import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { wetterVorhersageLaden } from "@/lib/weather/open-meteo";

/**
 * Täglicher Cron (z. B. 6:00): wetter-sensitive Projekte prüfen, Warnungen schreiben.
 * Authorization: Bearer CRON_SECRET (empfohlen in Produktion).
 */
export async function GET(request: Request) {
  if (process.env.CRON_SECRET) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json(
        { fehler: "Nicht autorisiert." },
        { status: 401 }
      );
    }
  }

  let supabase;
  try {
    supabase = createServiceRoleClient();
  } catch {
    return NextResponse.json({
      nachricht:
        "SUPABASE_SERVICE_ROLE_KEY fehlt — automatische Wetterwarnungen werden nicht geschrieben.",
      verarbeitet: 0,
    });
  }

  const heute = new Date().toISOString().slice(0, 10);
  const in3 = new Date();
  in3.setDate(in3.getDate() + 3);
  const ende = in3.toISOString().slice(0, 10);

  const { data: projekte, error } = await supabase
    .from("projects")
    .select("id, weather_sensitive, customers(lat,lng)")
    .eq("weather_sensitive", true);

  if (error) {
    return NextResponse.json({ fehler: error.message }, { status: 500 });
  }

  let neu = 0;

  for (const p of projekte ?? []) {
    const raw = p.customers as
      | { lat: number | null; lng: number | null }
      | { lat: number | null; lng: number | null }[]
      | null;
    const c = Array.isArray(raw) ? raw[0] : raw;
    const lat = c?.lat != null ? Number(c.lat) : null;
    const lng = c?.lng != null ? Number(c.lng) : null;
    if (lat == null || lng == null || Number.isNaN(lat) || Number.isNaN(lng)) {
      continue;
    }

    let forecast: {
      daily?: {
        time?: string[];
        weathercode?: number[];
        windspeed_10m_max?: number[];
        temperature_2m_min?: number[];
      };
    };
    try {
      forecast = (await wetterVorhersageLaden(
        lat,
        lng,
        heute,
        ende
      )) as typeof forecast;
    } catch {
      continue;
    }

    const zeiten = forecast.daily?.time ?? [];
    const codes = forecast.daily?.weathercode ?? [];
    const winde = forecast.daily?.windspeed_10m_max ?? [];
    const minTemp = forecast.daily?.temperature_2m_min ?? [];

    for (let i = 0; i < zeiten.length; i++) {
      const tag = zeiten[i]!;
      const code = codes[i] ?? 0;
      const wind = winde[i] ?? 0;
      const frost = (minTemp[i] ?? 10) < 0;

      let bedingung = "";
      let severity = "info";
      if (code >= 95 || wind > 70) {
        bedingung = "Sturm / Unwetter möglich";
        severity = "hoch";
      } else if (wind > 50) {
        bedingung = "Starker Wind";
        severity = "mittel";
      } else if (code >= 80) {
        bedingung = "Starkregen möglich";
        severity = "mittel";
      } else if (frost) {
        bedingung = "Frost";
        severity = "mittel";
      }

      if (!bedingung) continue;

      const { data: vorhanden } = await supabase
        .from("weather_alerts")
        .select("id")
        .eq("project_id", p.id as string)
        .eq("alert_date", tag)
        .eq("condition", bedingung)
        .maybeSingle();

      if (vorhanden) continue;

      const { error: insErr } = await supabase.from("weather_alerts").insert({
        project_id: p.id as string,
        alert_date: tag,
        condition: bedingung,
        severity,
        forecast_data: {
          tag,
          weathercode: code,
          wind,
          frost,
        } as unknown as Record<string, unknown>,
      });

      if (!insErr) neu++;
    }
  }

  return NextResponse.json({
    nachricht: "Wetter-Check abgeschlossen.",
    warnungenEingetragen: neu,
  });
}

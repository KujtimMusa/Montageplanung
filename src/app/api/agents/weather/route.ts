import { generateText } from "ai";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { wetterVorhersageLaden } from "@/lib/weather/open-meteo";
import { istKiKonfiguriert, kiModell } from "@/lib/agents/ki-client";
import type { KiStrukturierteAgentAntwort } from "@/types/ki-actions";

/** Wetter — Open-Meteo + KI-Text-Stream */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const body = (await request.json()) as { lat?: number; lng?: number };
  const lat = body.lat ?? 50.1;
  const lng = body.lng ?? 8.68;
  const heute = new Date().toISOString().slice(0, 10);
  const end = new Date();
  end.setDate(end.getDate() + 5);
  const endStr = end.toISOString().slice(0, 10);

  const roh = await wetterVorhersageLaden(lat, lng, heute, endStr);

  if (!istKiKonfiguriert()) {
    return new Response(
      JSON.stringify({
        rohdaten: roh,
        empfehlung:
          "KI nicht konfiguriert — Rohdaten von Open-Meteo siehe rohdaten.",
      }),
      { status: 503, headers: { "Content-Type": "application/json" } }
    );
  }

  const { text } = await generateText({
    model: kiModell,
    system:
      "Du bist Bau-Wetterberater. Antworte als valides JSON mit Feldern titel, zusammenfassung, abschnitte[] und aktionen[].",
    prompt: `Koordinaten: ${lat}, ${lng}\nVorhersage JSON:\n${JSON.stringify(roh)}`,
  });
  let parsed: KiStrukturierteAgentAntwort;
  try {
    parsed = JSON.parse(text) as KiStrukturierteAgentAntwort;
  } catch {
    parsed = {
      titel: "Wetterprüfung",
      zusammenfassung: text.slice(0, 120),
      abschnitte: [{ ueberschrift: "Ergebnis", inhalt: text, typ: "info" }],
      aktionen: [],
    };
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (
    appUrl &&
    parsed.abschnitte?.some((a) => a.typ === "warnung" || a.typ === "kritisch")
  ) {
    void fetch(`${appUrl}/api/notifications/koordinatoren`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        typ: "wetter",
        payload: {
          einsaetze: parsed.abschnitte
            .filter((a) => a.typ !== "info")
            .map((a) => ({
              projekt: a.ueberschrift,
              datum: new Date().toLocaleDateString("de-DE"),
              mitarbeiter: "",
              warnung: a.inhalt.slice(0, 120),
            })),
        },
      }),
    }).catch(() => {});
  }
  return NextResponse.json(parsed);
}

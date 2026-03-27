import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { wetterVorhersageLaden } from "@/lib/weather/open-meteo";
import { rufeGeminiOptional, istGeminiKonfiguriert } from "@/lib/agents/gemini";

/** Wetter-Analyse mit Open-Meteo + optional Gemini */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ fehler: "Nicht angemeldet." }, { status: 401 });
    }

    const body = (await request.json()) as { lat?: number; lng?: number };
    const lat = body.lat ?? 50.1;
    const lng = body.lng ?? 8.68;
    const heute = new Date().toISOString().slice(0, 10);
    const end = new Date();
    end.setDate(end.getDate() + 5);
    const endStr = end.toISOString().slice(0, 10);

    const roh = await wetterVorhersageLaden(lat, lng, heute, endStr);

    if (!istGeminiKonfiguriert()) {
      return NextResponse.json({
        rohdaten: roh,
        empfehlung:
          "KI nicht konfiguriert — Rohdaten von Open-Meteo siehe rohdaten.",
      });
    }

    const text = await rufeGeminiOptional(
      "Du bist Bau-Wetterberater. Antworte kurz auf Deutsch mit Handlungsempfehlung.",
      `Vorhersage JSON: ${JSON.stringify(roh)}`
    );

    return NextResponse.json({
      empfehlung: text ?? "",
      rohdaten: roh,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Fehler.";
    return NextResponse.json({ fehler: msg }, { status: 500 });
  }
}

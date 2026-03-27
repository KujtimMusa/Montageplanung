import { streamText } from "ai";
import { createClient } from "@/lib/supabase/server";
import { wetterVorhersageLaden } from "@/lib/weather/open-meteo";
import { istKiKonfiguriert, kiModell } from "@/lib/agents/ki-client";

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

  const result = streamText({
    model: kiModell,
    system:
      "Du bist Bau-Wetterberater. Antworte kurz auf Deutsch mit Handlungsempfehlung für Außenarbeiten.",
    prompt: `Koordinaten: ${lat}, ${lng}\nVorhersage JSON:\n${JSON.stringify(roh)}`,
  });

  return result.toTextStreamResponse();
}

import { streamText } from "ai";
import { createClient } from "@/lib/supabase/server";
import { istKiKonfiguriert, kiModell } from "@/lib/agents/ki-client";

const SYSTEM_NOTFALL = `Du bist ein Notfall-Planungsassistent für Handwerksbetriebe.
STRIKTE REGEL: Antworte AUSSCHLIESSLICH mit rohem JSON.
KEINE Code-Fences, KEIN Markdown, KEIN Text vor oder nach dem JSON.
Das allererste Zeichen deiner Antwort MUSS { sein.
Das allerletzte Zeichen MUSS } sein.

Pflichtformat:
{
  "zusammenfassung": "Max 2 Sätze. Was ist passiert, wie viele Einsätze betroffen.",
  "einsaetze": [
    {
      "id": "assignment-uuid",
      "projekt": "Projektname",
      "datum": "YYYY-MM-DD",
      "dringlichkeit": "hoch",
      "vorschlaege": [
        {
          "mitarbeiter_id": "employee-uuid",
          "name": "Vorname Nachname",
          "score": 85,
          "verfuegbar": true,
          "konflikt": false,
          "grund": "Max 60 Zeichen Begründung"
        }
      ]
    }
  ],
  "warnungen": [
    {
      "typ": "personalengpass",
      "text": "Max 80 Zeichen"
    }
  ],
  "sofortmassnahme": "Max 100 Zeichen. Was jetzt sofort zu tun ist."
}`;

/** Notfall — strukturiertes JSON als Text-Stream */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ fehler: "Nicht angemeldet." }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const body = (await request.json()) as {
      ausfallMitarbeiter?: {
        id?: string;
        name?: string;
        abteilung?: string;
        qualifikationen?: string[];
      };
      datum?: string;
      betroffeneEinsaetze?: unknown[];
      verfuegbareKraefte?: unknown[];
      abwesenheiten?: unknown[];
    };

    if (!body?.ausfallMitarbeiter?.id || !body?.datum) {
      return new Response(
        JSON.stringify({
          fehler: "ausfallMitarbeiter.id und datum sind Pflicht.",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!istKiKonfiguriert()) {
      return new Response(
        JSON.stringify({ fehler: "KI nicht konfiguriert (GEMINI_API_KEY)." }),
        { status: 503, headers: { "Content-Type": "application/json" } }
      );
    }

    const nutzerPrompt = `Kontext (JSON):\n${JSON.stringify(body, null, 2)}`;

    const result = streamText({
      model: kiModell,
      system: SYSTEM_NOTFALL,
      prompt: nutzerPrompt,
    });

    return result.toTextStreamResponse();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Fehler.";
    return new Response(JSON.stringify({ fehler: msg }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

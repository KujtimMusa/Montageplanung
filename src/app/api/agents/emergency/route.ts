import { streamText } from "ai";
import { createClient } from "@/lib/supabase/server";
import { istKiKonfiguriert, kiModell } from "@/lib/agents/ki-client";

const SYSTEM_NOTFALL = `Du bist ein Notfall-Planungsassistent für Handwerksbetriebe. Antworte logisch auf Deutsch.

Deine Ausgabe ist IMMER valides JSON (ohne Markdown-Fences, ohne Codeblöcke) mit genau dieser Struktur:
{
  "zusammenfassung": "string",
  "empfehlungen": [
    {
      "einsatzId": "uuid",
      "name": "Mitarbeitername",
      "employeeId": "uuid",
      "begruendung": "string",
      "einsatz": "Projektname Datum"
    }
  ],
  "risiken": ["string"],
  "kommunikation": "string"
}

Inhaltlich darfst du in den STRING-Feldern Markdown nutzen:
- **fett** für Namen und Kernpunkte
- ### kurze Zwischenüberschriften (z. B. "### Betroffene Einsätze")
- Aufzählungen mit -

Strukturvorschlag für "zusammenfassung":
### Betroffene Einsätze
Kurze Übersicht.

### Meine Empfehlung
**Projekt X am Datum** — wer übernimmt und warum.

### Hinweise
Wichtige Planungs-Hinweise.

In "empfehlungen[].begruendung" ebenfalls **fett** für Namen erlaubt.

Priorisiere:
1. Gleiche Abteilung wie Ausgefallener
2. verfuegbareKraefte mit hatKonflikt: false
3. Passende Qualifikationen
4. Nur employeeIds aus "verfuegbareKraefte" für Empfehlungen
5. Präzise, keine Romanzen.`;

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

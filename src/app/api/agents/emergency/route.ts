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

In den STRING-Feldern **kurzes Markdown** erlaubt:
- **fett** für Namen/Kernpunkte
- "###" für maximal 3 sehr kurze Zwischenüberschriften

Strukturvorschlag für "zusammenfassung":
### Betroffene Einsätze
Kurze Übersicht (max 2 Sätze).

### Meine Empfehlung
Kurzer Überblick über das Vorgehen (max 2 Sätze).

### Hinweise
Wichtigste Hinweise (max 2 Sätze).

In "empfehlungen[].begruendung" ebenfalls **fett** für Namen erlaubt.

WICHTIG:
- Liefere für **jeden Eintrag** aus "betroffeneEinsaetze" genau **eine** Empfehlung in "empfehlungen".
- Nutze **nur** employeeIds aus "verfuegbareKraefte" (genau dort sind Kandidaten inkl. hatKonflikt-Info).
- Wenn "ausfallHatAbwesenheit" true ist, beschreibe es als Risiko/Problem und priorisiere trotzdem eine praktikable Lösung.
- Wenn "ausfallHatAbwesenheit" true ist:
  - setze in "risiken" mindestens 1 Item, der klar auf die Abwesenheit des Ausfall-Mitarbeiters eingeht
  - erwähne die Abwesenheit in "zusammenfassung" und gib in "kommunikation" einen Satz dazu, warum Ersatz nötig ist
- Wenn "ausfallHatAbwesenheit" false ist: mache dazu keine Abwesenheits-Risiken.
- Jede "begruendung" max. 1 Satz, "risiken" max. 2 Items.
- "kommunikation" max. 5 Zeilen, direkt nutzbar.

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

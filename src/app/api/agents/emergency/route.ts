import { streamText } from "ai";
import { createClient } from "@/lib/supabase/server";
import { istKiKonfiguriert, kiModell } from "@/lib/agents/ki-client";

const SYSTEM_NOTFALL = `Du bist ein Notfall-Planungsassistent für einen Handwerksbetrieb.
Ein Mitarbeiter ist kurzfristig ausgefallen.
Analysiere die Situation und erstelle einen konkreten Notfallplan.

Deine Ausgabe ist IMMER valides JSON mit dieser Struktur (ohne Markdown, ohne Codeblöcke):
{
  "zusammenfassung": "2-3 Sätze was passiert ist und was zu tun ist",
  "empfehlungen": [
    {
      "einsatzId": "uuid",
      "name": "Mitarbeitername",
      "employeeId": "uuid",
      "begruendung": "Kurze Begründung warum diese Person",
      "einsatz": "Projektname Datum"
    }
  ],
  "risiken": ["Risiko 1", "Risiko 2"],
  "kommunikation": "Fertige WhatsApp-Nachricht an den Ersatz"
}

Priorisiere:
1. Gleiche Abteilung wie Ausgefallener
2. Keine Konflikte am selben Tag (hatKonflikt: false bevorzugen)
3. Gleiche Qualifikationen wenn möglich
4. Kurze Begründung in der Sprache des Handwerks
5. Nutze nur employeeIds aus "verfuegbareKraefte" für Empfehlungen.`;

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

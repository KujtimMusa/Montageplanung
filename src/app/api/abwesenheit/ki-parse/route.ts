import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Mitarbeiter = { id: string; name: string; abteilung?: string };

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
    }

    const { eingabe, mitarbeiter, heute, morgen } = (await req.json()) as {
      eingabe?: string;
      mitarbeiter?: Mitarbeiter[];
      heute?: string;
      morgen?: string;
    };
    if (!eingabe || !Array.isArray(mitarbeiter)) {
      return NextResponse.json({ error: "Ungültiger Request." }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "GEMINI_API_KEY fehlt." }, { status: 503 });
    }

    const modelId = process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash";
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: modelId,
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.1,
      },
    });

    const mitarbeiterText = mitarbeiter
      .map(
        (m) =>
          `- ${m.name} (ID: ${m.id}, Abteilung: ${m.abteilung ?? "unbekannt"})`
      )
      .join("\n");

    const prompt = `Du bist ein Assistent der Abwesenheiten für einen Handwerksbetrieb einträgt.
Heute ist: ${heute ?? ""}

Verfügbare Mitarbeiter:
${mitarbeiterText}

Nutzer-Eingabe: "${eingabe}"

Antworte NUR mit rohem JSON, keine Code-Fences:
{
  "mitarbeiter": [
    { "id": "uuid", "name": "Name", "abteilung": "Abteilung" }
  ],
  "typ": "krankheit|urlaub|sonstiges",
  "start_date": "YYYY-MM-DD",
  "end_date": "YYYY-MM-DD",
  "tage": 1,
  "begruendung": "kurze Notiz oder leer"
}

Regeln:
- "morgen" = ${morgen ?? ""}
- "nächste Woche" = Montag bis Freitag der nächsten Woche
- "krank/Krankmeldung/nicht da" -> typ: "krankheit"
- "Urlaub/frei/Auszeit" -> typ: "urlaub"
- Wenn Team/Abteilung genannt: ALLE Mitarbeiter dieser Abteilung einschließen
- Wenn Mitarbeiter nicht gefunden: leeres mitarbeiter-Array
- Das erste Zeichen MUSS { sein`;

    const result = await model.generateContent(prompt);
    const rawText = result.response.text();

    let cleaned = rawText
      .replace(/```json\s*/gi, "")
      .replace(/```\s*/gi, "")
      .trim();
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start !== -1 && end !== -1 && end > start) {
      cleaned = cleaned.substring(start, end + 1);
    }

    try {
      const parsed = JSON.parse(cleaned) as unknown;
      return NextResponse.json(parsed);
    } catch (e) {
      return NextResponse.json(
        {
          error: "parse_fehler",
          message: e instanceof Error ? e.message : String(e ?? ""),
        },
        { status: 422 }
      );
    }
  } catch (e) {
    return NextResponse.json(
      {
        error: "parse_fehler",
        message: e instanceof Error ? e.message : String(e ?? ""),
      },
      { status: 422 }
    );
  }
}


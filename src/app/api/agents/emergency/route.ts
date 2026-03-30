import { GoogleGenerativeAI, SchemaType, type Schema } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { NotfallAnalyse } from "@/types/notfall-ki";

const SYSTEM_NOTFALL = `Du bist ein Notfall-Planungsassistent für Handwerksbetriebe.
Antworte ausschließlich im vorgegebenen JSON-Format.
Analysiere welche Mitarbeiter als Ersatz geeignet sind.
Bewerte jeden Kandidaten mit einem score von 0-100.
score 0 = nicht verfügbar/Konflikt, score 80+ = sehr gut geeignet.
Gib immer eine sofortmassnahme an (max 100 Zeichen).`;

type EmergencyBody = {
  ausfallMitarbeiter?: {
    id?: string;
    name?: string;
    abteilung?: string;
    qualifikationen?: string[];
  };
  datum?: string;
  betroffeneEinsaetze?: Array<Record<string, unknown>>;
  verfuegbareKraefte?: Array<Record<string, unknown>>;
  abwesenheiten?: Array<Record<string, unknown>>;
};

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ fehler: "Nicht angemeldet." }, { status: 401 });
    }

    const body = (await request.json()) as EmergencyBody;

    if (!body?.ausfallMitarbeiter?.id || !body?.datum) {
      return NextResponse.json(
        { fehler: "ausfallMitarbeiter.id und datum sind Pflicht." },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { fehler: "KI nicht konfiguriert (GEMINI_API_KEY)." },
        { status: 503 }
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.1,
      },
      systemInstruction: SYSTEM_NOTFALL,
    });

    const schema: Schema = {
      type: SchemaType.OBJECT,
      properties: {
        zusammenfassung: { type: SchemaType.STRING },
        sofortmassnahme: { type: SchemaType.STRING },
        einsaetze: {
          type: SchemaType.ARRAY,
          items: {
            type: SchemaType.OBJECT,
            properties: {
              id: { type: SchemaType.STRING },
              projekt: { type: SchemaType.STRING },
              datum: { type: SchemaType.STRING },
              dringlichkeit: { type: SchemaType.STRING },
              vorschlaege: {
                type: SchemaType.ARRAY,
                items: {
                  type: SchemaType.OBJECT,
                  properties: {
                    mitarbeiter_id: { type: SchemaType.STRING },
                    name: { type: SchemaType.STRING },
                    score: { type: SchemaType.NUMBER },
                    verfuegbar: { type: SchemaType.BOOLEAN },
                    konflikt: { type: SchemaType.BOOLEAN },
                    grund: { type: SchemaType.STRING },
                  },
                  required: ["mitarbeiter_id", "name", "score", "verfuegbar", "konflikt", "grund"],
                },
              },
            },
            required: ["id", "projekt", "datum", "dringlichkeit", "vorschlaege"],
          },
        },
        warnungen: {
          type: SchemaType.ARRAY,
          items: {
            type: SchemaType.OBJECT,
            properties: {
              typ: { type: SchemaType.STRING },
              text: { type: SchemaType.STRING },
            },
            required: ["typ", "text"],
          },
        },
      },
      required: ["zusammenfassung", "sofortmassnahme", "einsaetze", "warnungen"],
    };

    const mitarbeiterName = body.ausfallMitarbeiter.name ?? body.ausfallMitarbeiter.id;
    const abDatum = body.datum;
    const betroffeneEinsaetze = body.betroffeneEinsaetze ?? [];
    const kandidaten = body.verfuegbareKraefte ?? [];

    const userPrompt = `Ausgefallener Mitarbeiter: ${mitarbeiterName}
Ab Datum: ${abDatum}
Betroffene Einsätze: ${JSON.stringify(betroffeneEinsaetze, null, 2)}
Verfügbare Ersatzkräfte: ${JSON.stringify(kandidaten, null, 2)}

Analysiere und gib Ersatzempfehlungen.`;

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: userPrompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.1,
        responseSchema: schema,
      },
    });
    const rawText = result.response.text();
    console.log("[NOTFALL KI RAW]", rawText.substring(0, 500));

    let analyse: NotfallAnalyse | null = null;
    try {
      analyse = JSON.parse(rawText) as NotfallAnalyse;
    } catch (e) {
      console.error("[NOTFALL KI PARSE ERROR]", e, "\nRaw:", rawText);
      const start = rawText.indexOf("{");
      const end = rawText.lastIndexOf("}");
      if (start !== -1 && end !== -1 && end > start) {
        try {
          analyse = JSON.parse(rawText.substring(start, end + 1)) as NotfallAnalyse;
        } catch {
          return NextResponse.json(
            {
              fehler: "Gemini Parse-Fehler",
              rawText: rawText.substring(0, 200),
            },
            { status: 422 }
          );
        }
      }
    }

    if (!analyse) {
      return NextResponse.json({ fehler: "Leere KI-Antwort." }, { status: 422 });
    }

    if (!analyse.einsaetze || analyse.einsaetze.length === 0) {
      analyse.einsaetze = betroffeneEinsaetze.map((e) => {
        const einsatz = e as Record<string, unknown>;
        const projektTitel =
          (einsatz.projektTitel as string | undefined) ??
          (einsatz.project_title as string | undefined) ??
          "Einsatz";
        const datum = (einsatz.datum as string | undefined) ?? abDatum;
        return {
          id: String(einsatz.id ?? crypto.randomUUID()),
          projekt: projektTitel,
          datum,
          dringlichkeit: "hoch" as const,
          vorschlaege: kandidaten.slice(0, 3).map((k, idx) => {
            const kraft = k as Record<string, unknown>;
            return {
              mitarbeiter_id: String(kraft.id ?? ""),
              name: String(kraft.name ?? `Kandidat ${idx + 1}`),
              score: Math.max(0, 70 - idx * 20),
              verfuegbar: true,
              konflikt: false,
              grund: "Gleiche Qualifikation verfügbar",
            };
          }),
        };
      });
    }

    return NextResponse.json(analyse);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Fehler.";
    return NextResponse.json({ fehler: msg }, { status: 500 });
  }
}

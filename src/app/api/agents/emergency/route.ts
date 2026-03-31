import { GoogleGenerativeAI, SchemaType, type Schema } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { NotfallAnalyse } from "@/types/notfall-ki";
import { getMyOrgId } from "@/lib/org";

const SYSTEM_NOTFALL = `Du bist ein Notfall-Planungsassistent für Handwerksbetriebe.
Antworte ausschließlich im vorgegebenen JSON-Format.

WICHTIGE REGELN FÜR konflikt UND score:
- Setze "konflikt: true" NUR wenn der Kandidat in einsaetze_am_datum
  einen Eintrag hat, der sich zeitlich mit dem betroffenen Einsatz überschneidet.
- Ist einsaetze_am_datum leer -> konflikt: false
- Ist hatKonflikt im Input false -> setze konflikt: false
- Du darfst konflikt NIEMALS selbst erfinden oder schätzen.
- score 0 = hatKonflikt ist true (echte Zeitüberlappung)
- score 85-100 = verfügbar, passende Qualifikation
- score 60-84 = verfügbar, Qualifikation teilweise passend
- score 1-59 = verfügbar aber wenig geeignet
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
    const orgId = await getMyOrgId();
    if (!orgId) {
      return NextResponse.json({ fehler: "Keine Org" }, { status: 403 });
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

    const modelId = process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash";
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: modelId,
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

Betroffene Einsätze (müssen besetzt werden):
${JSON.stringify(betroffeneEinsaetze, null, 2)}

Verfügbare Ersatzkräfte mit ihren bestehenden Einsätzen am Tag:
${JSON.stringify(kandidaten, null, 2)}

Regeln:
- Jeder Kandidat hat "einsaetze_am_datum" mit seinen heutigen Buchungen.
- "hatKonflikt: true" im Input = diese Person ist bereits zur gleichen Zeit gebucht -> setze konflikt: true, score: 0
- "hatKonflikt: false" = keine Überlappung -> setze konflikt: false
- Empfehle nur Mitarbeiter mit hatKonflikt: false
- Begründe kurz warum jemand gut geeignet ist (grund-Feld)`;

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

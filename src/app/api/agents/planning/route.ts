import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rufeGeminiOptional, istGeminiKonfiguriert } from "@/lib/agents/gemini";

/** Planungsvorschläge (Teamzusammenstellung) */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ fehler: "Nicht angemeldet." }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as {
      projektId?: string;
      datum?: string;
    };

    const [{ data: ma }, { data: zu }] = await Promise.all([
      supabase.from("employees").select("id,name,department_id,active").eq("active", true),
      supabase.from("assignments").select("employee_id,date,start_time,end_time").limit(300),
    ]);

    if (!istGeminiKonfiguriert()) {
      return NextResponse.json({
        nachricht:
          "Gemini nicht konfiguriert — Vorschlag: passende Monteure nach Abteilung filtern, freie Slots in der Planung prüfen.",
        daten: { mitarbeiter: ma ?? [], einsaetze: zu ?? [], hinweis: body },
      });
    }

    const text = await rufeGeminiOptional(
      "Du bist Planungsassistent. Schlage eine sinnvolle Teamzusammenstellung vor. Antworte auf Deutsch, stichpunktartig.",
      `Mitarbeiter: ${JSON.stringify(ma ?? [])}\nEinsätze(Stichprobe): ${JSON.stringify(zu ?? [])}\nAnfrage-Parameter: ${JSON.stringify(body)}`
    );

    return NextResponse.json({
      vorschlag: text ?? "Keine Auswertung möglich.",
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Fehler.";
    return NextResponse.json({ fehler: msg }, { status: 500 });
  }
}

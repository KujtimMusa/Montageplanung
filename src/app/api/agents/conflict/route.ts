import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rufeGeminiOptional, istGeminiKonfiguriert } from "@/lib/agents/gemini";

/** Konflikt-Wächter — Einsätze analysieren */
export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ fehler: "Nicht angemeldet." }, { status: 401 });
    }

    const { data: zu, error } = await supabase
      .from("assignments")
      .select("id,employee_id,date,start_time,end_time, projects(title)")
      .limit(500);

    if (error) {
      return NextResponse.json({ fehler: error.message }, { status: 500 });
    }

    if (!istGeminiKonfiguriert()) {
      return NextResponse.json({
        analyse:
          "KI nicht aktiv. Bitte Überschneidungen in der Planungsansicht und bei der Buchung prüfen.",
        rohdatenAnzahl: zu?.length ?? 0,
      });
    }

    const text = await rufeGeminiOptional(
      "Du prüfst Einsatzpläne auf Risiken und Überschneidungen. Antworte auf Deutsch.",
      `Einsätze: ${JSON.stringify(zu ?? [])}`
    );

    return NextResponse.json({ analyse: text ?? "" });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Fehler.";
    return NextResponse.json({ fehler: msg }, { status: 500 });
  }
}

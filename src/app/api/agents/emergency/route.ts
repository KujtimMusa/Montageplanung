import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rufeGeminiOptional, istGeminiKonfiguriert } from "@/lib/agents/gemini";

/** Notfall / Ersatz-Vorschläge per KI */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ fehler: "Nicht angemeldet." }, { status: 401 });
    }

    const body = (await request.json()) as {
      mitarbeiterId?: string;
      datum?: string;
    };

    const { data: ma } = await supabase
      .from("employees")
      .select("id,name,department_id,active")
      .eq("active", true);

    const { data: zu } = await supabase
      .from("assignments")
      .select("employee_id,date,start_time,end_time")
      .limit(400);

    if (!istGeminiKonfiguriert()) {
      return NextResponse.json({
        hinweis:
          "KI nicht konfiguriert — nutze die Notfall-Seite in der App für konkrete Ersatzvorschläge.",
        parameter: body,
      });
    }

    const text = await rufeGeminiOptional(
      "Ein Mitarbeiter fällt aus. Schlage Ersatz aus derselben Abteilung vor. Antworte kurz auf Deutsch.",
      `Parameter: ${JSON.stringify(body)}\nMitarbeiter: ${JSON.stringify(ma ?? [])}\nEinsätze: ${JSON.stringify(zu ?? [])}`
    );

    return NextResponse.json({ vorschlag: text ?? "" });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Fehler.";
    return NextResponse.json({ fehler: msg }, { status: 500 });
  }
}

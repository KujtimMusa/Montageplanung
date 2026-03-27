import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rufeGeminiOptional, istGeminiKonfiguriert } from "@/lib/agents/gemini";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { fehler: "Nicht angemeldet." },
        { status: 401 }
      );
    }

    const body = (await request.json()) as { message?: string };
    const frage = (body.message ?? "").trim();
    if (!frage) {
      return NextResponse.json(
        { fehler: "Leere Nachricht." },
        { status: 400 }
      );
    }

    const [{ data: ma }, { data: pr }, { data: zu }] = await Promise.all([
      supabase.from("employees").select("id,name,role,active,department_id").limit(200),
      supabase.from("projects").select("id,title,status,priority,planned_start,planned_end").limit(100),
      supabase
        .from("assignments")
        .select("id,employee_id,project_id,date,start_time,end_time")
        .order("date", { ascending: false })
        .limit(150),
    ]);

    const kontext = [
      "Du bist ein Assistent für Monteurplanung. Antworte knapp auf Deutsch.",
      "Mitarbeiter (Auszug):",
      JSON.stringify(ma ?? []),
      "Projekte (Auszug):",
      JSON.stringify(pr ?? []),
      "Einsätze (Auszug):",
      JSON.stringify(zu ?? []),
      "Nutzerfrage:",
      frage,
    ].join("\n");

    if (!istGeminiKonfiguriert()) {
      return NextResponse.json({
        antwort:
          "KI ist nicht konfiguriert (GEMINI_API_KEY fehlt). Hier ein Datenüberblick: " +
          `${(ma ?? []).length} Mitarbeiter, ${(pr ?? []).length} Projekte, ${(zu ?? []).length} Einsätze in der Stichprobe.`,
      });
    }

    const antwort = await rufeGeminiOptional(
      "Du hilfst bei Einsatzplanung. Nutze nur die mitgelieferten JSON-Daten. Antworte auf Deutsch, sachlich.",
      kontext
    );

    return NextResponse.json({
      antwort:
        antwort ??
        "Die KI konnte keine Antwort erzeugen. Bitte später erneut versuchen.",
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unbekannter Fehler.";
    return NextResponse.json({ fehler: msg }, { status: 500 });
  }
}

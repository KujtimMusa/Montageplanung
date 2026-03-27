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

    const heute = new Date().toISOString().slice(0, 10);

    const [
      { data: ma },
      { data: pr },
      { data: zu },
      { data: abw },
      { data: heuteZu },
    ] = await Promise.all([
      supabase
        .from("employees")
        .select("id,name,role,active,department_id")
        .limit(300),
      supabase
        .from("projects")
        .select("id,title,status,priority,planned_start,planned_end")
        .limit(150),
      supabase
        .from("assignments")
        .select(
          "id,employee_id,project_id,project_title,date,start_time,end_time"
        )
        .order("date", { ascending: false })
        .limit(200),
      supabase
        .from("absences")
        .select("id,employee_id,type,start_date,end_date,status")
        .limit(200),
      supabase
        .from("assignments")
        .select(
          "id,employee_id,project_id,project_title,date,start_time,end_time"
        )
        .eq("date", heute)
        .limit(100),
    ]);

    const kontext = [
      `Heutiges Datum (ISO): ${heute}`,
      "Du unterstützt Teamleitung, Abteilungs- und Bereichsleiter bei Einsatzplanung und Steuerung. Antworte knapp auf Deutsch.",
      "Mitarbeiter (Auszug):",
      JSON.stringify(ma ?? []),
      "Projekte (Auszug):",
      JSON.stringify(pr ?? []),
      "Einsätze (Auszug, inkl. project_title wenn kein Projekt verknüpft):",
      JSON.stringify(zu ?? []),
      "Abwesenheiten:",
      JSON.stringify(abw ?? []),
      "Einsätze nur heute:",
      JSON.stringify(heuteZu ?? []),
      "Hinweis: Prüfe bei Bedarf zeitliche Überschneidungen pro Mitarbeiter selbst aus den Einsätzen.",
      "Wenn du einen neuen Einsatz vorschlägst, formuliere klare Felder (Mitarbeiter-ID oder Name, Datum, Zeit, Projekt/Freitext).",
      "Nutzerfrage:",
      frage,
    ].join("\n");

    if (!istGeminiKonfiguriert()) {
      return NextResponse.json({
        antwort:
          "KI ist nicht konfiguriert (GEMINI_API_KEY fehlt). Datenüberblick: " +
          `${(ma ?? []).length} Mitarbeiter, ${(pr ?? []).length} Projekte, ${(zu ?? []).length} Einsätze (Stichprobe), ${(abw ?? []).length} Abwesenheiten.`,
      });
    }

    const antwort = await rufeGeminiOptional(
      "Du hilfst bei Planung und Steuerung. Nutze nur die mitgelieferten JSON-Daten. Antworte auf Deutsch, sachlich. Wenn eine konkrete Aktion sinnvoll wäre (z. B. Einsatz anlegen), beschreibe sie am Ende in einem Satz mit 'Vorschlag:' und den nötigen Feldern — der Nutzer bestätigt in der App.",
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

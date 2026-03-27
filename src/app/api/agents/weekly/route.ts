import { streamText } from "ai";
import { createClient } from "@/lib/supabase/server";
import { istKiKonfiguriert, kiModell } from "@/lib/agents/ki-client";

/** Wochenbericht — Text-Stream */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const heute = new Date();
  const start = new Date(heute);
  const day = start.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + diff);
  const ende = new Date(start);
  ende.setDate(ende.getDate() + 6);

  const von = start.toISOString().slice(0, 10);
  const bis = ende.toISOString().slice(0, 10);

  const [{ data: zu }, { data: abw }, { data: pr }] = await Promise.all([
    supabase
      .from("assignments")
      .select(
        "date,start_time,end_time,employee_id,project_title, projects(title), teams(name)"
      )
      .gte("date", von)
      .lte("date", bis)
      .limit(400),
    supabase
      .from("absences")
      .select("type,start_date,end_date, employees(name)")
      .lte("start_date", bis)
      .gte("end_date", von)
      .limit(100),
    supabase
      .from("projects")
      .select("title,status,priority")
      .limit(80),
  ]);

  if (!istKiKonfiguriert()) {
    return new Response(
      JSON.stringify({
        fehler: "KI nicht konfiguriert.",
        kw: { von, bis },
      }),
      { status: 503, headers: { "Content-Type": "application/json" } }
    );
  }

  const result = streamText({
    model: kiModell,
    system:
      "Du erstellst einen prägnanten Wochenbericht für die Leitung (Handwerk). Struktur: Überblick, Highlights, Risiken, nächste Schritte. Antworte auf Deutsch.",
    prompt: `Kalenderwoche (Mo–So): ${von} bis ${bis}\n\nEinsätze:\n${JSON.stringify(zu ?? [])}\n\nAbwesenheiten (Überschneidung mit Woche):\n${JSON.stringify(abw ?? [])}\n\nProjekte (Stichprobe):\n${JSON.stringify(pr ?? [])}`,
  });

  return result.toTextStreamResponse();
}

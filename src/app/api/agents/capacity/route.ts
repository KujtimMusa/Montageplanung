import { streamText } from "ai";
import { createClient } from "@/lib/supabase/server";
import { istKiKonfiguriert, kiModell } from "@/lib/agents/ki-client";

/** Kapazitätsplaner — Auslastung pro Team, Text-Stream */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const heute = new Date().toISOString().slice(0, 10);
  const in4w = new Date();
  in4w.setDate(in4w.getDate() + 28);
  const bis = in4w.toISOString().slice(0, 10);

  const [{ data: teams }, { data: zu }, { data: members }] = await Promise.all([
    supabase.from("teams").select("id,name,department_id").limit(100),
    supabase
      .from("assignments")
      .select("id,date,start_time,end_time,team_id,employee_id, projects(title)")
      .gte("date", heute)
      .lte("date", bis)
      .limit(800),
    supabase.from("team_members").select("team_id,employee_id").limit(2000),
  ]);

  if (!istKiKonfiguriert()) {
    return new Response(
      JSON.stringify({
        fehler: "KI nicht konfiguriert.",
        rohdaten: { teams: teams ?? [], assignments: zu ?? [] },
      }),
      { status: 503, headers: { "Content-Type": "application/json" } }
    );
  }

  const result = streamText({
    model: kiModell,
    system:
      "Du bist Kapazitätsplaner für einen Handwerksbetrieb. Analysiere Teamgröße (über team_members), geplante Einsätze mit team_id und zeige Engpässe, freie Kapazität und Empfehlungen. Antworte auf Deutsch, mit klaren Abschnitten.",
    prompt: `Zeitraum: ${heute} bis ${bis}\n\nTeams:\n${JSON.stringify(teams ?? [])}\n\nTeam-Mitglieder (Stichprobe):\n${JSON.stringify(members ?? [])}\n\nEinsätze (Stichprobe, mit team_id):\n${JSON.stringify(zu ?? [])}`,
  });

  return result.toTextStreamResponse();
}

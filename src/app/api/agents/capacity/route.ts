import { generateText } from "ai";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { istKiKonfiguriert, kiModell } from "@/lib/agents/ki-client";
import type { KiStrukturierteAgentAntwort } from "@/types/ki-actions";
import { getMyOrgId } from "@/lib/org";

/** Kapazitätsplaner — Auslastung pro Team, Text-Stream */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }
  const orgId = await getMyOrgId();
  if (!orgId) {
    return new Response("Keine Org", { status: 403 });
  }

  const heute = new Date().toISOString().slice(0, 10);
  const in4w = new Date();
  in4w.setDate(in4w.getDate() + 28);
  const bis = in4w.toISOString().slice(0, 10);

  const [{ data: teams }, { data: zu }] = await Promise.all([
    supabase
      .from("teams")
      .select("id,name,department_id")
      .eq("organization_id", orgId)
      .limit(100),
    supabase
      .from("assignments")
      .select("id,date,start_time,end_time,team_id,employee_id, projects(title)")
      .eq("organization_id", orgId)
      .gte("date", heute)
      .lte("date", bis)
      .limit(800),
  ]);

  const teamIds = (teams ?? []).map((t) => t.id as string);
  const { data: members } =
    teamIds.length > 0
      ? await supabase
          .from("team_members")
          .select("team_id,employee_id")
          .in("team_id", teamIds)
          .limit(2000)
      : { data: [] as { team_id: string; employee_id: string }[] };

  if (!istKiKonfiguriert()) {
    return new Response(
      JSON.stringify({
        fehler: "KI nicht konfiguriert.",
        rohdaten: { teams: teams ?? [], assignments: zu ?? [] },
      }),
      { status: 503, headers: { "Content-Type": "application/json" } }
    );
  }

  const systemPrompt = `Du analysierst Teamkapazitäten.
Antworte AUSSCHLIESSLICH als valides JSON:
{
  "titel": "Kapazitätsanalyse",
  "zusammenfassung": "...",
  "abschnitte": [
    {
      "ueberschrift": "Team [Name]",
      "inhalt": "Markdown-Tabelle mit Auslastung je Mitarbeiter",
      "typ": "info|warnung|kritisch"
    }
  ],
  "aktionen": []
}
Berechne Auslastung aus den Einsatzdaten.
Markiere Mitarbeiter >80% als warnung, >95% als kritisch.`;
  const { text } = await generateText({
    model: kiModell,
    system: systemPrompt,
    prompt: `Zeitraum: ${heute} bis ${bis}\n\nTeams:\n${JSON.stringify(teams ?? [])}\n\nTeam-Mitglieder (Stichprobe):\n${JSON.stringify(members ?? [])}\n\nEinsätze (Stichprobe, mit team_id):\n${JSON.stringify(zu ?? [])}`,
  });
  let parsed: KiStrukturierteAgentAntwort;
  try {
    parsed = JSON.parse(text) as KiStrukturierteAgentAntwort;
  } catch {
    parsed = {
      titel: "Kapazitätsanalyse",
      zusammenfassung: text.slice(0, 120),
      abschnitte: [{ ueberschrift: "Ergebnis", inhalt: text, typ: "info" }],
      aktionen: [],
    };
  }
  return NextResponse.json(parsed);
}

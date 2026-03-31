import { generateText } from "ai";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { istKiKonfiguriert, kiModell } from "@/lib/agents/ki-client";
import type { KiStrukturierteAgentAntwort } from "@/types/ki-actions";
import { getMyOrgId } from "@/lib/org";

/** Wochenbericht — Text-Stream */
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
      .eq("organization_id", orgId)
      .gte("date", von)
      .lte("date", bis)
      .limit(400),
    supabase
      .from("absences")
      .select(
        "type,start_date,end_date,employee:employees!employee_id(name)"
      )
      .eq("organization_id", orgId)
      .lte("start_date", bis)
      .gte("end_date", von)
      .limit(100),
    supabase
      .from("projects")
      .select("title,status,priority")
      .eq("organization_id", orgId)
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

  const systemPrompt = `Du erstellst Wochenberichte für einen Handwerksbetrieb.
Antworte AUSSCHLIESSLICH als valides JSON:
{
  "titel": "Wochenbericht KW [X]",
  "zusammenfassung": "...",
  "abschnitte": [
    { "ueberschrift": "Personal", "inhalt": "Markdown-Tabelle: Mitarbeiter | Status | Einsätze", "typ": "info" },
    { "ueberschrift": "Projekte im Überblick", "inhalt": "Markdown-Tabelle", "typ": "info" },
    { "ueberschrift": "Offene Einsätze (unbesetzt)", "inhalt": "...", "typ": "warnung" },
    { "ueberschrift": "Empfehlungen für nächste Woche", "inhalt": "...", "typ": "info" }
  ],
  "aktionen": []
}`;
  const { text } = await generateText({
    model: kiModell,
    system: systemPrompt,
    prompt: `Kalenderwoche (Mo–So): ${von} bis ${bis}\n\nEinsätze:\n${JSON.stringify(zu ?? [])}\n\nAbwesenheiten (Überschneidung mit Woche):\n${JSON.stringify(abw ?? [])}\n\nProjekte (Stichprobe):\n${JSON.stringify(pr ?? [])}`,
  });
  let parsed: KiStrukturierteAgentAntwort;
  try {
    parsed = JSON.parse(text) as KiStrukturierteAgentAntwort;
  } catch {
    parsed = {
      titel: "Wochenbericht",
      zusammenfassung: text.slice(0, 120),
      abschnitte: [{ ueberschrift: "Ergebnis", inhalt: text, typ: "info" }],
      aktionen: [],
    };
  }
  // TS-safe fallback header
  if (!parsed.abschnitte?.length) {
    parsed.abschnitte = [{ ueberschrift: "Ergebnis", inhalt: text, typ: "info" }];
  }
  return NextResponse.json(parsed);
}

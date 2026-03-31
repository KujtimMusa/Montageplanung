import { generateText } from "ai";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { istKiKonfiguriert, kiModell } from "@/lib/agents/ki-client";
import type { KiStrukturierteAgentAntwort } from "@/types/ki-actions";
import { getMyOrgId } from "@/lib/org";

/** Planungsoptimierer — Text-Stream */
export async function POST(request: Request) {
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

  const body = (await request.json().catch(() => ({}))) as {
    projektId?: string;
    datum?: string;
  };

  const [{ data: ma }, { data: zu }] = await Promise.all([
    supabase
      .from("employees")
      .select("id,name,department_id,active,qualifikationen")
      .eq("organization_id", orgId)
      .eq("active", true),
    supabase
      .from("assignments")
      .select("employee_id,date,start_time,end_time, projects(title)")
      .eq("organization_id", orgId)
      .limit(300),
  ]);

  if (!istKiKonfiguriert()) {
    return new Response(
      JSON.stringify({
        nachricht:
          "Gemini nicht konfiguriert — Vorschlag: passende Monteure nach Abteilung filtern, freie Slots in der Planung prüfen.",
        daten: { mitarbeiter: ma ?? [], einsaetze: zu ?? [], hinweis: body },
      }),
      { status: 503, headers: { "Content-Type": "application/json" } }
    );
  }

  const systemPrompt = `Du bist Planungsassistent für einen Handwerksbetrieb.
Antworte AUSSCHLIESSLICH als valides JSON:
{
  "titel": "Planungsvorschlag",
  "zusammenfassung": "X Einsätze vorgeschlagen",
  "abschnitte": [
    {
      "ueberschrift": "Projekt: [Name]",
      "inhalt": "Markdown: empfohlene Mitarbeiter, Begründung",
      "typ": "info"
    }
  ],
  "aktionen": [
    {
      "typ": "einsatz_erstellen",
      "label": "Einplanen: [Mitarbeiter] → [Projekt] am [Datum]",
      "payload": {
        "employee_id": "echte-id",
        "project_id": "echte-id",
        "project_title": "...",
        "date": "YYYY-MM-DD",
        "start_time": "07:00",
        "end_time": "16:00"
      },
      "risiko": "niedrig"
    }
  ]
}
Nutze NUR echte IDs aus den mitgelieferten Daten.`;

  const userPrompt = `Mitarbeiter:\n${JSON.stringify(ma ?? [])}\n\nEinsätze (Stichprobe):\n${JSON.stringify(zu ?? [])}\n\nAnfrage-Parameter:\n${JSON.stringify(body)}`;
  const { text } = await generateText({
    model: kiModell,
    system: systemPrompt,
    prompt: userPrompt,
  });
  let parsed: KiStrukturierteAgentAntwort;
  try {
    parsed = JSON.parse(text) as KiStrukturierteAgentAntwort;
  } catch {
    parsed = {
      titel: "Planungsvorschlag",
      zusammenfassung: text.slice(0, 120),
      abschnitte: [{ ueberschrift: "Ergebnis", inhalt: text, typ: "info" }],
      aktionen: [],
    };
  }
  return NextResponse.json(parsed);
}

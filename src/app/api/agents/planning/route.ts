import { streamText } from "ai";
import { createClient } from "@/lib/supabase/server";
import { istKiKonfiguriert, kiModell } from "@/lib/agents/ki-client";

/** Planungsoptimierer — Text-Stream */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    projektId?: string;
    datum?: string;
  };

  const [{ data: ma }, { data: zu }] = await Promise.all([
    supabase
      .from("employees")
      .select("id,name,department_id,active,qualifikationen")
      .eq("active", true),
    supabase
      .from("assignments")
      .select("employee_id,date,start_time,end_time, projects(title)")
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

  const result = streamText({
    model: kiModell,
    system:
      "Du bist Planungsassistent für einen Handwerksbetrieb. Schlage eine sinnvolle Teamzusammenstellung und Reihenfolge vor. Antworte auf Deutsch, stichpunktartig, ohne Markdown-Codeblöcke.",
    prompt: `Mitarbeiter:\n${JSON.stringify(ma ?? [])}\n\nEinsätze (Stichprobe):\n${JSON.stringify(zu ?? [])}\n\nAnfrage-Parameter:\n${JSON.stringify(body)}`,
  });

  return result.toTextStreamResponse();
}

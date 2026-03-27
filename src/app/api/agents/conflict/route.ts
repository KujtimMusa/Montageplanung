import { streamText } from "ai";
import { createClient } from "@/lib/supabase/server";
import { istKiKonfiguriert, kiModell } from "@/lib/agents/ki-client";

/** Konflikt-Resolver — Text-Stream */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { data: zu, error } = await supabase
    .from("assignments")
    .select("id,employee_id,date,start_time,end_time, projects(title)")
    .limit(500);

  if (error) {
    return new Response(JSON.stringify({ fehler: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!istKiKonfiguriert()) {
    return new Response(
      JSON.stringify({
        analyse:
          "KI nicht aktiv. Bitte Überschneidungen in der Planungsansicht und bei der Buchung prüfen.",
        rohdatenAnzahl: zu?.length ?? 0,
      }),
      { status: 503, headers: { "Content-Type": "application/json" } }
    );
  }

  const result = streamText({
    model: kiModell,
    system:
      "Du prüfst Einsatzpläne auf Risiken, Überschneidungen und Engpässe. Antworte auf Deutsch, strukturiert.",
    prompt: `Einsätze:\n${JSON.stringify(zu ?? [])}`,
  });

  return result.toTextStreamResponse();
}

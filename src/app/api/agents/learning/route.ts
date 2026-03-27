import { streamText } from "ai";
import { createClient } from "@/lib/supabase/server";
import { istKiKonfiguriert, kiModell } from "@/lib/agents/ki-client";

/**
 * Lern-/Auswertungs-Agent — Text-Stream.
 * POST { "frage"?: string }
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as { frage?: string };
  const frage = (body.frage ?? "").trim();

  const [{ data: logs }, { data: ma }, { data: pr }] = await Promise.all([
    supabase
      .from("agent_log")
      .select("id,agent_type,trigger_event,success,created_at")
      .order("created_at", { ascending: false })
      .limit(40),
    supabase.from("employees").select("id,name,role,active").limit(80),
    supabase.from("projects").select("id,title,status,priority").limit(50),
  ]);

  const logStichprobe = logs ?? [];

  const kontext = [
    "Du bist ein Lern- und Auswertungsassistent für Monteurplanung.",
    "Antworte auf Deutsch, strukturiert und sachlich.",
    "Letzte Agent-Log-Einträge (Stichprobe):",
    JSON.stringify(logStichprobe),
    "Mitarbeiter (Stichprobe):",
    JSON.stringify(ma ?? []),
    "Projekte (Stichprobe):",
    JSON.stringify(pr ?? []),
    frage
      ? `Konkrete Nutzerfrage:\n${frage}`
      : "Gib eine sehr kurze Einschätzung: Was lässt sich aus den Log-Daten ableiten? Welche nächsten Schritte wären sinnvoll?",
  ].join("\n\n");

  if (!istKiKonfiguriert()) {
    return new Response(
      JSON.stringify({
        antwort:
          "KI ist nicht konfiguriert (GEMINI_API_KEY fehlt). Rohdaten: " +
          `${logStichprobe.length} Log-Zeilen, ${(ma ?? []).length} Mitarbeiter, ${(pr ?? []).length} Projekte (Stichproben).`,
        meta: { logZeilen: logStichprobe.length, gemini: false },
      }),
      { status: 503, headers: { "Content-Type": "application/json" } }
    );
  }

  const result = streamText({
    model: kiModell,
    system:
      "Du wertest Planungs- und Agentendaten aus. Keine erfundenen Fakten — nur aus den JSON-Daten schließen.",
    prompt: kontext,
  });

  return result.toTextStreamResponse();
}

import { generateText } from "ai";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { istKiKonfiguriert, kiModell } from "@/lib/agents/ki-client";
import type { KiStrukturierteAgentAntwort } from "@/types/ki-actions";
import { getMyOrgId } from "@/lib/org";

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
  const orgId = await getMyOrgId();
  if (!orgId) {
    return new Response("Keine Org", { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as { frage?: string };
  const frage = (body.frage ?? "").trim();

  const [{ data: logs }, { data: ma }, { data: pr }] = await Promise.all([
    supabase
      .from("agent_log")
      .select("id,agent_type,trigger_event,success,created_at")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false })
      .limit(40),
    supabase
      .from("employees")
      .select("id,name,role,active")
      .eq("organization_id", orgId)
      .limit(80),
    supabase
      .from("projects")
      .select("id,title,status,priority")
      .eq("organization_id", orgId)
      .limit(50),
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

  const systemPrompt = `Du analysierst vergangene Planungsdaten und
lernst daraus Optimierungsmuster.
Antworte AUSSCHLIESSLICH als valides JSON:
{
  "titel": "Optimierungshinweise",
  "zusammenfassung": "X Hinweise aus [N] analysierten Einsätzen",
  "abschnitte": [
    {
      "ueberschrift": "Muster: [Beschreibung]",
      "inhalt": "Markdown: Beobachtung, Häufigkeit, Empfehlung",
      "typ": "info|warnung"
    }
  ],
  "aktionen": []
}`;
  const { text } = await generateText({
    model: kiModell,
    system: systemPrompt,
    prompt: kontext,
  });
  let parsed: KiStrukturierteAgentAntwort;
  try {
    parsed = JSON.parse(text) as KiStrukturierteAgentAntwort;
  } catch {
    parsed = {
      titel: "Optimierungshinweise",
      zusammenfassung: text.slice(0, 120),
      abschnitte: [{ ueberschrift: "Ergebnis", inhalt: text, typ: "info" }],
      aktionen: [],
    };
  }
  return NextResponse.json(parsed);
}

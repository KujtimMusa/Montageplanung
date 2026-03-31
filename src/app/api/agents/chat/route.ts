import { convertToModelMessages, streamText, type UIMessage } from "ai";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { istKiKonfiguriert, kiModell } from "@/lib/agents/ki-client";

let kontextCache: {
  kontext: string;
  stats: { ma: number; pr: number; zu: number; abw: number };
  ts: number;
} | null = null;
const CACHE_TTL = 60_000;

async function kontextLaden(supabase: SupabaseClient) {
  const now = Date.now();
  if (kontextCache && now - kontextCache.ts < CACHE_TTL) {
    return kontextCache;
  }

  const heute = new Date().toISOString().slice(0, 10);

  const [
    { data: ma },
    { data: pr },
    { data: zu },
    { data: abw },
    { data: heuteZu },
    { data: einsaetze },
    { data: projekteOffen },
    { data: abwesenheiten },
  ] = await Promise.all([
    supabase
      .from("employees")
      .select("id,name,role,active,department_id")
      .eq("active", true)
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
    supabase
      .from("assignments")
      .select(
        "id,date,start_time,end_time,project_title, projects(title), teams(name)"
      )
      .gte("date", heute)
      .order("date", { ascending: true })
      .limit(50),
    supabase
      .from("projects")
      .select("title,status,priority")
      .neq("status", "abgeschlossen")
      .limit(20),
    supabase
      .from("absences")
      .select(
        "type,start_date,end_date,employee:employees!employee_id(name)"
      )
      .gte("end_date", heute)
      .limit(20),
  ]);

  const kontext = [
    "WICHTIG — ANTWORTFORMAT:",
    "Wenn du Listen von Mitarbeitern, Einsätzen oder Projekten",
    "zurückgibst, formatiere sie als Markdown-Tabelle.",
    "Wenn du eine Warnung oder einen Konflikt erkennst,",
    "beginne deine Antwort mit '⚠️ WARNUNG:'",
    "Wenn du eine Empfehlung gibst, beginne mit '💡 EMPFEHLUNG:'",
    "Wenn du eine Aktion ausführen könntest, beginne mit '⚡ AKTION:'",
    "Halte Antworten kurz und präzise — max 150 Wörter.",
    "Kein Markdown-Code-Fences (kein ```).",
    "",
    `Heutiges Datum (ISO): ${heute}`,
    `Lokales Datum: ${new Date().toLocaleDateString("de-DE")}`,
    "Du bist der KI-Assistent für einen Handwerksbetrieb (Einsatzplanung).",
    "Antworte auf Deutsch, präzise und praxisorientiert.",
    "Nutze nur die mitgelieferten Daten; keine erfundenen Namen oder Termine.",
    "Bei Planungsfragen: konkrete Namen, Daten und Empfehlungen nennen.",
    "",
    "AKTIVE MITARBEITER (Auszug):",
    JSON.stringify(ma ?? []),
    "",
    "PROJEKTE (Auszug):",
    JSON.stringify(pr ?? []),
    "",
    "EINSÄTZE (Auszug):",
    JSON.stringify(zu ?? []),
    "",
    "ABWESENHEITEN:",
    JSON.stringify(abw ?? []),
    "",
    "EINSÄTZE NUR HEUTE:",
    JSON.stringify(heuteZu ?? []),
    "",
    "KOMMENDE EINSÄTZE (mit Projekt/Team, ab heute):",
    JSON.stringify(einsaetze ?? []),
    "",
    "OFFENE PROJEKTE (nicht abgeschlossen, Stichprobe):",
    JSON.stringify(projekteOffen ?? []),
    "",
    "ABWESENHEITEN (mit Name, endet nicht vor heute):",
    JSON.stringify(abwesenheiten ?? []),
  ].join("\n");

  const result = {
    kontext,
    stats: {
      ma: ma?.length ?? 0,
      pr: pr?.length ?? 0,
      zu: zu?.length ?? 0,
      abw: abw?.length ?? 0,
    },
    ts: now,
  };
  kontextCache = result;
  return result;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const raw = (await request.json()) as {
    messages?: UIMessage[];
    message?: string;
  };

  const legacy =
    typeof raw.message === "string" &&
    raw.message.trim().length > 0 &&
    (!raw.messages || raw.messages.length === 0);

  const reqUrl = new URL(request.url);
  if (reqUrl.searchParams.get("noCache") === "1") {
    kontextCache = null;
  }

  const { kontext, stats } = await kontextLaden(supabase);

  if (!istKiKonfiguriert()) {
    return new Response(
      JSON.stringify({
        error:
          "KI nicht konfiguriert — bitte GEMINI_API_KEY setzen. Datenüberblick ohne KI: " +
          `${stats.ma} Mitarbeiter, ${stats.pr} Projekte, ${stats.zu} Einsätze (Stichprobe), ${stats.abw} Abwesenheiten.`,
        antwort:
          "KI nicht konfiguriert — bitte GEMINI_API_KEY setzen. Datenüberblick ohne KI: " +
          `${stats.ma} Mitarbeiter, ${stats.pr} Projekte, ${stats.zu} Einsätze (Stichprobe), ${stats.abw} Abwesenheiten.`,
      }),
      { status: 503, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    if (legacy) {
      const result = streamText({
        model: kiModell,
        system: kontext,
        prompt: raw.message!.trim(),
      });
      return result.toTextStreamResponse();
    }

    const messages = raw.messages;
    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: "messages required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const modelMessages = await convertToModelMessages(messages);
    const result = streamText({
      model: kiModell,
      system: kontext,
      messages: modelMessages,
    });
    return result.toUIMessageStreamResponse();
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unbekannter Fehler.";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

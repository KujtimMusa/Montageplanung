import { generateText } from "ai";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { istKiKonfiguriert, kiModell } from "@/lib/agents/ki-client";
import type { KiStrukturierteAgentAntwort } from "@/types/ki-actions";
import { logFehler } from "@/lib/logger";
import { getMyOrgId } from "@/lib/org";

/** Konflikt-Resolver — Text-Stream */
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

  const { data: zu, error } = await supabase
    .from("assignments")
    .select("id,employee_id,date,start_time,end_time, projects(title)")
    .eq("organization_id", orgId)
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

  const systemPrompt = `Du analysierst Einsatzpläne auf Konflikte.
Antworte AUSSCHLIESSLICH als valides JSON:
{
  "titel": "Konflikt-Analyse",
  "zusammenfassung": "X Konflikte gefunden",
  "abschnitte": [
    {
      "ueberschrift": "Name des Konflikts",
      "inhalt": "Markdown: wer, wann, warum Konflikt",
      "typ": "kritisch|warnung|info"
    }
  ],
  "aktionen": [
    {
      "typ": "einsatz_loeschen",
      "label": "Konflikt lösen: [Beschreibung]",
      "payload": { "assignment_id": "echte-id-aus-den-daten" },
      "risiko": "mittel"
    }
  ]
}
Nur echte Konflikte — keine Halluzinationen.
Nutze die echten IDs aus den mitgelieferten Daten.`;
  const { text } = await generateText({
    model: kiModell,
    system: systemPrompt,
    prompt: `Einsätze:\n${JSON.stringify(zu ?? [])}`,
  });
  let parsed: KiStrukturierteAgentAntwort;
  try {
    parsed = JSON.parse(text) as KiStrukturierteAgentAntwort;
  } catch {
    parsed = {
      titel: "Konflikt-Analyse",
      zusammenfassung: text.slice(0, 120),
      abschnitte: [{ ueberschrift: "Ergebnis", inhalt: text, typ: "info" }],
      aktionen: [],
    };
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (
    appUrl &&
    parsed.abschnitte?.some(
      (a) => a.typ === "kritisch" || a.typ === "warnung"
    )
  ) {
    const konflikte = parsed.abschnitte
      .filter((a) => a.typ === "kritisch" || a.typ === "warnung")
      .map((a) => ({
        mitarbeiter: a.ueberschrift,
        projekt: "",
        datum: new Date().toLocaleDateString("de-DE"),
        beschreibung: a.inhalt.slice(0, 100),
      }));

    void fetch(`${appUrl}/api/notifications/koordinatoren`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        typ: "konflikt",
        payload: {
          anzahl_konflikte: konflikte.length,
          konflikte,
        },
      }),
    }).catch((e) => logFehler("agent:koordinatoren-notify", e));
  }
  return NextResponse.json(parsed);
}

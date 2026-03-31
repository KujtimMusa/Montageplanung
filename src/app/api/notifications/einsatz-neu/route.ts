import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Body = {
  teamId?: string;
  projektName?: string;
  datum?: string;
  ort?: string;
};

/**
 * Benachrichtigung nach neuem Einsatz (WhatsApp) — Fehler blockieren den Aufrufer nicht.
 */
export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, error: "Ungültiger JSON-Body" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Nicht angemeldet" }, { status: 401 });
  }

  const { data: rows } = await supabase
    .from("settings")
    .select("key, value")
    .in("key", ["whatsapp_enabled"]);

  const map = Object.fromEntries((rows ?? []).map((r) => [r.key, r.value ?? ""]));

  const whatsappOn = map.whatsapp_enabled === "true";

  const text = [
    "Neuer Einsatz",
    body.projektName ? `Projekt: ${body.projektName}` : null,
    body.datum ? `Datum: ${body.datum}` : null,
    body.ort ? `Ort: ${body.ort}` : null,
    body.teamId ? `Team-ID: ${body.teamId}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    if (whatsappOn) {
      const sid = process.env.TWILIO_ACCOUNT_SID?.trim();
      if (!sid) {
        console.info("[einsatz-neu] Twilio: kein TWILIO_ACCOUNT_SID — Stub, kein Versand.");
      } else {
        console.info("[einsatz-neu] Twilio-Versand (Stub):", text.slice(0, 200));
      }
    }

  } catch (e) {
    console.warn("[einsatz-neu] Benachrichtigung:", e);
  }

  return NextResponse.json({ ok: true });
}

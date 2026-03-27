import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@/lib/supabase/server";

type Provider = "twilio" | "teams" | "resend" | "gemini";

async function loadSettingsMap(
  supabase: Awaited<ReturnType<typeof createClient>>,
  keys: string[]
): Promise<Record<string, string | null>> {
  const { data } = await supabase.from("settings").select("key,value").in("key", keys);
  return Object.fromEntries((data ?? []).map((r) => [r.key as string, r.value ?? null]));
}

/**
 * POST { provider: 'twilio' | 'teams' | 'resend' | 'gemini' }
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { success: false, message: "Nicht angemeldet" },
      { status: 401 }
    );
  }

  let body: { provider?: string };
  try {
    body = (await request.json()) as { provider?: string };
  } catch {
    return NextResponse.json(
      { success: false, message: "Ungültiger JSON-Body" },
      { status: 400 }
    );
  }

  const provider = body.provider as Provider | undefined;
  if (!provider || !["twilio", "teams", "resend", "gemini"].includes(provider)) {
    return NextResponse.json(
      { success: false, message: "Unbekannter provider" },
      { status: 400 }
    );
  }

  try {
    if (provider === "twilio") {
      const s = await loadSettingsMap(supabase, [
        "twilio_account_sid",
        "twilio_auth_token",
        "twilio_from_number",
      ]);
      const sid = s.twilio_account_sid?.trim() || process.env.TWILIO_ACCOUNT_SID?.trim();
      const token =
        s.twilio_auth_token?.trim() || process.env.TWILIO_AUTH_TOKEN?.trim();
      const from =
        s.twilio_from_number?.trim() || process.env.TWILIO_FROM_NUMBER?.trim();
      if (!sid || !token || !from) {
        return NextResponse.json({
          success: false,
          message: "Twilio: Account SID, Auth Token und From-Nummer erforderlich.",
        });
      }
      const auth = Buffer.from(`${sid}:${token}`).toString("base64");
      const bodyParams = new URLSearchParams({
        To: from,
        From: from,
        Body: "Test Monteurplanung — Verbindung OK",
      });
      const res = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
        {
          method: "POST",
          headers: {
            Authorization: `Basic ${auth}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: bodyParams,
        }
      );
      if (!res.ok) {
        const errText = await res.text();
        return NextResponse.json({
          success: false,
          message: `Twilio: ${res.status} ${errText.slice(0, 200)}`,
        });
      }
      return NextResponse.json({
        success: true,
        message: "Test-Nachricht über Twilio gesendet.",
      });
    }

    if (provider === "teams") {
      const s = await loadSettingsMap(supabase, ["teams_webhook_url", "teams_enabled"]);
      const url =
        s.teams_webhook_url?.trim() || process.env.TEAMS_WEBHOOK_URL?.trim();
      if (!url) {
        return NextResponse.json({
          success: false,
          message: "Teams: Webhook-URL fehlt.",
        });
      }
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: "Test Monteurplanung — Verbindung OK",
        }),
      });
      if (!res.ok) {
        return NextResponse.json({
          success: false,
          message: `Teams Webhook: HTTP ${res.status}`,
        });
      }
      return NextResponse.json({
        success: true,
        message: "Test-Nachricht an Teams gesendet.",
      });
    }

    if (provider === "resend") {
      const s = await loadSettingsMap(supabase, ["resend_api_key", "resend_from_email"]);
      const apiKey = s.resend_api_key?.trim() || process.env.RESEND_API_KEY?.trim();
      const from =
        s.resend_from_email?.trim() || process.env.RESEND_FROM_EMAIL?.trim();
      if (!apiKey || !from) {
        return NextResponse.json({
          success: false,
          message: "Resend: API-Key und Absender-E-Mail erforderlich.",
        });
      }
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          to: [from],
          subject: "Test Monteurplanung",
          text: "Verbindung OK",
        }),
      });
      const j = (await res.json().catch(() => ({}))) as { message?: string };
      if (!res.ok) {
        return NextResponse.json({
          success: false,
          message: j.message ?? `Resend: HTTP ${res.status}`,
        });
      }
      return NextResponse.json({
        success: true,
        message: "Test-E-Mail über Resend gesendet.",
      });
    }

    if (provider === "gemini") {
      const s = await loadSettingsMap(supabase, ["gemini_api_key"]);
      const apiKey = s.gemini_api_key?.trim() || process.env.GEMINI_API_KEY?.trim();
      if (!apiKey) {
        return NextResponse.json({
          success: false,
          message: "Gemini: API-Key fehlt.",
        });
      }
      const modelId = process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash";
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: modelId });
      const result = await model.generateContent("Antworte mit OK");
      const text = result.response.text();
      if (!text?.toLowerCase().includes("ok")) {
        return NextResponse.json({
          success: true,
          message: `Antwort erhalten: ${text.slice(0, 120)}`,
        });
      }
      return NextResponse.json({
        success: true,
        message: "Gemini hat geantwortet — Verbindung OK.",
      });
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unbekannter Fehler";
    return NextResponse.json({ success: false, message: msg });
  }

  return NextResponse.json({ success: false, message: "Interner Fehler" });
}

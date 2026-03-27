import { NextResponse } from "next/server";

export async function POST() {
  if (!process.env.TWILIO_ACCOUNT_SID?.trim()) {
    return NextResponse.json({
      uebersprungen: true,
      nachricht:
        "WhatsApp/Twilio nicht konfiguriert (TWILIO_ACCOUNT_SID fehlt).",
    });
  }

  return NextResponse.json({
    nachricht: "Benachrichtigung: Platzhalter — Twilio-Integration folgt.",
  });
}

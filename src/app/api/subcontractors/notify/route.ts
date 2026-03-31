import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-check";

export async function POST() {
  const { error } = await requireAuth();
  if (error) return error;
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

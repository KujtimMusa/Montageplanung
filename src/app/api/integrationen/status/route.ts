import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-check";

/**
 * Liefert, ob serverseitig WhatsApp/Twilio konfiguriert ist (ohne Secrets).
 */
export async function GET() {
  const { error } = await requireAuth();
  if (error) return error;
  return NextResponse.json({
    whatsapp: Boolean(process.env.TWILIO_ACCOUNT_SID?.trim()),
  });
}

import { NextResponse } from "next/server";

/**
 * Liefert, ob Server-seitig Outlook/Twilio konfiguriert sind (ohne Secrets).
 */
export async function GET() {
  return NextResponse.json({
    outlook: Boolean(process.env.AZURE_CLIENT_ID?.trim()),
    whatsapp: Boolean(process.env.TWILIO_ACCOUNT_SID?.trim()),
  });
}

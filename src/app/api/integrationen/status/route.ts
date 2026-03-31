import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-check";

/**
 * Liefert, ob Server-seitig Outlook/Twilio konfiguriert sind (ohne Secrets).
 */
export async function GET() {
  const { error } = await requireAuth();
  if (error) return error;
  return NextResponse.json({
    outlook: Boolean(process.env.AZURE_CLIENT_ID?.trim()),
    whatsapp: Boolean(process.env.TWILIO_ACCOUNT_SID?.trim()),
  });
}

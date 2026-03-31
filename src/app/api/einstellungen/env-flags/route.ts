import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Liefert nur Booleans, welche Server-Umgebungsvariablen gesetzt sind (keine Werte).
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  }

  return NextResponse.json({
    gemini_api_key: Boolean(process.env.GEMINI_API_KEY?.trim()),
    twilio_account_sid: Boolean(process.env.TWILIO_ACCOUNT_SID?.trim()),
    twilio_auth_token: Boolean(process.env.TWILIO_AUTH_TOKEN?.trim()),
    twilio_from_number: Boolean(process.env.TWILIO_FROM_NUMBER?.trim()),
    resend_api_key: Boolean(process.env.RESEND_API_KEY?.trim()),
    resend_from_email: Boolean(process.env.RESEND_FROM_EMAIL?.trim()),
  });
}

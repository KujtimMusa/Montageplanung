import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-check";

export async function POST() {
  const { error } = await requireAuth();
  if (error) return error;
  return NextResponse.json({
    uebersprungen: true,
    nachricht:
      "Teams-Benachrichtigung: Platzhalter — Anbindung an Microsoft Graph / Webhook folgt.",
  });
}

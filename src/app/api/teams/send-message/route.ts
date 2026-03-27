import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({
    uebersprungen: true,
    nachricht:
      "Teams-Benachrichtigung: Platzhalter — Anbindung an Microsoft Graph / Webhook folgt.",
  });
}

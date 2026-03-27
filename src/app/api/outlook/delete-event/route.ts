import { NextResponse } from "next/server";

export async function POST() {
  if (!process.env.AZURE_CLIENT_ID?.trim()) {
    return NextResponse.json({
      uebersprungen: true,
      nachricht: "Azure nicht konfiguriert.",
    });
  }
  return NextResponse.json({ nachricht: "Delete-Event — Platzhalter." });
}

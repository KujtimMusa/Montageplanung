import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-check";

export async function POST() {
  const { error } = await requireAuth();
  if (error) return error;
  if (!process.env.AZURE_CLIENT_ID?.trim()) {
    return NextResponse.json({
      uebersprungen: true,
      nachricht: "Azure nicht konfiguriert.",
    });
  }
  return NextResponse.json({ nachricht: "Delete-Event — Platzhalter." });
}

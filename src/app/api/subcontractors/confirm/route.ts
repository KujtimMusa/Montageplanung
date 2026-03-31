import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-check";

export async function POST() {
  const { error } = await requireAuth();
  if (error) return error;
  return NextResponse.json({ nachricht: "Dienstleister JA — Phase 6." }, { status: 501 });
}

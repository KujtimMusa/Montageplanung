import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({ nachricht: "WhatsApp Notify — Phase 6." }, { status: 501 });
}

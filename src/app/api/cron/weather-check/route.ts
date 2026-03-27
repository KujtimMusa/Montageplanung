import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ nachricht: "Cron Wetter — Phase 5." }, { status: 501 });
}

import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ nachricht: "Cron Wochenbericht — Phase 7." }, { status: 501 });
}

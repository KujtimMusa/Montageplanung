import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({ nachricht: "Wetter-Agent — Phase 7." }, { status: 501 });
}

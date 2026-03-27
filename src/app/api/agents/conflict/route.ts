import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { nachricht: "Konflikt-Agent — Phase 7." },
    { status: 501 }
  );
}

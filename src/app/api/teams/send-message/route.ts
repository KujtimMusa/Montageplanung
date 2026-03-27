import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({ nachricht: "Teams — Phase 4." }, { status: 501 });
}

import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({ nachricht: "Outlook — Phase 4." }, { status: 501 });
}

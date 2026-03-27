import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({ nachricht: "Chatbot — Phase 7." }, { status: 501 });
}

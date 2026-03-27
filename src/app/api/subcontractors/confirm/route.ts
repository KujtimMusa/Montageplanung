import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({ nachricht: "Dienstleister JA — Phase 6." }, { status: 501 });
}

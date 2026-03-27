import { NextResponse } from "next/server";

/** Planungsassistent API — Phase 7 */
export async function POST() {
  return NextResponse.json(
    { nachricht: "Noch nicht angebunden — Phase 7 (Gemini)." },
    { status: 501 }
  );
}

import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ nachricht: "Cron Erinnerungen — später." }, { status: 501 });
}

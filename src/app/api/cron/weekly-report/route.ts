import { NextResponse } from "next/server";

/**
 * Montags 7:00 — Platzhalter für Wochenbericht (E-Mail / Teams später).
 */
export async function GET(request: Request) {
  if (!process.env.CRON_SECRET?.trim()) {
    return NextResponse.json({ error: "CRON_SECRET fehlt" }, { status: 500 });
  }
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json(
      { fehler: "Nicht autorisiert." },
      { status: 401 }
    );
  }

  return NextResponse.json({
    nachricht:
      "Wochenbericht: noch nicht angebunden — Agent kann später GEMINI + Datenquellen nutzen.",
    zeit: new Date().toISOString(),
  });
}

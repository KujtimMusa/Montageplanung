import { NextResponse } from "next/server";

export async function POST() {
  if (!process.env.AZURE_CLIENT_ID?.trim()) {
    return NextResponse.json({
      uebersprungen: true,
      nachricht:
        "Microsoft Outlook ist nicht konfiguriert (AZURE_CLIENT_ID fehlt).",
    });
  }

  return NextResponse.json({
    nachricht:
      "Kalender-Sync: Platzhalter — echte Graph-Anbindung folgt bei gesetzten Azure-Variablen.",
  });
}

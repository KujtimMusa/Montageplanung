import { NextResponse } from "next/server";
import {
  istGueltigeTokenZeichenfolge,
  resolveToken,
} from "@/lib/pwa/token-resolver";

export async function GET(
  _request: Request,
  context: { params: Promise<{ token: string }> }
) {
  const { token } = await context.params;

  if (!istGueltigeTokenZeichenfolge(token)) {
    return NextResponse.json({ error: "Ungültig" }, { status: 404 });
  }

  const resolved = await resolveToken(token);
  if (!resolved || resolved.role !== "customer") {
    return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });
  }

  const body = {
    name: resolved.orgName || "Projektstatus",
    short_name: "Projekt",
    start_url: `/k/${token}`,
    scope: `/k/${token}/`,
    display: "standalone" as const,
    orientation: "portrait-primary" as const,
    background_color: "#020617",
    theme_color: "#01696f",
    launch_handler: {
      client_mode: "navigate-existing" as const,
    },
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable any",
      },
    ],
  };

  return NextResponse.json(body, {
    headers: {
      "Content-Type": "application/manifest+json; charset=utf-8",
      "Cache-Control": "private, max-age=60",
    },
  });
}

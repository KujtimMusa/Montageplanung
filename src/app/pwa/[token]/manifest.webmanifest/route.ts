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
  if (!resolved || resolved.role !== "coordinator") {
    return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });
  }

  const shortName =
    resolved.employeeName.split(/\s+/)[0]?.trim() || "Vlerafy";

  const body = {
    name: resolved.orgName || "Vlerafy",
    short_name: shortName,
    start_url: `/pwa/${token}/dashboard`,
    scope: `/pwa/${token}/`,
    display: "standalone" as const,
    orientation: "portrait-primary" as const,
    background_color: "#0f172a",
    theme_color: "#01696f",
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

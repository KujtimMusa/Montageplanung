import type { Metadata } from "next";
import {
  istGueltigeTokenZeichenfolge,
  resolveToken,
} from "@/lib/pwa/token-resolver";
import { KundenPortalClient } from "@/components/pwa/KundenPortalClient";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await params;
  if (!istGueltigeTokenZeichenfolge(token)) {
    return { title: "Kundenportal" };
  }
  return {
    title: "Projektstatus",
    manifest: `/k/${token}/manifest.webmanifest`,
    themeColor: "#01696f",
    appleWebApp: { capable: true, title: "Projektstatus" },
  };
}

export default async function KundenPortalPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!istGueltigeTokenZeichenfolge(token)) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-slate-950 px-4 text-center">
        <h1 className="text-lg font-semibold text-slate-100">Ungültiger Link</h1>
        <p className="mt-2 text-sm text-slate-500">Der angeforderte Zugang ist ungültig.</p>
      </div>
    );
  }

  const resolved = await resolveToken(token);
  if (!resolved) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-slate-950 px-4 text-center">
        <h1 className="text-lg font-semibold text-slate-100">Ungültiger Link</h1>
        <p className="mt-2 text-sm text-slate-500">Dieser Link ist ungültig oder abgelaufen.</p>
      </div>
    );
  }

  if (resolved.role !== "customer") {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-slate-950 px-4 text-center">
        <h1 className="text-lg font-semibold text-slate-100">Falscher Zugangslink</h1>
        <p className="mt-2 max-w-sm text-sm text-slate-500">
          Dieser Bereich ist nur für Kunden. Bitte den Monteur-Link nutzen.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-slate-950 pb-8 text-slate-100">
      <KundenPortalClient token={token} />
    </div>
  );
}

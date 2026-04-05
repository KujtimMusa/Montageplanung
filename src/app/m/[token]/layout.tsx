import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  istGueltigeTokenZeichenfolge,
  resolveToken,
} from "@/lib/pwa/token-resolver";
import { PwaMonteurProvider } from "@/lib/pwa/monteur-context";
import { PwaMonteurShell } from "@/components/pwa/PwaMonteurShell";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await params;
  return {
    manifest: `/m/${token}/manifest.webmanifest`,
  };
}

export default async function PwaMonteurLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!istGueltigeTokenZeichenfolge(token)) {
    notFound();
  }

  const resolved = await resolveToken(token);
  if (!resolved || resolved.role === "customer") {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-zinc-950 px-4 text-center">
        <h1 className="text-lg font-semibold text-zinc-100">Ungültiger Zugang</h1>
        <p className="mt-2 max-w-sm text-sm text-zinc-500">
          {resolved?.role === "customer"
            ? "Dieser Link ist für das Kundenportal. Bitte den Kunden-Link verwenden."
            : "Dieser Monteur-Link ist ungültig oder abgelaufen."}
        </p>
      </div>
    );
  }

  return (
    <PwaMonteurProvider token={token} resolved={resolved}>
      <PwaMonteurShell token={token}>{children}</PwaMonteurShell>
    </PwaMonteurProvider>
  );
}

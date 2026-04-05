import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
  istGueltigeTokenZeichenfolge,
  resolveToken,
} from "@/lib/pwa/token-resolver";
import { KoordinatorPwaProvider } from "@/lib/pwa/koordinator-context";
import { KoordinatorPwaShell } from "@/components/pwa/KoordinatorPwaShell";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await params;
  return {
    manifest: `/pwa/${token}/manifest.webmanifest`,
  };
}

export default async function KoordinatorPwaLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!istGueltigeTokenZeichenfolge(token)) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-zinc-950 px-4 text-center">
        <h1 className="text-lg font-semibold text-zinc-100">Ungültiger Zugang</h1>
        <p className="mt-2 text-sm text-zinc-500">Der Link ist ungültig.</p>
      </div>
    );
  }

  const resolved = await resolveToken(token);
  if (!resolved) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-zinc-950 px-4 text-center">
        <h1 className="text-lg font-semibold text-zinc-100">Link ungültig</h1>
        <p className="mt-2 max-w-sm text-sm text-zinc-500">
          Dieser Link ist abgelaufen oder ungültig.
        </p>
      </div>
    );
  }

  if (resolved.role === "customer") {
    redirect(`/k/${token}`);
  }

  if (resolved.role === "worker") {
    redirect(`/m/${token}/projekte`);
  }

  if (resolved.role !== "coordinator") {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-zinc-950 px-4 text-center">
        <h1 className="text-lg font-semibold text-zinc-100">Kein Zugriff</h1>
        <p className="mt-2 text-sm text-zinc-500">Unerwartete Rolle.</p>
      </div>
    );
  }

  return (
    <KoordinatorPwaProvider token={token} resolved={resolved}>
      <KoordinatorPwaShell token={token}>{children}</KoordinatorPwaShell>
    </KoordinatorPwaProvider>
  );
}

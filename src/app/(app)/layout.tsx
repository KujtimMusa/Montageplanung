import { AppShell } from "@/components/layout/AppShell";

export const dynamic = "force-dynamic";

export default async function AppBereichLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="dark min-h-dvh bg-zinc-950 text-zinc-100">
      <AppShell>{children}</AppShell>
    </div>
  );
}

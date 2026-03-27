"use client";

import { BottomNav } from "@/components/layout/BottomNav";
import { Sidebar } from "@/components/layout/Sidebar";

type AppShellProps = {
  children: React.ReactNode;
};

/**
 * Responsives App-Layout: Sidebar (Desktop), BottomNav (Mobil).
 */
export function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex min-h-dvh w-full bg-zinc-950">
      <Sidebar />
      <div className="flex min-h-dvh flex-1 flex-col">
        <main className="flex-1 overflow-x-hidden bg-zinc-950 px-4 pb-24 pt-4 md:px-8 md:pb-8 md:pt-8">
          {children}
        </main>
      </div>
      <BottomNav />
    </div>
  );
}

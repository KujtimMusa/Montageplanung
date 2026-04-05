"use client";

import type { ReactNode } from "react";
import { PwaBottomNav } from "@/components/pwa/PwaBottomNav";

export function PwaMonteurShell({
  token,
  children,
}: {
  token: string;
  children: ReactNode;
}) {
  return (
    <div className="pwa-shell min-h-dvh bg-zinc-950 text-zinc-100">
      <div className="mx-auto max-w-lg pb-2">{children}</div>
      <PwaBottomNav token={token} />
    </div>
  );
}

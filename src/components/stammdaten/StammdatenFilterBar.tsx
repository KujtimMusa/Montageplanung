import type { ReactNode } from "react";

export function StammdatenFilterBar({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-3 rounded-xl border border-zinc-800/70 bg-zinc-900/25 p-4 sm:grid-cols-2 lg:grid-cols-4">
      {children}
    </div>
  );
}

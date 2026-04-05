"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { ResolvedEmployee } from "@/lib/pwa/token-resolver";

type Wert = {
  token: string;
  resolved: ResolvedEmployee;
};

const KoordinatorPwaKontext = createContext<Wert | null>(null);

export function KoordinatorPwaProvider({
  token,
  resolved,
  children,
}: {
  token: string;
  resolved: ResolvedEmployee;
  children: ReactNode;
}) {
  return (
    <KoordinatorPwaKontext.Provider value={{ token, resolved }}>
      {children}
    </KoordinatorPwaKontext.Provider>
  );
}

export function useKoordinatorPwa(): Wert {
  const v = useContext(KoordinatorPwaKontext);
  if (!v) {
    throw new Error("useKoordinatorPwa nur unter /pwa/[token]");
  }
  return v;
}

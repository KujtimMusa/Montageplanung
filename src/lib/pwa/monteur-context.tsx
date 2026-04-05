"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { ResolvedEmployee } from "@/lib/pwa/token-resolver";

type PwaMonteurKontextWert = {
  token: string;
  resolved: ResolvedEmployee;
};

const PwaMonteurKontext = createContext<PwaMonteurKontextWert | null>(null);

export function PwaMonteurProvider({
  token,
  resolved,
  children,
}: {
  token: string;
  resolved: ResolvedEmployee;
  children: ReactNode;
}) {
  return (
    <PwaMonteurKontext.Provider value={{ token, resolved }}>
      {children}
    </PwaMonteurKontext.Provider>
  );
}

export function usePwaMonteur(): PwaMonteurKontextWert {
  const v = useContext(PwaMonteurKontext);
  if (!v) {
    throw new Error("usePwaMonteur nur unter /m/[token]");
  }
  return v;
}

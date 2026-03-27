"use client";

import { BottomNav } from "@/components/layout/BottomNav";
import {
  ProfilHinweisLeiste,
  type ProfilKurz,
} from "@/components/layout/ProfilHinweisLeiste";
import { Sidebar } from "@/components/layout/Sidebar";

export type AbteilungZeile = {
  id: string;
  name: string;
  color: string;
  icon: string | null;
};

type AppShellProps = {
  children: React.ReactNode;
  abteilungen: AbteilungZeile[];
  /** Leitung sieht /teams in der Navigation */
  darfMitarbeiterSeite: boolean;
  /** Für Hinweis-Leiste (fehlendes Profil / Rolle Monteur) */
  profilKurz: ProfilKurz;
};

/**
 * Responsives App-Layout: Sidebar (Desktop), BottomNav (Mobil).
 */
export function AppShell({
  children,
  abteilungen,
  darfMitarbeiterSeite,
  profilKurz,
}: AppShellProps) {
  return (
    <div className="flex min-h-dvh w-full bg-zinc-950">
      <Sidebar
        abteilungen={abteilungen}
        darfMitarbeiterSeite={darfMitarbeiterSeite}
      />
      <div className="flex min-h-dvh flex-1 flex-col">
        <main className="flex-1 overflow-x-hidden bg-zinc-950 px-4 pb-24 pt-4 md:px-8 md:pb-8 md:pt-8">
          <ProfilHinweisLeiste profil={profilKurz} />
          {children}
        </main>
      </div>
      <BottomNav darfMitarbeiterSeite={darfMitarbeiterSeite} />
    </div>
  );
}

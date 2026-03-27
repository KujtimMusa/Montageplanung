"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  sidebarEinträgeFiltern,
  sidebarNavigation,
} from "@/lib/constants/navigation";
import { Separator } from "@/components/ui/separator";
import { LogoutButton } from "@/components/auth/LogoutButton";
import type { AbteilungZeile } from "@/components/layout/AppShell";

type SidebarProps = {
  abteilungen: AbteilungZeile[];
  darfMitarbeiterSeite: boolean;
};

/**
 * Desktop-Navigation mit Abteilungs-Farben als linker Rand.
 */
export function Sidebar({ abteilungen, darfMitarbeiterSeite }: SidebarProps) {
  const pathname = usePathname();
  const einträge = sidebarEinträgeFiltern(
    sidebarNavigation,
    darfMitarbeiterSeite
  );

  return (
    <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-zinc-800 bg-zinc-950 md:flex">
      <div className="flex h-14 items-center border-b border-zinc-800 px-4">
        <Link href="/dashboard" className="font-semibold text-zinc-100">
          Monteurplanung
        </Link>
      </div>
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3" aria-label="Hauptnavigation">
        {einträge.map((eintrag) => {
          const aktiv =
            pathname === eintrag.href || pathname.startsWith(`${eintrag.href}/`);
          const Icon = eintrag.icon;
          return (
            <Link
              key={eintrag.href}
              href={eintrag.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                aktiv
                  ? "bg-blue-600 text-white"
                  : "text-zinc-400 hover:bg-zinc-800/80 hover:text-zinc-100"
              )}
            >
              <Icon className="size-4 shrink-0" aria-hidden />
              {eintrag.label}
            </Link>
          );
        })}
      </nav>
      <Separator />
      <div className="p-3">
        <p className="mb-2 px-1 text-xs font-medium uppercase tracking-wide text-zinc-500">
          Abteilungen
        </p>
        <ul className="space-y-1" aria-label="Abteilungen">
          {abteilungen.length === 0 ? (
            <li className="px-2 py-1 text-xs text-zinc-500">
              Keine Abteilungen geladen
            </li>
          ) : (
            abteilungen.map((a) => (
              <li
                key={a.id}
                className="rounded-md border-l-4 bg-zinc-900/80 py-2 pl-3 text-sm text-zinc-300"
                style={{ borderLeftColor: a.color }}
              >
                {a.name}
              </li>
            ))
          )}
        </ul>
      </div>
      <Separator />
      <div className="p-3">
        <LogoutButton className="w-full text-zinc-400 hover:bg-zinc-800/80 hover:text-zinc-100" />
      </div>
    </aside>
  );
}

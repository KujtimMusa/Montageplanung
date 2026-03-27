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
type SidebarProps = {
  darfMitarbeiterSeite: boolean;
};

/**
 * Desktop-Navigation.
 */
export function Sidebar({ darfMitarbeiterSeite }: SidebarProps) {
  const pathname = usePathname();
  const einträge = sidebarEinträgeFiltern(
    sidebarNavigation,
    darfMitarbeiterSeite
  );

  return (
    <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-zinc-800 bg-zinc-950 md:flex">
      <div className="flex h-14 items-center border-b border-zinc-800 px-4">
        <Link href="/dashboard" className="font-semibold text-zinc-100">
          Einsatzplanung
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
        <LogoutButton className="w-full text-zinc-400 hover:bg-zinc-800/80 hover:text-zinc-100" />
      </div>
    </aside>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { sidebarNavigation } from "@/lib/constants/navigation";
import { SidebarAccount } from "@/components/layout/SidebarAccount";

/**
 * Desktop-Navigation — alle Einträge für eingeloggte Nutzer (Monteure ohne Login).
 */
export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-zinc-800 bg-zinc-950 md:flex">
      <div className="flex h-14 shrink-0 items-center border-b border-zinc-800 px-4">
        <Link href="/dashboard" className="font-semibold tracking-tight text-zinc-100">
          Einsatzplanung
        </Link>
      </div>
      <nav
        className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-3"
        aria-label="Hauptnavigation"
      >
        {sidebarNavigation.map((eintrag) => {
          const aktiv =
            pathname === eintrag.href ||
            pathname.startsWith(`${eintrag.href}/`);
          const Icon = eintrag.icon;
          return (
            <Link
              key={eintrag.href}
              href={eintrag.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-200",
                aktiv
                  ? "bg-blue-600 text-white"
                  : "text-zinc-400 hover:bg-white/5 hover:text-zinc-100"
              )}
            >
              <Icon className="size-[18px] shrink-0" aria-hidden />
              {eintrag.label}
            </Link>
          );
        })}
      </nav>
      <SidebarAccount />
    </aside>
  );
}

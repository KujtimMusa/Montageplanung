"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { bottomNavigation } from "@/lib/constants/navigation";
import { LogoutButton } from "@/components/auth/LogoutButton";

type BottomNavProps = {
  darfMitarbeiterSeite: boolean;
};

/**
 * Mobile Bottom Navigation (4 Haupt-Einträge).
 */
export function BottomNav({ darfMitarbeiterSeite }: BottomNavProps) {
  const pathname = usePathname();
  const basis = bottomNavigation.filter(
    (e) => darfMitarbeiterSeite || e.href !== "/teams"
  );
  const einträge = basis;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-zinc-800 bg-zinc-950/95 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1.5 backdrop-blur supports-[backdrop-filter]:bg-zinc-950/90 md:hidden"
      aria-label="Mobile Hauptnavigation"
    >
      <ul className="mx-auto flex max-w-2xl items-center justify-between gap-0.5 overflow-x-auto px-1">
        {einträge.map((eintrag) => {
          const aktiv =
            pathname === eintrag.href || pathname.startsWith(`${eintrag.href}/`);
          const Icon = eintrag.icon;
          return (
            <li key={eintrag.href} className="flex-1">
              <Link
                href={eintrag.href}
                className={cn(
                  "flex flex-col items-center gap-0.5 rounded-lg px-1 py-1 text-[11px] font-medium",
                  aktiv ? "text-blue-400" : "text-zinc-500"
                )}
              >
                <Icon className={cn("size-5", aktiv && "text-blue-400")} aria-hidden />
                <span className="max-w-[4.5rem] truncate text-center leading-tight">
                  {eintrag.label}
                </span>
              </Link>
            </li>
          );
        })}
        <li className="flex shrink-0">
          <LogoutButton
            kompakt
            variant="ghost"
            size="sm"
            className="size-10 shrink-0 text-zinc-500 hover:text-zinc-300"
          />
        </li>
      </ul>
    </nav>
  );
}

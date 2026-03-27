"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  bottomNavigationAdmin,
  bottomNavigationMonteur,
} from "@/lib/constants/navigation";
import { LogoutButton } from "@/components/auth/LogoutButton";

type BottomNavProps = {
  darfMitarbeiterSeite: boolean;
};

/**
 * Mobile Bottom Navigation (4 Haupt-Einträge).
 */
export function BottomNav({ darfMitarbeiterSeite }: BottomNavProps) {
  const pathname = usePathname();
  const einträge = darfMitarbeiterSeite
    ? bottomNavigationAdmin
    : bottomNavigationMonteur;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:hidden"
      aria-label="Mobile Hauptnavigation"
    >
      <ul className="mx-auto flex max-w-lg items-center justify-around px-1">
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
                  aktiv ? "text-primary" : "text-muted-foreground"
                )}
              >
                <Icon className={cn("size-5", aktiv && "text-primary")} aria-hidden />
                <span className="line-clamp-1">{eintrag.label}</span>
              </Link>
            </li>
          );
        })}
        <li className="flex shrink-0">
          <LogoutButton
            kompakt
            variant="ghost"
            size="sm"
            className="size-10 shrink-0 text-muted-foreground"
          />
        </li>
      </ul>
    </nav>
  );
}

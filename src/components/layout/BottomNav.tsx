"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { bottomNavigation } from "@/lib/constants/navigation";
import { LogoutButton } from "@/components/auth/LogoutButton";

/**
 * Mobile Bottom Navigation — scrollbare Icon-Leiste + Abmelden.
 */
export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-zinc-800 bg-zinc-950/95 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1.5 backdrop-blur supports-[backdrop-filter]:bg-zinc-950/90 md:hidden"
      aria-label="Mobile Hauptnavigation"
    >
      <ul className="mx-auto flex max-w-full items-center gap-0.5 overflow-x-auto px-1 scrollbar-thin">
        {bottomNavigation.map((eintrag) => {
          const aktiv =
            pathname === eintrag.href ||
            pathname.startsWith(`${eintrag.href}/`);
          const Icon = eintrag.icon;
          return (
            <li key={eintrag.href} className="shrink-0">
              <Link
                href={eintrag.href}
                className={cn(
                  "flex min-w-[3.25rem] flex-col items-center gap-0.5 rounded-lg px-1.5 py-1 text-[10px] font-medium transition-colors duration-200",
                  aktiv
                    ? "bg-blue-600/90 text-white"
                    : "text-zinc-500 hover:bg-white/5 hover:text-zinc-300"
                )}
              >
                <Icon className="size-[18px] shrink-0" aria-hidden />
                <span className="max-w-[4rem] truncate text-center leading-tight">
                  {eintrag.labelKurz}
                </span>
              </Link>
            </li>
          );
        })}
        <li className="flex shrink-0 pl-1">
          <LogoutButton
            kompakt
            variant="ghost"
            size="sm"
            className="size-10 shrink-0 text-zinc-500 hover:bg-white/5 hover:text-zinc-300"
          />
        </li>
      </ul>
    </nav>
  );
}

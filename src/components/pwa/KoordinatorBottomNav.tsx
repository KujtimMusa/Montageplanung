"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Briefcase,
  CalendarDays,
  LayoutDashboard,
  Settings,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

const AKZENT = "#01696f";

type Tab = { href: string; label: string; Icon: typeof LayoutDashboard };

export function KoordinatorBottomNav({ token }: { token: string }) {
  const pathname = usePathname();
  const base = `/pwa/${token}`;

  const tabs: Tab[] = [
    { href: `${base}/dashboard`, label: "Dashboard", Icon: LayoutDashboard },
    { href: `${base}/planung`, label: "Planung", Icon: CalendarDays },
    { href: `${base}/teams`, label: "Teams", Icon: Users },
    { href: `${base}/projekte`, label: "Projekte", Icon: Briefcase },
    { href: `${base}/einstellungen`, label: "Mehr", Icon: Settings },
  ];

  return (
    <nav
      className="pwa-bottom-nav border-t border-zinc-800 bg-zinc-950/95 backdrop-blur"
      aria-label="Koordinator PWA Navigation"
    >
      <ul className="mx-auto flex max-w-lg items-stretch justify-around gap-0 px-0.5 pt-1">
        {tabs.map(({ href, label, Icon }) => {
          const aktiv =
            pathname === href || (href !== base && pathname.startsWith(href + "/"));
          return (
            <li key={href} className="flex min-w-0 flex-1 justify-center">
              <Link
                href={href}
                className={cn(
                  "touch-target flex min-h-[44px] min-w-[44px] flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-1 text-[10px] font-medium transition-colors",
                  aktiv ? "text-white" : "text-zinc-500 hover:text-zinc-300"
                )}
                style={aktiv ? { color: AKZENT } : undefined}
              >
                <Icon
                  className="size-6 shrink-0"
                  strokeWidth={aktiv ? 2.5 : 2}
                  aria-hidden
                />
                <span className="truncate">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

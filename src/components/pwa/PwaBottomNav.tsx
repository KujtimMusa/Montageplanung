"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Bell, Camera, LayoutGrid, UserRound, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

const AKZENT = "#01696f";

type Tab = { href: string; label: string; Icon: typeof LayoutGrid };

export function PwaBottomNav({ token }: { token: string }) {
  const pathname = usePathname();
  const base = `/m/${token}`;
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void fetch(`/api/pwa/notifications?token=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((d: { notifications?: { read: boolean }[] }) => {
        if (cancelled) return;
        const n = (d.notifications ?? []).filter((x) => !x.read).length;
        setUnread(n);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [token, pathname]);

  const tabs: Tab[] = [
    { href: `${base}/projekte`, label: "Projekte", Icon: LayoutGrid },
    { href: `${base}/aktiv`, label: "Aktiv", Icon: Zap },
    { href: `${base}/fotos`, label: "Fotos", Icon: Camera },
    { href: `${base}/benachrichtigungen`, label: "Info", Icon: Bell },
    { href: `${base}/profil`, label: "Profil", Icon: UserRound },
  ];

  return (
    <nav
      className="pwa-bottom-nav border-t border-zinc-800 bg-zinc-950/95 backdrop-blur"
      aria-label="PWA Hauptnavigation"
    >
      <ul className="mx-auto flex max-w-lg items-stretch justify-around gap-0 px-1 pt-1">
        {tabs.map(({ href, label, Icon }) => {
          const aktiv =
            pathname === href || (href !== base && pathname.startsWith(href + "/"));
          const badge =
            href.endsWith("/benachrichtigungen") && unread > 0 ? unread : 0;
          return (
            <li key={href} className="flex min-w-0 flex-1 justify-center">
              <Link
                href={href}
                className={cn(
                  "touch-target relative flex min-h-[44px] min-w-[44px] flex-col items-center justify-center gap-0.5 rounded-lg px-2 py-1 text-[10px] font-medium transition-colors",
                  aktiv ? "text-white" : "text-zinc-500 hover:text-zinc-300"
                )}
                style={aktiv ? { color: AKZENT } : undefined}
              >
                <span className="relative inline-flex">
                  <Icon
                    className="size-6 shrink-0"
                    strokeWidth={aktiv ? 2.5 : 2}
                    aria-hidden
                  />
                  {badge > 0 ? (
                    <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-0.5 text-[9px] font-bold text-white">
                      {badge > 9 ? "9+" : badge}
                    </span>
                  ) : null}
                </span>
                <span className="truncate">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

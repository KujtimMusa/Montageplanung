"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

const INTERVAL_MS = 35_000;

/**
 * Hält Server-gerenderte Monteur-Seiten (Einsätze, Benachrichtigungen) aktuell,
 * ohne nur auf E-Mail zu vertrauen.
 */
export function MonteurAppLiveRefresh() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname?.startsWith("/m/")) return;

    const id = window.setInterval(() => {
      router.refresh();
    }, INTERVAL_MS);

    const onVis = () => {
      if (document.visibilityState === "visible") {
        router.refresh();
      }
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [router, pathname]);

  return null;
}

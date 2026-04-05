"use client";

import type { ReactNode } from "react";
import { useCallback, useState } from "react";
import { cn } from "@/lib/utils";
import { KoordinatorBottomNav } from "@/components/pwa/KoordinatorBottomNav";
import { PwaInstallBanner } from "@/components/pwa/PwaInstallBanner";

export function KoordinatorPwaShell({
  token,
  children,
}: {
  token: string;
  children: ReactNode;
}) {
  const [bannerOben, setBannerOben] = useState(false);
  const onBannerVisibleChange = useCallback((visible: boolean) => {
    setBannerOben(visible);
  }, []);

  return (
    <>
      <PwaInstallBanner onBannerVisibleChange={onBannerVisibleChange} />
      <div
        className={cn(
          "pwa-shell min-h-dvh bg-zinc-950 text-zinc-100",
          bannerOben && "has-banner"
        )}
      >
        <div className="mx-auto max-w-lg pb-2">{children}</div>
        <KoordinatorBottomNav token={token} />
      </div>
    </>
  );
}

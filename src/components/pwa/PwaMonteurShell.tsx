"use client";

import type { ReactNode } from "react";
import { useCallback, useState } from "react";
import { cn } from "@/lib/utils";
import { PwaBottomNav } from "@/components/pwa/PwaBottomNav";
import { PwaInstallBanner } from "@/components/pwa/PwaInstallBanner";
import { PwaPushPromptBanner } from "@/components/pwa/PwaPushPromptBanner";
import { MonteurAppLiveRefresh } from "@/components/pwa/MonteurAppLiveRefresh";

export function PwaMonteurShell({
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
      <MonteurAppLiveRefresh />
      <PwaPushPromptBanner token={token} />
      <div
        className={cn(
          "pwa-shell min-h-dvh bg-zinc-950 text-zinc-100",
          bannerOben && "has-banner"
        )}
      >
        <div className="mx-auto max-w-lg pb-2">{children}</div>
        <PwaBottomNav token={token} />
      </div>
    </>
  );
}

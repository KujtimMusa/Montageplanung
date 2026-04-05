"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import type { ResolvedEmployee } from "@/lib/pwa/token-resolver";
import { usePwaOnboarding } from "@/hooks/usePwaOnboarding";
import { KoordinatorOnboarding } from "@/components/pwa/onboarding/KoordinatorOnboarding";

export function KoordinatorPwaEntry({
  token,
  resolved,
}: {
  token: string;
  resolved: ResolvedEmployee;
}) {
  const router = useRouter();
  const o = usePwaOnboarding(token);

  useEffect(() => {
    if (!o.hydrated) return;
    if (o.onboardingAbgeschlossen) {
      router.replace(`/pwa/${token}/dashboard`);
    }
  }, [o.hydrated, o.onboardingAbgeschlossen, router, token]);

  if (!o.hydrated) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-zinc-950 text-zinc-500">
        …
      </div>
    );
  }

  if (o.onboardingAbgeschlossen) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-zinc-950 text-zinc-500">
        Weiterleitung…
      </div>
    );
  }

  return <KoordinatorOnboarding token={token} resolved={resolved} />;
}

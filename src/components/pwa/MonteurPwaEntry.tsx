"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import type { ResolvedEmployee } from "@/lib/pwa/token-resolver";
import { usePwaOnboarding } from "@/hooks/usePwaOnboarding";
import { MonteurOnboarding } from "@/components/pwa/onboarding/MonteurOnboarding";

export function MonteurPwaEntry({
  token,
  resolved,
  employeeEmail,
}: {
  token: string;
  resolved: ResolvedEmployee;
  employeeEmail: string | null;
}) {
  const router = useRouter();
  const o = usePwaOnboarding(token);

  useEffect(() => {
    if (!o.hydrated) return;
    if (o.onboardingAbgeschlossen) {
      router.replace(`/m/${token}/projekte`);
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

  return (
    <MonteurOnboarding
      token={token}
      resolved={resolved}
      employeeEmail={employeeEmail}
    />
  );
}

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

function prefix(token: string): string {
  return token.trim().slice(0, 8);
}

const TAG_DONE = "pwa_onboarding_done_";
const TAG_INSTALL = "pwa_install_dismissed_";
const TAG_PUSH_ASKED = "pwa_push_last_asked_";

export function usePwaOnboarding(token: string) {
  const p = useMemo(() => prefix(token), [token]);
  const [hydrated, setHydrated] = useState(false);
  const [onboardingDone, setOnboardingDone] = useState(false);
  const [installDismissed, setInstallDismissed] = useState(false);
  const [pushLastAsked, setPushLastAsked] = useState<number | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      setOnboardingDone(localStorage.getItem(`${TAG_DONE}${p}`) === "1");
      setInstallDismissed(localStorage.getItem(`${TAG_INSTALL}${p}`) === "1");
      const raw = localStorage.getItem(`${TAG_PUSH_ASKED}${p}`);
      setPushLastAsked(raw ? parseInt(raw, 10) : null);
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, [p]);

  const markiereOnboardingAbgeschlossen = useCallback(() => {
    try {
      localStorage.setItem(`${TAG_DONE}${p}`, "1");
    } catch {
      /* ignore */
    }
    setOnboardingDone(true);
  }, [p]);

  const markiereInstallDismissed = useCallback(() => {
    try {
      localStorage.setItem(`${TAG_INSTALL}${p}`, "1");
    } catch {
      /* ignore */
    }
    setInstallDismissed(true);
  }, [p]);

  const markierePushGefragt = useCallback(() => {
    const t = Date.now();
    try {
      localStorage.setItem(`${TAG_PUSH_ASKED}${p}`, String(t));
    } catch {
      /* ignore */
    }
    setPushLastAsked(t);
  }, [p]);

  const sollPushErneutFragen = useMemo(() => {
    if (!hydrated || typeof window === "undefined") return false;
    if (!("Notification" in window)) return false;
    if (Notification.permission !== "default") return false;
    if (!pushLastAsked) return false;
    const dreiTage = 3 * 24 * 60 * 60 * 1000;
    return Date.now() - pushLastAsked > dreiTage;
  }, [hydrated, pushLastAsked]);

  return {
    hydrated,
    onboardingAbgeschlossen: onboardingDone,
    installDismissed,
    pushZuletztGefragt: pushLastAsked ? new Date(pushLastAsked) : null,
    markiereOnboardingAbgeschlossen,
    markiereInstallDismissed,
    markierePushGefragt,
    sollPushErneutFragen,
  };
}

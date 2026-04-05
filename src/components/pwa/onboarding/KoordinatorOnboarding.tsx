"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BarChart3,
  Bell,
  Briefcase,
  CheckCircle,
  Download,
  LayoutDashboard,
  Share2,
  Users,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ResolvedEmployee } from "@/lib/pwa/token-resolver";
import { usePwaOnboarding } from "@/hooks/usePwaOnboarding";
import {
  meldePushStatus,
  subscribeMonteurPush,
} from "@/lib/pwa/monteur-push-client";

type Platform = "ios" | "android" | "desktop";

function detectPlatform(): Platform {
  if (typeof window === "undefined") return "desktop";
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua)) return "ios";
  if (/Android/.test(ua)) return "android";
  return "desktop";
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const standalone =
    "standalone" in window.navigator &&
    (window.navigator as Navigator & { standalone?: boolean }).standalone ===
      true;
  return (
    window.matchMedia("(display-mode: standalone)").matches || standalone
  );
}

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function KoordinatorOnboarding({
  token,
  resolved,
}: {
  token: string;
  resolved: ResolvedEmployee;
}) {
  const router = useRouter();
  const o = usePwaOnboarding(token);
  const [step, setStep] = useState(1);
  const [platform, setPlatform] = useState<Platform>("desktop");
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showIosGuide, setShowIosGuide] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const vapid = Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim());

  useEffect(() => {
    setPlatform(detectPlatform());
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  useEffect(() => {
    if (step !== 2) return;
    if (isStandalone()) setStep(3);
  }, [step]);

  const installSkip = useCallback(() => {
    o.markiereInstallDismissed();
    setStep(3);
  }, [o]);

  const fertig = useCallback(() => {
    o.markiereOnboardingAbgeschlossen();
    router.push(`/pwa/${token}/dashboard`);
  }, [o, router, token]);

  async function pushAktivieren() {
    if (!vapid || !("Notification" in window)) {
      await meldePushStatus(token, "unsupported");
      setStep(4);
      return;
    }
    setPushBusy(true);
    try {
      await subscribeMonteurPush(token);
    } catch {
      await meldePushStatus(token, "denied");
    } finally {
      setPushBusy(false);
      setStep(4);
    }
  }

  const schrittAnzeige = step;

  return (
    <div className="fixed inset-0 z-[200] flex min-h-screen flex-col bg-background">
      <div className="flex min-h-screen flex-col items-center justify-center px-6 py-12">
        <div className="mb-8 flex justify-center gap-1.5">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={cn(
                "rounded-full transition-all",
                schrittAnzeige === s
                  ? "h-1.5 w-6 bg-primary"
                  : "h-1.5 w-1.5 bg-muted"
              )}
            />
          ))}
        </div>

        <div className="mx-auto w-full max-w-sm space-y-6 text-center">
          {step === 1 ? (
            <>
              <div className="bg-primary/10 mx-auto flex h-20 w-20 items-center justify-center rounded-full">
                <LayoutDashboard className="text-primary size-10" aria-hidden />
              </div>
              <h1 className="text-foreground text-2xl font-bold">
                Ihre mobile Schaltzentrale
              </h1>
              <ul className="space-y-3 text-left">
                <li className="text-foreground flex items-start gap-3 text-sm">
                  <Users className="text-primary mt-0.5 size-[18px] shrink-0" />
                  <span>Live-Status des Teams</span>
                </li>
                <li className="text-foreground flex items-start gap-3 text-sm">
                  <BarChart3 className="text-primary mt-0.5 size-[18px] shrink-0" />
                  <span>Einsätze planen und steuern</span>
                </li>
                <li className="text-foreground flex items-start gap-3 text-sm">
                  <Briefcase className="text-primary mt-0.5 size-[18px] shrink-0" />
                  <span>Projekte im Überblick</span>
                </li>
              </ul>
              <button
                type="button"
                onClick={() => setStep(2)}
                className="bg-primary text-primary-foreground w-full rounded-2xl py-4 text-base font-semibold"
              >
                App einrichten →
              </button>
            </>
          ) : null}

          {step === 2 ? (
            <>
              {platform === "ios" ? (
                <>
                  <div className="bg-primary/10 mx-auto flex h-20 w-20 items-center justify-center rounded-full">
                    <Share2 className="text-primary size-10" />
                  </div>
                  <h1 className="text-foreground text-2xl font-bold">
                    App zum Homescreen
                  </h1>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    Ohne App Store — für schnellen Zugriff unterwegs.
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowIosGuide(true)}
                    className="bg-primary text-primary-foreground w-full rounded-2xl py-4 text-base font-semibold"
                  >
                    Anleitung
                  </button>
                  <button
                    type="button"
                    onClick={installSkip}
                    className="text-muted-foreground text-sm underline"
                  >
                    Weiter
                  </button>
                </>
              ) : platform === "android" && deferredPrompt ? (
                <>
                  <div className="bg-primary/10 mx-auto flex h-20 w-20 items-center justify-center rounded-full">
                    <Download className="text-primary size-10" />
                  </div>
                  <h1 className="text-foreground text-2xl font-bold">
                    App installieren
                  </h1>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!deferredPrompt) return;
                      await deferredPrompt.prompt();
                      setDeferredPrompt(null);
                      setStep(3);
                    }}
                    className="bg-primary text-primary-foreground w-full rounded-2xl py-4 text-base font-semibold"
                  >
                    Jetzt installieren
                  </button>
                  <button
                    type="button"
                    onClick={installSkip}
                    className="text-muted-foreground text-sm"
                  >
                    Nicht jetzt
                  </button>
                </>
              ) : (
                <>
                  <p className="text-muted-foreground text-sm">
                    Am Desktop: Lesezeichen setzen oder später auf dem Smartphone
                    installieren.
                  </p>
                  <button
                    type="button"
                    onClick={installSkip}
                    className="bg-primary text-primary-foreground w-full rounded-2xl py-4 text-base font-semibold"
                  >
                    Weiter
                  </button>
                </>
              )}
            </>
          ) : null}

          {step === 3 ? (
            <>
              <div className="bg-primary/10 mx-auto flex h-20 w-20 items-center justify-center rounded-full">
                <Bell className="text-primary size-10" />
              </div>
              <h1 className="text-foreground text-2xl font-bold">
                Benachrichtigungen für Koordinatoren
              </h1>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Informiert werden, wenn sich Mitarbeitende ein- oder ausstempeln
                und bei wichtigen Ereignissen — wenn Sie möchten.
              </p>
              <button
                type="button"
                disabled={pushBusy}
                onClick={() => void pushAktivieren()}
                className="bg-primary text-primary-foreground w-full rounded-2xl py-4 text-base font-semibold"
              >
                {pushBusy ? "…" : "Aktivieren"}
              </button>
              <button
                type="button"
                onClick={() => setStep(4)}
                className="text-muted-foreground text-sm"
              >
                Nicht jetzt
              </button>
            </>
          ) : null}

          {step === 4 ? (
            <>
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/15">
                <CheckCircle className="size-10 text-emerald-400" />
              </div>
              <h1 className="text-foreground text-2xl font-bold">Bereit</h1>
              <p className="text-muted-foreground text-sm">
                {resolved.employeeName}, willkommen in der Koordinator-App.
              </p>
              <button
                type="button"
                onClick={fertig}
                className="bg-primary text-primary-foreground w-full rounded-2xl py-4 text-base font-semibold"
              >
                Zum Dashboard
              </button>
            </>
          ) : null}
        </div>
      </div>

      {showIosGuide ? (
        <div className="fixed inset-0 z-[210] flex items-end bg-black/60">
          <div className="w-full rounded-t-2xl bg-white p-6 pb-10">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">iOS</h2>
              <button
                type="button"
                onClick={() => setShowIosGuide(false)}
                className="text-gray-400"
              >
                <X size={22} />
              </button>
            </div>
            <p className="text-sm text-gray-600">
              Teilen → „Zum Home-Bildschirm“ → Hinzufügen
            </p>
            <button
              type="button"
              onClick={() => {
                setShowIosGuide(false);
                try {
                  localStorage.setItem(
                    `pwa_install_dismissed_${token.slice(0, 8)}`,
                    "true"
                  );
                } catch {
                  /* ignore */
                }
                o.markiereInstallDismissed();
                setStep(3);
              }}
              className="mt-6 w-full rounded-xl bg-[#01696f] py-3 font-semibold text-white"
            >
              Verstanden
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

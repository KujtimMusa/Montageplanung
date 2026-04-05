"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  Briefcase,
  CheckCircle,
  ClipboardList,
  Download,
  HardHat,
  Share2,
  Camera,
  BellRing,
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

type PushOutcome = "granted" | "denied" | "skipped" | "unsupported";

export function MonteurOnboarding({
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
  const [step, setStep] = useState(0);
  const [platform, setPlatform] = useState<Platform>("desktop");
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showIosGuide, setShowIosGuide] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const [pushOutcome, setPushOutcome] = useState<PushOutcome | null>(null);
  const vapid = Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim());

  const vorname = resolved.employeeName?.split(/\s+/)[0] ?? "du";
  const hatEmail = Boolean(employeeEmail?.trim());

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
    if (step !== 0) return;
    const t = setTimeout(() => setStep(1), 1500);
    return () => clearTimeout(t);
  }, [step]);

  useEffect(() => {
    if (step !== 2) return;
    if (isStandalone()) {
      setStep(3);
    }
  }, [step]);

  const schritt2Weiter = useCallback(() => {
    o.markiereInstallDismissed();
    setStep(3);
  }, [o]);

  const abschluss = useCallback(() => {
    o.markiereOnboardingAbgeschlossen();
    router.push(`/m/${token}/projekte`);
  }, [o, router, token]);

  async function pushAktivieren() {
    if (!vapid) {
      await meldePushStatus(token, "unsupported");
      setPushOutcome("unsupported");
      setStep(4);
      return;
    }
    if (!("Notification" in window)) {
      await meldePushStatus(token, "unsupported");
      setPushOutcome("unsupported");
      setStep(4);
      return;
    }
    setPushBusy(true);
    try {
      await subscribeMonteurPush(token);
      setPushOutcome("granted");
      setStep(4);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      if (msg.includes("nicht erlaubt") || msg.includes("not")) {
        await meldePushStatus(token, "denied");
        setPushOutcome("denied");
      } else {
        setPushOutcome("denied");
      }
      setStep(4);
    } finally {
      setPushBusy(false);
    }
  }

  async function pushUeberspringenMitEmail() {
    o.markierePushGefragt();
    setPushOutcome("skipped");
    setStep(4);
  }

  const schrittAnzeige = step >= 1 && step <= 4 ? step : 1;

  return (
    <div className="fixed inset-0 z-[200] flex min-h-screen flex-col bg-background">
      {step === 0 ? (
        <div className="flex min-h-screen flex-col items-center justify-center bg-[#01696f] px-6 py-12 text-white">
          <div className="animate-pulse">
            <div className="mx-auto flex h-24 w-24 scale-100 items-center justify-center rounded-full bg-white/20 transition-transform duration-700">
              <span className="text-4xl font-black tracking-tight">V</span>
            </div>
          </div>
          <p className="mt-8 text-lg font-semibold opacity-90">Vlerafy</p>
        </div>
      ) : (
        <div className="flex min-h-screen flex-col items-center justify-center px-6 py-12">
          {step >= 1 && step <= 4 ? (
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
          ) : null}

          <div className="mx-auto w-full max-w-sm space-y-6 text-center">
            {step === 1 ? (
              <>
                <div className="bg-primary/10 mx-auto flex h-20 w-20 items-center justify-center rounded-full">
                  <HardHat className="text-primary size-10" aria-hidden />
                </div>
                <h1 className="text-foreground text-2xl font-bold">
                  Hallo, {vorname}! 👋
                </h1>
                <p className="text-muted-foreground text-base leading-relaxed">
                  Hier siehst du all deine Einsätze, Infos und Projektunterlagen
                  — direkt auf deinem Handy.
                </p>
                <ul className="space-y-3 text-left">
                  <li className="text-foreground flex items-start gap-3 text-sm">
                    <ClipboardList
                      className="text-primary mt-0.5 size-[18px] shrink-0"
                      aria-hidden
                    />
                    <span>Einsätze &amp; Termine auf einen Blick</span>
                  </li>
                  <li className="text-foreground flex items-start gap-3 text-sm">
                    <Camera
                      className="text-primary mt-0.5 size-[18px] shrink-0"
                      aria-hidden
                    />
                    <span>Fotos direkt vom Baustellenprotokoll</span>
                  </li>
                  <li className="text-foreground flex items-start gap-3 text-sm">
                    <BellRing
                      className="text-primary mt-0.5 size-[18px] shrink-0"
                      aria-hidden
                    />
                    <span>Sofort-Infos wenn sich etwas ändert</span>
                  </li>
                </ul>
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="bg-primary text-primary-foreground w-full rounded-2xl py-4 text-base font-semibold"
                >
                  Los geht&apos;s →
                </button>
              </>
            ) : null}

            {step === 2 ? (
              <>
                {platform === "ios" ? (
                  <>
                    <div className="bg-primary/10 mx-auto flex h-20 w-20 items-center justify-center rounded-full">
                      <Share2 className="text-primary size-10" aria-hidden />
                    </div>
                    <h1 className="text-foreground text-2xl font-bold">
                      App zum Homescreen
                    </h1>
                    <p className="text-muted-foreground text-base leading-relaxed">
                      So hast du die App immer griffbereit — ohne App Store, ohne
                      Passwort.
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowIosGuide(true)}
                      className="bg-primary text-primary-foreground w-full rounded-2xl py-4 text-base font-semibold"
                    >
                      Anleitung anzeigen
                    </button>
                    <button
                      type="button"
                      onClick={schritt2Weiter}
                      className="text-muted-foreground hover:text-foreground mt-2 text-sm underline-offset-4 hover:underline"
                    >
                      Schon hinzugefügt? Weiter
                    </button>
                  </>
                ) : platform === "android" && deferredPrompt ? (
                  <>
                    <div className="bg-primary/10 mx-auto flex h-20 w-20 items-center justify-center rounded-full">
                      <Download className="text-primary size-10" aria-hidden />
                    </div>
                    <h1 className="text-foreground text-2xl font-bold">
                      App installieren
                    </h1>
                    <p className="text-muted-foreground text-base leading-relaxed">
                      Einmal installieren — dann immer sofort starten.
                    </p>
                    <button
                      type="button"
                      onClick={async () => {
                        if (!deferredPrompt) return;
                        await deferredPrompt.prompt();
                        const { outcome } = await deferredPrompt.userChoice;
                        if (outcome === "accepted") {
                          setStep(3);
                        } else {
                          schritt2Weiter();
                        }
                        setDeferredPrompt(null);
                      }}
                      className="bg-primary text-primary-foreground w-full rounded-2xl py-4 text-base font-semibold"
                    >
                      Jetzt installieren
                    </button>
                    <button
                      type="button"
                      onClick={schritt2Weiter}
                      className="text-muted-foreground hover:text-foreground mt-2 text-sm underline-offset-4 hover:underline"
                    >
                      Nicht jetzt
                    </button>
                  </>
                ) : (
                  <>
                    <div className="bg-primary/10 mx-auto flex h-20 w-20 items-center justify-center rounded-full">
                      <Briefcase className="text-primary size-10" aria-hidden />
                    </div>
                    <h1 className="text-foreground text-2xl font-bold">
                      App nutzen
                    </h1>
                    <p className="text-muted-foreground text-base leading-relaxed">
                      Am Computer: Diese Seite als Lesezeichen speichern. Unterwegs
                      empfehlen wir die Installation auf dem Smartphone.
                    </p>
                    <button
                      type="button"
                      onClick={schritt2Weiter}
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
                <div className="relative mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
                  <Bell className="text-primary size-10" aria-hidden />
                  {!hatEmail ? (
                    <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                      !
                    </span>
                  ) : null}
                </div>
                <h1 className="text-foreground text-2xl font-bold">
                  {hatEmail
                    ? "Immer informiert bleiben"
                    : "Wichtig: Benachrichtigungen aktivieren"}
                </h1>
                <p className="text-muted-foreground text-base leading-relaxed">
                  {hatEmail ? (
                    <>
                      Aktiviere Benachrichtigungen — wir melden uns direkt auf
                      deinem Handy, kein E-Mail-Postfach nötig.
                    </>
                  ) : (
                    <>
                      Du hast keine E-Mail hinterlegt. Ohne Benachrichtigungen
                      erfährst du nicht zuverlässig von neuen Einsätzen.
                    </>
                  )}
                </p>
                <button
                  type="button"
                  disabled={pushBusy}
                  onClick={() => void pushAktivieren()}
                  className="bg-primary text-primary-foreground w-full rounded-2xl py-4 text-base font-semibold disabled:opacity-60"
                >
                  {pushBusy ? "…" : "Benachrichtigungen aktivieren"}
                </button>
                {hatEmail ? (
                  <button
                    type="button"
                    onClick={() => void pushUeberspringenMitEmail()}
                    className="text-muted-foreground hover:text-foreground text-sm underline-offset-4 hover:underline"
                  >
                    Lieber per E-Mail
                  </button>
                ) : null}
              </>
            ) : null}

            {step === 4 ? (
              <>
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/15">
                  <CheckCircle
                    className="size-10 text-emerald-400"
                    aria-hidden
                  />
                </div>
                <h1 className="text-foreground text-2xl font-bold">
                  Alles bereit! ✓
                </h1>
                <p className="text-muted-foreground text-base leading-relaxed">
                  {pushOutcome === "granted" ? (
                    <>
                      Du bekommst ab jetzt Infos direkt hier. Für Push brauchst
                      du deine E-Mail nicht.
                    </>
                  ) : pushOutcome === "denied" || pushOutcome === "skipped" ? (
                    <>
                      Du bekommst Infos per E-Mail, wenn hinterlegt. Push kannst du
                      in den Browser-Einstellungen jederzeit aktivieren.
                    </>
                  ) : (
                    <>
                      Push wird von diesem Browser nicht unterstützt oder ist
                      nicht konfiguriert — du erhältst Infos per E-Mail.
                    </>
                  )}
                </p>
                <button
                  type="button"
                  onClick={abschluss}
                  className="bg-primary text-primary-foreground w-full rounded-2xl py-4 text-base font-semibold"
                >
                  Zu meinen Einsätzen
                </button>
              </>
            ) : null}
          </div>
        </div>
      )}

      {showIosGuide ? (
        <div className="fixed inset-0 z-[210] flex items-end bg-black/60">
          <div className="max-h-[85vh] w-full overflow-y-auto rounded-t-2xl bg-white p-6 pb-10">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">App installieren</h2>
              <button
                type="button"
                onClick={() => setShowIosGuide(false)}
                className="text-gray-400"
              >
                <X size={22} />
              </button>
            </div>
            <p className="mb-4 text-sm text-gray-600">
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
              className="mt-4 w-full rounded-xl bg-[#01696f] py-3 text-base font-semibold text-white"
            >
              Verstanden
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

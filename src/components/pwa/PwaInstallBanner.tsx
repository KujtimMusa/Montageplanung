"use client";

import { useEffect, useState } from "react";
import { X, Download, Share } from "lucide-react";

type Platform = "ios" | "android" | "desktop" | "unknown";

function detectPlatform(): Platform {
  if (typeof window === "undefined") return "unknown";
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua)) return "ios";
  if (/Android/.test(ua)) return "android";
  return "desktop";
}

function isInStandaloneMode(): boolean {
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

export type PwaInstallBannerProps = {
  /** PWA-Token (UUID) — localStorage-Key für „Banner geschlossen“. */
  token: string;
  /** Wird gesetzt, wenn das feste Banner (oben) sichtbar ist — für Shell-Padding. */
  onBannerVisibleChange?: (visible: boolean) => void;
};

const installStorageKey = (token: string) =>
  `pwa_install_dismissed_${token.trim().slice(0, 8)}`;

export function PwaInstallBanner({
  token,
  onBannerVisibleChange,
}: PwaInstallBannerProps) {
  const [platform, setPlatform] = useState<Platform>("unknown");
  const [isInstalled, setIsInstalled] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showIosGuide, setShowIosGuide] = useState(false);

  useEffect(() => {
    setPlatform(detectPlatform());
    setIsInstalled(isInStandaloneMode());
    try {
      if (localStorage.getItem(installStorageKey(token)) === "true") {
        setDismissed(true);
      }
    } catch {
      /* ignore */
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, [token]);

  function handleDismiss() {
    try {
      localStorage.setItem(installStorageKey(token), "true");
    } catch {
      /* ignore */
    }
    setDismissed(true);
  }

  const bannerSichtbar =
    !isInstalled &&
    !dismissed &&
    (platform === "ios" || platform === "android");

  useEffect(() => {
    onBannerVisibleChange?.(bannerSichtbar);
  }, [bannerSichtbar, onBannerVisibleChange]);

  if (isInstalled || dismissed) return null;
  if (platform === "desktop" || platform === "unknown") return null;

  const handleAndroidInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setIsInstalled(true);
    setDeferredPrompt(null);
  };

  return (
    <>
      <div className="fixed top-0 left-0 right-0 z-50 flex items-center gap-3 bg-[#01696f] px-4 py-3 text-white shadow-lg">
        <div className="flex-1">
          <p className="text-sm font-semibold leading-tight">
            App zum Homescreen hinzufügen
          </p>
          <p className="mt-0.5 text-xs text-white/80">
            {platform === "ios"
              ? "Tippe auf Teilen → „Zum Home-Bildschirm“"
              : "Für schnellen Zugriff ohne Browser"}
          </p>
        </div>

        {platform === "android" && deferredPrompt ? (
          <button
            type="button"
            onClick={() => void handleAndroidInstall()}
            className="flex shrink-0 items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-[#01696f]"
          >
            <Download size={14} />
            Installieren
          </button>
        ) : null}

        {platform === "ios" ? (
          <button
            type="button"
            onClick={() => setShowIosGuide(true)}
            className="flex shrink-0 items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-[#01696f]"
          >
            <Share size={14} />
            Anleitung
          </button>
        ) : null}

        <button
          type="button"
          onClick={handleDismiss}
          className="shrink-0 p-1 text-white/60 hover:text-white"
          aria-label="Schließen"
        >
          <X size={18} />
        </button>
      </div>

      {showIosGuide ? (
        <div className="fixed inset-0 z-[60] flex items-end bg-black/60">
          <div className="w-full rounded-t-2xl bg-white p-6 pb-10">
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

            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#01696f] font-bold text-white">
                  1
                </div>
                <div>
                  <p className="font-semibold text-gray-900">
                    Teilen-Button antippen
                  </p>
                  <p className="mt-0.5 text-sm text-gray-500">
                    Das Symbol unten in der Mitte in Safari (Quadrat mit Pfeil
                    nach oben ↑)
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#01696f] font-bold text-white">
                  2
                </div>
                <div>
                  <p className="font-semibold text-gray-900">
                    „Zum Home-Bildschirm“ wählen
                  </p>
                  <p className="mt-0.5 text-sm text-gray-500">
                    Im Teilen-Menü nach unten scrollen und diesen Punkt antippen
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#01696f] font-bold text-white">
                  3
                </div>
                <div>
                  <p className="font-semibold text-gray-900">
                    „Hinzufügen“ bestätigen
                  </p>
                  <p className="mt-0.5 text-sm text-gray-500">
                    Name kann geändert werden, dann oben rechts „Hinzufügen“ tippen
                  </p>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setShowIosGuide(false);
                handleDismiss();
              }}
              className="mt-6 w-full rounded-xl bg-[#01696f] py-3 text-base font-semibold text-white"
            >
              Verstanden
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}

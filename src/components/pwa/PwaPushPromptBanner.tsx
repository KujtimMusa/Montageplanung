"use client";

import { useEffect, useState } from "react";
import { Bell, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { subscribeMonteurPush } from "@/lib/pwa/monteur-push-client";
import { cn } from "@/lib/utils";

const storageKey = (token: string) => `monteur-push-hinweis-${token.slice(0, 8)}`;

/**
 * Hinweis auf der Monteur-PWA: Push erlauben (nur wenn noch nicht gefragt / nicht aktiv).
 * Link aus E-Mails öffnet oft den Browser — hier können Nutzer Push aktivieren, ohne Profil zu suchen.
 */
export function PwaPushPromptBanner({ token }: { token: string }) {
  const vapid = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim();
  const [permission, setPermission] = useState<NotificationPermission | null>(
    null
  );
  const [weg, setWeg] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setPermission("denied");
      return;
    }
    setPermission(Notification.permission);
    try {
      if (sessionStorage.getItem(storageKey(token)) === "1") setWeg(true);
    } catch {
      /* ignore */
    }
  }, [token]);

  if (!vapid || weg || permission === null) return null;

  if (permission === "granted") return null;

  if (permission === "denied") {
    return (
      <div className="border-b border-amber-900/50 bg-amber-950/40 px-3 py-2 text-center text-[11px] text-amber-200/90">
        Push ist blockiert. In den Browser-Einstellungen für diese Website
        Benachrichtigungen erlauben — oder Seite im Browser neu öffnen und
        erneut versuchen.
      </div>
    );
  }

  async function aktivieren() {
    setBusy(true);
    try {
      await subscribeMonteurPush(token);
      toast.success("Push-Benachrichtigungen aktiviert.");
      if ("Notification" in window) {
        setPermission(Notification.permission);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Aktivierung fehlgeschlagen");
    } finally {
      setBusy(false);
    }
  }

  function spaeter() {
    try {
      sessionStorage.setItem(storageKey(token), "1");
    } catch {
      /* ignore */
    }
    setWeg(true);
  }

  return (
    <div
      className={cn(
        "flex items-start gap-2 border-b border-[#01696f]/40 bg-[#01696f]/15 px-3 py-2.5 text-zinc-100"
      )}
    >
      <Bell className="mt-0.5 size-4 shrink-0 text-[#01696f]" aria-hidden />
      <div className="min-w-0 flex-1 text-xs leading-snug">
        <p className="font-medium text-zinc-100">
          Einsätze per Push mitbekommen
        </p>
        <p className="mt-0.5 text-zinc-400">
          Kurz erlauben — besonders sinnvoll, wenn du die App über einen
          E-Mail-Link im Browser öffnest.
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            className="h-8 bg-[#01696f] text-xs hover:bg-[#015a5f]"
            disabled={busy}
            onClick={() => void aktivieren()}
          >
            {busy ? "…" : "Jetzt aktivieren"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 text-xs text-zinc-500"
            onClick={spaeter}
          >
            Später
          </Button>
        </div>
      </div>
      <button
        type="button"
        className="shrink-0 rounded p-1 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
        aria-label="Schließen"
        onClick={spaeter}
      >
        <X className="size-4" />
      </button>
    </div>
  );
}

"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { usePwaOnboarding } from "@/hooks/usePwaOnboarding";
import { subscribeMonteurPush } from "@/lib/pwa/monteur-push-client";
import { cn } from "@/lib/utils";

/**
 * Nach Onboarding: dezenter Hinweis, Push zu aktivieren (z. B. nach 3 Tagen).
 */
export function PwaPushReminderBanner({ token }: { token: string }) {
  const vapid = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim();
  const o = usePwaOnboarding(token);
  const [weg, setWeg] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!vapid || !o.hydrated || !o.onboardingAbgeschlossen) return null;
  if (!o.sollPushErneutFragen) return null;
  if (typeof window === "undefined" || !("Notification" in window)) return null;
  if (Notification.permission !== "default") return null;
  if (weg) return null;

  async function aktivieren() {
    setBusy(true);
    try {
      await subscribeMonteurPush(token);
      toast.success("Push aktiviert.");
      o.markierePushGefragt();
      setWeg(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Fehler");
    } finally {
      setBusy(false);
    }
  }

  function schliessen() {
    o.markierePushGefragt();
    setWeg(true);
  }

  return (
    <div
      className={cn(
        "flex items-center gap-2 border-t border-[#01696f]/30 bg-[#01696f]/10 px-3 py-2 text-xs text-zinc-200"
      )}
    >
      <span className="flex-1">
        🔔 Push noch nicht aktiv —{" "}
        <button
          type="button"
          className="font-medium text-[#01696f] underline"
          disabled={busy}
          onClick={() => void aktivieren()}
        >
          Aktivieren?
        </button>
      </span>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-8 shrink-0 text-zinc-500"
        aria-label="Schließen"
        onClick={schliessen}
      >
        <X className="size-4" />
      </Button>
    </div>
  );
}

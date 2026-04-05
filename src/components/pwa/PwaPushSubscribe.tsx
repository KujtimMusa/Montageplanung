"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { subscribeMonteurPush } from "@/lib/pwa/monteur-push-client";

export function PwaPushSubscribe({
  token,
  vapidKonfiguriert,
}: {
  token: string;
  /** Von der Server-Page: NEXT_PUBLIC_VAPID_PUBLIC_KEY gesetzt */
  vapidKonfiguriert: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [permission, setPermission] =
    useState<NotificationPermission | "unsupported">("default");

  const vapid = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim();

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setPermission("unsupported");
      return;
    }
    setPermission(Notification.permission);
  }, []);

  if (!vapidKonfiguriert || !vapid) return null;

  if (permission === "unsupported") return null;

  if (permission === "granted") {
    return (
      <p className="text-center text-sm font-medium text-emerald-500">
        ✓ Push-Benachrichtigungen aktiv
      </p>
    );
  }

  async function aktivieren() {
    if (!vapid) return;
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

  return (
    <Button
      type="button"
      variant="outline"
      className="touch-target w-full border-zinc-700 text-zinc-200"
      disabled={busy}
      onClick={() => void aktivieren()}
    >
      Push-Benachrichtigungen aktivieren
    </Button>
  );
}

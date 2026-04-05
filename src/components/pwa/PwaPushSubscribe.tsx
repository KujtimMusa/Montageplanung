"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function PwaPushSubscribe({ token }: { token: string }) {
  const [busy, setBusy] = useState(false);
  const vapid = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim();

  if (!vapid) return null;

  async function aktivieren() {
    const keyB64 = vapid;
    if (!keyB64) return;
    if (!("Notification" in window) || !("serviceWorker" in navigator)) {
      toast.error("Push wird von diesem Browser nicht unterstützt.");
      return;
    }
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        toast.message("Benachrichtigungen wurden nicht erlaubt.");
        return;
      }
      const registration = await navigator.serviceWorker.ready;
      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(keyB64) as BufferSource,
      });
      const json = sub.toJSON();
      if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
        toast.error("Subscription unvollständig.");
        return;
      }
      const res = await fetch("/api/pwa/push-subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          subscription: {
            endpoint: json.endpoint,
            keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
          },
        }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? res.statusText);
      }
      toast.success("Push-Benachrichtigungen aktiviert.");
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

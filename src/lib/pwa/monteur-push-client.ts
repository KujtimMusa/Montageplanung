/** Gemeinsame Push-Registrierung für Monteur-PWA (Profil + Banner). */

const PUSH_FLOW_TIMEOUT_MS = 45_000;

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  let id: ReturnType<typeof setTimeout>;
  return new Promise<T>((resolve, reject) => {
    id = setTimeout(
      () => reject(new Error(`${label}: Zeitüberschreitung`)),
      ms
    );
    p.then(
      (v) => {
        clearTimeout(id);
        resolve(v);
      },
      (e) => {
        clearTimeout(id);
        reject(e instanceof Error ? e : new Error(String(e)));
      }
    );
  });
}

export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Nach erteilter Notification-Berechtigung: SW ready → subscribe → POST push-subscribe.
 * Kein erneutes requestPermission (vermeidet Doppel-Prompt / Race).
 */
export async function registerPushSubscription(token: string): Promise<void> {
  const keyB64 = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim();
  if (!keyB64) {
    throw new Error("Push ist auf dem Server nicht konfiguriert.");
  }
  if (!("serviceWorker" in navigator)) {
    throw new Error("Push wird von diesem Browser nicht unterstützt.");
  }
  if (Notification.permission !== "granted") {
    throw new Error("Benachrichtigungen wurden nicht erlaubt.");
  }

  const registration = await withTimeout(
    navigator.serviceWorker.ready,
    PUSH_FLOW_TIMEOUT_MS,
    "Service Worker"
  );

  let sub: PushSubscription;
  try {
    sub = await withTimeout(
      registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(keyB64) as BufferSource,
      }),
      PUSH_FLOW_TIMEOUT_MS,
      "Push-Abonnement"
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(
      msg.includes("Zeitüberschreitung")
        ? msg
        : `Push-Abonnement fehlgeschlagen: ${msg}`
    );
  }

  const json = sub.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
    throw new Error("Subscription unvollständig.");
  }

  const res = await withTimeout(
    fetch("/api/pwa/push-subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token,
        subscription: {
          endpoint: json.endpoint,
          keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
        },
      }),
    }),
    PUSH_FLOW_TIMEOUT_MS,
    "Server"
  );

  if (!res.ok) {
    const j = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(j.error ?? res.statusText);
  }
}

export async function subscribeMonteurPush(token: string): Promise<void> {
  if (!("Notification" in window) || !("serviceWorker" in navigator)) {
    throw new Error("Push wird von diesem Browser nicht unterstützt.");
  }
  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error("Benachrichtigungen wurden nicht erlaubt.");
  }
  await registerPushSubscription(token);
}

export async function meldePushStatus(
  token: string,
  status: "denied" | "unsupported"
): Promise<void> {
  const res = await fetch("/api/pwa/push-status", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, status }),
  });
  if (!res.ok) {
    const j = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(j.error ?? res.statusText);
  }
}

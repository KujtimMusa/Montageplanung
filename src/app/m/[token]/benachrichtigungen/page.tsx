"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { formatDistanceToNow, parseISO } from "date-fns";
import { de } from "date-fns/locale";
import { AlertTriangle, Bell, CalendarDays, Info, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type NotificationRow = {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  action_url: string | null;
  created_at: string;
};

function typeIcon(typ: string) {
  if (typ === "einsatz_neu") return CalendarDays;
  if (typ === "warnung") return AlertTriangle;
  return Info;
}

export default function MonteurBenachrichtigungenPage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const token = params.token;
  const [liste, setListe] = useState<NotificationRow[]>([]);
  const [laedt, setLaedt] = useState(true);
  const [fehler, setFehler] = useState<string | null>(null);

  const laden = useCallback(async () => {
    if (!token) return;
    setLaedt(true);
    setFehler(null);
    try {
      const res = await fetch(
        `/api/pwa/notifications?token=${encodeURIComponent(token)}`
      );
      const j = (await res.json()) as {
        notifications?: NotificationRow[];
        error?: string;
      };
      if (!res.ok) throw new Error(j.error ?? "Laden fehlgeschlagen");
      setListe(j.notifications ?? []);
    } catch (e) {
      setFehler(e instanceof Error ? e.message : "Fehler");
    } finally {
      setLaedt(false);
    }
  }, [token]);

  useEffect(() => {
    void laden();
  }, [laden]);

  async function alleGelesen() {
    if (!token) return;
    await fetch("/api/pwa/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, markAll: true }),
    });
    void laden();
  }

  async function eintragOeffnen(n: NotificationRow) {
    if (!token) return;
    if (!n.read) {
      await fetch("/api/pwa/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, notificationId: n.id }),
      });
    }
    if (n.action_url) {
      try {
        const u = new URL(n.action_url, window.location.origin);
        if (u.origin === window.location.origin) {
          router.push(`${u.pathname}${u.search}${u.hash}`);
        } else {
          window.location.href = n.action_url;
        }
      } catch {
        router.push(n.action_url);
      }
    } else {
      void laden();
    }
  }

  const ungelesen = liste.filter((n) => !n.read).length;

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Bell className="size-6 text-[#01696f]" aria-hidden />
          <h1 className="text-xl font-bold text-zinc-50">Benachrichtigungen</h1>
        </div>
        {ungelesen > 0 ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-xs text-zinc-400"
            onClick={() => void alleGelesen()}
          >
            Alle gelesen
          </Button>
        ) : null}
      </div>

      {laedt ? (
        <div className="flex justify-center py-12">
          <Loader2 className="size-8 animate-spin text-zinc-500" />
        </div>
      ) : fehler ? (
        <p className="text-sm text-red-400">{fehler}</p>
      ) : liste.length === 0 ? (
        <p className="py-8 text-center text-sm text-zinc-500">
          Keine Benachrichtigungen.
        </p>
      ) : (
        <ul className="space-y-2">
          {liste.map((n) => {
            const Icon = typeIcon(n.type);
            return (
              <li key={n.id}>
                <button
                  type="button"
                  onClick={() => void eintragOeffnen(n)}
                  className={cn(
                    "w-full rounded-xl border px-3 py-3 text-left transition-colors",
                    n.read
                      ? "border-zinc-800 bg-zinc-900/40"
                      : "border-l-4 border-l-[#01696f] border-zinc-800 bg-zinc-900/70"
                  )}
                >
                  <div className="flex gap-3">
                    <Icon
                      className="mt-0.5 size-5 shrink-0 text-zinc-500"
                      aria-hidden
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-zinc-100">{n.title}</p>
                      <p className="mt-1 text-sm text-zinc-400">{n.message}</p>
                      <p className="mt-2 text-xs text-zinc-600">
                        {formatDistanceToNow(parseISO(n.created_at), {
                          addSuffix: true,
                          locale: de,
                        })}
                      </p>
                    </div>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

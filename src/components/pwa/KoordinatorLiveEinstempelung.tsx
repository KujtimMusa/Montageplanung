"use client";

import { useEffect, useState } from "react";
import { formatDistanceToNow, parseISO } from "date-fns";
import { de } from "date-fns/locale";
import { Loader2 } from "lucide-react";

type Ein = {
  id: string;
  employee_id: string;
  mitarbeiter_name: string;
  checkin_at: string;
};

export function KoordinatorLiveEinstempelung({ token }: { token: string }) {
  const [liste, setListe] = useState<Ein[]>([]);
  const [laedt, setLaedt] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function poll() {
      try {
        const r = await fetch(
          `/api/pwa/koordinator-live?token=${encodeURIComponent(token)}`
        );
        const j = (await r.json()) as { eingestempelt?: Ein[] };
        if (!cancelled) setListe(j.eingestempelt ?? []);
      } catch {
        if (!cancelled) setListe([]);
      } finally {
        if (!cancelled) setLaedt(false);
      }
    }
    void poll();
    const t = setInterval(() => void poll(), 15_000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [token]);

  if (laedt) {
    return (
      <div className="flex items-center gap-2 text-sm text-zinc-500">
        <Loader2 className="size-4 animate-spin" />
        Live-Status…
      </div>
    );
  }

  if (liste.length === 0) {
    return (
      <p className="text-sm text-zinc-500">Niemand eingestempelt.</p>
    );
  }

  return (
    <ul className="space-y-2">
      {liste.map((e) => (
        <li
          key={e.id}
          className="rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2 text-sm"
        >
          <span className="font-medium text-zinc-200">{e.mitarbeiter_name}</span>
          <span className="ml-2 text-emerald-400">● eingestempelt</span>
          <p className="text-xs text-zinc-500">
            seit{" "}
            {formatDistanceToNow(parseISO(e.checkin_at), {
              addSuffix: true,
              locale: de,
            })}
          </p>
        </li>
      ))}
    </ul>
  );
}

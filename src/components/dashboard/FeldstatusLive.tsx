"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { format, parseISO } from "date-fns";
import { de } from "date-fns/locale";
import { Loader2, Radio } from "lucide-react";
import { cn } from "@/lib/utils";

type Zeile = {
  id: string;
  checkin_at: string;
  name: string;
  projekt: string;
};

function initialen(n: string): string {
  const p = n.trim().split(/\s+/).filter(Boolean);
  if (p.length >= 2) return (p[0]![0]! + p[1]![0]!).toUpperCase();
  return n.slice(0, 2).toUpperCase() || "?";
}

export function FeldstatusLive() {
  const [zeilen, setZeilen] = useState<Zeile[]>([]);
  const [laedt, setLaedt] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    async function laden() {
      const { data, error } = await supabase
        .from("time_entries")
        .select("id, checkin_at, employees(name), projects(title)")
        .is("checkout_at", null)
        .order("checkin_at", { ascending: false })
        .limit(20);

      if (error) {
        setZeilen([]);
        setLaedt(false);
        return;
      }

      const out: Zeile[] = [];
      for (const row of data ?? []) {
        const emp = row.employees as
          | { name?: string | null }
          | { name?: string | null }[]
          | null;
        const pr = row.projects as
          | { title?: string | null }
          | { title?: string | null }[]
          | null;
        const name = Array.isArray(emp) ? emp[0]?.name : emp?.name;
        const ptitle = Array.isArray(pr) ? pr[0]?.title : pr?.title;
        if (!name) continue;
        out.push({
          id: row.id as string,
          checkin_at: row.checkin_at as string,
          name: String(name),
          projekt: String(ptitle ?? "—"),
        });
      }
      setZeilen(out);
      setLaedt(false);
    }

    void laden();

    const channel = supabase
      .channel("time-entries-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "time_entries" },
        () => {
          void laden();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/40 p-5">
      <div className="mb-4 flex items-center gap-2">
        <Radio className="size-4 text-emerald-500" aria-hidden />
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
          Live-Feldstatus
        </h2>
      </div>
      {laedt ? (
        <div className="flex items-center gap-2 text-sm text-zinc-500">
          <Loader2 className="size-4 animate-spin" />
          Lade…
        </div>
      ) : zeilen.length === 0 ? (
        <p className="text-sm text-zinc-500">
          Niemand ist aktuell eingestempelt.
        </p>
      ) : (
        <ul className="space-y-3">
          {zeilen.map((z) => (
            <li
              key={z.id}
              className="flex items-center gap-3 rounded-xl border border-zinc-800/80 bg-zinc-950/50 px-3 py-2"
            >
              <div
                className={cn(
                  "flex size-10 shrink-0 items-center justify-center rounded-full border border-zinc-700 bg-zinc-800 text-xs font-bold text-zinc-300"
                )}
              >
                {initialen(z.name)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-zinc-100">{z.name}</p>
                <p className="truncate text-xs text-zinc-500">{z.projekt}</p>
                <p className="text-xs text-emerald-400">
                  Eingestempelt seit{" "}
                  {format(parseISO(z.checkin_at), "HH:mm", { locale: de })} Uhr
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

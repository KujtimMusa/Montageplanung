"use client";

import { useMemo } from "react";
import { addDays, endOfWeek, format, isSameDay } from "date-fns";
import { cn } from "@/lib/utils";
import { PRIORITAET_FARBEN } from "@/lib/constants/planung-farben";
import { EinsatzChip } from "@/components/kalender/EinsatzChip";
import type { EinsatzEvent } from "@/types/planung";
import type { ProjektOption } from "@/types/planung";

const WOCHENTAGE_KURZ = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"] as const;

function projektBalkenFarbe(z: EinsatzEvent, fallbackHex: string): string {
  const pf = z.projects?.farbe?.trim();
  if (pf) return pf;
  const prio = z.projects?.priority ?? "normal";
  return PRIORITAET_FARBEN[prio] ?? fallbackHex;
}

function groupByProject(einsaetze: EinsatzEvent[]): Map<string, EinsatzEvent[]> {
  const m = new Map<string, EinsatzEvent[]>();
  const sorted = [...einsaetze].sort((a, b) => {
    const ta = a.start_time ?? "";
    const tb = b.start_time ?? "";
    if (ta !== tb) return ta.localeCompare(tb);
    return (a.projects?.title ?? "").localeCompare(b.projects?.title ?? "", "de");
  });
  for (const e of sorted) {
    const pid = e.project_id;
    if (!pid) continue;
    if (!m.has(pid)) m.set(pid, []);
    m.get(pid)!.push(e);
  }
  return m;
}

export type PlanungTagesSpaltenProps = {
  wocheStart: Date;
  zuweisungen: EinsatzEvent[];
  projekteById: Map<string, ProjektOption>;
  abwesenheitCountProTag: Record<string, number>;
  onEinsatzBearbeiten: (z: EinsatzEvent) => void;
  onEinsatzLoeschen: (z: EinsatzEvent) => void;
  onEinsatzDragStart: (e: React.DragEvent, z: EinsatzEvent) => void;
  /** Schnellansicht (Floating-Panel) */
  onEinsatzDetail?: (z: EinsatzEvent, anchor: HTMLElement) => void;
  /** Monatsmodus: kompaktere Typo */
  kompakt?: boolean;
};

export function PlanungTagesSpalten({
  wocheStart,
  zuweisungen,
  projekteById,
  abwesenheitCountProTag,
  onEinsatzBearbeiten,
  onEinsatzLoeschen,
  onEinsatzDragStart,
  onEinsatzDetail,
  kompakt = false,
}: PlanungTagesSpaltenProps) {
  const wocheEnde = endOfWeek(wocheStart, { weekStartsOn: 1 });
  const von = format(wocheStart, "yyyy-MM-dd");
  const bis = format(wocheEnde, "yyyy-MM-dd");

  const tage = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(wocheStart, i)),
    [wocheStart]
  );

  const einsaetzeProTag = useMemo(() => {
    const acc: Record<string, EinsatzEvent[]> = {};
    for (const d of tage) {
      acc[format(d, "yyyy-MM-dd")] = [];
    }
    for (const z of zuweisungen) {
      if (!z.project_id) continue;
      if (z.date < von || z.date > bis) continue;
      if (!acc[z.date]) acc[z.date] = [];
      acc[z.date].push(z);
    }
    return acc;
  }, [zuweisungen, von, bis, tage]);

  return (
    <div className="grid min-h-0 flex-1 grid-cols-7 divide-x divide-zinc-800/30">
      {tage.map((datum, i) => {
        const iso = format(datum, "yyyy-MM-dd");
        const heute = isSameDay(datum, new Date());
        const list = einsaetzeProTag[iso] ?? [];
        const byProj = groupByProject(list);
        const abw = abwesenheitCountProTag[iso] ?? 0;

        return (
          <div
            key={iso}
            className={cn(
              "flex min-h-0 min-w-0 flex-col bg-zinc-950/80",
              heute ? "bg-zinc-900/50" : ""
            )}
          >
            <div
              className={cn(
                "shrink-0 border-b border-zinc-800/50 px-1.5 py-2 text-center",
                kompakt ? "py-1.5" : ""
              )}
            >
              <p
                className={cn(
                  "font-semibold tracking-wider uppercase",
                  kompakt ? "text-[9px]" : "text-[10px]",
                  heute ? "text-zinc-400" : "text-zinc-600"
                )}
              >
                {WOCHENTAGE_KURZ[i]}
              </p>
              <div
                className={cn(
                  "mx-auto mt-0.5 flex items-center justify-center rounded-full font-bold tabular-nums",
                  kompakt ? "h-6 w-6 text-xs" : "h-7 w-7 text-sm",
                  heute ? "bg-zinc-100 text-zinc-900" : "text-zinc-300"
                )}
              >
                {format(datum, "d")}
              </div>
              {abw > 0 ? (
                <div className="mt-0.5 text-[8px] font-semibold text-amber-500/80">
                  {abw} Abw.
                </div>
              ) : null}
            </div>

            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-1.5">
              {list.length === 0 ? (
                <p
                  className={cn(
                    "py-6 text-center text-zinc-600",
                    kompakt ? "text-[9px]" : "text-[10px]"
                  )}
                >
                  Frei
                </p>
              ) : (
                Array.from(byProj.entries()).map(([projektId, einsaetze]) => {
                  const proj = projekteById.get(projektId);
                  const farbe =
                    proj?.farbe?.trim() ||
                    PRIORITAET_FARBEN[proj?.priority ?? "normal"] ||
                    "#3b82f6";
                  const titel = proj?.title ?? "Projekt";
                  return (
                    <div key={projektId} className="mb-2 last:mb-0">
                      <p
                        className={cn(
                          "mb-1 truncate px-0.5 font-semibold text-zinc-500",
                          kompakt ? "text-[9px]" : "text-[10px]"
                        )}
                      >
                        {titel}
                      </p>
                      <div className="space-y-1">
                        {einsaetze.map((einsatz) => (
                          <div
                            key={einsatz.id}
                            data-planung-drop
                            data-datum={iso}
                            data-projekt-id={projektId}
                            onClick={(e) => {
                              if (!onEinsatzDetail) return;
                              if ((e.target as HTMLElement).closest("button")) return;
                              onEinsatzDetail(einsatz, e.currentTarget);
                            }}
                          >
                            <EinsatzChip
                              einsatz={einsatz}
                              projektTitel={titel}
                              projektFarbe={projektBalkenFarbe(einsatz, farbe)}
                              onBearbeiten={() => onEinsatzBearbeiten(einsatz)}
                              onLoeschen={() => onEinsatzLoeschen(einsatz)}
                              onDragStartNative={(ev) =>
                                onEinsatzDragStart(ev, einsatz)
                              }
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
              <div
                data-planung-drop
                data-datum={iso}
                data-empty-row="1"
                className={cn(
                  "mt-auto min-h-[36px] rounded-md border border-dashed border-zinc-800/50 transition-colors hover:border-zinc-700/60 hover:bg-zinc-900/30",
                  kompakt ? "min-h-[28px]" : ""
                )}
                onDragOver={(e) => e.preventDefault()}
                title="Projekt hier einplanen"
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

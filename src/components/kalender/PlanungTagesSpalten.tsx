"use client";

import { useMemo } from "react";
import { addDays, endOfWeek, format, isSameDay } from "date-fns";
import { cn } from "@/lib/utils";
import { PRIORITAET_FARBEN } from "@/lib/constants/planung-farben";
import { gruppiereEinsaetzeNachProjektImTag } from "@/lib/planung/einsatz-gruppe";
import { EinsatzChip } from "@/components/kalender/EinsatzChip";
import type { EinsatzEvent } from "@/types/planung";
import type { ProjektOption } from "@/types/planung";

const WOCHENTAGE_KURZ = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"] as const;

/** Feste Zeilen für Abwesenheit, damit alle Tagesköpfe gleich hoch bleiben */
const ABW_ZEILE_H = "h-4";

function projektBalkenFarbe(z: EinsatzEvent, fallbackHex: string): string {
  const pf = z.projects?.farbe?.trim();
  if (pf) return pf;
  const prio = z.projects?.priority ?? "normal";
  return PRIORITAET_FARBEN[prio] ?? fallbackHex;
}

export type PlanungTagesSpaltenProps = {
  wocheStart: Date;
  zuweisungen: EinsatzEvent[];
  projekteById: Map<string, ProjektOption>;
  abwesenheitCountProTag: Record<string, number>;
  onEinsatzBearbeiten: (gruppe: EinsatzEvent[]) => void;
  onEinsatzLoeschen: (gruppe: EinsatzEvent[]) => void;
  onEinsatzDragStart: (e: React.DragEvent, gruppe: EinsatzEvent[]) => void;
  /** Schnellansicht (Floating-Panel) */
  onEinsatzDetail?: (gruppe: EinsatzEvent[], anchor: HTMLElement) => void;
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
        const gruppen = gruppiereEinsaetzeNachProjektImTag(einsaetzeProTag[iso] ?? []);
        const abw = abwesenheitCountProTag[iso] ?? 0;

        return (
          <div
            key={iso}
            data-planung-drop
            data-datum={iso}
            data-empty-row="1"
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
              <div
                className={cn(
                  "mt-0.5 flex w-full items-center justify-center",
                  ABW_ZEILE_H
                )}
              >
                <span
                  className={cn(
                    "text-[8px] font-semibold leading-none",
                    abw > 0 ? "text-amber-500/80" : "invisible"
                  )}
                >
                  {abw > 0 ? `${abw} Abw.` : "—"}
                </span>
              </div>
            </div>

            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-1.5">
              {gruppen.length === 0 ? (
                <p
                  className={cn(
                    "py-6 text-center text-zinc-600",
                    kompakt ? "text-[9px]" : "text-[10px]"
                  )}
                >
                  Frei
                </p>
              ) : (
                <div className="flex flex-col gap-1">
                  {gruppen.map((gruppe) => {
                    const lead = gruppe[0]!;
                    const projektId = lead.project_id!;
                    const proj = projekteById.get(projektId);
                    const farbe =
                      proj?.farbe?.trim() ||
                      PRIORITAET_FARBEN[proj?.priority ?? "normal"] ||
                      "#3b82f6";
                    const titel = proj?.title ?? "Projekt";

                    return (
                      <div
                        key={`${iso}-${projektId}`}
                        data-planung-drop
                        data-datum={iso}
                        data-projekt-id={projektId}
                        onClick={(e) => {
                          if (!onEinsatzDetail) return;
                          if ((e.target as HTMLElement).closest("button")) return;
                          onEinsatzDetail(gruppe, e.currentTarget);
                        }}
                      >
                        <EinsatzChip
                          einsaetzeImTag={gruppe}
                          projektTitel={titel}
                          projektFarbe={projektBalkenFarbe(lead, farbe)}
                          onBearbeiten={() => onEinsatzBearbeiten(gruppe)}
                          onLoeschen={() => onEinsatzLoeschen(gruppe)}
                          onDragStartNative={(ev) =>
                            onEinsatzDragStart(ev, gruppe)
                          }
                        />
                      </div>
                    );
                  })}
                </div>
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

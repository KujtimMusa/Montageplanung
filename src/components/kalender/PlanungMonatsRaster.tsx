"use client";

import { useMemo } from "react";
import {
  eachWeekOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  getISOWeek,
  startOfMonth,
} from "date-fns";
import { de } from "date-fns/locale";
import { PlanungTagesSpalten } from "@/components/kalender/PlanungTagesSpalten";
import type { EinsatzEvent } from "@/types/planung";
import type { ProjektOption } from "@/types/planung";

type Props = {
  monatAnker: Date;
  zuweisungen: EinsatzEvent[];
  projekteById: Map<string, ProjektOption>;
  abwesenheitCountProTag: Record<string, number>;
  onEinsatzBearbeiten: (z: EinsatzEvent) => void;
  onEinsatzLoeschen: (z: EinsatzEvent) => void;
  onEinsatzDragStart: (e: React.DragEvent, z: EinsatzEvent) => void;
  onEinsatzDetail?: (z: EinsatzEvent, anchor: HTMLElement) => void;
};

export function PlanungMonatsRaster({
  monatAnker,
  zuweisungen,
  projekteById,
  abwesenheitCountProTag,
  onEinsatzBearbeiten,
  onEinsatzLoeschen,
  onEinsatzDragStart,
  onEinsatzDetail,
}: Props) {
  const wochen = useMemo(
    () =>
      eachWeekOfInterval(
        { start: startOfMonth(monatAnker), end: endOfMonth(monatAnker) },
        { weekStartsOn: 1 }
      ),
    [monatAnker]
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overflow-x-hidden px-1 pb-2">
      {wochen.map((wStart) => {
        const wEnd = endOfWeek(wStart, { weekStartsOn: 1 });
        return (
          <section
            key={format(wStart, "yyyy-MM-dd")}
            className="flex min-h-[280px] shrink-0 flex-col overflow-hidden rounded-xl border border-zinc-800/60 bg-zinc-950/80 shadow-sm"
          >
            <div className="shrink-0 border-b border-zinc-800/50 bg-zinc-900/40 px-3 py-2">
              <p className="text-[10px] font-semibold tracking-wider text-zinc-400 uppercase">
                KW {getISOWeek(wStart)} · {format(wStart, "dd.", { locale: de })}–
                {format(wEnd, "dd. MMMM yyyy", { locale: de })}
              </p>
            </div>
            <div className="flex min-h-[240px] min-w-0 flex-1 flex-col">
              <PlanungTagesSpalten
                wocheStart={wStart}
                zuweisungen={zuweisungen}
                projekteById={projekteById}
                abwesenheitCountProTag={abwesenheitCountProTag}
                onEinsatzBearbeiten={onEinsatzBearbeiten}
                onEinsatzLoeschen={onEinsatzLoeschen}
                onEinsatzDragStart={onEinsatzDragStart}
                onEinsatzDetail={onEinsatzDetail}
                kompakt
              />
            </div>
          </section>
        );
      })}
    </div>
  );
}

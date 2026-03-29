"use client";

import { endOfWeek, format, getISOWeek } from "date-fns";
import { de } from "date-fns/locale";
import { PlanungTagesSpalten } from "@/components/kalender/PlanungTagesSpalten";
import type { EinsatzEvent } from "@/types/planung";
import type { ProjektOption } from "@/types/planung";

type Props = {
  wocheStart: Date;
  zuweisungen: EinsatzEvent[];
  projekteById: Map<string, ProjektOption>;
  abwesenheitCountProTag: Record<string, number>;
  onEinsatzBearbeiten: (z: EinsatzEvent) => void;
  onEinsatzLoeschen: (z: EinsatzEvent) => void;
  onEinsatzDragStart: (e: React.DragEvent, z: EinsatzEvent) => void;
  onEinsatzDetail?: (z: EinsatzEvent, anchor: HTMLElement) => void;
};

export function PlanungWochenRaster({
  wocheStart,
  zuweisungen,
  projekteById,
  abwesenheitCountProTag,
  onEinsatzBearbeiten,
  onEinsatzLoeschen,
  onEinsatzDragStart,
  onEinsatzDetail,
}: Props) {
  const wocheEnde = endOfWeek(wocheStart, { weekStartsOn: 1 });
  const kw = getISOWeek(wocheStart);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-zinc-800/60 bg-zinc-950/80">
      <PlanungTagesSpalten
        wocheStart={wocheStart}
        zuweisungen={zuweisungen}
        projekteById={projekteById}
        abwesenheitCountProTag={abwesenheitCountProTag}
        onEinsatzBearbeiten={onEinsatzBearbeiten}
        onEinsatzLoeschen={onEinsatzLoeschen}
        onEinsatzDragStart={onEinsatzDragStart}
        onEinsatzDetail={onEinsatzDetail}
      />
      <div className="sr-only" aria-live="polite">
        Kalenderwoche {kw} {format(wocheStart, "dd.MM.", { locale: de })} bis{" "}
        {format(wocheEnde, "dd.MM.yyyy", { locale: de })}
      </div>
    </div>
  );
}

export function formatPlanungWocheLabel(wocheStart: Date): string {
  const wEnd = endOfWeek(wocheStart, { weekStartsOn: 1 });
  const kw = getISOWeek(wocheStart);
  return `KW ${kw} · ${format(wocheStart, "dd.", { locale: de })}–${format(wEnd, "dd. MMMM yyyy", { locale: de })}`;
}

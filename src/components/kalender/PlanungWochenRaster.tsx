"use client";

import { useMemo } from "react";
import { addDays, endOfWeek, format, getISOWeek, isSameDay } from "date-fns";
import { de } from "date-fns/locale";
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

type Props = {
  wocheStart: Date;
  zuweisungen: EinsatzEvent[];
  projekteById: Map<string, ProjektOption>;
  abwesenheitCountProTag: Record<string, number>;
  onEinsatzBearbeiten: (z: EinsatzEvent) => void;
  onEinsatzLoeschen: (z: EinsatzEvent) => void;
  onEinsatzDragStart: (e: React.DragEvent, z: EinsatzEvent) => void;
};

export function PlanungWochenRaster({
  wocheStart,
  zuweisungen,
  projekteById,
  abwesenheitCountProTag,
  onEinsatzBearbeiten,
  onEinsatzLoeschen,
  onEinsatzDragStart,
}: Props) {
  const wocheEnde = endOfWeek(wocheStart, { weekStartsOn: 1 });
  const von = format(wocheStart, "yyyy-MM-dd");
  const bis = format(wocheEnde, "yyyy-MM-dd");

  const tage = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(wocheStart, i)),
    [wocheStart]
  );

  const projektIdsInWoche = useMemo(() => {
    const ids = new Set<string>();
    for (const z of zuweisungen) {
      if (!z.project_id) continue;
      if (z.date < von || z.date > bis) continue;
      ids.add(z.project_id);
    }
    return Array.from(ids).sort((a, b) => {
      const ta = projekteById.get(a)?.title ?? a;
      const tb = projekteById.get(b)?.title ?? b;
      return ta.localeCompare(tb, "de");
    });
  }, [zuweisungen, von, bis, projekteById]);

  const einsaetzeByProjektDatum = useMemo(() => {
    const m = new Map<string, EinsatzEvent[]>();
    for (const z of zuweisungen) {
      if (!z.project_id) continue;
      if (z.date < von || z.date > bis) continue;
      const key = `${z.project_id}|${z.date}`;
      if (!m.has(key)) m.set(key, []);
      m.get(key)!.push(z);
    }
    return m;
  }, [zuweisungen, von, bis]);

  const kw = getISOWeek(wocheStart);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-zinc-950">
      <div
        className="grid shrink-0 border-b border-zinc-800/60"
        style={{ gridTemplateColumns: "repeat(7, 1fr)" }}
      >
        {tage.map((datum, i) => {
          const iso = format(datum, "yyyy-MM-dd");
          const heute = isSameDay(datum, new Date());
          const abw = abwesenheitCountProTag[iso] ?? 0;
          return (
            <div
              key={iso}
              className={cn(
                "border-r border-zinc-800/40 px-3 py-2.5 text-center last:border-0",
                heute ? "bg-zinc-900/60" : ""
              )}
            >
              <p
                className={cn(
                  "text-[10px] font-semibold tracking-wider uppercase",
                  heute ? "text-zinc-400" : "text-zinc-600"
                )}
              >
                {WOCHENTAGE_KURZ[i]}
              </p>
              <div
                className={cn(
                  "mx-auto mt-0.5 flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold",
                  heute ? "bg-zinc-100 text-zinc-900" : "text-zinc-300"
                )}
              >
                {format(datum, "d")}
              </div>
              {abw > 0 ? (
                <div className="mt-1 text-[9px] font-semibold text-amber-500/80">
                  {abw} Abw.
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
        {projektIdsInWoche.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-zinc-500">
            Keine Einsätze in dieser Kalenderwoche. Projekte von links auf einen Tag
            ziehen oder eine andere Woche wählen.
          </p>
        ) : (
          projektIdsInWoche.map((projektId) => {
            const proj = projekteById.get(projektId);
            const farbe =
              proj?.farbe?.trim() ||
              PRIORITAET_FARBEN[proj?.priority ?? "normal"] ||
              "#3b82f6";
            const titel = proj?.title ?? "Projekt";

            return (
              <div
                key={projektId}
                className="grid min-h-[72px] border-b border-zinc-800/30"
                style={{ gridTemplateColumns: "repeat(7, 1fr)" }}
              >
                {tage.map((datum) => {
                  const iso = format(datum, "yyyy-MM-dd");
                  const heute = isSameDay(datum, new Date());
                  const key = `${projektId}|${iso}`;
                  const list = einsaetzeByProjektDatum.get(key) ?? [];
                  return (
                    <div
                      key={iso}
                      data-planung-drop
                      data-datum={iso}
                      data-projekt-id={projektId}
                      className={cn(
                        "relative border-r border-zinc-800/30 p-1.5 last:border-0",
                        heute ? "bg-zinc-900/40" : "",
                        "transition-colors hover:bg-zinc-900/20"
                      )}
                      onDragOver={(e) => e.preventDefault()}
                    >
                      {list.map((einsatz) => (
                        <EinsatzChip
                          key={einsatz.id}
                          einsatz={einsatz}
                          projektTitel={titel}
                          projektFarbe={projektBalkenFarbe(einsatz, farbe)}
                          onBearbeiten={() => onEinsatzBearbeiten(einsatz)}
                          onLoeschen={() => onEinsatzLoeschen(einsatz)}
                          onDragStartNative={(ev) => onEinsatzDragStart(ev, einsatz)}
                        />
                      ))}
                    </div>
                  );
                })}
              </div>
            );
          })
        )}

        <div
          className="grid min-h-[48px] border-t border-zinc-800/40 border-dashed"
          style={{ gridTemplateColumns: "repeat(7, 1fr)" }}
        >
          {tage.map((datum) => {
            const iso = format(datum, "yyyy-MM-dd");
            return (
              <div
                key={`neu-${iso}`}
                data-planung-drop
                data-datum={iso}
                data-empty-row="1"
                className="min-h-[48px] border-r border-zinc-800/20 last:border-0 hover:bg-zinc-900/10"
                onDragOver={(e) => e.preventDefault()}
              />
            );
          })}
        </div>
      </div>

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

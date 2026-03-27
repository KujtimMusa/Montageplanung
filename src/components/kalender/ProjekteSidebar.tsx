"use client";

import { useEffect, useMemo, useState } from "react";
import { Draggable } from "@fullcalendar/interaction";
import { CalendarDays, CheckCircle2, GripVertical } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDatum } from "@/lib/utils/datum";
import {
  PRIORITAET_FARBEN,
  STATUS_FARBEN,
  planungPrioritaetLabel,
  planungStatusLabel,
} from "@/lib/constants/planung-farben";
import type { UngeplantesProjekt } from "@/types/planung";

type Props = {
  projekte: UngeplantesProjekt[];
};

export function ProjekteSidebar({ projekte }: Props) {
  const [suche, setSuche] = useState("");

  const gefiltert = useMemo(() => {
    const q = suche.trim().toLowerCase();
    if (!q) return projekte;
    return projekte.filter((p) => {
      const kunde = p.customerLabel ?? "";
      return (
        p.title.toLowerCase().includes(q) ||
        kunde.toLowerCase().includes(q)
      );
    });
  }, [projekte, suche]);

  useEffect(() => {
    const container = document.getElementById("projekte-drag-container");
    if (!container) return;

    const draggable = new Draggable(container, {
      itemSelector: ".draggable-projekt",
      eventData: (el: HTMLElement) => {
        const raw = el.getAttribute("data-event");
        let data: {
          title?: string;
          extendedProps?: {
            projektId?: string;
            prioritaet?: string;
            farbe?: string;
          };
        } = {};
        try {
          data = raw ? JSON.parse(raw) : {};
        } catch {
          /* ignore */
        }
        return {
          title: data.title ?? "Projekt",
          duration: { hours: 8 },
          extendedProps: data.extendedProps ?? {},
          color: "transparent",
        };
      },
    });

    return () => {
      draggable.destroy();
    };
  }, [projekte]);

  return (
    <div className="flex h-full min-h-0 flex-col border-r border-zinc-800 bg-zinc-950">
      <div className="flex shrink-0 items-center justify-between border-b border-zinc-800 p-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
          Offene Projekte
        </span>
        <Badge className="bg-zinc-800 text-zinc-400">{projekte.length}</Badge>
      </div>

      <Input
        placeholder="Suchen…"
        value={suche}
        onChange={(e) => setSuche(e.target.value)}
        className="m-2 h-7 w-[calc(100%-16px)] border-zinc-800 bg-zinc-900 text-xs"
      />

      <ScrollArea className="min-h-0 flex-1">
        <div id="projekte-drag-container" className="pb-3 pr-1">
          {gefiltert.length === 0 ? (
            projekte.length === 0 ? (
              <div className="flex h-32 flex-col items-center justify-center px-4 text-zinc-700">
                <CheckCircle2 size={28} className="mb-2 text-emerald-600" />
                <p className="text-center text-xs">
                  Alle Projekte eingeplant
                </p>
              </div>
            ) : (
              <p className="px-3 py-6 text-center text-xs text-zinc-500">
                Keine Treffer
              </p>
            )
          ) : (
            gefiltert.map((projekt) => {
              const prio = projekt.priority ?? "normal";
              const farbe =
                PRIORITAET_FARBEN[prio] ?? PRIORITAET_FARBEN.normal ?? "#3b82f6";
              const statusKey = (projekt.status ?? "neu").toLowerCase();
              const dataEvent = JSON.stringify({
                title: projekt.title,
                extendedProps: {
                  projektId: projekt.id,
                  prioritaet: prio,
                  farbe,
                },
              });
              return (
                <div
                  key={projekt.id}
                  className="draggable-projekt mx-2 mb-2 cursor-grab select-none rounded-lg border border-zinc-800 bg-zinc-900 p-3 transition-all duration-150 hover:border-zinc-600 hover:bg-zinc-800/80 active:cursor-grabbing"
                  data-event={dataEvent}
                >
                  <div
                    className="-mx-3 -mt-3 mb-2 h-0.5 rounded-t-lg rounded-full"
                    style={{ backgroundColor: farbe }}
                  />

                  <p className="truncate text-xs font-semibold leading-tight text-zinc-200">
                    {projekt.title}
                  </p>

                  {projekt.customerLabel ? (
                    <p className="mt-0.5 truncate text-[10px] text-zinc-500">
                      {projekt.customerLabel}
                    </p>
                  ) : null}

                  <div className="mt-2 flex flex-wrap items-center gap-1">
                    <Badge
                      className={`px-1.5 py-0 text-[9px] ${STATUS_FARBEN[statusKey] ?? "bg-zinc-800 text-zinc-300"}`}
                    >
                      {planungStatusLabel(statusKey)}
                    </Badge>
                    <div className="ml-auto flex items-center gap-0.5">
                      <div
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ background: farbe }}
                      />
                      <span className="text-[9px] text-zinc-600">
                        {planungPrioritaetLabel(prio)}
                      </span>
                    </div>
                  </div>

                  {projekt.plannedStart ? (
                    <p className="mt-1.5 flex items-center gap-1 text-[10px] text-zinc-600">
                      <CalendarDays size={9} />
                      {formatDatum(projekt.plannedStart)}
                      {projekt.plannedEnd ? (
                        <> → {formatDatum(projekt.plannedEnd)}</>
                      ) : null}
                    </p>
                  ) : null}

                  <p className="mt-1.5 flex items-center gap-1 text-[9px] text-zinc-700">
                    <GripVertical size={9} />
                    Auf Kalender ziehen
                  </p>
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

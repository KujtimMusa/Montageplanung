"use client";

import { useMemo, useState, type ReactNode } from "react";
import { CalendarDays, CheckCircle2, GripVertical, Layers } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDatum } from "@/lib/utils/datum";
import {
  PRIORITAET_FARBEN,
  STATUS_FARBEN,
  planungPrioritaetLabel,
  planungStatusLabel,
} from "@/lib/constants/planung-farben";
import type { ProjektOption, UngeplantesProjekt } from "@/types/planung";

type Props = {
  /** Noch ohne Einsatz ab heute — hierher ziehen, um eine Baustelle erstmals zu belegen */
  projekteOffen: UngeplantesProjekt[];
  /** Alle aktiven Projekte (Kalenderzeilen); für zusätzliche Tage / zweite Gewerke */
  projekteAlle: ProjektOption[];
  /** Anzahl Einsätze je Projekt-ID (Hinweis „schon geplant“) */
  einsatzCountByProjekt: Record<string, number>;
};

function prioRang(prio: string): number {
  switch (prio) {
    case "kritisch":
      return 1;
    case "hoch":
      return 2;
    case "normal":
    case "mittel":
      return 3;
    case "niedrig":
      return 4;
    default:
      return 5;
  }
}

export function ProjekteSidebar({
  projekteOffen,
  projekteAlle,
  einsatzCountByProjekt,
}: Props) {
  const [suche, setSuche] = useState("");

  const alleSortiert = useMemo(() => {
    return [...projekteAlle].sort((a, b) => {
      const pa = prioRang(a.priority ?? "normal");
      const pb = prioRang(b.priority ?? "normal");
      if (pa !== pb) return pa - pb;
      return a.title.localeCompare(b.title, "de");
    });
  }, [projekteAlle]);

  const gefiltertOffen = useMemo(() => {
    const q = suche.trim().toLowerCase();
    if (!q) return projekteOffen;
    return projekteOffen.filter((p) => {
      const kunde = p.customerLabel ?? "";
      return (
        p.title.toLowerCase().includes(q) ||
        kunde.toLowerCase().includes(q)
      );
    });
  }, [projekteOffen, suche]);

  const gefiltertAlle = useMemo(() => {
    const q = suche.trim().toLowerCase();
    if (!q) return alleSortiert;
    return alleSortiert.filter((p) => {
      const kunde = p.customerLabel ?? "";
      return (
        p.title.toLowerCase().includes(q) ||
        kunde.toLowerCase().includes(q)
      );
    });
  }, [alleSortiert, suche]);

  function projektCard(
    id: string,
    title: string,
    customerLabel: string | null,
    priority: string,
    statusKey: string,
    extra?: ReactNode
  ) {
    const prio = priority ?? "normal";
    const farbe =
      PRIORITAET_FARBEN[prio] ?? PRIORITAET_FARBEN.normal ?? "#3b82f6";
    const dataEvent = JSON.stringify({
      title,
      extendedProps: {
        projektId: id,
        prioritaet: prio,
        farbe,
      },
    });
    return (
      <div
        key={id}
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData("application/json", dataEvent);
          e.dataTransfer.effectAllowed = "copy";
        }}
        className="draggable-projekt mx-2 mb-2 cursor-grab select-none rounded-lg border border-zinc-800 bg-zinc-900 p-3 transition-all duration-150 hover:border-zinc-600 hover:bg-zinc-800/80 active:cursor-grabbing"
        data-event={dataEvent}
      >
        <div
          className="-mx-3 -mt-3 mb-2 h-0.5 rounded-t-lg rounded-full"
          style={{ backgroundColor: farbe }}
        />
        <p className="truncate text-xs font-semibold leading-tight text-zinc-200">
          {title}
        </p>
        {customerLabel ? (
          <p className="mt-0.5 truncate text-[10px] text-zinc-500">{customerLabel}</p>
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
        {extra}
        <p className="mt-1.5 flex items-center gap-1 text-[9px] text-zinc-700">
          <GripVertical size={9} />
          Auf Tag im Kalender ziehen
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col border-r border-zinc-800 bg-zinc-950">
      <div className="shrink-0 border-b border-zinc-800 px-3 py-2">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
          Linke Leiste
        </p>
        <p className="mt-0.5 text-[11px] leading-snug text-zinc-400">
          Projekte auf einen <span className="text-zinc-200">Tag</span> ziehen — mehrere
          Einsätze pro Tag und Projekt möglich (verschiedene Teams/Gewerke).
        </p>
      </div>

      <Tabs defaultValue="offen" className="flex min-h-0 flex-1 flex-col">
        <TabsList className="mx-2 mt-2 w-[calc(100%-16px)] shrink-0 bg-zinc-900/80">
          <TabsTrigger value="offen" className="flex-1 gap-1 text-xs">
            Offen
            <Badge variant="secondary" className="h-4 px-1 text-[9px] tabular-nums">
              {projekteOffen.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="alle" className="flex-1 gap-1 text-xs">
            <Layers className="size-3 opacity-70" aria-hidden />
            Alle
            <Badge variant="secondary" className="h-4 px-1 text-[9px] tabular-nums">
              {projekteAlle.length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        <Input
          placeholder="Projekte suchen…"
          value={suche}
          onChange={(e) => setSuche(e.target.value)}
          className="m-2 h-9 w-[calc(100%-16px)] rounded-lg border-zinc-600/80 bg-zinc-900/90 text-xs text-zinc-100 shadow-[inset_0_1px_2px_rgba(0,0,0,0.35)] placeholder:text-zinc-500 focus-visible:border-zinc-500 focus-visible:ring-2 focus-visible:ring-blue-500/25"
        />

        <TabsContent
          value="offen"
          className="mt-0 flex min-h-0 flex-1 flex-col data-[state=inactive]:hidden"
        >
          <div className="flex shrink-0 items-center justify-between border-b border-zinc-800 px-3 py-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Noch einplanen
            </span>
          </div>
          <ScrollArea className="min-h-0 flex-1">
            <div id="projekte-drag-container" className="pb-3 pr-1">
              {gefiltertOffen.length === 0 ? (
                projekteOffen.length === 0 ? (
                  <div className="flex h-28 flex-col items-center justify-center px-4 text-zinc-700">
                    <CheckCircle2 size={26} className="mb-2 text-emerald-600" />
                    <p className="text-center text-xs">
                      Alles mit Einsatz versehen — oder unter „Alle“ eine Baustelle
                      wählen.
                    </p>
                  </div>
                ) : (
                  <p className="px-3 py-6 text-center text-xs text-zinc-500">
                    Keine Treffer
                  </p>
                )
              ) : (
                gefiltertOffen.map((projekt) => {
                  const statusKey = (projekt.status ?? "neu").toLowerCase();
                  return projektCard(
                    projekt.id,
                    projekt.title,
                    projekt.customerLabel,
                    projekt.priority ?? "normal",
                    statusKey,
                    projekt.plannedStart ? (
                      <p className="mt-1.5 flex items-center gap-1 text-[10px] text-zinc-600">
                        <CalendarDays size={9} />
                        {formatDatum(projekt.plannedStart)}
                        {projekt.plannedEnd ? (
                          <> → {formatDatum(projekt.plannedEnd)}</>
                        ) : null}
                      </p>
                    ) : null
                  );
                })
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent
          value="alle"
          className="mt-0 flex min-h-0 flex-1 flex-col data-[state=inactive]:hidden"
        >
          <div className="flex shrink-0 items-center justify-between border-b border-zinc-800 px-3 py-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Alle Baustellen
            </span>
          </div>
          <ScrollArea className="min-h-0 flex-1">
            <div id="projekte-alle-drag-container" className="pb-3 pr-1">
              {gefiltertAlle.length === 0 ? (
                <p className="px-3 py-6 text-center text-xs text-zinc-500">
                  Keine aktiven Projekte.
                </p>
              ) : (
                gefiltertAlle.map((projekt) => {
                  const statusKey = (projekt.status ?? "neu").toLowerCase();
                  const n = einsatzCountByProjekt[projekt.id] ?? 0;
                  return projektCard(
                    projekt.id,
                    projekt.title,
                    projekt.customerLabel || null,
                    projekt.priority ?? "normal",
                    statusKey,
                    n > 0 ? (
                      <p className="mt-1.5 text-[10px] text-zinc-500">
                        {n} Einsatz{n === 1 ? "" : "e"} im System — weitere Tage
                        möglich
                      </p>
                    ) : (
                      <p className="mt-1.5 text-[10px] text-zinc-600">
                        Noch kein Einsatz
                      </p>
                    )
                  );
                })
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}

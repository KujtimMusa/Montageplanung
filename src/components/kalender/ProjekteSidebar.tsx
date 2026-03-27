"use client";

import { useMemo, useState, type ReactNode } from "react";
import { ChevronDown, GripVertical } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  PRIORITAET_FARBEN,
  STATUS_FARBEN,
  planungPrioritaetLabel,
  planungStatusLabel,
} from "@/lib/constants/planung-farben";
import type { ProjektOption } from "@/types/planung";

type ProjektGruppe = {
  id: "noch" | "geplant" | "abgeschlossen";
  label: string;
  status: string[];
  farbe: string;
  icon: string;
};

const GRUPPEN: ProjektGruppe[] = [
  {
    id: "noch",
    label: "Noch einplanen",
    status: ["neu", "offen"],
    farbe: "#3b82f6",
    icon: "○",
  },
  {
    id: "geplant",
    label: "Geplant",
    status: ["geplant", "aktiv"],
    farbe: "#10b981",
    icon: "◉",
  },
  {
    id: "abgeschlossen",
    label: "Abgeschlossen",
    status: ["abgeschlossen", "fertig"],
    farbe: "#22c55e",
    icon: "●",
  },
];

type Props = {
  projekteAlle: ProjektOption[];
  /** Einsätze nur in der laufenden Kalenderwoche je Projekt */
  einsatzCountByProjektWoche: Record<string, number>;
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

function inGruppe(statusRaw: string, gruppe: ProjektGruppe): boolean {
  const s = statusRaw.toLowerCase();
  return gruppe.status.includes(s);
}

export function ProjekteSidebar({
  projekteAlle,
  einsatzCountByProjektWoche,
}: Props) {
  const [suche, setSuche] = useState("");
  const [offen, setOffen] = useState<Record<string, boolean>>({
    noch: true,
    geplant: true,
    abgeschlossen: false,
  });

  const alleSortiert = useMemo(() => {
    return [...projekteAlle].sort((a, b) => {
      const pa = prioRang(a.priority ?? "normal");
      const pb = prioRang(b.priority ?? "normal");
      if (pa !== pb) return pa - pb;
      return a.title.localeCompare(b.title, "de");
    });
  }, [projekteAlle]);

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

  const projekteProGruppe = useMemo(() => {
    const map: Record<string, ProjektOption[]> = {
      noch: [],
      geplant: [],
      abgeschlossen: [],
    };
    for (const p of gefiltertAlle) {
      const st = (p.status ?? "neu").toLowerCase();
      let placed = false;
      for (const g of GRUPPEN) {
        if (inGruppe(st, g)) {
          map[g.id].push(p);
          placed = true;
          break;
        }
      }
      if (!placed) {
        map.noch.push(p);
      }
    }
    for (const g of GRUPPEN) {
      map[g.id].sort((a, b) => {
        const pa = prioRang(a.priority ?? "normal");
        const pb = prioRang(b.priority ?? "normal");
        if (pa !== pb) return pa - pb;
        return a.title.localeCompare(b.title, "de");
      });
    }
    return map;
  }, [gefiltertAlle]);

  function projektKarte(
    p: ProjektOption,
    gruppeId: ProjektGruppe["id"]
  ): ReactNode {
    const prio = p.priority ?? "normal";
    const prioFarbe =
      PRIORITAET_FARBEN[prio] ?? PRIORITAET_FARBEN.normal ?? "#3b82f6";
    const statusKey = (p.status ?? "neu").toLowerCase();
    const kunde = p.customerLabel?.trim() || null;
    const wocheN = einsatzCountByProjektWoche[p.id] ?? 0;
    const dataEvent = JSON.stringify({
      title: p.title,
      extendedProps: {
        projektId: p.id,
        prioritaet: prio,
        farbe: prioFarbe,
      },
    });

    return (
      <div
        key={`${gruppeId}-${p.id}`}
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData("application/json", dataEvent);
          e.dataTransfer.effectAllowed = "copy";
        }}
        className="draggable-projekt mx-2 mb-2 cursor-grab select-none rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 py-2 transition-all duration-150 hover:border-zinc-600 hover:bg-zinc-800/80 active:cursor-grabbing"
        data-event={dataEvent}
      >
        <p className="truncate text-xs font-semibold leading-tight text-zinc-200">
          {p.title}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <span
            className="inline-block size-1.5 shrink-0 rounded-full"
            style={{ background: prioFarbe }}
            title={planungPrioritaetLabel(prio)}
          />
          <span className="text-[10px] text-zinc-500">
            {planungPrioritaetLabel(prio)}
          </span>
          <Badge
            className={cn(
              "ml-auto px-1 py-0 text-[9px]",
              STATUS_FARBEN[statusKey] ?? "bg-zinc-800 text-zinc-300"
            )}
          >
            {planungStatusLabel(statusKey)}
          </Badge>
        </div>
        {kunde ? (
          <p className="mt-0.5 truncate text-[10px] text-zinc-500">{kunde}</p>
        ) : null}
        {gruppeId === "geplant" ? (
          <p className="mt-1 text-[10px] text-zinc-500">
            {wocheN} Einsatz{wocheN === 1 ? "" : "e"} diese Woche
          </p>
        ) : null}
        {gruppeId === "noch" ? (
          <p className="mt-1 flex items-center gap-1 text-[9px] text-zinc-600">
            <GripVertical size={9} />
            Auf Tag im Kalender ziehen
          </p>
        ) : null}
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
          Projekte auf einen <span className="text-zinc-200">Tag</span> ziehen —
          mehrere Einsätze pro Tag und Projekt möglich.
        </p>
      </div>

      <Input
        placeholder="Projekte suchen…"
        value={suche}
        onChange={(e) => setSuche(e.target.value)}
        className="m-2 h-9 w-[calc(100%-16px)] rounded-lg border-zinc-600/80 bg-zinc-900/90 text-xs text-zinc-100 shadow-[inset_0_1px_2px_rgba(0,0,0,0.35)] placeholder:text-zinc-500 focus-visible:border-zinc-500 focus-visible:ring-2 focus-visible:ring-blue-500/25"
      />

      <ScrollArea className="min-h-0 flex-1">
        <div className="pb-3 pr-1">
          {GRUPPEN.map((gruppe) => {
            const liste = projekteProGruppe[gruppe.id];
            const expanded = offen[gruppe.id] ?? true;
            return (
              <div key={gruppe.id} className="mb-1">
                <button
                  type="button"
                  onClick={() =>
                    setOffen((o) => ({ ...o, [gruppe.id]: !expanded }))
                  }
                  className="flex w-full items-center gap-2 border-b border-zinc-800/80 bg-zinc-950/90 px-3 py-2 text-left hover:bg-zinc-900/80"
                >
                  <span
                    className="text-xs text-zinc-500"
                    style={{ color: gruppe.farbe }}
                    aria-hidden
                  >
                    {gruppe.icon}
                  </span>
                  <span className="flex-1 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                    {gruppe.label}
                  </span>
                  <Badge
                    variant="secondary"
                    className="h-5 px-1.5 text-[9px] tabular-nums"
                  >
                    {liste.length}
                  </Badge>
                  <ChevronDown
                    className={cn(
                      "size-4 shrink-0 text-zinc-600 transition-transform",
                      expanded ? "rotate-180" : ""
                    )}
                  />
                </button>
                {expanded ? (
                  <div className="pt-1">
                    {liste.length === 0 ? (
                      <p className="px-3 py-4 text-center text-[11px] text-zinc-600">
                        Keine Projekte in dieser Gruppe
                        {suche.trim() ? " (Suche)" : ""}.
                      </p>
                    ) : (
                      liste.map((pr) => projektKarte(pr, gruppe.id))
                    )}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}

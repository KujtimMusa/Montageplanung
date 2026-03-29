"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { GripVertical } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
  dot: string;
};

const GRUPPEN: ProjektGruppe[] = [
  { id: "noch", label: "Noch einplanen", dot: "#3b82f6" },
  { id: "geplant", label: "Geplant/Aktiv", dot: "#10b981" },
  { id: "abgeschlossen", label: "Abgeschlossen", dot: "#22c55e" },
];

type Props = {
  projekteAlle: ProjektOption[];
  /** Einsätze im aktuell gewählten Kalenderzeitraum (Woche oder Monat) */
  einsatzCountByProjektImRaster: Record<string, number>;
  einsatzCountByProjekt: Record<string, number>;
  /** z. B. „diese Woche“ oder „im März 2026“ */
  rasterZeitraumLabel: string;
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

function sidebarBucket(
  statusRaw: string,
  assignmentCount: number
): ProjektGruppe["id"] {
  const s = statusRaw.toLowerCase();
  if (s === "abgeschlossen" || s === "fertig") return "abgeschlossen";
  if (assignmentCount > 0) return "geplant";
  return "noch";
}

export function ProjekteSidebar({
  projekteAlle,
  einsatzCountByProjektImRaster,
  einsatzCountByProjekt,
  rasterZeitraumLabel,
}: Props) {
  const router = useRouter();
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

  const projekteProGruppe = useMemo(() => {
    const map: Record<string, ProjektOption[]> = {
      noch: [],
      geplant: [],
      abgeschlossen: [],
    };
    for (const p of alleSortiert) {
      const cnt = einsatzCountByProjekt[p.id] ?? 0;
      const b = sidebarBucket(p.status ?? "neu", cnt);
      map[b].push(p);
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
  }, [alleSortiert, einsatzCountByProjekt]);

  function projektKarte(
    p: ProjektOption,
    gruppeId: ProjektGruppe["id"]
  ): ReactNode {
    const prio = p.priority ?? "normal";
    const prioFarbe =
      PRIORITAET_FARBEN[prio] ?? PRIORITAET_FARBEN.normal ?? "#3b82f6";
    const statusKey = (p.status ?? "neu").toLowerCase();
    const kunde = p.customerLabel?.trim() || null;
    const rasterN = einsatzCountByProjektImRaster[p.id] ?? 0;
    const projektHex = p.farbe?.trim();
    const punkt = projektHex || prioFarbe;
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
        className="group mb-1 flex cursor-grab select-none items-start gap-2 rounded-lg border border-zinc-800/60 bg-zinc-900 p-2.5 transition-all hover:border-zinc-700/60 active:cursor-grabbing"
        data-event={dataEvent}
      >
        <div
          className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
          style={{ background: punkt }}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs leading-tight font-semibold text-zinc-300">
            {p.title}
          </p>
          <p className="mt-0.5 text-[10px] text-zinc-600">
            {einsatzCountByProjekt[p.id] ?? 0} Einsätze
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
            <p className="mt-0.5 truncate text-[10px] text-zinc-600">{kunde}</p>
          ) : null}
          {gruppeId === "geplant" ? (
            <p className="mt-1 text-[10px] text-zinc-500">
              {rasterN} Einsatz{rasterN === 1 ? "" : "e"} {rasterZeitraumLabel}
            </p>
          ) : null}
          {gruppeId === "noch" ? (
            <p className="mt-1 flex items-center gap-1 text-[9px] text-zinc-600">
              <GripVertical size={9} />
              Auf Tag im Kalender ziehen
            </p>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-zinc-950">
      <div className="flex h-[52px] shrink-0 items-center justify-between border-b border-zinc-800/60 pl-5 pr-4">
        <h2 className="text-xs font-semibold tracking-wider text-zinc-400 uppercase">
          Projekte
        </h2>
        <button
          type="button"
          onClick={() => router.push("/projekte")}
          className="text-[10px] text-zinc-600 transition-colors hover:text-zinc-400"
        >
          Alle →
        </button>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-1 py-3 pl-5 pr-3">
          {GRUPPEN.map((gruppe) => {
            const liste = projekteProGruppe[gruppe.id];
            const expanded = offen[gruppe.id] ?? true;
            return (
              <div key={gruppe.id} className="mb-3">
                <button
                  type="button"
                  onClick={() =>
                    setOffen((o) => ({ ...o, [gruppe.id]: !expanded }))
                  }
                  className="mb-1 flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-[10px] font-semibold tracking-wider text-zinc-600 uppercase transition-colors hover:text-zinc-400"
                >
                  <div className="flex items-center gap-1.5">
                    <div
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ background: gruppe.dot }}
                    />
                    {gruppe.label}
                  </div>
                  <span className="text-zinc-700">{liste.length}</span>
                </button>
                {expanded ? (
                  liste.length === 0 ? (
                    <p className="rounded-md border border-dashed border-zinc-800/60 px-2 py-3 text-center text-[10px] text-zinc-600">
                      Keine Projekte
                    </p>
                  ) : (
                    <div>{liste.map((pr) => projektKarte(pr, gruppe.id))}</div>
                  )
                ) : null}
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}

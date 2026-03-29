"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { AlertTriangle, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { EinsatzEvent } from "@/types/planung";

type Props = {
  einsatz: EinsatzEvent;
  projektTitel: string;
  projektFarbe: string;
  onBearbeiten: () => void;
  onLoeschen: () => void;
  onDragStartNative: (e: React.DragEvent) => void;
};

export function EinsatzChip({
  einsatz,
  projektTitel,
  projektFarbe,
  onBearbeiten,
  onLoeschen,
  onDragStartNative,
}: Props) {
  const [hovered, setHovered] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);
  const [tipPos, setTipPos] = useState({ top: 0, left: 0 });

  const istKonflikt = Boolean(einsatz.hatKonflikt);
  const team = einsatz.teams;
  const mitglieder = team?.mitglieder ?? [];
  const partnerName = einsatz.dienstleister?.company_name?.trim() ?? null;

  const updatePos = useCallback(() => {
    const el = anchorRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setTipPos({ top: r.bottom + 6, left: Math.min(r.left, window.innerWidth - 240) });
  }, []);

  useLayoutEffect(() => {
    if (!hovered) return;
    updatePos();
    const onScroll = () => updatePos();
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, [hovered, updatePos]);

  const start = einsatz.start_time?.slice(0, 5) ?? "–";
  const end = einsatz.end_time?.slice(0, 5) ?? "–";

  return (
    <div ref={anchorRef} className="relative">
      <div
        draggable
        onDragStart={onDragStartNative}
        onMouseEnter={() => {
          setHovered(true);
          updatePos();
        }}
        onMouseLeave={() => setHovered(false)}
        className={cn(
          "mb-1 flex cursor-grab items-center gap-1.5 rounded-md border px-2 py-1.5 text-xs font-semibold transition-all select-none active:cursor-grabbing",
          istKonflikt
            ? "border-orange-600/60 bg-orange-950/40 text-orange-300"
            : "border-zinc-700/50 bg-zinc-800/80 text-zinc-300",
          "hover:border-zinc-600 hover:bg-zinc-800"
        )}
      >
        <div
          className="h-1.5 w-1.5 shrink-0 rounded-full"
          style={{ background: projektFarbe }}
        />
        <span className="min-w-0 flex-1 truncate">{projektTitel}</span>
      </div>

      {hovered ? (
        <div
          className="fixed z-[200] w-56 min-w-[224px] rounded-xl border border-zinc-700 bg-zinc-900 p-3 shadow-2xl shadow-black/60"
          style={{ top: tipPos.top, left: tipPos.left }}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        >
          <div className="mb-3 flex items-center gap-2">
            <div
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ background: projektFarbe }}
            />
            <p className="text-xs font-bold text-zinc-200">{projektTitel}</p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] tracking-wider text-zinc-600 uppercase">
                Zeit
              </span>
              <span className="text-xs font-semibold text-zinc-300 tabular-nums">
                {start} – {end}
              </span>
            </div>

            {team ? (
              <div className="flex items-center justify-between">
                <span className="text-[10px] tracking-wider text-zinc-600 uppercase">
                  Team
                </span>
                <div className="flex items-center gap-1.5">
                  <div
                    className="h-2 w-2 rounded-full"
                    style={{ background: team.farbe ?? projektFarbe }}
                  />
                  <span className="text-xs font-semibold text-zinc-300">{team.name}</span>
                </div>
              </div>
            ) : partnerName ? (
              <div className="flex items-center justify-between">
                <span className="text-[10px] tracking-wider text-zinc-600 uppercase">
                  Partner
                </span>
                <span className="max-w-[10rem] truncate text-xs font-semibold text-zinc-300">
                  {partnerName}
                </span>
              </div>
            ) : null}

            {mitglieder.length > 0 ? (
              <div className="flex items-center justify-between">
                <span className="text-[10px] tracking-wider text-zinc-600 uppercase">
                  Mitarbeiter
                </span>
                <div className="-space-x-1 flex">
                  {mitglieder.slice(0, 4).map((m) => (
                    <div
                      key={m.id}
                      title={m.name}
                      className="flex h-5 w-5 items-center justify-center rounded-full border border-zinc-900 bg-zinc-700 text-[8px] font-bold text-zinc-400"
                    >
                      {m.name?.slice(0, 2).toUpperCase()}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {istKonflikt ? (
              <div className="mt-1 flex items-center gap-1.5 border-t border-zinc-800 pt-2">
                <AlertTriangle size={11} className="text-orange-400" />
                <span className="text-[10px] font-semibold text-orange-400">
                  Überschneidung mit anderem Einsatz
                </span>
              </div>
            ) : null}
          </div>

          <div className="mt-3 flex gap-1.5 border-t border-zinc-800 pt-2">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onBearbeiten();
              }}
              className="flex-1 rounded-md bg-zinc-800 py-1 text-[10px] font-semibold text-zinc-400 transition-colors hover:bg-zinc-700 hover:text-zinc-200"
            >
              Bearbeiten
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onLoeschen();
              }}
              className="rounded-md px-2 py-1 text-zinc-600 transition-colors hover:bg-red-950 hover:text-red-400"
            >
              <Trash2 size={11} />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

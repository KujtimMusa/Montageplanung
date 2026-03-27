"use client";

import { useEffect, useRef } from "react";
import { MapPin, Zap } from "lucide-react";
import { format, parseISO } from "date-fns";
import { de } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { dbPrioritaetZuUi } from "@/lib/utils/priority";
import type { EinsatzEvent } from "@/types/planung";

const PRI_LABEL: Record<string, string> = {
  niedrig: "Niedrig",
  mittel: "Mittel",
  hoch: "Hoch",
  kritisch: "Kritisch",
};

type Props = {
  offen: boolean;
  zuweisung: EinsatzEvent | null;
  position: { top: number; left: number } | null;
  onClose: () => void;
  onBearbeiten: () => void;
  onLoeschen: () => void;
  loeschenOffen: boolean;
  setLoeschenOffen: (v: boolean) => void;
};

export function EinsatzEventDetailFloating({
  offen,
  zuweisung,
  position,
  onClose,
  onBearbeiten,
  onLoeschen,
  loeschenOffen,
  setLoeschenOffen,
}: Props) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!offen) return;
    function handleDown(e: MouseEvent) {
      const t = e.target as HTMLElement | null;
      if (!t) return;
      if (panelRef.current?.contains(t)) return;
      if (
        t.closest('[data-slot="dialog-content"]') ||
        t.closest('[data-slot="dialog-overlay"]')
      )
        return;
      onClose();
    }
    document.addEventListener("mousedown", handleDown);
    return () => document.removeEventListener("mousedown", handleDown);
  }, [offen, onClose]);

  if (!offen || !zuweisung || !position) return null;

  const titel =
    zuweisung.projects?.title ??
    (zuweisung.project_title?.trim() ? zuweisung.project_title.trim() : null) ??
    "Einsatz";

  const teamName =
    zuweisung.dienstleister?.company_name ?? zuweisung.teams?.name ?? "—";
  const farbe =
    zuweisung.teams?.farbe?.trim() ||
    (zuweisung.dienstleister?.company_name ? "#a855f7" : "#3b82f6");
  const priUi = dbPrioritaetZuUi(
    zuweisung.prioritaet ?? zuweisung.projects?.priority
  );

  let left = position.left;
  let top = position.top;
  if (typeof window !== "undefined") {
    const w = 320;
    const h = 280;
    left = Math.min(left, window.innerWidth - w - 8);
    top = Math.min(top, window.innerHeight - h - 8);
    left = Math.max(8, left);
    top = Math.max(8, top);
  }

  return (
    <>
      <div
        ref={panelRef}
        className="fixed z-[60] w-80 rounded-lg border border-zinc-700 bg-zinc-900 p-3 shadow-xl"
        style={{ left, top }}
        role="dialog"
        aria-label="Einsatzdetails"
      >
        <h3 className="font-semibold leading-tight text-zinc-50">{titel}</h3>
        <div className="mt-2 flex items-center gap-2">
          <span
            className="inline-block size-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: farbe }}
          />
          <span className="text-sm text-zinc-300">{teamName}</span>
        </div>
        <p className="mt-1 text-xs text-zinc-400">
          {format(parseISO(zuweisung.date), "EEEE, dd. MMMM yyyy", { locale: de })}
        </p>
        <p className="mt-1 text-sm tabular-nums text-zinc-200">
          {zuweisung.start_time.slice(0, 5)} – {zuweisung.end_time.slice(0, 5)}{" "}
          Uhr
        </p>
        {zuweisung.ortLabel?.trim() ? (
          <p className="mt-2 flex gap-2 text-xs leading-snug text-zinc-400">
            <MapPin className="mt-0.5 size-3.5 shrink-0 text-zinc-500" />
            <span>{zuweisung.ortLabel.trim()}</span>
          </p>
        ) : null}
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Badge
            variant="secondary"
            className={cn(
              "text-xs",
              priUi === "kritisch" && "border border-red-500/50 bg-red-950/40 text-red-200"
            )}
          >
            {PRI_LABEL[priUi] ?? priUi}
            {priUi === "kritisch" && (
              <Zap className="ml-1 inline size-3 text-red-400" aria-hidden />
            )}
          </Badge>
        </div>
        {zuweisung.notes?.trim() ? (
          <p className="mt-2 text-sm text-zinc-500">{zuweisung.notes.trim()}</p>
        ) : null}
        <Separator className="my-3 bg-zinc-800" />
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="flex-1"
            onClick={() => {
              onBearbeiten();
              onClose();
            }}
          >
            Bearbeiten
          </Button>
          <Button
            type="button"
            size="sm"
            variant="destructive"
            className="flex-1"
            onClick={() => setLoeschenOffen(true)}
          >
            Löschen
          </Button>
        </div>
      </div>

      <Dialog open={loeschenOffen} onOpenChange={setLoeschenOffen}>
        <DialogContent className="border-zinc-800 bg-zinc-950 sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-zinc-50">Einsatz löschen?</DialogTitle>
            <DialogDescription>
              Dieser Einsatz wird unwiderruflich entfernt.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setLoeschenOffen(false)}
            >
              Abbrechen
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                onLoeschen();
                setLoeschenOffen(false);
                onClose();
              }}
            >
              Löschen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

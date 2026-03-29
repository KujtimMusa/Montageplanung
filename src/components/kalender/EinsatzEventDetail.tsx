"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EinsatzDetailPopover } from "@/components/kalender/EinsatzDetailPopover";
import type { EinsatzEvent } from "@/types/planung";

type Props = {
  offen: boolean;
  einsaetze: EinsatzEvent[] | null;
  position: { top: number; left: number } | null;
  onClose: () => void;
  onBearbeiten: () => void;
  onLoeschen: () => void;
  loeschenOffen: boolean;
  setLoeschenOffen: (v: boolean) => void;
};

export function EinsatzEventDetailFloating({
  offen,
  einsaetze,
  position,
  onClose,
  onBearbeiten,
  onLoeschen,
  loeschenOffen,
  setLoeschenOffen,
}: Props) {
  if (!offen || !einsaetze?.length || !position) return null;

  return (
    <>
      <EinsatzDetailPopover
        einsaetze={einsaetze}
        position={{ x: position.left, y: position.top }}
        onClose={onClose}
        onBearbeiten={onBearbeiten}
        onDeleteMenu={() => setLoeschenOffen(true)}
      />

      <Dialog open={loeschenOffen} onOpenChange={setLoeschenOffen}>
        <DialogContent className="border-zinc-800 bg-zinc-950 sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-zinc-50">Einsatz löschen?</DialogTitle>
            <DialogDescription>
              {einsaetze.length > 1
                ? `Alle ${einsaetze.length} Zuweisungen dieser Kachel (gleiches Projekt, gleicher Tag) werden unwiderruflich entfernt.`
                : "Dieser Einsatz wird unwiderruflich entfernt."}
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

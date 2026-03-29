"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ComponentType } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import * as LucideIcons from "lucide-react";
import { Building2, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { nachrichtAusUnbekannt } from "@/lib/fehler";
import { StammdatenSection } from "@/components/stammdaten/StammdatenSection";
import { StammdatenFilterBar } from "@/components/stammdaten/StammdatenFilterBar";
import {
  STAMMDATEN_FILTER_INPUT,
  STAMMDATEN_HEADER_BUTTON,
  STAMMDATEN_TABLE,
  STAMMDATEN_TH,
  STAMMDATEN_TABELLE_HUELLE,
} from "@/components/stammdaten/stammdatenKlassen";
import { cn } from "@/lib/utils";

type Zeile = {
  id: string;
  name: string;
  color: string;
  icon: string | null;
  anzahlTeams: number;
  anzahlMitarbeiter: number;
};

const ICON_NAMEN = [
  "Zap",
  "Wrench",
  "HardHat",
  "Layers",
  "Settings",
  "Building2",
  "Hammer",
  "Cable",
  "Droplets",
  "Wind",
  "Sun",
  "Grid3x3",
] as const;

function IconVorschau({ name }: { name: string | null }) {
  if (!name) return <span className="text-muted-foreground">—</span>;
  const Cmp = (
    LucideIcons as unknown as Record<
      string,
      ComponentType<{ className?: string }>
    >
  )[name];
  if (!Cmp) return <span>{name}</span>;
  return <Cmp className="size-5" aria-hidden />;
}

function IconOption({ name }: { name: string }) {
  const Cmp = (
    LucideIcons as unknown as Record<
      string,
      ComponentType<{ className?: string }>
    >
  )[name];
  return (
    <span className="flex items-center gap-2">
      {Cmp ? <Cmp className="size-4" /> : null}
      {name}
    </span>
  );
}

type AbteilungenVerwaltungProps = {
  onDatenGeaendert?: () => void;
};

export function AbteilungenVerwaltung({
  onDatenGeaendert,
}: AbteilungenVerwaltungProps = {}) {
  const supabase = useMemo(() => createClient(), []);
  const [zeilen, setZeilen] = useState<Zeile[]>([]);
  const [sheetOffen, setSheetOffen] = useState(false);
  const [bearbeitenId, setBearbeitenId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [farbe, setFarbe] = useState("#3b82f6");
  const [icon, setIcon] = useState<string>("Wrench");
  const [lädt, setLädt] = useState(false);
  const [listeLaedt, setListeLaedt] = useState(true);

  const [loeschenDialog, setLoeschenDialog] = useState<Zeile | null>(null);
  const [sucheAbteilung, setSucheAbteilung] = useState("");

  const laden = useCallback(async () => {
    setListeLaedt(true);
    try {
      const [{ data: depts, error: e1 }, { data: teams }, { data: emps }] =
        await Promise.all([
          supabase.from("departments").select("id,name,color,icon").order("name"),
          supabase.from("teams").select("id,department_id"),
          supabase.from("employees").select("id,department_id"),
        ]);
      if (e1) throw e1;

      const teamCount: Record<string, number> = {};
      for (const t of teams ?? []) {
        const d = (t as { department_id: string | null }).department_id;
        if (d) teamCount[d] = (teamCount[d] ?? 0) + 1;
      }
      const empCount: Record<string, number> = {};
      for (const e of emps ?? []) {
        const d = (e as { department_id: string | null }).department_id;
        if (d) empCount[d] = (empCount[d] ?? 0) + 1;
      }

      setZeilen(
        (depts ?? []).map((z) => ({
          id: z.id as string,
          name: z.name as string,
          color: z.color as string,
          icon: (z.icon as string | null) ?? null,
          anzahlTeams: teamCount[z.id as string] ?? 0,
          anzahlMitarbeiter: empCount[z.id as string] ?? 0,
        }))
      );
    } catch (e) {
      toast.error(nachrichtAusUnbekannt(e, "Laden fehlgeschlagen."));
    } finally {
      setListeLaedt(false);
      onDatenGeaendert?.();
    }
  }, [supabase, onDatenGeaendert]);

  useEffect(() => {
    void laden();
  }, [laden]);

  const zeilenGefiltert = useMemo(() => {
    const q = sucheAbteilung.trim().toLowerCase();
    if (!q) return zeilen;
    return zeilen.filter(
      (z) =>
        z.name.toLowerCase().includes(q) ||
        (z.icon ?? "").toLowerCase().includes(q)
    );
  }, [zeilen, sucheAbteilung]);

  function leeren() {
    setBearbeitenId(null);
    setName("");
    setFarbe("#3b82f6");
    setIcon("Wrench");
  }

  function oeffnenNeu() {
    leeren();
    setSheetOffen(true);
  }

  function oeffnenBearbeiten(z: Zeile) {
    setBearbeitenId(z.id);
    setName(z.name);
    setFarbe(z.color);
    setIcon(
      z.icon && (ICON_NAMEN as readonly string[]).includes(z.icon)
        ? z.icon
        : "Wrench"
    );
    setSheetOffen(true);
  }

  async function speichern() {
    if (!name.trim()) {
      toast.error("Name ist Pflicht.");
      return;
    }
    setLädt(true);
    try {
      const payload = { name: name.trim(), color: farbe, icon };
      if (bearbeitenId) {
        const { error } = await supabase
          .from("departments")
          .update(payload)
          .eq("id", bearbeitenId);
        if (error) throw error;
        toast.success("Abteilung gespeichert.");
      } else {
        const { error } = await supabase.from("departments").insert(payload);
        if (error) throw error;
        toast.success("Abteilung angelegt.");
      }
      setSheetOffen(false);
      leeren();
      void laden();
    } catch (e) {
      toast.error(nachrichtAusUnbekannt(e, "Speichern fehlgeschlagen."));
    } finally {
      setLädt(false);
    }
  }

  async function loeschenBestaetigt() {
    if (!loeschenDialog) return;
    setLädt(true);
    try {
      const { error } = await supabase
        .from("departments")
        .delete()
        .eq("id", loeschenDialog.id);
      if (error) throw error;
      toast.success("Abteilung gelöscht.");
      setLoeschenDialog(null);
      setSheetOffen(false);
      leeren();
      void laden();
    } catch (e) {
      toast.error(nachrichtAusUnbekannt(e, "Löschen fehlgeschlagen."));
    } finally {
      setLädt(false);
    }
  }

  if (listeLaedt) {
    return (
      <StammdatenSection title="Abteilungen">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
          Lade Abteilungen…
        </div>
      </StammdatenSection>
    );
  }

  return (
    <StammdatenSection
      title="Abteilungen"
      actions={
        <Button
          type="button"
          className={cn(STAMMDATEN_HEADER_BUTTON, "gap-1")}
          onClick={oeffnenNeu}
        >
          <Plus className="size-4 shrink-0" />
          Neue Abteilung
        </Button>
      }
    >
      <StammdatenFilterBar>
        <Input
          placeholder="Abteilungen suchen…"
          value={sucheAbteilung}
          onChange={(e) => setSucheAbteilung(e.target.value)}
          className={STAMMDATEN_FILTER_INPUT}
        />
      </StammdatenFilterBar>

      {zeilen.length === 0 ? (
        <Card className="border-dashed border-zinc-700 bg-zinc-900/40">
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Building2 className="size-12 text-zinc-600" />
            <p className="font-medium text-zinc-200">
              Noch keine Abteilungen vorhanden
            </p>
            <p className="max-w-sm text-sm text-zinc-500">
              Lege Abteilungen an, um Teams und Filter zu strukturieren.
            </p>
            <Button type="button" onClick={oeffnenNeu}>
              <Plus className="mr-1 size-4" />
              Abteilung hinzufügen
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className={STAMMDATEN_TABELLE_HUELLE}>
          <Table className={STAMMDATEN_TABLE}>
            <TableHeader>
              <TableRow className="border-zinc-800 hover:bg-transparent">
                <TableHead className={cn("w-12", STAMMDATEN_TH)}>Farbe</TableHead>
                <TableHead className={cn("w-14", STAMMDATEN_TH)}>Icon</TableHead>
                <TableHead className={cn("min-w-[10rem] w-[26%]", STAMMDATEN_TH)}>
                  Name
                </TableHead>
                <TableHead className={cn("w-24 text-right", STAMMDATEN_TH)}>
                  Teams
                </TableHead>
                <TableHead className={cn("w-28 text-right", STAMMDATEN_TH)}>
                  Mitarbeiter
                </TableHead>
                <TableHead className={cn("w-[9.5rem] text-right", STAMMDATEN_TH)}>
                  Aktionen
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {zeilenGefiltert.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center text-muted-foreground"
                  >
                    Keine Treffer für die Suche.
                  </TableCell>
                </TableRow>
              ) : (
                zeilenGefiltert.map((z) => (
                <TableRow key={z.id} className="border-zinc-800">
                  <TableCell>
                    <div
                      className="size-4 rounded-full ring-1 ring-zinc-700"
                      style={{ backgroundColor: z.color }}
                    />
                  </TableCell>
                  <TableCell>
                    <IconVorschau name={z.icon} />
                  </TableCell>
                  <TableCell className="font-medium text-zinc-50">{z.name}</TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {z.anzahlTeams}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {z.anzahlMitarbeiter}
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      onClick={() => oeffnenBearbeiten(z)}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-8 text-destructive"
                      onClick={() => setLoeschenDialog(z)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </TableCell>
                </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <Sheet
        open={sheetOffen}
        onOpenChange={(o) => {
          setSheetOffen(o);
          if (!o) leeren();
        }}
      >
        <SheetContent
          side="right"
          className="flex w-full max-h-[90dvh] flex-col gap-0 overflow-y-auto border-zinc-800 bg-zinc-950 p-0 shadow-2xl sm:max-w-md"
        >
          <SheetHeader className="sticky top-0 z-10 border-b border-zinc-800/80 bg-zinc-950/95 px-4 pb-3 pt-4 pr-12 backdrop-blur-sm">
            <SheetTitle className="text-lg">
              {bearbeitenId ? "Abteilung bearbeiten" : "Neue Abteilung"}
            </SheetTitle>
          </SheetHeader>
          <div className="space-y-5 px-4 py-5">
            <div className="space-y-2">
              <Label htmlFor="ab-name">Name *</Label>
              <Input
                id="ab-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-10 w-full border-zinc-700/90 bg-zinc-900/80"
              />
            </div>
            <div className="space-y-2">
              <Label>Farbe *</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="color"
                  className="h-10 w-14 shrink-0 cursor-pointer p-1"
                  value={farbe}
                  onChange={(e) => setFarbe(e.target.value)}
                />
                <Input
                  value={farbe}
                  onChange={(e) => setFarbe(e.target.value)}
                  className="h-10 min-w-0 flex-1 border-zinc-700/90 bg-zinc-900/80 font-mono text-sm"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Icon</Label>
              <Select value={icon} onValueChange={(v) => setIcon(v ?? "Wrench")}>
                <SelectTrigger className="h-10 w-full min-w-0 border-zinc-700/90 bg-zinc-900/80">
                  <SelectValue>
                    <IconOption name={icon} />
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {ICON_NAMEN.map((n) => (
                    <SelectItem key={n} value={n}>
                      <IconOption name={n} />
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <SheetFooter className="sticky bottom-0 border-t border-zinc-800/90 bg-zinc-950/95 backdrop-blur-sm flex-col gap-2 sm:flex-row sm:justify-between">
            {bearbeitenId && (
              <Button
                type="button"
                variant="destructive"
                className="w-full sm:w-auto"
                onClick={() => {
                  const z = zeilen.find((x) => x.id === bearbeitenId);
                  if (z) setLoeschenDialog(z);
                }}
                disabled={lädt}
              >
                Löschen
              </Button>
            )}
            <div className="flex w-full flex-col gap-2 sm:ml-auto sm:w-auto sm:flex-row">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setSheetOffen(false)}
              >
                Abbrechen
              </Button>
              <Button
                type="button"
                onClick={() => void speichern()}
                disabled={lädt}
              >
                Speichern
              </Button>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Dialog
        open={!!loeschenDialog}
        onOpenChange={(o) => !o && setLoeschenDialog(null)}
      >
        <DialogContent className="border-zinc-800 bg-zinc-950">
          <DialogHeader>
            <DialogTitle>Abteilung löschen?</DialogTitle>
            <DialogDescription>
              Diese Abteilung hat {loeschenDialog?.anzahlTeams ?? 0} Teams und{" "}
              {loeschenDialog?.anzahlMitarbeiter ?? 0} Mitarbeiter. Teams und
              Mitarbeiter werden keiner Abteilung mehr zugeordnet.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setLoeschenDialog(null)}
            >
              Abbrechen
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void loeschenBestaetigt()}
              disabled={lädt}
            >
              Trotzdem löschen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </StammdatenSection>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import type { ComponentType } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { toast } from "sonner";
import * as LucideIcons from "lucide-react";
import { Pencil, Plus, Trash2 } from "lucide-react";

type Zeile = {
  id: string;
  name: string;
  color: string;
  icon: string | null;
};

const ICON_NAMEN = [
  "Wrench",
  "Hammer",
  "Calendar",
  "Zap",
  "Users",
  "HardHat",
  "Truck",
  "Sun",
  "Cloud",
  "Home",
  "Building2",
  "Briefcase",
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

export function AbteilungenVerwaltung() {
  const supabase = createClient();
  const [zeilen, setZeilen] = useState<Zeile[]>([]);
  const [offen, setOffen] = useState(false);
  const [bearbeitenId, setBearbeitenId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [farbe, setFarbe] = useState("#3b82f6");
  const [icon, setIcon] = useState<string>("Wrench");
  const [lädt, setLädt] = useState(false);

  const laden = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("departments")
        .select("id,name,color,icon")
        .order("name");
      if (error) throw error;
      setZeilen((data as Zeile[]) ?? []);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Laden fehlgeschlagen.";
      toast.error(msg);
    }
  }, [supabase]);

  useEffect(() => {
    void laden();
  }, [laden]);

  function leeren() {
    setBearbeitenId(null);
    setName("");
    setFarbe("#3b82f6");
    setIcon("Wrench");
  }

  function oeffnenNeu() {
    leeren();
    setOffen(true);
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
    setOffen(true);
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
      setOffen(false);
      leeren();
      void laden();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Speichern fehlgeschlagen.";
      toast.error(msg);
    } finally {
      setLädt(false);
    }
  }

  async function loeschen(id: string) {
    if (!confirm("Abteilung wirklich löschen?")) return;
    setLädt(true);
    try {
      const { error } = await supabase.from("departments").delete().eq("id", id);
      if (error) throw error;
      toast.success("Abteilung gelöscht.");
      setOffen(false);
      leeren();
      void laden();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Löschen fehlgeschlagen.";
      toast.error(msg);
    } finally {
      setLädt(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button type="button" size="sm" onClick={oeffnenNeu}>
          <Plus className="mr-1 size-4" />
          Neue Abteilung
        </Button>
      </div>
      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Farbe</TableHead>
              <TableHead>Icon</TableHead>
              <TableHead className="w-[100px] text-right">Aktionen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {zeilen.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-muted-foreground">
                  Noch keine Abteilungen.
                </TableCell>
              </TableRow>
            ) : (
              zeilen.map((z) => (
                <TableRow key={z.id}>
                  <TableCell className="font-medium">{z.name}</TableCell>
                  <TableCell>
                    <span
                      className="mr-2 inline-block h-4 w-4 rounded border align-middle"
                      style={{ backgroundColor: z.color }}
                      aria-hidden
                    />
                    <code className="text-xs">{z.color}</code>
                  </TableCell>
                  <TableCell>
                    <IconVorschau name={z.icon} />
                  </TableCell>
                  <TableCell className="text-right">
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
                      onClick={() => void loeschen(z.id)}
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

      <Dialog
        open={offen}
        onOpenChange={(o) => {
          setOffen(o);
          if (!o) leeren();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {bearbeitenId ? "Abteilung bearbeiten" : "Neue Abteilung"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="space-y-2">
              <Label htmlFor="ab-name">Name *</Label>
              <Input
                id="ab-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ab-farbe">Farbe</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="ab-farbe"
                  type="color"
                  className="h-10 w-14 cursor-pointer p-1"
                  value={farbe}
                  onChange={(e) => setFarbe(e.target.value)}
                />
                <Input
                  value={farbe}
                  onChange={(e) => setFarbe(e.target.value)}
                  className="font-mono text-sm"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Icon</Label>
              <Select
                value={icon}
                onValueChange={(v) => setIcon(v ?? "Wrench")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ICON_NAMEN.map((n) => (
                    <SelectItem key={n} value={n}>
                      {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:justify-between">
            {bearbeitenId && (
              <Button
                type="button"
                variant="destructive"
                onClick={() => void loeschen(bearbeitenId)}
                disabled={lädt}
              >
                Löschen
              </Button>
            )}
            <div className="flex gap-2">
              <Button type="button" variant="secondary" onClick={() => setOffen(false)}>
                Abbrechen
              </Button>
              <Button type="button" onClick={() => void speichern()} disabled={lädt}>
                Speichern
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

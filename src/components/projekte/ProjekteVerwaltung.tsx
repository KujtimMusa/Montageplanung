"use client";

import { useCallback, useEffect, useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Pencil, Plus, Trash2 } from "lucide-react";

type ProjektZeile = {
  id: string;
  title: string;
  status: string;
  priority: string;
  planned_start: string | null;
  planned_end: string | null;
  weather_sensitive: boolean;
  customer_id: string | null;
  departments_involved: string[] | null;
  notes: string | null;
  customers: { company_name: string } | null;
};

type KundeOpt = { id: string; company_name: string };
type AbteilungOpt = { id: string; name: string };

const STATUS = ["neu", "aktiv", "pausiert", "abgeschlossen"] as const;
const PRIORITÄT = ["niedrig", "normal", "hoch", "kritisch"] as const;

export function ProjekteVerwaltung() {
  const supabase = createClient();
  const [zeilen, setZeilen] = useState<ProjektZeile[]>([]);
  const [kunden, setKunden] = useState<KundeOpt[]>([]);
  const [abteilungen, setAbteilungen] = useState<AbteilungOpt[]>([]);
  const [eigeneId, setEigeneId] = useState<string | null>(null);
  const [dialogOffen, setDialogOffen] = useState(false);
  const [bearbeitenId, setBearbeitenId] = useState<string | null>(null);
  const [titel, setTitel] = useState("");
  const [kundeId, setKundeId] = useState<string>("");
  const [status, setStatus] = useState<string>("neu");
  const [priorität, setPriorität] = useState<string>("normal");
  const [start, setStart] = useState("");
  const [ende, setEnde] = useState("");
  const [notiz, setNotiz] = useState("");
  const [wetterSens, setWetterSens] = useState(false);
  const [abteilungenAuswahl, setAbteilungenAuswahl] = useState<string[]>([]);
  const [lädt, setLädt] = useState(false);

  const laden = useCallback(async () => {
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return;
      const { data: ich } = await supabase
        .from("employees")
        .select("id")
        .eq("auth_user_id", auth.user.id)
        .maybeSingle();
      if (ich?.id) setEigeneId(ich.id);

      const [{ data: p }, { data: k }, { data: a }] = await Promise.all([
        supabase
          .from("projects")
          .select(
            "id,title,status,priority,planned_start,planned_end,weather_sensitive,customer_id,departments_involved,notes,customers(company_name)"
          )
          .order("created_at", { ascending: false }),
        supabase.from("customers").select("id,company_name").order("company_name"),
        supabase.from("departments").select("id,name").order("name"),
      ]);

      if (p) {
        setZeilen(
          (p as Record<string, unknown>[]).map((row) => {
            const c = row.customers;
            const cust = Array.isArray(c) ? c[0] : c;
            return {
              ...(row as unknown as ProjektZeile),
              customers: (cust as { company_name: string } | null) ?? null,
            };
          })
        );
      } else setZeilen([]);
      setKunden(k ?? []);
      setAbteilungen(a ?? []);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unbekannter Fehler";
      toast.error(`Projekte konnten nicht geladen werden: ${msg}`);
    }
  }, [supabase]);

  useEffect(() => {
    void laden();
  }, [laden]);

  function dialogLeeren() {
    setBearbeitenId(null);
    setTitel("");
    setKundeId("");
    setStatus("neu");
    setPriorität("normal");
    setStart("");
    setEnde("");
    setNotiz("");
    setWetterSens(false);
    setAbteilungenAuswahl([]);
  }

  function oeffnenNeu() {
    dialogLeeren();
    setDialogOffen(true);
  }

  function oeffnenBearbeiten(row: ProjektZeile) {
    setBearbeitenId(row.id);
    setTitel(row.title);
    setKundeId(row.customer_id ?? "");
    setStatus(row.status);
    setPriorität(row.priority);
    setStart(row.planned_start ?? "");
    setEnde(row.planned_end ?? "");
    setWetterSens(row.weather_sensitive);
    setAbteilungenAuswahl(row.departments_involved ?? []);
    setNotiz(row.notes ?? "");
    setDialogOffen(true);
  }

  async function speichern() {
    if (!titel.trim()) {
      toast.error("Titel ist Pflicht.");
      return;
    }
    setLädt(true);
    const payload = {
      title: titel.trim(),
      customer_id: kundeId || null,
      status,
      priority: priorität,
      planned_start: start || null,
      planned_end: ende || null,
      weather_sensitive: wetterSens,
      departments_involved:
        abteilungenAuswahl.length > 0 ? abteilungenAuswahl : null,
      notes: notiz.trim() || null,
    };

    try {
      if (bearbeitenId) {
        const { error } = await supabase
          .from("projects")
          .update(payload)
          .eq("id", bearbeitenId);
        if (error) throw error;
        toast.success("Projekt gespeichert.");
      } else {
        const insert: Record<string, unknown> = { ...payload };
        if (eigeneId) insert.created_by = eigeneId;
        const { error } = await supabase.from("projects").insert(insert);
        if (error) throw error;
        toast.success("Projekt angelegt.");
      }
      setDialogOffen(false);
      dialogLeeren();
      void laden();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Speichern fehlgeschlagen.";
      toast.error(msg);
    } finally {
      setLädt(false);
    }
  }

  async function loeschen(id: string) {
    if (!confirm("Projekt wirklich löschen? Zugehörige Einsätze werden mitgelöscht."))
      return;
    setLädt(true);
    try {
      const { error } = await supabase.from("projects").delete().eq("id", id);
      if (error) throw error;
      toast.success("Projekt gelöscht.");
      setDialogOffen(false);
      dialogLeeren();
      void laden();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Löschen fehlgeschlagen.";
      toast.error(msg);
    } finally {
      setLädt(false);
    }
  }

  function toggleAbteilung(id: string) {
    setAbteilungenAuswahl((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          Kunde optional — Abteilungen für Filter im Kalender.
        </p>
        <Button type="button" size="sm" onClick={oeffnenNeu}>
          <Plus className="mr-1 size-4" />
          Neues Projekt
        </Button>
      </div>

      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Titel</TableHead>
              <TableHead>Kunde</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Priorität</TableHead>
              <TableHead>Zeitraum</TableHead>
              <TableHead className="w-[100px] text-right">Aktionen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {zeilen.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-muted-foreground">
                  Noch keine Projekte — lege das erste Projekt an.
                </TableCell>
              </TableRow>
            ) : (
              zeilen.map((z) => (
                <TableRow key={z.id}>
                  <TableCell className="font-medium">{z.title}</TableCell>
                  <TableCell>
                    {z.customers?.company_name ?? "—"}
                  </TableCell>
                  <TableCell>{z.status}</TableCell>
                  <TableCell>{z.priority}</TableCell>
                  <TableCell className="whitespace-nowrap text-sm">
                    {z.planned_start ?? "—"} → {z.planned_end ?? "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      onClick={() => oeffnenBearbeiten(z)}
                      aria-label="Bearbeiten"
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-8 text-destructive"
                      onClick={() => void loeschen(z.id)}
                      aria-label="Löschen"
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
        open={dialogOffen}
        onOpenChange={(o) => {
          setDialogOffen(o);
          if (!o) dialogLeeren();
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {bearbeitenId ? "Projekt bearbeiten" : "Neues Projekt"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="space-y-2">
              <Label htmlFor="p-titel">Titel *</Label>
              <Input
                id="p-titel"
                value={titel}
                onChange={(e) => setTitel(e.target.value)}
                placeholder="Projektname"
              />
            </div>
            <div className="space-y-2">
              <Label>Kunde (optional)</Label>
              <Select
                value={kundeId || "__kein__"}
                onValueChange={(v) =>
                  setKundeId(v === "__kein__" || v == null ? "" : v)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Kein Kunde" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__kein__">Kein Kunde</SelectItem>
                  {kunden.map((k) => (
                    <SelectItem key={k.id} value={k.id}>
                      {k.company_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={status}
                  onValueChange={(v) => setStatus(v ?? "neu")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Priorität</Label>
                <Select
                  value={priorität}
                  onValueChange={(v) => setPriorität(v ?? "normal")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITÄT.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label htmlFor="p-start">Start (geplant)</Label>
                <Input
                  id="p-start"
                  type="date"
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="p-ende">Ende (geplant)</Label>
                <Input
                  id="p-ende"
                  type="date"
                  value={ende}
                  onChange={(e) => setEnde(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Abteilungen</Label>
              <div className="max-h-36 space-y-2 overflow-y-auto rounded-md border p-2">
                {abteilungen.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    Keine Abteilungen — unter „Abteilungen“ anlegen.
                  </p>
                ) : (
                  abteilungen.map((a) => (
                    <label
                      key={a.id}
                      className="flex cursor-pointer items-center gap-2 text-sm"
                    >
                      <Checkbox
                        checked={abteilungenAuswahl.includes(a.id)}
                        onCheckedChange={() => toggleAbteilung(a.id)}
                      />
                      {a.name}
                    </label>
                  ))
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="p-wetter"
                checked={wetterSens}
                onCheckedChange={(c) => setWetterSens(Boolean(c))}
              />
              <Label htmlFor="p-wetter" className="font-normal">
                Wetter-sensitiv (Warnungen)
              </Label>
            </div>
            <div className="space-y-2">
              <Label htmlFor="p-notiz">Notiz</Label>
              <Textarea
                id="p-notiz"
                value={notiz}
                onChange={(e) => setNotiz(e.target.value)}
                rows={2}
                placeholder="Optional"
              />
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
              <Button
                type="button"
                variant="secondary"
                onClick={() => setDialogOffen(false)}
              >
                Abbrechen
              </Button>
              <Button type="button" onClick={() => void speichern()} disabled={lädt}>
                {lädt ? "Speichern…" : "Speichern"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

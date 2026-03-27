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
import { Checkbox } from "@/components/ui/checkbox";
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
import { Plus, Trash2 } from "lucide-react";

type RegelZeile = {
  id: string;
  subcontractor_id: string;
  trigger_type: string;
  trigger_value: string;
  auto_book: boolean;
  notify_via: string;
  active: boolean;
};

type BuchungsregelnDialogProps = {
  offen: boolean;
  onOffenChange: (o: boolean) => void;
  dienstleisterId: string | null;
  firmenname: string;
};

export function BuchungsregelnDialog({
  offen,
  onOffenChange,
  dienstleisterId,
  firmenname,
}: BuchungsregelnDialogProps) {
  const supabase = createClient();
  const [regeln, setRegeln] = useState<RegelZeile[]>([]);
  const [lädt, setLädt] = useState(false);
  const [neuTyp, setNeuTyp] = useState("wetter");
  const [neuWert, setNeuWert] = useState("");
  const [neuAuto, setNeuAuto] = useState(true);
  const [neuNotify, setNeuNotify] = useState("whatsapp");

  const laden = useCallback(async () => {
    if (!dienstleisterId) return;
    setLädt(true);
    try {
      const { data, error } = await supabase
        .from("booking_rules")
        .select("*")
        .eq("subcontractor_id", dienstleisterId)
        .order("trigger_type");
      if (error) throw error;
      setRegeln((data as RegelZeile[]) ?? []);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Laden fehlgeschlagen.";
      toast.error(msg);
    } finally {
      setLädt(false);
    }
  }, [supabase, dienstleisterId]);

  useEffect(() => {
    if (offen && dienstleisterId) void laden();
  }, [offen, dienstleisterId, laden]);

  async function regelHinzufuegen() {
    if (!dienstleisterId || !neuWert.trim()) {
      toast.error("Trigger-Wert ist Pflicht.");
      return;
    }
    setLädt(true);
    try {
      const { error } = await supabase.from("booking_rules").insert({
        subcontractor_id: dienstleisterId,
        trigger_type: neuTyp.trim(),
        trigger_value: neuWert.trim(),
        auto_book: neuAuto,
        notify_via: neuNotify,
        active: true,
      });
      if (error) throw error;
      toast.success("Regel gespeichert.");
      setNeuWert("");
      void laden();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Speichern fehlgeschlagen.";
      toast.error(msg);
    } finally {
      setLädt(false);
    }
  }

  async function regelLoeschen(id: string) {
    if (!confirm("Regel wirklich löschen?")) return;
    setLädt(true);
    try {
      const { error } = await supabase.from("booking_rules").delete().eq("id", id);
      if (error) throw error;
      toast.success("Gelöscht.");
      void laden();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Löschen fehlgeschlagen.";
      toast.error(msg);
    } finally {
      setLädt(false);
    }
  }

  async function toggleAktiv(r: RegelZeile, aktiv: boolean) {
    setLädt(true);
    try {
      const { error } = await supabase
        .from("booking_rules")
        .update({ active: aktiv })
        .eq("id", r.id);
      if (error) throw error;
      void laden();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Update fehlgeschlagen.";
      toast.error(msg);
    } finally {
      setLädt(false);
    }
  }

  return (
    <Dialog open={offen} onOpenChange={onOffenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Buchungsregeln — {firmenname}</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          Trigger beschreiben wann automatisch gebucht oder benachrichtigt werden soll
          (z. B. <code className="rounded bg-muted px-1">wetter</code> + Wert{" "}
          <code className="rounded bg-muted px-1">sturm</code>).
        </p>

        <div className="grid gap-3 rounded-lg border p-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Trigger-Typ</Label>
            <Input
              value={neuTyp}
              onChange={(e) => setNeuTyp(e.target.value)}
              placeholder="wetter, prioritaet, …"
            />
          </div>
          <div className="space-y-2">
            <Label>Trigger-Wert *</Label>
            <Input
              value={neuWert}
              onChange={(e) => setNeuWert(e.target.value)}
              placeholder="z. B. sturm, hoch, …"
            />
          </div>
          <div className="space-y-2">
            <Label>Benachrichtigung</Label>
            <Select
              value={neuNotify}
              onValueChange={(v) => setNeuNotify(v ?? "whatsapp")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="whatsapp">WhatsApp</SelectItem>
                <SelectItem value="email">E-Mail</SelectItem>
                <SelectItem value="teams">Teams</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end gap-2 pb-1">
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <Checkbox
                checked={neuAuto}
                onCheckedChange={(c) => setNeuAuto(Boolean(c))}
              />
              Auto-Buchung
            </label>
          </div>
        </div>
        <Button
          type="button"
          size="sm"
          onClick={() => void regelHinzufuegen()}
          disabled={lädt || !dienstleisterId}
        >
          <Plus className="mr-1 size-4" />
          Regel hinzufügen
        </Button>

        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Typ</TableHead>
                <TableHead>Wert</TableHead>
                <TableHead>Benachrichtigung</TableHead>
                <TableHead>Auto</TableHead>
                <TableHead>Aktiv</TableHead>
                <TableHead className="w-[50px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {regeln.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-muted-foreground">
                    Noch keine Regeln.
                  </TableCell>
                </TableRow>
              ) : (
                regeln.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs">{r.trigger_type}</TableCell>
                    <TableCell className="max-w-[140px] truncate text-sm">
                      {r.trigger_value}
                    </TableCell>
                    <TableCell className="text-sm">{r.notify_via}</TableCell>
                    <TableCell>{r.auto_book ? "Ja" : "Nein"}</TableCell>
                    <TableCell>
                      <Checkbox
                        checked={r.active}
                        onCheckedChange={(c) => void toggleAktiv(r, Boolean(c))}
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-8 text-destructive"
                        onClick={() => void regelLoeschen(r.id)}
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

        <DialogFooter>
          <Button type="button" variant="secondary" onClick={() => onOffenChange(false)}>
            Schließen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

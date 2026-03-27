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
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { ListOrdered, Pencil, Plus, Trash2 } from "lucide-react";
import { BuchungsregelnDialog } from "@/components/dienstleister/BuchungsregelnDialog";

type Zeile = {
  id: string;
  company_name: string;
  contact_name: string | null;
  whatsapp_number: string | null;
  specialization: string[] | null;
  lead_time_days: number;
  max_concurrent_projects: number;
  active: boolean;
};

export function DienstleisterVerwaltung() {
  const supabase = createClient();
  const [zeilen, setZeilen] = useState<Zeile[]>([]);
  const [offen, setOffen] = useState(false);
  const [bearbeitenId, setBearbeitenId] = useState<string | null>(null);
  const [firma, setFirma] = useState("");
  const [kontakt, setKontakt] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [spez, setSpez] = useState("");
  const [vorlauf, setVorlauf] = useState("3");
  const [parallel, setParallel] = useState("2");
  const [notiz, setNotiz] = useState("");
  const [lädt, setLädt] = useState(false);
  const [regelnOffen, setRegelnOffen] = useState(false);
  const [regelnFuerId, setRegelnFuerId] = useState<string | null>(null);
  const [regelnFuerName, setRegelnFuerName] = useState("");

  const laden = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("subcontractors")
        .select(
          "id,company_name,contact_name,whatsapp_number,specialization,lead_time_days,max_concurrent_projects,active"
        )
        .order("company_name");
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
    setFirma("");
    setKontakt("");
    setWhatsapp("");
    setSpez("");
    setVorlauf("3");
    setParallel("2");
    setNotiz("");
  }

  function oeffnenNeu() {
    leeren();
    setOffen(true);
  }

  function oeffnenBearbeiten(z: Zeile) {
    setBearbeitenId(z.id);
    setFirma(z.company_name);
    setKontakt(z.contact_name ?? "");
    setWhatsapp(z.whatsapp_number ?? "");
    setSpez((z.specialization ?? []).join(", "));
    setVorlauf(String(z.lead_time_days));
    setParallel(String(z.max_concurrent_projects));
    setNotiz("");
    setOffen(true);
  }

  async function speichern() {
    if (!firma.trim()) {
      toast.error("Firmenname ist Pflicht.");
      return;
    }
    const specArr = spez
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    setLädt(true);
    try {
      const payload = {
        company_name: firma.trim(),
        contact_name: kontakt.trim() || null,
        whatsapp_number: whatsapp.trim() || null,
        specialization: specArr.length > 0 ? specArr : null,
        lead_time_days: Math.max(0, parseInt(vorlauf, 10) || 0),
        max_concurrent_projects: Math.max(1, parseInt(parallel, 10) || 1),
        active: true,
      };
      if (bearbeitenId) {
        const { error } = await supabase
          .from("subcontractors")
          .update(payload)
          .eq("id", bearbeitenId);
        if (error) throw error;
        toast.success("Gespeichert.");
      } else {
        const { error } = await supabase.from("subcontractors").insert(payload);
        if (error) throw error;
        toast.success("Dienstleister angelegt.");
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
    if (!confirm("Dienstleister wirklich löschen?")) return;
    setLädt(true);
    try {
      const { error } = await supabase.from("subcontractors").delete().eq("id", id);
      if (error) throw error;
      toast.success("Gelöscht.");
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
          Dienstleister
        </Button>
      </div>
      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Firma</TableHead>
              <TableHead>Ansprechpartner</TableHead>
              <TableHead>WhatsApp</TableHead>
              <TableHead>Spezialisierung</TableHead>
              <TableHead>Vorlauf (Tage)</TableHead>
              <TableHead className="w-[130px] text-right">Aktionen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {zeilen.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-muted-foreground">
                  Keine Dienstleister.
                </TableCell>
              </TableRow>
            ) : (
              zeilen.map((z) => (
                <TableRow key={z.id}>
                  <TableCell className="font-medium">{z.company_name}</TableCell>
                  <TableCell>{z.contact_name ?? "—"}</TableCell>
                  <TableCell className="text-sm">{z.whatsapp_number ?? "—"}</TableCell>
                  <TableCell className="max-w-[200px] truncate text-sm">
                    {(z.specialization ?? []).join(", ") || "—"}
                  </TableCell>
                  <TableCell>{z.lead_time_days}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      title="Buchungsregeln"
                      onClick={() => {
                        setRegelnFuerId(z.id);
                        setRegelnFuerName(z.company_name);
                        setRegelnOffen(true);
                      }}
                    >
                      <ListOrdered className="size-4" />
                    </Button>
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
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {bearbeitenId ? "Dienstleister bearbeiten" : "Dienstleister anlegen"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="space-y-2">
              <Label>Firma *</Label>
              <Input value={firma} onChange={(e) => setFirma(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Ansprechpartner</Label>
              <Input value={kontakt} onChange={(e) => setKontakt(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>WhatsApp (E.164 oder mit Ländervorwahl)</Label>
              <Input
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="+49…"
              />
            </div>
            <div className="space-y-2">
              <Label>Spezialisierung (Komma-getrennt)</Label>
              <Input
                value={spez}
                onChange={(e) => setSpez(e.target.value)}
                placeholder="Dach, Elektro, …"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label>Vorlaufzeit (Tage)</Label>
                <Input
                  type="number"
                  min={0}
                  value={vorlauf}
                  onChange={(e) => setVorlauf(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Max. parallele Projekte</Label>
                <Input
                  type="number"
                  min={1}
                  value={parallel}
                  onChange={(e) => setParallel(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notiz</Label>
              <Textarea value={notiz} onChange={(e) => setNotiz(e.target.value)} rows={2} />
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

      <BuchungsregelnDialog
        offen={regelnOffen}
        onOffenChange={(o) => {
          setRegelnOffen(o);
          if (!o) setRegelnFuerId(null);
        }}
        dienstleisterId={regelnFuerId}
        firmenname={regelnFuerName}
      />
    </div>
  );
}

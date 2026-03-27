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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Plus } from "lucide-react";

type Kunde = {
  id: string;
  company_name: string;
  contact_name: string | null;
  city: string | null;
  phone: string | null;
};

export function KundenListe() {
  const supabase = createClient();
  const [zeilen, setZeilen] = useState<Kunde[]>([]);
  const [offen, setOffen] = useState(false);
  const [firma, setFirma] = useState("");
  const [ansprech, setAnsprech] = useState("");
  const [adresse, setAdresse] = useState("");
  const [stadt, setStadt] = useState("");
  const [tel, setTel] = useState("");
  const [lädt, setLädt] = useState(false);

  const laden = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("customers")
        .select("id,company_name,contact_name,city,phone")
        .order("company_name");
      if (error) throw error;
      setZeilen((data as Kunde[]) ?? []);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Laden fehlgeschlagen.";
      toast.error(msg);
    }
  }, [supabase]);

  useEffect(() => {
    void laden();
  }, [laden]);

  function leeren() {
    setFirma("");
    setAnsprech("");
    setAdresse("");
    setStadt("");
    setTel("");
  }

  async function anlegen() {
    if (!firma.trim()) {
      toast.error("Firmenname ist Pflicht.");
      return;
    }
    if (!adresse.trim()) {
      toast.error("Adresse ist Pflicht (Kurzform z. B. „nur Projekt“ möglich).");
      return;
    }
    setLädt(true);
    try {
      const { error } = await supabase.from("customers").insert({
        company_name: firma.trim(),
        contact_name: ansprech.trim() || null,
        address: adresse.trim(),
        city: stadt.trim() || null,
        phone: tel.trim() || null,
      });
      if (error) throw error;
      toast.success("Kunde angelegt.");
      setOffen(false);
      leeren();
      void laden();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Anlegen fehlgeschlagen.";
      toast.error(msg);
    } finally {
      setLädt(false);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Kunden dienen der Auswahl bei Projekten — nur Stammdaten, keine komplexe
        Verwaltung.
      </p>
      <div className="flex justify-end">
        <Button type="button" size="sm" onClick={() => setOffen(true)}>
          <Plus className="mr-1 size-4" />
          Kunde anlegen
        </Button>
      </div>
      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Firma</TableHead>
              <TableHead>Ansprechpartner</TableHead>
              <TableHead>Ort</TableHead>
              <TableHead>Telefon</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {zeilen.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-muted-foreground">
                  Noch keine Kunden — optional beim ersten Projekt anlegen.
                </TableCell>
              </TableRow>
            ) : (
              zeilen.map((z) => (
                <TableRow key={z.id}>
                  <TableCell className="font-medium">{z.company_name}</TableCell>
                  <TableCell>{z.contact_name ?? "—"}</TableCell>
                  <TableCell>{z.city ?? "—"}</TableCell>
                  <TableCell>{z.phone ?? "—"}</TableCell>
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
            <DialogTitle>Kunde anlegen</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="space-y-2">
              <Label htmlFor="k-firma">Firma *</Label>
              <Input
                id="k-firma"
                value={firma}
                onChange={(e) => setFirma(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="k-anspr">Ansprechpartner</Label>
              <Input
                id="k-anspr"
                value={ansprech}
                onChange={(e) => setAnsprech(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="k-adr">Adresse *</Label>
              <Input
                id="k-adr"
                value={adresse}
                onChange={(e) => setAdresse(e.target.value)}
                placeholder="Straße, PLZ Ort"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="k-ort">Ort</Label>
              <Input
                id="k-ort"
                value={stadt}
                onChange={(e) => setStadt(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="k-tel">Telefon</Label>
              <Input
                id="k-tel"
                value={tel}
                onChange={(e) => setTel(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setOffen(false)}>
              Abbrechen
            </Button>
            <Button type="button" onClick={() => void anlegen()} disabled={lädt}>
              Speichern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

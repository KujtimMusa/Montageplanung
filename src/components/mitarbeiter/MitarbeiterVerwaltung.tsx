"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

type Zeile = {
  id: string;
  name: string;
  email: string | null;
  role: string;
  active: boolean;
  abteilungsName: string | null;
};

const rollen = [
  { wert: "monteur", label: "Monteur" },
  { wert: "abteilungsleiter", label: "Abteilungsleiter" },
  { wert: "admin", label: "Admin" },
];

/**
 * Admin-Ansicht: Mitarbeiterliste, Rolle, Einladung, Deaktivieren.
 */
export function MitarbeiterVerwaltung() {
  const [zeilen, setZeilen] = useState<Zeile[]>([]);
  const [laedt, setLaedt] = useState(true);
  const [einladEmail, setEinladEmail] = useState("");
  const [einladOffen, setEinladOffen] = useState(false);
  const [einladLaedt, setEinladLaedt] = useState(false);

  const laden = useCallback(async () => {
    const supabase = createClient();
    const [{ data: mitarbeiter }, { data: abteilungen }] = await Promise.all([
      supabase
        .from("employees")
        .select("id,name,email,role,active,department_id")
        .order("name"),
      supabase.from("departments").select("id,name"),
    ]);

    const abteilungNachId = Object.fromEntries(
      (abteilungen ?? []).map((a) => [a.id, a.name])
    );

    setZeilen(
      (mitarbeiter ?? []).map((m) => ({
        id: m.id,
        name: m.name,
        email: m.email,
        role: m.role,
        active: m.active,
        abteilungsName: m.department_id
          ? abteilungNachId[m.department_id] ?? null
          : null,
      }))
    );
    setLaedt(false);
  }, []);

  useEffect(() => {
    void laden();
  }, [laden]);

  async function rolleAendern(id: string, neueRolle: string) {
    const res = await fetch(`/api/admin/mitarbeiter/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: neueRolle }),
    });
    const json = (await res.json()) as { fehler?: string };
    if (!res.ok) {
      toast.error(json.fehler ?? "Speichern fehlgeschlagen.");
      return;
    }
    toast.success("Rolle aktualisiert.");
    void laden();
  }

  async function aktivitaetAendern(id: string, aktiv: boolean) {
    const res = await fetch(`/api/admin/mitarbeiter/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: aktiv }),
    });
    const json = (await res.json()) as { fehler?: string };
    if (!res.ok) {
      toast.error(json.fehler ?? "Speichern fehlgeschlagen.");
      return;
    }
    toast.success(aktiv ? "Mitarbeiter aktiviert." : "Mitarbeiter deaktiviert.");
    void laden();
  }

  async function einladen() {
    const email = einladEmail.trim().toLowerCase();
    if (!email) {
      toast.error("E-Mail eingeben.");
      return;
    }
    setEinladLaedt(true);
    const res = await fetch("/api/admin/mitarbeiter/einladen", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const json = (await res.json()) as { fehler?: string };
    setEinladLaedt(false);
    if (!res.ok) {
      toast.error(json.fehler ?? "Einladung fehlgeschlagen.");
      return;
    }
    toast.success("Einladung wurde versendet.");
    setEinladEmail("");
    setEinladOffen(false);
  }

  if (laedt) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
        Lade Mitarbeiter…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Mitarbeiter</h1>
          <p className="text-muted-foreground">
            Rollen vergeben, Konten einladen, Zugänge sperren.
          </p>
        </div>
        <Dialog open={einladOffen} onOpenChange={setEinladOffen}>
          <DialogTrigger render={<Button type="button" />}>
            Per E-Mail einladen
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Mitarbeiter einladen</DialogTitle>
            </DialogHeader>
            <div className="space-y-2 py-2">
              <Label htmlFor="einlad-email">E-Mail</Label>
              <Input
                id="einlad-email"
                type="email"
                value={einladEmail}
                onChange={(e) => setEinladEmail(e.target.value)}
                placeholder="kollege@firma.de"
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                onClick={() => void einladen()}
                disabled={einladLaedt}
              >
                {einladLaedt ? "Senden…" : "Einladung senden"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>E-Mail</TableHead>
              <TableHead>Abteilung</TableHead>
              <TableHead>Rolle</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Aktion</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {zeilen.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-muted-foreground">
                  Keine Einträge.
                </TableCell>
              </TableRow>
            ) : (
              zeilen.map((z) => (
                <TableRow key={z.id}>
                  <TableCell className="font-medium">{z.name}</TableCell>
                  <TableCell>{z.email ?? "—"}</TableCell>
                  <TableCell>{z.abteilungsName ?? "—"}</TableCell>
                  <TableCell>
                    <Select
                      value={z.role}
                      onValueChange={(v) => {
                        if (v) void rolleAendern(z.id, v);
                      }}
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {rollen.map((r) => (
                          <SelectItem key={r.wert} value={r.wert}>
                            {r.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Badge variant={z.active ? "default" : "secondary"}>
                      {z.active ? "aktiv" : "inaktiv"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {z.active ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => void aktivitaetAendern(z.id, false)}
                      >
                        Deaktivieren
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => void aktivitaetAendern(z.id, true)}
                      >
                        Aktivieren
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

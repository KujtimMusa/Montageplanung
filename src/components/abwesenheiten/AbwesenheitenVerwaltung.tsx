"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";

type Zeile = {
  id: string;
  type: string;
  start_date: string;
  end_date: string;
  status: string;
  employees: { name: string } | null;
};

const TYPEN = [
  { value: "urlaub", label: "Urlaub" },
  { value: "krank", label: "Krank" },
  { value: "fortbildung", label: "Fortbildung" },
  { value: "sonstiges", label: "Sonstiges" },
] as const;

export function AbwesenheitenVerwaltung() {
  const supabase = createClient();
  const [zeilen, setZeilen] = useState<Zeile[]>([]);
  const [mitarbeiter, setMitarbeiter] = useState<{ id: string; name: string }[]>(
    []
  );
  const [maId, setMaId] = useState("");
  const [typ, setTyp] = useState<string>("urlaub");
  const [von, setVon] = useState("");
  const [bis, setBis] = useState("");
  const [notiz, setNotiz] = useState("");
  const [konfliktHinweis, setKonfliktHinweis] = useState<string | null>(null);
  const [lädt, setLädt] = useState(false);

  const laden = useCallback(async () => {
    try {
      const [{ data: m }, { data: a }] = await Promise.all([
        supabase
          .from("employees")
          .select("id,name")
          .eq("active", true)
          .order("name"),
        supabase
          .from("absences")
          .select("id,type,start_date,end_date,status,employees(name)")
          .order("start_date", { ascending: false }),
      ]);
      setMitarbeiter(m ?? []);
      if (a) {
        setZeilen(
          (a as Record<string, unknown>[]).map((row) => {
            const e = row.employees;
            const emp = Array.isArray(e) ? e[0] : e;
            return {
              ...(row as Zeile),
              employees: (emp as { name: string } | null) ?? null,
            };
          })
        );
      } else setZeilen([]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Laden fehlgeschlagen.";
      toast.error(msg);
    }
  }, [supabase]);

  useEffect(() => {
    void laden();
  }, [laden]);

  async function eintragen() {
    if (!maId || !von || !bis) {
      toast.error("Mitarbeiter und Zeitraum sind Pflicht.");
      return;
    }
    if (von > bis) {
      toast.error("Ende muss nach Start liegen.");
      return;
    }
    setLädt(true);
    setKonfliktHinweis(null);
    try {
      const { data: planTreffer, error: planErr } = await supabase
        .from("assignments")
        .select("id,date")
        .eq("employee_id", maId)
        .gte("date", von)
        .lte("date", bis);
      if (planErr) throw planErr;
      const n = planTreffer?.length ?? 0;
      if (n > 0) {
        setKonfliktHinweis(
          `Achtung: In diesem Zeitraum sind ${n} Einsatz/Einsätze geplant — bitte Planung prüfen.`
        );
      }

      const { error } = await supabase.from("absences").insert({
        employee_id: maId,
        type: typ,
        start_date: von,
        end_date: bis,
        status: "beantragt",
        notes: notiz.trim() || null,
        quelle: "manuell",
      });
      if (error) throw error;
      toast.success("Abwesenheit erfasst.");
      setVon("");
      setBis("");
      setNotiz("");
      void laden();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Speichern fehlgeschlagen.";
      toast.error(msg);
    } finally {
      setLädt(false);
    }
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Manuelle Erfassung bis Personio angebunden ist — Typ und Zeitraum sind
        Personio-kompatibel (Felder type, start_date, end_date).
      </p>

      <div className="rounded-lg border p-4">
        <h2 className="mb-3 text-sm font-semibold">Neue Abwesenheit</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2">
            <Label>Mitarbeiter</Label>
            <Select
              value={maId}
              onValueChange={(v) => setMaId(v ?? "")}
            >
              <SelectTrigger>
                <SelectValue placeholder="Wählen" />
              </SelectTrigger>
              <SelectContent>
                {mitarbeiter.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Typ</Label>
            <Select value={typ} onValueChange={(v) => setTyp(v ?? "urlaub")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TYPEN.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="ab-von">Von</Label>
            <Input
              id="ab-von"
              type="date"
              value={von}
              onChange={(e) => setVon(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ab-bis">Bis</Label>
            <Input
              id="ab-bis"
              type="date"
              value={bis}
              onChange={(e) => setBis(e.target.value)}
            />
          </div>
          <div className="space-y-2 sm:col-span-2 lg:col-span-3">
            <Label htmlFor="ab-notiz">Notiz (optional)</Label>
            <Input
              id="ab-notiz"
              value={notiz}
              onChange={(e) => setNotiz(e.target.value)}
              placeholder="Kurze Bemerkung"
            />
          </div>
        </div>
        {konfliktHinweis && (
          <Alert className="mt-4 border-amber-600/50 bg-amber-950/30">
            <AlertTriangle className="size-4 text-amber-500" />
            <AlertTitle>Konflikt mit Planung</AlertTitle>
            <AlertDescription>{konfliktHinweis}</AlertDescription>
          </Alert>
        )}
        <Button
          type="button"
          className="mt-4"
          onClick={() => void eintragen()}
          disabled={lädt}
        >
          Speichern
        </Button>
      </div>

      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mitarbeiter</TableHead>
              <TableHead>Typ</TableHead>
              <TableHead>Von</TableHead>
              <TableHead>Bis</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {zeilen.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-muted-foreground">
                  Keine Einträge.
                </TableCell>
              </TableRow>
            ) : (
              zeilen.map((z) => (
                <TableRow key={z.id}>
                  <TableCell>{z.employees?.name ?? "—"}</TableCell>
                  <TableCell>{z.type}</TableCell>
                  <TableCell>{z.start_date}</TableCell>
                  <TableCell>{z.end_date}</TableCell>
                  <TableCell>{z.status}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

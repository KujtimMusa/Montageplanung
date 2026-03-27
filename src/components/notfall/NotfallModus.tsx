"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
import { pruefeEinsatzKonflikt } from "@/lib/utils/conflicts";

type Mitarbeiter = { id: string; name: string; department_id: string | null };

type EinsatzZeile = {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  project_id: string | null;
  project_title: string | null;
  projects: { title: string } | null;
};

function projektLabel(e: EinsatzZeile): string {
  if (e.projects?.title) return e.projects.title;
  if (e.project_title?.trim()) return e.project_title.trim();
  return "Einsatz";
}

export function NotfallModus() {
  const supabase = createClient();
  const [mitarbeiter, setMitarbeiter] = useState<Mitarbeiter[]>([]);
  const [ausfallId, setAusfallId] = useState("");
  const [datum, setDatum] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [einsätze, setEinsätze] = useState<EinsatzZeile[]>([]);
  const [kandidatenProEinsatz, setKandidatenProEinsatz] = useState<
    Record<string, { id: string; name: string }[]>
  >({});
  const [lädt, setLädt] = useState(false);

  const ausfall = useMemo(
    () => mitarbeiter.find((m) => m.id === ausfallId),
    [mitarbeiter, ausfallId]
  );

  const ladenMitarbeiter = useCallback(async () => {
    const { data } = await supabase
      .from("employees")
      .select("id,name,department_id")
      .eq("active", true)
      .order("name");
    setMitarbeiter((data as Mitarbeiter[]) ?? []);
  }, [supabase]);

  useEffect(() => {
    void ladenMitarbeiter();
  }, [ladenMitarbeiter]);

  const betroffeneLaden = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!ausfallId || !datum) {
        if (!opts?.silent) toast.error("Mitarbeiter und Datum wählen.");
        return;
      }
      setLädt(true);
      setKandidatenProEinsatz({});
      try {
        const { data, error } = await supabase
          .from("assignments")
          .select(
            "id,date,start_time,end_time,project_id,project_title, projects(title)"
          )
          .eq("employee_id", ausfallId)
          .eq("date", datum);

        if (error) throw error;

        const rows: EinsatzZeile[] = (data ?? []).map(
          (row: Record<string, unknown>) => {
            const p = row.projects;
            const proj = Array.isArray(p) ? p[0] : p;
            return {
              id: row.id as string,
              date: row.date as string,
              start_time: row.start_time as string,
              end_time: row.end_time as string,
              project_id: (row.project_id as string | null) ?? null,
              project_title: (row.project_title as string | null) ?? null,
              projects: proj as { title: string } | null,
            };
          }
        );

        setEinsätze(rows);

        const dept = ausfall?.department_id;
        const kandidatenBasis = mitarbeiter.filter(
          (m) =>
            m.id !== ausfallId && m.department_id && m.department_id === dept
        );

        const map: Record<string, { id: string; name: string }[]> = {};
        for (const e of rows) {
          const ok: { id: string; name: string }[] = [];
          for (const k of kandidatenBasis) {
            const pr = await pruefeEinsatzKonflikt(supabase, {
              mitarbeiterId: k.id,
              datum,
              startZeit: e.start_time,
              endZeit: e.end_time,
            });
            if (!pr.hatKonflikt) {
              ok.push({ id: k.id, name: k.name });
            }
          }
          map[e.id] = ok;
        }
        setKandidatenProEinsatz(map);

        if (rows.length === 0 && !opts?.silent) {
          toast.info("Keine Einsätze an diesem Tag für diesen Mitarbeiter.");
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Laden fehlgeschlagen.";
        toast.error(msg);
      } finally {
        setLädt(false);
      }
    },
    [ausfallId, ausfall?.department_id, datum, mitarbeiter, supabase]
  );

  async function ersatzZuweisen(einsatzId: string, neuerMaId: string) {
    setLädt(true);
    try {
      const { error } = await supabase
        .from("assignments")
        .update({ employee_id: neuerMaId })
        .eq("id", einsatzId);
      if (error) throw error;
      toast.success("Ersatz zugewiesen.");
      void betroffeneLaden({ silent: true });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Zuweisung fehlgeschlagen.";
      toast.error(msg);
    } finally {
      setLädt(false);
    }
  }

  return (
    <div className="space-y-8 text-zinc-100">
      <ol className="grid gap-4 md:grid-cols-3">
        <li className="rounded-xl border border-red-500/30 bg-red-950/40 px-4 py-3">
          <span className="text-xs font-semibold uppercase tracking-wide text-red-300">
            Schritt 1
          </span>
          <p className="mt-1 text-sm">Wer fällt aus?</p>
        </li>
        <li className="rounded-xl border border-red-500/30 bg-red-950/40 px-4 py-3">
          <span className="text-xs font-semibold uppercase tracking-wide text-red-300">
            Schritt 2
          </span>
          <p className="mt-1 text-sm">Betroffene Einsätze (automatisch)</p>
        </li>
        <li className="rounded-xl border border-red-500/30 bg-red-950/40 px-4 py-3">
          <span className="text-xs font-semibold uppercase tracking-wide text-red-300">
            Schritt 3
          </span>
          <p className="mt-1 text-sm">Ersatz zuweisen (ein Klick)</p>
        </li>
      </ol>

      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-red-900/40 bg-red-950/25 p-4">
        <div className="space-y-2">
          <Label className="text-red-100">Ausfall</Label>
          <Select
            value={ausfallId}
            onValueChange={(v) => setAusfallId(v ?? "")}
          >
            <SelectTrigger className="w-[min(100%,220px)] border-red-900/50 bg-zinc-950">
              <SelectValue placeholder="Mitarbeiter" />
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
          <Label htmlFor="nf-datum" className="text-red-100">
            Datum
          </Label>
          <Input
            id="nf-datum"
            type="date"
            value={datum}
            onChange={(e) => setDatum(e.target.value)}
            className="w-[160px] border-red-900/50 bg-zinc-950"
          />
        </div>
        <Button
          type="button"
          variant="secondary"
          className="border border-red-700/50 bg-red-900/40 text-white hover:bg-red-900/60"
          onClick={() => void betroffeneLaden()}
          disabled={lädt}
        >
          {lädt ? "Laden…" : "Aktualisieren"}
        </Button>
      </div>

      {!ausfall?.department_id && ausfallId && (
        <p className="text-sm text-amber-400">
          Dieser Mitarbeiter hat keine Abteilung — Ersatzfilter greift nicht. Bitte
          unter Einstellungen eine Abteilung zuweisen.
        </p>
      )}

      <div className="overflow-x-auto rounded-xl border border-red-900/40 bg-zinc-950/80">
        <Table>
          <TableHeader>
            <TableRow className="border-red-900/40 hover:bg-transparent">
              <TableHead className="text-zinc-300">Projekt / Titel</TableHead>
              <TableHead className="text-zinc-300">Zeit</TableHead>
              <TableHead className="text-zinc-300">Ersatz (gleiche Abteilung)</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {einsätze.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-zinc-500">
                  {ausfallId
                    ? "Keine Einsätze oder noch nicht geladen."
                    : "Mitarbeiter wählen — Einsätze werden geladen."}
                </TableCell>
              </TableRow>
            ) : (
              einsätze.map((e) => (
                <TableRow key={e.id} className="border-red-900/30">
                  <TableCell className="font-medium text-zinc-100">
                    {projektLabel(e)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-zinc-300">
                    {e.start_time.slice(0, 5)} – {e.end_time.slice(0, 5)}
                  </TableCell>
                  <TableCell>
                    {(kandidatenProEinsatz[e.id] ?? []).length === 0 ? (
                      <span className="text-zinc-500">Keine frei</span>
                    ) : (
                      <ul className="space-y-1">
                        {kandidatenProEinsatz[e.id]!.map((k) => (
                          <li key={k.id} className="flex items-center gap-2">
                            <span>{k.name}</span>
                            <Button
                              type="button"
                              size="sm"
                              className="bg-green-700 text-white hover:bg-green-600"
                              disabled={lädt}
                              onClick={() => void ersatzZuweisen(e.id, k.id)}
                            >
                              Zuweisen
                            </Button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </TableCell>
                  <TableCell />
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

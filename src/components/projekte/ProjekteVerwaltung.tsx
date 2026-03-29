"use client";

import Link from "next/link";
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
} from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { addDays, format, isBefore, parseISO, startOfDay } from "date-fns";
import {
  Eye,
  FolderOpen,
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatDatum } from "@/lib/utils/datum";
import {
  normalisierePrioritaet,
  normalisiereStatus,
  PROJEKT_PRIORITAET,
  PROJEKT_STATUS,
} from "@/types/projekte";
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
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  STATUS_CONFIG,
  STATUS_DIALOG_REIHENFOLGE,
  autoStatus,
} from "@/lib/projekt-status";
import { KundeKombofeld } from "@/components/projekte/KundeKombofeld";

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
  description: string | null;
  notes: string | null;
  created_at: string;
  customers: { company_name: string } | null;
};

type KundeOpt = { id: string; company_name: string };
type AbteilungOpt = { id: string; name: string };

type EinsatzZeile = {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  teams: { name: string; farbe: string | null } | null;
};

const formSchema = z.object({
  title: z.string().min(1, "Titel erforderlich."),
  customer_id: z.string().optional(),
  status: z.enum([
    "neu",
    "geplant",
    "aktiv",
    "pausiert",
    "abgeschlossen",
    "kritisch",
  ]),
  priority: z.enum(["niedrig", "normal", "hoch", "kritisch"]),
  planned_start: z.string().optional(),
  planned_end: z.string().optional(),
  description: z.string().optional(),
  baustelle_adresse: z.string().optional(),
  departments_involved: z.array(z.string()).optional(),
  weather_sensitive: z.boolean(),
});

type FormWerte = z.infer<typeof formSchema>;

function StatusAnzeige({ status }: { status: string }) {
  const st = normalisiereStatus(status);
  const cfg = STATUS_CONFIG[st] ?? { label: status, dot: "#71717a" };
  return (
    <div className="flex items-center gap-1.5">
      <div className="h-1.5 w-1.5 rounded-full" style={{ background: cfg.dot }} />
      <span className="text-xs font-medium text-zinc-400">{cfg.label}</span>
    </div>
  );
}

function PrioritaetAnzeige({ prioritaet }: { prioritaet: string }) {
  const pr = normalisierePrioritaet(prioritaet);
  const cfg =
    {
      niedrig: { label: "Niedrig", farbe: "#71717a" },
      normal: { label: "Normal", farbe: "#3b82f6" },
      hoch: { label: "Hoch", farbe: "#f59e0b" },
      kritisch: { label: "Kritisch", farbe: "#ef4444" },
    }[pr] ?? { label: prioritaet, farbe: "#71717a" };
  return (
    <div className="flex items-center gap-1.5">
      <div className="h-1.5 w-1.5 rounded-full" style={{ background: cfg.farbe }} />
      <span className="text-xs font-medium text-zinc-500">{cfg.label}</span>
    </div>
  );
}

export type ProjekteVerwaltungHandle = { openNeu: () => void };

type ProjekteVerwaltungProps = {
  hideChrome?: boolean;
  onAnzahlProjekteChange?: (n: number) => void;
};

export const ProjekteVerwaltung = forwardRef<
  ProjekteVerwaltungHandle,
  ProjekteVerwaltungProps
>(function ProjekteVerwaltung(
  { hideChrome = false, onAnzahlProjekteChange },
  ref
) {
  const supabase = useMemo(() => createClient(), []);
  const [zeilen, setZeilen] = useState<ProjektZeile[]>([]);
  const [kunden, setKunden] = useState<KundeOpt[]>([]);
  const [abteilungen, setAbteilungen] = useState<AbteilungOpt[]>([]);
  const [eigeneId, setEigeneId] = useState<string | null>(null);
  const [einsatzCounts, setEinsatzCounts] = useState<Record<string, number>>({});
  const [laden, setLaden] = useState(true);
  const [speichern, setSpeichern] = useState(false);

  const [sheetOffen, setSheetOffen] = useState(false);
  const [bearbeitenId, setBearbeitenId] = useState<string | null>(null);
  const [detailProjekt, setDetailProjekt] = useState<ProjektZeile | null>(null);
  const [detailOffen, setDetailOffen] = useState(false);
  const [detailEinsaetze, setDetailEinsaetze] = useState<EinsatzZeile[]>([]);
  const [detailEinsaetzeLaden, setDetailEinsaetzeLaden] = useState(false);

  const [loeschenId, setLoeschenId] = useState<string | null>(null);

  const [filter, setFilter] = useState({
    suche: "",
    status: "all",
    prioritaet: "all",
  });

  const form = useForm<FormWerte>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      customer_id: "",
      status: "neu",
      priority: "normal",
      planned_start: "",
      planned_end: "",
      description: "",
      baustelle_adresse: "",
      departments_involved: [],
      weather_sensitive: false,
    },
  });

  const projekteLaden = useCallback(async () => {
    setLaden(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return;
      const { data: ich } = await supabase
        .from("employees")
        .select("id")
        .eq("auth_user_id", auth.user.id)
        .maybeSingle();
      if (ich?.id) setEigeneId(ich.id);

      const [{ data: p }, { data: k }, { data: a }, { data: assignRows }] =
        await Promise.all([
          supabase
            .from("projects")
            .select(
              "id,title,status,priority,planned_start,planned_end,weather_sensitive,customer_id,departments_involved,description,notes,created_at,customers(company_name)"
            )
            .order("created_at", { ascending: false }),
          supabase.from("customers").select("id,company_name").order("company_name"),
          supabase.from("departments").select("id,name").order("name"),
          supabase.from("assignments").select("project_id"),
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

      const counts: Record<string, number> = {};
      for (const r of assignRows ?? []) {
        const pid = r.project_id as string;
        if (pid) counts[pid] = (counts[pid] ?? 0) + 1;
      }
      setEinsatzCounts(counts);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unbekannter Fehler";
      toast.error(`Projekte konnten nicht geladen werden: ${msg}`);
    } finally {
      setLaden(false);
    }
  }, [supabase]);

  useEffect(() => {
    void projekteLaden();
  }, [projekteLaden]);

  useEffect(() => {
    onAnzahlProjekteChange?.(zeilen.length);
  }, [zeilen, onAnzahlProjekteChange]);

  useEffect(() => {
    if (!detailOffen || !detailProjekt) {
      setDetailEinsaetze([]);
      return;
    }
    let cancelled = false;
    setDetailEinsaetzeLaden(true);
    void (async () => {
      const { data, error } = await supabase
        .from("assignments")
        .select("id,date,start_time,end_time,teams(name,farbe)")
        .eq("project_id", detailProjekt.id)
        .order("date", { ascending: true });
      if (cancelled) return;
      if (error) {
        setDetailEinsaetze([]);
      } else {
        const list: EinsatzZeile[] = (data ?? []).map((row) => {
          const t = row.teams as
            | { name?: string; farbe?: string | null }
            | { name?: string; farbe?: string | null }[]
            | null;
          const team = Array.isArray(t) ? t[0] : t;
          return {
            id: row.id as string,
            date: row.date as string,
            start_time: row.start_time as string,
            end_time: row.end_time as string,
            teams: team?.name
              ? { name: team.name as string, farbe: team.farbe as string | null }
              : null,
          };
        });
        setDetailEinsaetze(list);
      }
      setDetailEinsaetzeLaden(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [detailOffen, detailProjekt, supabase]);

  function sheetLeeren() {
    setBearbeitenId(null);
    form.reset({
      title: "",
      customer_id: "",
      status: "neu",
      priority: "normal",
      planned_start: "",
      planned_end: "",
      description: "",
      baustelle_adresse: "",
      departments_involved: [],
      weather_sensitive: false,
    });
  }

  function sheetOeffnen() {
    sheetLeeren();
    setSheetOffen(true);
  }

  useImperativeHandle(ref, () => ({
    openNeu: () => {
      sheetLeeren();
      setSheetOffen(true);
    },
  }));

  function oeffnenBearbeiten(row: ProjektZeile) {
    setBearbeitenId(row.id);
    form.reset({
      title: row.title,
      customer_id: row.customer_id ?? "",
      status: normalisiereStatus(row.status),
      priority: normalisierePrioritaet(row.priority),
      planned_start: row.planned_start ?? "",
      planned_end: row.planned_end ?? "",
      description: row.description ?? "",
      baustelle_adresse: row.notes ?? "",
      departments_involved: row.departments_involved ?? [],
      weather_sensitive: row.weather_sensitive,
    });
    setSheetOffen(true);
  }

  async function onSubmit(werte: FormWerte) {
    setSpeichern(true);
    const payload = {
      title: werte.title.trim(),
      customer_id: werte.customer_id?.trim() || null,
      status: werte.status,
      priority: werte.priority,
      planned_start: werte.planned_start?.trim() || null,
      planned_end: werte.planned_end?.trim() || null,
      weather_sensitive: werte.weather_sensitive,
      departments_involved:
        werte.departments_involved && werte.departments_involved.length > 0
          ? werte.departments_involved
          : null,
      description: werte.description?.trim() || null,
      notes: werte.baustelle_adresse?.trim() || null,
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
      setSheetOffen(false);
      sheetLeeren();
      void projekteLaden();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Speichern fehlgeschlagen.";
      toast.error(msg);
    } finally {
      setSpeichern(false);
    }
  }

  const kundeSchnellAnlegen = useCallback(
    async (name: string) => {
      const { data, error } = await supabase
        .from("customers")
        .insert({ company_name: name, address: "—" })
        .select("id, company_name")
        .single();
      if (error) throw error;
      const row = data as KundeOpt;
      setKunden((prev) =>
        [...prev, row].sort((a, b) =>
          a.company_name.localeCompare(b.company_name, "de")
        )
      );
      toast.success("Kunde angelegt.");
      return row;
    },
    [supabase]
  );

  async function loeschenAusfuehren() {
    if (!loeschenId) return;
    setSpeichern(true);
    try {
      const { error } = await supabase.from("projects").delete().eq("id", loeschenId);
      if (error) throw error;
      toast.success("Projekt gelöscht.");
      setLoeschenId(null);
      setDetailOffen(false);
      setDetailProjekt(null);
      setSheetOffen(false);
      sheetLeeren();
      void projekteLaden();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Löschen fehlgeschlagen.";
      toast.error(msg);
    } finally {
      setSpeichern(false);
    }
  }

  const heute = startOfDay(new Date());
  const heuteStr = format(heute, "yyyy-MM-dd");
  const in7 = format(addDays(heute, 7), "yyyy-MM-dd");

  const effektiverStatus = useCallback(
    (p: ProjektZeile) =>
      autoStatus({
        status: p.status,
        planned_start: p.planned_start,
        assignments_count: einsatzCounts[p.id] ?? 0,
      }),
    [einsatzCounts]
  );

  const stats = useMemo(() => {
    let aktiv = 0;
    let geplant = 0;
    let kritisch = 0;
    let wocheFaellig = 0;
    for (const p of zeilen) {
      const st = effektiverStatus(p);
      const rawSt = normalisiereStatus(p.status);
      if (st === "aktiv") aktiv++;
      if (st === "geplant") geplant++;
      if (rawSt === "kritisch") kritisch++;
      if (
        st !== "abgeschlossen" &&
        p.planned_end &&
        p.planned_end >= heuteStr &&
        p.planned_end <= in7
      ) {
        wocheFaellig++;
      }
    }
    return { aktiv, geplant, kritisch, wocheFaellig };
  }, [zeilen, heuteStr, in7, effektiverStatus]);

  const gefiltert = useMemo(() => {
    const q = filter.suche.trim().toLowerCase();
    return zeilen.filter((z) => {
      if (q) {
        const titel = z.title.toLowerCase();
        const kunde = z.customers?.company_name?.toLowerCase() ?? "";
        if (!titel.includes(q) && !kunde.includes(q)) return false;
      }
      if (filter.status !== "all" && effektiverStatus(z) !== filter.status)
        return false;
      if (
        filter.prioritaet !== "all" &&
        normalisierePrioritaet(z.priority) !== filter.prioritaet
      )
        return false;
      return true;
    });
  }, [zeilen, filter, effektiverStatus]);

  const hatFilter =
    Boolean(filter.suche.trim()) ||
    filter.status !== "all" ||
    filter.prioritaet !== "all";

  function resetFilter() {
    setFilter({ suche: "", status: "all", prioritaet: "all" });
  }

  function istUeberfaellig(p: ProjektZeile): boolean {
    if (!p.planned_end || effektiverStatus(p) === "abgeschlossen") return false;
    try {
      return isBefore(parseISO(p.planned_end), heute);
    } catch {
      return false;
    }
  }

  function detailOeffnen(p: ProjektZeile) {
    setDetailProjekt(p);
    setDetailOffen(true);
  }

  const kpiZeilen = [
    {
      label: "AKTIVE PROJEKTE",
      wert: stats.aktiv,
      sub: "Status: aktiv",
    },
    {
      label: "GEPLANT",
      wert: stats.geplant,
      sub: "Mind. 1 Einsatz",
    },
    {
      label: "KRITISCH",
      wert: stats.kritisch,
      sub: "Manuell markiert",
    },
    {
      label: "DIESE WOCHE FÄLLIG",
      wert: stats.wocheFaellig,
      sub: "Enddatum in 7 Tagen",
    },
  ];

  return (
    <div>
      {!hideChrome ? (
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-bold text-zinc-50">Projekte</h1>
          <Button type="button" onClick={sheetOeffnen}>
            <Plus size={16} className="mr-2" />
            Neues Projekt
          </Button>
        </div>
      ) : null}

      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {laden
          ? Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-2xl bg-zinc-800" />
            ))
          : kpiZeilen.map((k) => (
              <div
                key={k.label}
                className="rounded-2xl border border-zinc-800/60 bg-zinc-900 p-5 transition-all hover:border-zinc-700/60"
              >
                <p className="mb-4 text-xs font-semibold tracking-wider text-zinc-500 uppercase">
                  {k.label}
                </p>
                <p className="mb-1 text-4xl font-bold text-zinc-100 tabular-nums">
                  {k.wert}
                </p>
                <p className="text-xs text-zinc-600">{k.sub}</p>
              </div>
            ))}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative max-w-xs flex-1">
          <Search
            size={13}
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-zinc-500"
          />
          <input
            value={filter.suche}
            onChange={(e) => setFilter((f) => ({ ...f, suche: e.target.value }))}
            placeholder="Projekt oder Kunde suchen..."
            className="w-full rounded-lg border border-zinc-800 bg-zinc-900 py-2 pr-3 pl-8 text-sm text-zinc-200 transition-colors placeholder:text-zinc-600 focus:border-zinc-700 focus:outline-none"
          />
        </div>
        <select
          value={filter.status}
          onChange={(e) =>
            setFilter((f) => ({ ...f, status: e.target.value }))
          }
          className="cursor-pointer appearance-none rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-400 focus:outline-none"
        >
          <option value="all">Alle Status</option>
          <option value="neu">Neu</option>
          <option value="geplant">Geplant</option>
          <option value="aktiv">Aktiv</option>
          <option value="abgeschlossen">Abgeschlossen</option>
          <option value="kritisch">Kritisch</option>
        </select>
        <select
          value={filter.prioritaet}
          onChange={(e) =>
            setFilter((f) => ({ ...f, prioritaet: e.target.value }))
          }
          className="cursor-pointer appearance-none rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-400 focus:outline-none"
        >
          <option value="all">Alle Prioritäten</option>
          <option value="niedrig">Niedrig</option>
          <option value="normal">Normal</option>
          <option value="hoch">Hoch</option>
          <option value="kritisch">Kritisch</option>
        </select>
        {hatFilter ? (
          <Button variant="ghost" size="sm" type="button" onClick={resetFilter}>
            <X size={14} className="mr-1" />
            Filter zurücksetzen
          </Button>
        ) : null}
      </div>

      {laden ? (
        <div className="space-y-2 rounded-2xl border border-zinc-800/60 p-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full bg-zinc-800" />
          ))}
        </div>
      ) : zeilen.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-zinc-600">
          <FolderOpen size={48} className="mb-4 text-zinc-600" />
          <p className="text-base font-medium text-zinc-400">Noch keine Projekte</p>
          <p className="mt-1 text-sm">Lege dein erstes Projekt an</p>
          <Button className="mt-4" type="button" onClick={sheetOeffnen}>
            <Plus size={16} className="mr-2" />
            Erstes Projekt anlegen
          </Button>
        </div>
      ) : gefiltert.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-zinc-500">
          <p className="text-sm font-medium">Keine Projekte für diese Filter</p>
          <Button
            variant="ghost"
            size="sm"
            className="mt-2"
            type="button"
            onClick={resetFilter}
          >
            Filter zurücksetzen
          </Button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-zinc-800/60">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-800/60 bg-zinc-900/40">
                {[
                  "Projekt",
                  "Kunde",
                  "Status",
                  "Priorität",
                  "Zeitraum",
                  "Einsätze",
                  "Aktionen",
                ].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-xs font-semibold tracking-wider text-zinc-500 uppercase"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/40">
              {gefiltert.map((z) => {
                const st = effektiverStatus(z);
                const cnt = einsatzCounts[z.id] ?? 0;
                return (
                  <tr
                    key={z.id}
                    className="group transition-colors hover:bg-zinc-900/40"
                  >
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-zinc-700/50 bg-zinc-800 text-xs font-bold text-zinc-400">
                          {z.title?.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-zinc-200">{z.title}</p>
                          {z.notes?.trim() ? (
                            <p className="max-w-32 truncate text-xs text-zinc-600">
                              {z.notes.trim()}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      {z.customers?.company_name ? (
                        <div className="flex items-center gap-2">
                          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-zinc-700 bg-zinc-800 text-[9px] font-bold text-zinc-500">
                            {z.customers.company_name.slice(0, 2).toUpperCase()}
                          </div>
                          <span className="truncate text-sm text-zinc-400">
                            {z.customers.company_name}
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm text-zinc-700">–</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <StatusAnzeige status={st} />
                    </td>
                    <td className="px-4 py-3.5">
                      <PrioritaetAnzeige prioritaet={z.priority} />
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="text-xs text-zinc-400 tabular-nums">
                        {z.planned_start
                          ? format(new Date(z.planned_start), "dd.MM.yy")
                          : "–"}
                        {" → "}
                        {z.planned_end
                          ? format(new Date(z.planned_end), "dd.MM.yy")
                          : "–"}
                        {istUeberfaellig(z) ? (
                          <Badge variant="destructive" className="ml-2 text-[10px]">
                            Überfällig
                          </Badge>
                        ) : null}
                      </p>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-sm font-semibold text-zinc-300 tabular-nums">
                        {cnt}
                      </span>
                      <span className="ml-1 text-xs text-zinc-600">Einsätze</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                        <button
                          type="button"
                          onClick={() => detailOeffnen(z)}
                          className="rounded-md p-1.5 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
                          aria-label="Details"
                        >
                          <Eye size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => oeffnenBearbeiten(z)}
                          className="rounded-md p-1.5 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
                          aria-label="Bearbeiten"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setLoeschenId(z.id)}
                          className="rounded-md p-1.5 text-zinc-500 transition-colors hover:bg-red-950 hover:text-red-400"
                          aria-label="Löschen"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Sheet
        open={sheetOffen}
        onOpenChange={(o) => {
          setSheetOffen(o);
          if (!o) sheetLeeren();
        }}
      >
        <SheetContent className="flex flex-col border-zinc-800 bg-zinc-950 sm:max-w-[520px]">
          <SheetHeader>
            <SheetTitle className="text-zinc-50">
              {bearbeitenId ? "Projekt bearbeiten" : "Neues Projekt"}
            </SheetTitle>
          </SheetHeader>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-1 flex-col gap-4 overflow-y-auto py-2"
          >
            <div className="space-y-2">
              <Label className="text-zinc-300">Titel *</Label>
              <Input
                className="border-zinc-800 bg-zinc-900"
                placeholder="Projektname"
                {...form.register("title")}
              />
              {form.formState.errors.title && (
                <p className="text-xs text-red-400">
                  {form.formState.errors.title.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-zinc-300">Auftraggeber</Label>
              <Controller
                control={form.control}
                name="customer_id"
                render={({ field }) => (
                  <KundeKombofeld
                    value={field.value?.trim() ? field.value : null}
                    onChange={(id) => field.onChange(id ?? "")}
                    kunden={kunden}
                    onNeuAnlegen={async (name) => {
                      try {
                        return await kundeSchnellAnlegen(name);
                      } catch (e) {
                        const msg =
                          e instanceof Error ? e.message : "Kunde konnte nicht angelegt werden.";
                        toast.error(msg);
                        throw e;
                      }
                    }}
                    disabled={speichern}
                  />
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-zinc-300">Status *</Label>
                <Controller
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="border-zinc-800 bg-zinc-900">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_DIALOG_REIHENFOLGE.map((val) => {
                          const cfg = STATUS_CONFIG[val];
                          if (!cfg) return null;
                          return (
                            <SelectItem key={val} value={val}>
                              <div className="flex items-center gap-2">
                                <div
                                  className="size-2 shrink-0 rounded-full"
                                  style={{ background: cfg.dot }}
                                />
                                {cfg.label}
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  )}
                />
                <p className="mt-1 text-xs text-zinc-600">
                  Neu, Geplant und Aktiv richten sich nach Einsätzen und Startdatum in der Liste.
                  Pausiert, Abgeschlossen und Kritisch (Status) setzt du hier manuell.
                </p>
              </div>
              <div className="space-y-2">
                <Label className="text-zinc-300">Priorität *</Label>
                <Controller
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="border-zinc-800 bg-zinc-900">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PROJEKT_PRIORITAET.map((p) => (
                          <SelectItem key={p.value} value={p.value}>
                            <div className="flex items-center gap-2">
                              <div
                                className="size-3 rounded-full"
                                style={{ backgroundColor: p.dot }}
                              />
                              {p.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-zinc-300">Start (geplant)</Label>
                <Input
                  type="date"
                  className="border-zinc-800 bg-zinc-900"
                  {...form.register("planned_start")}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-zinc-300">Ende (geplant)</Label>
                <Input
                  type="date"
                  className="border-zinc-800 bg-zinc-900"
                  {...form.register("planned_end")}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-zinc-300">Baustellen-Adresse (optional)</Label>
              <Input
                className="border-zinc-800 bg-zinc-900"
                placeholder="wird in der Planung als Hinweis genutzt"
                {...form.register("baustelle_adresse")}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-zinc-300">Beschreibung (optional)</Label>
              <Textarea
                className="resize-none border-zinc-800 bg-zinc-900"
                rows={3}
                placeholder="Kurzbeschreibung…"
                {...form.register("description")}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-zinc-300">Abteilungen</Label>
              <div className="max-h-32 space-y-2 overflow-y-auto rounded-md border border-zinc-800 p-2">
                {abteilungen.length === 0 ? (
                  <p className="text-xs text-zinc-500">Keine Abteilungen angelegt.</p>
                ) : (
                  <Controller
                    control={form.control}
                    name="departments_involved"
                    render={({ field }) => (
                      <>
                        {abteilungen.map((a) => (
                          <label
                            key={a.id}
                            className="flex cursor-pointer items-center gap-2 text-sm text-zinc-300"
                          >
                            <Checkbox
                              checked={field.value?.includes(a.id) ?? false}
                              onCheckedChange={() => {
                                const v = field.value ?? [];
                                field.onChange(
                                  v.includes(a.id)
                                    ? v.filter((x) => x !== a.id)
                                    : [...v, a.id]
                                );
                              }}
                            />
                            {a.name}
                          </label>
                        ))}
                      </>
                    )}
                  />
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Controller
                control={form.control}
                name="weather_sensitive"
                render={({ field }) => (
                  <Checkbox
                    id="wetter"
                    checked={field.value}
                    onCheckedChange={(c) => field.onChange(c === true)}
                  />
                )}
              />
              <Label htmlFor="wetter" className="font-normal text-zinc-300">
                Wetter-sensitiv
              </Label>
            </div>

            <SheetFooter className="mt-auto flex-col gap-2 border-t border-zinc-800 pt-4 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                onClick={() => setSheetOffen(false)}
              >
                Abbrechen
              </Button>
              <Button type="submit" disabled={speichern}>
                {speichern ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : null}
                Speichern
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      <Sheet open={detailOffen} onOpenChange={setDetailOffen}>
        <SheetContent className="flex flex-col border-zinc-800 bg-zinc-950 sm:max-w-[600px]">
          {detailProjekt && (
            <>
              <SheetHeader>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    variant="secondary"
                    className={cn(
                      "font-normal",
                      PROJEKT_STATUS.find(
                        (s) => s.value === effektiverStatus(detailProjekt)
                      )?.farbe
                    )}
                  >
                    {
                      PROJEKT_STATUS.find(
                        (s) => s.value === effektiverStatus(detailProjekt)
                      )?.label
                    }
                  </Badge>
                  <div className="flex items-center gap-1.5">
                    <div
                      className="size-2 rounded-full"
                      style={{
                        backgroundColor: PROJEKT_PRIORITAET.find(
                          (p) =>
                            p.value === normalisierePrioritaet(detailProjekt.priority)
                        )?.dot,
                      }}
                    />
                    <span className="text-sm text-zinc-300">
                      {
                        PROJEKT_PRIORITAET.find(
                          (p) =>
                            p.value === normalisierePrioritaet(detailProjekt.priority)
                        )?.label
                      }
                    </span>
                  </div>
                </div>
                <SheetTitle className="text-left text-xl font-bold text-zinc-50">
                  {detailProjekt.title}
                </SheetTitle>
                <p className="text-sm text-zinc-400">
                  {detailProjekt.customers?.company_name ?? "—"}
                </p>
              </SheetHeader>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-zinc-500">Zeitraum</p>
                  <p className="text-zinc-200">
                    {formatDatum(detailProjekt.planned_start)} →{" "}
                    {formatDatum(detailProjekt.planned_end)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500">Baustelle</p>
                  <p className="text-zinc-200">{detailProjekt.notes?.trim() || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500">Erstellt am</p>
                  <p className="text-zinc-200">
                    {formatDatum(detailProjekt.created_at?.slice(0, 10))}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500">Einsätze gesamt</p>
                  <p className="text-zinc-200">
                    {einsatzCounts[detailProjekt.id] ?? 0}
                  </p>
                </div>
              </div>

              <div>
                <p className="mb-2 text-sm font-medium text-zinc-300">Einsätze</p>
                {detailEinsaetzeLaden ? (
                  <Skeleton className="h-20 w-full bg-zinc-800" />
                ) : detailEinsaetze.length === 0 ? (
                  <p className="text-sm text-zinc-500">
                    Noch keine Einsätze — in der Planung einplanen.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {detailEinsaetze.map((e) => (
                      <li
                        key={e.id}
                        className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2 text-sm"
                      >
                        <span
                          className="inline-block size-2.5 shrink-0 rounded-full"
                          style={{
                            backgroundColor: e.teams?.farbe ?? "#64748b",
                          }}
                        />
                        <span className="text-zinc-300">
                          {formatDatum(e.date)} · {e.start_time.slice(0, 5)}–
                          {e.end_time.slice(0, 5)}
                        </span>
                        <span className="text-zinc-500">
                          {e.teams?.name ?? "Team"}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                <Link
                  href="/planung"
                  className="mt-2 inline-block text-sm font-medium text-blue-400 hover:underline"
                >
                  Zur Planung →
                </Link>
              </div>

              {detailProjekt.description?.trim() ? (
                <div className="rounded-lg bg-zinc-900 p-3 text-sm text-zinc-300">
                  {detailProjekt.description.trim()}
                </div>
              ) : null}

              <SheetFooter className="mt-auto flex-col gap-2 border-t border-zinc-800 pt-4 sm:flex-row">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    const p = detailProjekt;
                    setDetailOffen(false);
                    oeffnenBearbeiten(p);
                  }}
                >
                  Bearbeiten
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => {
                    setLoeschenId(detailProjekt.id);
                  }}
                >
                  Löschen
                </Button>
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>

      <Dialog open={!!loeschenId} onOpenChange={(o) => !o && setLoeschenId(null)}>
        <DialogContent className="border-zinc-800 bg-zinc-950">
          <DialogHeader>
            <DialogTitle className="text-zinc-50">Projekt löschen?</DialogTitle>
            <DialogDescription>
              Zugehörige Einsätze werden mitgelöscht. Diese Aktion kann nicht
              rückgängig gemacht werden.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => setLoeschenId(null)}>
              Abbrechen
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={speichern}
              onClick={() => void loeschenAusfuehren()}
            >
              Löschen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
});

ProjekteVerwaltung.displayName = "ProjekteVerwaltung";

"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { addDays, format, isBefore, parseISO, startOfDay } from "date-fns";
import {
  Activity,
  CalendarClock,
  CalendarDays,
  Clock,
  Eye,
  FolderOpen,
  LayoutGrid,
  List,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  X,
  Zap,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
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

const ANSICHT_KEY = "projekte-ansicht";

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
  status: z.enum(["neu", "geplant", "aktiv", "pausiert", "abgeschlossen"]),
  priority: z.enum(["niedrig", "normal", "hoch", "kritisch"]),
  planned_start: z.string().optional(),
  planned_end: z.string().optional(),
  description: z.string().optional(),
  baustelle_adresse: z.string().optional(),
  departments_involved: z.array(z.string()).optional(),
  weather_sensitive: z.boolean(),
});

type FormWerte = z.infer<typeof formSchema>;

export function ProjekteVerwaltung() {
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

  const [ansicht, setAnsicht] = useState<"tabelle" | "kacheln">("tabelle");

  useEffect(() => {
    try {
      const v = localStorage.getItem(ANSICHT_KEY);
      if (v === "tabelle" || v === "kacheln") setAnsicht(v);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(ANSICHT_KEY, ansicht);
    } catch {
      /* ignore */
    }
  }, [ansicht]);

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

  const stats = useMemo(() => {
    let aktiv = 0;
    let geplant = 0;
    let kritisch = 0;
    let wocheFaellig = 0;
    for (const p of zeilen) {
      const st = normalisiereStatus(p.status);
      const pr = normalisierePrioritaet(p.priority);
      if (st === "aktiv") aktiv++;
      if (st === "geplant") geplant++;
      if (pr === "kritisch") kritisch++;
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
  }, [zeilen, heuteStr, in7]);

  const gefiltert = useMemo(() => {
    const q = filter.suche.trim().toLowerCase();
    return zeilen.filter((z) => {
      if (q) {
        const titel = z.title.toLowerCase();
        const kunde = z.customers?.company_name?.toLowerCase() ?? "";
        if (!titel.includes(q) && !kunde.includes(q)) return false;
      }
      if (filter.status !== "all" && normalisiereStatus(z.status) !== filter.status)
        return false;
      if (
        filter.prioritaet !== "all" &&
        normalisierePrioritaet(z.priority) !== filter.prioritaet
      )
        return false;
      return true;
    });
  }, [zeilen, filter]);

  const hatFilter =
    Boolean(filter.suche.trim()) ||
    filter.status !== "all" ||
    filter.prioritaet !== "all";

  function resetFilter() {
    setFilter({ suche: "", status: "all", prioritaet: "all" });
  }

  function istUeberfaellig(p: ProjektZeile): boolean {
    if (!p.planned_end || normalisiereStatus(p.status) === "abgeschlossen")
      return false;
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

  const statCards = [
    {
      label: "Aktive Projekte",
      wert: stats.aktiv,
      icon: FolderOpen,
      iconClass: "text-emerald-400",
      wrap: "bg-emerald-500/10",
    },
    {
      label: "Geplant",
      wert: stats.geplant,
      icon: CalendarClock,
      iconClass: "text-blue-400",
      wrap: "bg-blue-500/10",
    },
    {
      label: "Kritisch",
      wert: stats.kritisch,
      icon: Zap,
      iconClass: "text-red-400",
      wrap: "bg-red-500/10",
    },
    {
      label: "Diese Woche fällig",
      wert: stats.wocheFaellig,
      icon: Clock,
      iconClass: "text-orange-400",
      wrap: "bg-orange-500/10",
    },
  ];

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-50">Projekte</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Aufträge planen, Teams zuweisen, Status verfolgen.
          </p>
        </div>
        <Button type="button" onClick={sheetOeffnen}>
          <Plus size={16} className="mr-2" />
          Neues Projekt
        </Button>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {laden
          ? Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl bg-zinc-800" />
            ))
          : statCards.map((c) => (
              <Card
                key={c.label}
                className="rounded-xl border border-zinc-800 bg-zinc-900/50"
              >
                <CardContent className="flex items-center gap-3 p-4">
                  <div className={cn("rounded-lg p-2", c.wrap)}>
                    <c.icon className={cn("size-6", c.iconClass)} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-zinc-50">{c.wert}</p>
                    <p className="text-xs text-zinc-500">{c.label}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Input
          placeholder="Projekt oder Kunde suchen..."
          className="w-full max-w-xs border-zinc-800 bg-zinc-900 sm:w-56"
          value={filter.suche}
          onChange={(e) =>
            setFilter((f) => ({ ...f, suche: e.target.value }))
          }
        />
        <Select
          value={filter.status}
          onValueChange={(v) =>
            setFilter((f) => ({ ...f, status: v ?? "all" }))
          }
        >
          <SelectTrigger className="w-[160px] border-zinc-800 bg-zinc-900">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Status</SelectItem>
            {PROJEKT_STATUS.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filter.prioritaet}
          onValueChange={(v) =>
            setFilter((f) => ({ ...f, prioritaet: v ?? "all" }))
          }
        >
          <SelectTrigger className="w-[180px] border-zinc-800 bg-zinc-900">
            <SelectValue placeholder="Priorität" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Prioritäten</SelectItem>
            {PROJEKT_PRIORITAET.map((p) => (
              <SelectItem key={p.value} value={p.value}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {hatFilter && (
          <Button variant="ghost" size="sm" type="button" onClick={resetFilter}>
            <X size={14} className="mr-1" />
            Filter zurücksetzen
          </Button>
        )}
        <div className="ml-auto flex gap-1">
          <Button
            type="button"
            variant={ansicht === "tabelle" ? "secondary" : "ghost"}
            size="icon"
            onClick={() => setAnsicht("tabelle")}
            aria-label="Tabellenansicht"
          >
            <List size={16} />
          </Button>
          <Button
            type="button"
            variant={ansicht === "kacheln" ? "secondary" : "ghost"}
            size="icon"
            onClick={() => setAnsicht("kacheln")}
            aria-label="Kachelansicht"
          >
            <LayoutGrid size={16} />
          </Button>
        </div>
      </div>

      {laden ? (
        ansicht === "tabelle" ? (
          <div className="space-y-2 rounded-lg border border-zinc-800 p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full bg-zinc-800" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-40 rounded-xl bg-zinc-800" />
            ))}
          </div>
        )
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
      ) : ansicht === "tabelle" ? (
        <div className="overflow-x-auto rounded-lg border border-zinc-800">
          <Table>
            <TableHeader>
              <TableRow className="border-zinc-800 hover:bg-transparent">
                <TableHead>Titel</TableHead>
                <TableHead>Kunde</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Priorität</TableHead>
                <TableHead>Zeitraum</TableHead>
                <TableHead>Einsätze</TableHead>
                <TableHead className="text-right">Aktionen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {gefiltert.map((z) => {
                const st = normalisiereStatus(z.status);
                const pr = normalisierePrioritaet(z.priority);
                const stMeta = PROJEKT_STATUS.find((s) => s.value === st);
                const prMeta = PROJEKT_PRIORITAET.find((p) => p.value === pr);
                const cnt = einsatzCounts[z.id] ?? 0;
                return (
                  <TableRow key={z.id} className="border-zinc-800 hover:bg-zinc-900/50">
                    <TableCell>
                      <button
                        type="button"
                        className="text-left font-medium text-zinc-200 hover:underline"
                        onClick={() => detailOeffnen(z)}
                      >
                        {z.title}
                      </button>
                    </TableCell>
                    <TableCell className="text-sm text-zinc-400">
                      {z.customers?.company_name ?? "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={cn("font-normal", stMeta?.farbe)}>
                        {stMeta?.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <div
                          className="size-2 rounded-full"
                          style={{ backgroundColor: prMeta?.dot }}
                        />
                        <span className="text-sm">{prMeta?.label}</span>
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-zinc-300">
                      {formatDatum(z.planned_start)} → {formatDatum(z.planned_end)}
                      {istUeberfaellig(z) && (
                        <Badge variant="destructive" className="ml-2 text-xs">
                          Überfällig
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-zinc-400">
                      {cnt > 0 ? `${cnt} Einsätze` : "–"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-0">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          onClick={() => detailOeffnen(z)}
                          aria-label="Details"
                        >
                          <Eye size={14} />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          onClick={() => oeffnenBearbeiten(z)}
                          aria-label="Bearbeiten"
                        >
                          <Pencil size={14} />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-8 text-destructive"
                          onClick={() => setLoeschenId(z.id)}
                          aria-label="Löschen"
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {gefiltert.map((z) => {
            const st = normalisiereStatus(z.status);
            const pr = normalisierePrioritaet(z.priority);
            const stMeta = PROJEKT_STATUS.find((s) => s.value === st);
            const prMeta = PROJEKT_PRIORITAET.find((p) => p.value === pr);
            const cnt = einsatzCounts[z.id] ?? 0;
            return (
              <Card
                key={z.id}
                className="cursor-pointer rounded-xl border border-zinc-800 bg-zinc-900/50 transition-colors hover:border-zinc-700"
                onClick={() => detailOeffnen(z)}
              >
                <CardContent className="p-5">
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div
                        className="size-2 shrink-0 rounded-full"
                        style={{ backgroundColor: prMeta?.dot }}
                      />
                      <h3 className="line-clamp-2 font-semibold text-base text-zinc-100">
                        {z.title}
                      </h3>
                    </div>
                    <Badge variant="secondary" className={cn("shrink-0 font-normal", stMeta?.farbe)}>
                      {stMeta?.label}
                    </Badge>
                  </div>
                  {z.customers?.company_name ? (
                    <p className="text-sm text-zinc-500">{z.customers.company_name}</p>
                  ) : null}
                  <Separator className="my-3 bg-zinc-800" />
                  <div className="flex items-center gap-2 text-sm text-zinc-400">
                    <CalendarDays size={14} className="shrink-0" />
                    <span>
                      {formatDatum(z.planned_start)} → {formatDatum(z.planned_end)}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-sm text-zinc-400">
                    <Activity size={14} className="shrink-0" />
                    <span>{cnt > 0 ? `${cnt} Einsätze` : "Keine Einsätze"}</span>
                  </div>
                  <div
                    className="mt-4 flex items-center justify-between border-t border-zinc-800 pt-3"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Button
                      variant="ghost"
                      size="sm"
                      type="button"
                      onClick={() => detailOeffnen(z)}
                    >
                      Details
                    </Button>
                    <div className="flex gap-0">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        onClick={() => oeffnenBearbeiten(z)}
                      >
                        <Pencil size={14} />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-8 text-destructive"
                        onClick={() => setLoeschenId(z.id)}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
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
              <Label className="text-zinc-300">Kunde (optional)</Label>
              <Controller
                control={form.control}
                name="customer_id"
                render={({ field }) => (
                  <Select
                    value={field.value || "__kein__"}
                    onValueChange={(v) =>
                      field.onChange(v === "__kein__" ? "" : v)
                    }
                  >
                    <SelectTrigger className="border-zinc-800 bg-zinc-900">
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
                        {PROJEKT_STATUS.map((s) => (
                          <SelectItem key={s.value} value={s.value}>
                            {s.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
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
              <Label className="text-zinc-300">Beschreibung (optional)</Label>
              <Textarea
                className="resize-none border-zinc-800 bg-zinc-900"
                rows={3}
                placeholder="Kurzbeschreibung…"
                {...form.register("description")}
              />
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
                        (s) => s.value === normalisiereStatus(detailProjekt.status)
                      )?.farbe
                    )}
                  >
                    {
                      PROJEKT_STATUS.find(
                        (s) => s.value === normalisiereStatus(detailProjekt.status)
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
}

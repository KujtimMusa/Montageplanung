"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  addDays,
  addWeeks,
  endOfDay,
  endOfMonth,
  endOfWeek,
  format,
  getISOWeek,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subDays,
  subMonths,
} from "date-fns";
import { de } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Clock, RefreshCw } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { exportAlsCSV } from "@/lib/csv-export";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type TabKey = "live" | "heute" | "woche" | "projekte";

type LiveEintrag = {
  id: string;
  checkin_at: string;
  checkin_lat: number | null;
  checkin_lng: number | null;
  notes: string | null;
  employee_id: string;
  project_id: string | null;
  assignment_id: string | null;
  employees?: { name?: string | null; role?: string | null } | null;
  projects?: { title?: string | null } | null;
};

type HeuteEintrag = {
  id: string;
  checkin_at: string;
  checkout_at: string | null;
  notes: string | null;
  employee_id: string;
  project_id: string | null;
  employees?: { name?: string | null; role?: string | null } | null;
  projects?: { title?: string | null } | null;
};

type WocheMitarbeiter = {
  id: string;
  name: string;
  role: string;
  minuten: number;
  eintraege: number;
  arbeitstage: number;
};

type ProjektZeile = {
  id: string;
  titel: string;
  minuten: number;
  stunden: number;
  eintraege: number;
  mitarbeiter: { id: string; name: string; minuten: number }[];
};

export function minutenZuText(minuten: number): string {
  const h = Math.floor(minuten / 60);
  const m = minuten % 60;
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
}

function initialen(n: string): string {
  const p = n.trim().split(/\s+/).filter(Boolean);
  if (p.length >= 2) return (p[0]![0]! + p[1]![0]!).toUpperCase();
  return n.slice(0, 2).toUpperCase() || "?";
}

function empName(
  e: LiveEintrag | HeuteEintrag | { employees?: unknown }
): string {
  const raw = e.employees as
    | { name?: string | null }
    | { name?: string | null }[]
    | null;
  const one = Array.isArray(raw) ? raw[0] : raw;
  return String(one?.name ?? "–");
}

function empRole(e: LiveEintrag | HeuteEintrag): string {
  const raw = e.employees as
    | { role?: string | null }
    | { role?: string | null }[]
    | null;
  const one = Array.isArray(raw) ? raw[0] : raw;
  return String(one?.role ?? "");
}

function projTitel(e: LiveEintrag | HeuteEintrag): string {
  const raw = e.projects as
    | { title?: string | null }
    | { title?: string | null }[]
    | null;
  const one = Array.isArray(raw) ? raw[0] : raw;
  return String(one?.title ?? "–");
}

function dauerMinuten(
  checkin: string,
  checkout: string | null,
  jetzt: Date
): number {
  const start = new Date(checkin).getTime();
  const end = checkout ? new Date(checkout).getTime() : jetzt.getTime();
  return Math.max(0, Math.round((end - start) / 60000));
}

export function ZeiterfassungClient() {
  const [aktuellerTab, setAktuellerTab] = useState<TabKey>("live");
  const [datum, setDatum] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [wochenAnker, setWochenAnker] = useState(() =>
    format(new Date(), "yyyy-MM-dd")
  );
  const [daten, setDaten] = useState<unknown>(null);
  const [laden, setLaden] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());

  const [projektPreset, setProjektPreset] = useState<
    "woche" | "monat" | "letzter" | "individuell"
  >("woche");
  const [customVon, setCustomVon] = useState(() =>
    format(startOfMonth(new Date()), "yyyy-MM-dd")
  );
  const [customBis, setCustomBis] = useState(() =>
    format(endOfMonth(new Date()), "yyyy-MM-dd")
  );

  void tick;
  const jetzt = new Date();

  useEffect(() => {
    const id = setInterval(() => setTick((x) => x + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const projektZeitraum = useMemo(() => {
    const n = new Date();
    if (projektPreset === "woche") {
      const ws = startOfWeek(n, { weekStartsOn: 1 });
      const we = endOfWeek(n, { weekStartsOn: 1 });
      return {
        von: startOfDay(ws).toISOString(),
        bis: endOfDay(we).toISOString(),
        label: "Diese Woche",
      };
    }
    if (projektPreset === "monat") {
      return {
        von: startOfDay(startOfMonth(n)).toISOString(),
        bis: endOfDay(endOfMonth(n)).toISOString(),
        label: "Dieser Monat",
      };
    }
    if (projektPreset === "letzter") {
      const lm = subMonths(n, 1);
      return {
        von: startOfDay(startOfMonth(lm)).toISOString(),
        bis: endOfDay(endOfMonth(lm)).toISOString(),
        label: "Letzter Monat",
      };
    }
    const v = parseISO(customVon);
    const b = parseISO(customBis);
    return {
      von: startOfDay(v).toISOString(),
      bis: endOfDay(b).toISOString(),
      label: "Individuell",
    };
  }, [projektPreset, customVon, customBis]);

  const ladenApi = useCallback(async () => {
    setLaden(true);
    setFehler(null);
    try {
      const p = new URLSearchParams({ tab: aktuellerTab });
      if (aktuellerTab === "heute") p.set("datum", datum);
      if (aktuellerTab === "woche") p.set("datum", wochenAnker);
      if (aktuellerTab === "projekte") {
        p.set("von", projektZeitraum.von);
        p.set("bis", projektZeitraum.bis);
      }
      const r = await fetch(`/api/zeiterfassung?${p.toString()}`);
      const j = await r.json();
      if (!r.ok) {
        setFehler((j as { error?: string }).error ?? "Fehler beim Laden");
        setDaten(null);
        return;
      }
      setDaten(j);
    } catch {
      setFehler("Netzwerkfehler");
      setDaten(null);
    } finally {
      setLaden(false);
    }
  }, [aktuellerTab, datum, wochenAnker, projektZeitraum]);

  useEffect(() => {
    void ladenApi();
  }, [ladenApi]);

  useEffect(() => {
    if (aktuellerTab !== "live") return;
    const supabase = createClient();
    const channel = supabase
      .channel("zeiterfassung-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "time_entries" },
        () => {
          void ladenApi();
        }
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [aktuellerTab, ladenApi]);

  const liveListe =
    (daten as { eintraege?: LiveEintrag[] } | null)?.eintraege ?? [];

  const heuteListe =
    (daten as { eintraege?: HeuteEintrag[] } | null)?.eintraege ?? [];

  const wocheDaten = daten as {
    mitarbeiter?: WocheMitarbeiter[];
    wochenstart?: string;
    wochenende?: string;
  } | null;

  const projekteListe =
    (daten as { projekte?: ProjektZeile[] } | null)?.projekte ?? [];

  const maxWocheMin = Math.max(
    1,
    ...((wocheDaten?.mitarbeiter ?? []).map((m) => m.minuten))
  );

  const orgGesamtMin = (wocheDaten?.mitarbeiter ?? []).reduce(
    (s, m) => s + m.minuten,
    0
  );

  const heuteGesamtMin = heuteListe.reduce(
    (s, e) => s + dauerMinuten(e.checkin_at, e.checkout_at, jetzt),
    0
  );

  function csvHeute() {
    const rows = heuteListe.map((e) => ({
      Mitarbeiter: empName(e),
      Projekt: projTitel(e),
      Von: format(parseISO(e.checkin_at), "HH:mm"),
      Bis: e.checkout_at
        ? format(parseISO(e.checkout_at), "HH:mm")
        : "läuft",
      Dauer: minutenZuText(
        dauerMinuten(e.checkin_at, e.checkout_at, jetzt)
      ),
      Notiz: e.notes ?? "",
    }));
    exportAlsCSV(rows, `zeiterfassung-heute-${datum}.csv`);
  }

  function csvWoche() {
    const rows = (wocheDaten?.mitarbeiter ?? []).map((m) => ({
      Mitarbeiter: m.name,
      Rolle: m.role,
      Eintraege: m.eintraege,
      Gesamtminuten: m.minuten,
      Gesamtstunden: +(m.minuten / 60).toFixed(2),
      Arbeitstage: m.arbeitstage,
      Ø_Stunden_pro_Tag:
        m.arbeitstage > 0
          ? +((m.minuten / 60) / m.arbeitstage).toFixed(2)
          : 0,
    }));
    exportAlsCSV(
      rows,
      `zeiterfassung-woche-${wocheDaten?.wochenstart ?? ""}.csv`
    );
  }

  function csvProjekte() {
    const rows = projekteListe.map((p) => ({
      Projekt: p.titel,
      Eintraege: p.eintraege,
      Gesamtstunden: p.stunden,
    }));
    exportAlsCSV(
      rows,
      `zeiterfassung-projekte-${format(new Date(), "yyyyMMdd")}.csv`
    );
  }

  const wochenLabel = useMemo(() => {
    const a = parseISO(wochenAnker);
    const ws = startOfWeek(a, { weekStartsOn: 1 });
    const we = endOfWeek(a, { weekStartsOn: 1 });
    const kw = getISOWeek(ws);
    return {
      text: `${format(ws, "dd.MM.", { locale: de })} – ${format(we, "dd.MM.yyyy", { locale: de })}`,
      kw: `KW ${kw}`,
    };
  }, [wochenAnker]);

  return (
    <div className="space-y-4">
      <Tabs
        value={aktuellerTab}
        onValueChange={(v) => setAktuellerTab(v as TabKey)}
      >
        <TabsList className="flex w-full flex-wrap gap-1 bg-zinc-900/80 p-1">
          <TabsTrigger value="live" className="flex-1">
            Live
          </TabsTrigger>
          <TabsTrigger value="heute" className="flex-1">
            Heute
          </TabsTrigger>
          <TabsTrigger value="woche" className="flex-1">
            Woche
          </TabsTrigger>
          <TabsTrigger value="projekte" className="flex-1">
            Projekte
          </TabsTrigger>
        </TabsList>

        <TabsContent value="live" className="mt-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-pulse rounded-full bg-emerald-500 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              <span className="text-sm text-zinc-300">
                {liveListe.length} Mitarbeiter eingestempelt
              </span>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-zinc-700 bg-zinc-950"
              onClick={() => void ladenApi()}
              disabled={laden}
            >
              <RefreshCw
                className={cn("mr-2 size-4", laden && "animate-spin")}
              />
              Aktualisieren
            </Button>
          </div>
          {fehler && (
            <p className="text-sm text-red-400" role="alert">
              {fehler}
            </p>
          )}
          {laden && liveListe.length === 0 ? (
            <p className="text-sm text-zinc-500">Lade…</p>
          ) : liveListe.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-zinc-800/60 bg-zinc-900/50 py-12 text-zinc-500">
              <Clock className="size-10 opacity-50" />
              <p>Niemand ist aktuell eingestempelt</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {liveListe.map((e) => {
                const name = empName(e);
                const min = dauerMinuten(e.checkin_at, null, jetzt);
                const gps = e.checkin_lat != null && e.checkin_lng != null;
                return (
                  <li
                    key={e.id}
                    className="flex flex-col gap-3 rounded-2xl border border-zinc-800/60 bg-zinc-900/50 p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/20 text-sm font-semibold text-primary">
                        {initialen(name)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium text-zinc-100">
                            {name}
                          </span>
                          {empRole(e) ? (
                            <Badge
                              variant="outline"
                              className="border-zinc-600 bg-zinc-800/40 text-zinc-300"
                            >
                              {empRole(e)}
                            </Badge>
                          ) : null}
                        </div>
                        <p className="truncate text-sm text-zinc-500">
                          {projTitel(e) === "–" ? "Kein Projekt" : projTitel(e)}
                        </p>
                        {gps ? (
                          <p className="text-xs text-zinc-500">
                            Standort verfügbar (GPS)
                          </p>
                        ) : null}
                      </div>
                    </div>
                    <div className="text-right sm:shrink-0">
                      <p className="text-sm text-emerald-400">
                        Eingestempelt seit{" "}
                        {format(parseISO(e.checkin_at), "HH:mm")} Uhr
                      </p>
                      <p className="text-sm font-medium text-zinc-200">
                        {minutenZuText(min)}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="heute" className="mt-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="border-zinc-700"
                onClick={() =>
                  setDatum((d) => format(subDays(parseISO(d), 1), "yyyy-MM-dd"))
                }
              >
                <ChevronLeft className="size-4" />
              </Button>
              <span className="min-w-[10rem] text-center text-sm font-medium text-zinc-200">
                {format(parseISO(datum), "EEEE, dd.MM.yyyy", { locale: de })}
              </span>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="border-zinc-700"
                onClick={() =>
                  setDatum((d) => format(addDays(parseISO(d), 1), "yyyy-MM-dd"))
                }
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-zinc-700"
              onClick={csvHeute}
              disabled={heuteListe.length === 0}
            >
              CSV exportieren
            </Button>
          </div>
          <div className="overflow-hidden rounded-xl border border-zinc-800">
            <Table>
              <TableHeader>
                <TableRow className="border-zinc-800 hover:bg-transparent">
                  <TableHead className="text-zinc-400">Mitarbeiter</TableHead>
                  <TableHead className="text-zinc-400">Projekt</TableHead>
                  <TableHead className="text-zinc-400">Von</TableHead>
                  <TableHead className="text-zinc-400">Bis</TableHead>
                  <TableHead className="text-zinc-400">Dauer</TableHead>
                  <TableHead className="text-zinc-400">Notiz</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {heuteListe.map((e) => {
                  const offen = !e.checkout_at;
                  const dm = dauerMinuten(
                    e.checkin_at,
                    e.checkout_at,
                    jetzt
                  );
                  return (
                    <TableRow key={e.id} className="border-zinc-800">
                      <TableCell className="font-medium text-zinc-100">
                        {empName(e)}
                      </TableCell>
                      <TableCell className="text-zinc-400">
                        {projTitel(e) === "–" ? "—" : projTitel(e)}
                      </TableCell>
                      <TableCell className="tabular-nums text-zinc-300">
                        {format(parseISO(e.checkin_at), "HH:mm")}
                      </TableCell>
                      <TableCell>
                        {offen ? (
                          <Badge
                            variant="outline"
                            className="border-amber-500/30 bg-amber-500/20 text-amber-400"
                          >
                            Läuft noch
                          </Badge>
                        ) : (
                          <span className="tabular-nums text-zinc-300">
                            {format(parseISO(e.checkout_at!), "HH:mm")}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-zinc-200">
                        {minutenZuText(dm)}
                      </TableCell>
                      <TableCell className="max-w-[12rem] truncate text-zinc-500">
                        {e.notes ?? "–"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <p className="text-sm text-zinc-500">
            Gesamt heute:{" "}
            <span className="font-medium text-zinc-200">
              {minutenZuText(heuteGesamtMin)}
            </span>
          </p>
        </TabsContent>

        <TabsContent value="woche" className="mt-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="border-zinc-700"
                onClick={() =>
                  setWochenAnker((d) =>
                    format(addWeeks(parseISO(d), -1), "yyyy-MM-dd")
                  )
                }
              >
                <ChevronLeft className="mr-1 size-4" />
                Vorwoche
              </Button>
              <span className="text-sm font-medium text-zinc-200">
                {wochenLabel.kw}, {wochenLabel.text}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="border-zinc-700"
                onClick={() =>
                  setWochenAnker((d) =>
                    format(addWeeks(parseISO(d), 1), "yyyy-MM-dd")
                  )
                }
              >
                Nächste Woche
                <ChevronRight className="ml-1 size-4" />
              </Button>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-zinc-700"
              onClick={csvWoche}
              disabled={!wocheDaten?.mitarbeiter?.length}
            >
              CSV exportieren
            </Button>
          </div>
          <div className="overflow-hidden rounded-xl border border-zinc-800">
            <Table>
              <TableHeader>
                <TableRow className="border-zinc-800 hover:bg-transparent">
                  <TableHead className="text-zinc-400">Mitarbeiter</TableHead>
                  <TableHead className="text-zinc-400">Rolle</TableHead>
                  <TableHead className="text-zinc-400">Einträge</TableHead>
                  <TableHead className="text-zinc-400">Gesamt</TableHead>
                  <TableHead className="text-zinc-400">Ø / Tag</TableHead>
                  <TableHead className="min-w-[8rem] text-zinc-400">
                    Vergleich
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(wocheDaten?.mitarbeiter ?? []).map((m) => {
                  const stunden = m.minuten / 60;
                  const ø =
                    m.arbeitstage > 0 ? stunden / m.arbeitstage : 0;
                  return (
                    <TableRow key={m.id} className="border-zinc-800">
                      <TableCell className="font-medium text-zinc-100">
                        {m.name}
                      </TableCell>
                      <TableCell className="text-zinc-400">{m.role}</TableCell>
                      <TableCell className="tabular-nums text-zinc-300">
                        {m.eintraege}
                      </TableCell>
                      <TableCell className="text-zinc-200">
                        {stunden.toFixed(1)}h
                      </TableCell>
                      <TableCell className="text-zinc-300">
                        {ø.toFixed(1)}h
                      </TableCell>
                      <TableCell>
                        <div className="h-2 w-full min-w-[6rem] overflow-hidden rounded bg-zinc-800">
                          <div
                            className="h-full rounded bg-primary/30 transition-all"
                            style={{
                              width: `${(m.minuten / maxWocheMin) * 100}%`,
                            }}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <p className="text-sm text-zinc-500">
            Org-Gesamt:{" "}
            <span className="font-medium text-zinc-200">
              {(orgGesamtMin / 60).toFixed(1)} Stunden
            </span>
          </p>
        </TabsContent>

        <TabsContent value="projekte" className="mt-4 space-y-4">
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["woche", "Diese Woche"],
                ["monat", "Dieser Monat"],
                ["letzter", "Letzter Monat"],
                ["individuell", "Individuell"],
              ] as const
            ).map(([key, label]) => (
              <Button
                key={key}
                type="button"
                size="sm"
                variant={projektPreset === key ? "default" : "outline"}
                className={
                  projektPreset === key
                    ? ""
                    : "border-zinc-700 bg-zinc-950 text-zinc-300"
                }
                onClick={() => setProjektPreset(key)}
              >
                {label}
              </Button>
            ))}
          </div>
          {projektPreset === "individuell" ? (
            <div className="flex flex-wrap items-end gap-3">
              <div className="space-y-1">
                <span className="block text-xs text-zinc-500">Von</span>
                <input
                  type="date"
                  value={customVon}
                  onChange={(ev) => setCustomVon(ev.target.value)}
                  className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
                />
              </div>
              <div className="space-y-1">
                <span className="block text-xs text-zinc-500">Bis</span>
                <input
                  type="date"
                  value={customBis}
                  onChange={(ev) => setCustomBis(ev.target.value)}
                  className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
                />
              </div>
            </div>
          ) : null}
          <div className="flex justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-zinc-700"
              onClick={csvProjekte}
              disabled={projekteListe.length === 0}
            >
              CSV exportieren
            </Button>
          </div>
          <div className="space-y-2">
            {projekteListe.map((p) => {
              const open = expanded.has(p.id);
              return (
                <div
                  key={p.id}
                  className="rounded-2xl border border-zinc-800/60 bg-zinc-900/50"
                >
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-3 p-4 text-left"
                    onClick={() => {
                      setExpanded((prev) => {
                        const n = new Set(prev);
                        if (n.has(p.id)) n.delete(p.id);
                        else n.add(p.id);
                        return n;
                      });
                    }}
                  >
                    <div>
                      <p className="font-medium text-zinc-100">{p.titel}</p>
                      <p className="text-sm text-zinc-500">
                        {p.eintraege} Einträge · {p.stunden}h gesamt
                      </p>
                    </div>
                    <ChevronRight
                      className={cn(
                        "size-5 shrink-0 text-zinc-500 transition-transform",
                        open && "rotate-90"
                      )}
                    />
                  </button>
                  {open ? (
                    <div className="border-t border-zinc-800 px-4 pb-4">
                      <div className="overflow-hidden rounded-xl border border-zinc-800">
                        <Table>
                          <TableHeader>
                            <TableRow className="border-zinc-800 hover:bg-transparent">
                              <TableHead className="text-zinc-400">
                                Mitarbeiter
                              </TableHead>
                              <TableHead className="text-right text-zinc-400">
                                Stunden
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {p.mitarbeiter.map((ma) => (
                              <TableRow key={ma.id} className="border-zinc-800">
                                <TableCell className="text-zinc-200">
                                  {ma.name}
                                </TableCell>
                                <TableCell className="text-right tabular-nums text-zinc-200">
                                  {(ma.minuten / 60).toFixed(1)}h
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
          {projekteListe.length === 0 && !laden ? (
            <p className="text-sm text-zinc-500">Keine Daten im Zeitraum.</p>
          ) : null}
        </TabsContent>
      </Tabs>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  AlertTriangle,
  CalendarOff,
  Check,
  ChevronsUpDown,
  Clock,
  Loader2,
  Palmtree,
  Pencil,
  Plus,
  Search,
  Thermometer,
  Trash2,
  X,
} from "lucide-react";
import {
  differenceInCalendarDays,
  endOfMonth,
  format,
  parseISO,
} from "date-fns";
import { de } from "date-fns/locale";
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
import { Textarea } from "@/components/ui/textarea";
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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type {
  Abwesenheit,
  AbwesenheitFormWerte,
  AbwesenheitStatus,
  AbwesenheitTyp,
} from "@/types/abwesenheiten";
import {
  ABWESENHEIT_STATUS,
  ABWESENHEIT_TYPEN,
} from "@/types/abwesenheiten";

const schema = z
  .object({
    employee_id: z.string().uuid("Mitarbeiter wählen."),
    type: z.enum(["urlaub", "krank", "fortbildung", "sonstiges"]),
    start_date: z.string().min(1, "Von-Datum erforderlich."),
    end_date: z.string().min(1, "Bis-Datum erforderlich."),
    status: z.enum(["beantragt", "genehmigt", "abgelehnt"]),
    notes: z.string().optional(),
  })
  .refine((d) => d.start_date <= d.end_date, {
    message: "Ende muss nach Start liegen.",
    path: ["end_date"],
  });

/** Datumsschlüssel YYYY-MM-DD (auch bei ISO-Timestamps aus der API) */
function toDateKey(d: string): string {
  if (!d) return d;
  const t = d.indexOf("T");
  if (t > 0) return d.slice(0, 10);
  return d.length >= 10 ? d.slice(0, 10) : d;
}

function formatDatum(iso: string): string {
  try {
    return format(parseISO(toDateKey(iso)), "dd.MM.yyyy", { locale: de });
  } catch {
    return iso;
  }
}

function berecheDauer(start: string, end: string): number {
  try {
    return (
      differenceInCalendarDays(parseISO(toDateKey(end)), parseISO(toDateKey(start))) +
      1
    );
  } catch {
    return 0;
  }
}

function formatZeitraum(start: string, end: string): string {
  const s = parseISO(toDateKey(start));
  const e = parseISO(toDateKey(end));
  const days = berecheDauer(start, end);
  const tagLabel = days === 1 ? "1 Tag" : `${days} Tage`;
  if (format(s, "yyyy-MM-dd") === format(e, "yyyy-MM-dd")) {
    return `${format(s, "d. MMMM yyyy", { locale: de })} · ${tagLabel}`;
  }
  if (s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear()) {
    return `${format(s, "d.", { locale: de })} – ${format(e, "d. MMMM yyyy", { locale: de })} · ${tagLabel}`;
  }
  return `${format(s, "d. MMM yyyy", { locale: de })} – ${format(e, "d. MMM yyyy", { locale: de })} · ${tagLabel}`;
}

function normalisiereTyp(raw: string): AbwesenheitTyp {
  const t = raw as AbwesenheitTyp;
  return ABWESENHEIT_TYPEN.some((x) => x.value === t) ? t : "sonstiges";
}

function normalisiereStatus(raw: string): AbwesenheitStatus {
  const u = String(raw ?? "").toLowerCase().trim();
  if (["genehmigt", "approved", "genehmig"].includes(u)) return "genehmigt";
  if (["abgelehnt", "rejected", "declined"].includes(u)) return "abgelehnt";
  if (["beantragt", "ausstehend", "pending", "offen"].includes(u))
    return "beantragt";
  const s = u as AbwesenheitStatus;
  return ABWESENHEIT_STATUS.some((x) => x.value === s) ? s : "beantragt";
}

function intervalleUeberlappen(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string
): boolean {
  const as = toDateKey(aStart);
  const ae = toDateKey(aEnd);
  const bs = toDateKey(bStart);
  const be = toDateKey(bEnd);
  return as <= be && ae >= bs;
}

function mitarbeiterInitialen(name: string): string {
  const p = name.trim().split(/\s+/).filter(Boolean);
  if (p.length >= 2)
    return `${p[0]!.charAt(0)}${p[1]!.charAt(0)}`.toUpperCase();
  return name.slice(0, 2).toUpperCase() || "—";
}

/** Kalenderwoche Montag 00:00 lokal */
function wocheStartDatum(): Date {
  const d = new Date();
  const diff = d.getDay() === 0 ? -6 : 1 - d.getDay();
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function wocheStartStr(): string {
  return format(wocheStartDatum(), "yyyy-MM-dd");
}

function wocheEndeStr(): string {
  const e = new Date(wocheStartDatum());
  e.setDate(e.getDate() + 6);
  e.setHours(0, 0, 0, 0);
  return format(e, "yyyy-MM-dd");
}

function istUrlaubStat(a: Abwesenheit): boolean {
  const r = a.type_raw.toLowerCase().trim();
  return (
    a.type === "urlaub" ||
    ["urlaub", "bezahlter_urlaub", "urlaubstag"].includes(r)
  );
}

function istKrankStat(a: Abwesenheit): boolean {
  const r = a.type_raw.toLowerCase().trim();
  return (
    a.type === "krank" ||
    ["krank", "krankheit", "krankmeldung"].includes(r)
  );
}

const STATUS_STYLE: Record<
  AbwesenheitStatus,
  {
    bg: string;
    text: string;
    border: string;
    pulse: boolean;
    label: string;
  }
> = {
  beantragt: {
    bg: "bg-amber-950",
    text: "text-amber-400",
    border: "border-amber-900/50",
    pulse: true,
    label: "Ausstehend",
  },
  genehmigt: {
    bg: "bg-emerald-950",
    text: "text-emerald-400",
    border: "border-emerald-900/50",
    pulse: false,
    label: "Genehmigt",
  },
  abgelehnt: {
    bg: "bg-red-950",
    text: "text-red-400",
    border: "border-red-900/50",
    pulse: false,
    label: "Abgelehnt",
  },
};

function typBadgeMeta(typeRaw: string, norm: AbwesenheitTyp): {
  label: string;
  className: string;
} {
  const r = typeRaw.toLowerCase().trim();
  if (["bezahlter_urlaub", "urlaubstag", "urlaub"].includes(r))
    return { label: "Urlaub", className: "bg-blue-950 text-blue-300 border-blue-900/50" };
  if (["krank", "krankheit", "krankmeldung"].includes(r))
    return { label: "Krank", className: "bg-red-950 text-red-300 border-red-900/50" };
  if (r.includes("kind") && r.includes("krank"))
    return { label: typeRaw || "Kind krank", className: "bg-pink-950 text-pink-300 border-pink-900/50" };
  if (r.includes("eltern"))
    return { label: "Elternzeit", className: "bg-violet-950 text-violet-300 border-violet-900/50" };
  if (r.includes("freizeit") || r.includes("gleitzeit"))
    return { label: "Freizeitausgleich", className: "bg-emerald-950 text-emerald-300 border-emerald-900/50" };
  const fromEnum = ABWESENHEIT_TYPEN.find((t) => t.value === norm);
  if (norm === "fortbildung")
    return {
      label: fromEnum?.label ?? "Fortbildung",
      className: "bg-violet-950 text-violet-300 border-violet-900/50",
    };
  if (norm === "urlaub")
    return { label: "Urlaub", className: "bg-blue-950 text-blue-300 border-blue-900/50" };
  if (norm === "krank")
    return { label: "Krank", className: "bg-red-950 text-red-300 border-red-900/50" };
  return {
    label: fromEnum?.label ?? "Sonstiges",
    className: "bg-zinc-800 text-zinc-300 border-zinc-700/50",
  };
}

type FilterTyp = "all" | "urlaub" | "krank" | "sonstige";

export function AbwesenheitenVerwaltung() {
  const supabase = useMemo(() => createClient(), []);
  const [abwesenheiten, setAbwesenheiten] = useState<Abwesenheit[]>([]);
  const [mitarbeiter, setMitarbeiter] = useState<
    { id: string; name: string; department?: string }[]
  >([]);
  const [laden, setLaden] = useState(true);
  const [sheetOffen, setSheetOffen] = useState(false);
  const [bearbeitenId, setBearbeitenId] = useState<string | null>(null);
  const [konflikte, setKonflikte] = useState<{ datum: string; projekt: string }[]>(
    []
  );
  const [filter, setFilter] = useState({
    suche: "",
    typ: "all" as FilterTyp,
    status: "all" as "all" | AbwesenheitStatus,
    monat: "all",
  });
  const [speichern, setSpeichern] = useState(false);
  const [statusUpdate, setStatusUpdate] = useState<{
    id: string;
    to: "genehmigt" | "abgelehnt";
  } | null>(null);
  const [loeschenDialog, setLoeschenDialog] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [maComboOffen, setMaComboOffen] = useState(false);

  const jahr = new Date().getFullYear();
  const monatOptionen = useMemo(
    () => [
      { value: "all", label: "Alle Monate" },
      ...Array.from({ length: 12 }, (_, i) => ({
        value: `${jahr}-${String(i + 1).padStart(2, "0")}`,
        label: format(new Date(jahr, i, 1), "MMMM", { locale: de }),
      })),
    ],
    [jahr]
  );

  const ladenDaten = useCallback(async () => {
    try {
      const [resM, resA] = await Promise.all([
        supabase
          .from("employees")
          .select("id,name,departments(name)")
          .eq("active", true)
          .order("name"),
        supabase
          .from("absences")
          .select(
            `
            id,
            type,
            status,
            start_date,
            end_date,
            notes,
            quelle,
            created_at,
            employee_id,
            employee:employees!employee_id(
              id,
              name,
              teams(id, name, farbe),
              departments(id, name)
            )
          `
          )
          .order("start_date", { ascending: false }),
      ]);

      if (resM.error) {
        toast.error(resM.error.message);
        setMitarbeiter([]);
      } else {
        setMitarbeiter(
          (resM.data ?? []).map((row) => {
            const d = row.departments as
              | { name?: string }
              | { name?: string }[]
              | null;
            const dep = Array.isArray(d) ? d[0] : d;
            return {
              id: row.id as string,
              name: row.name as string,
              department: dep?.name as string | undefined,
            };
          })
        );
      }

      if (resA.error) {
        console.error("Absences Query Error:", resA.error);
        toast.error(
          resA.error.message ||
            "Abwesenheiten konnten nicht geladen werden."
        );
        setAbwesenheiten([]);
        return;
      }

      const list: Abwesenheit[] = (resA.data as Record<string, unknown>[]).map(
        (row) => {
          const e = row.employee;
          const emp = Array.isArray(e) ? e[0] : e;
          const quelle = row.quelle as string;
          const rawType = String(row.type ?? "");
          return {
            id: row.id as string,
            employee_id: row.employee_id as string,
            employee_name: (emp as { name?: string })?.name ?? "—",
            type_raw: rawType,
            type: normalisiereTyp(rawType),
            start_date: toDateKey(String(row.start_date ?? "")),
            end_date: toDateKey(String(row.end_date ?? "")),
            status: normalisiereStatus(String(row.status ?? "")),
            notes: (row.notes as string | null) ?? null,
            quelle: quelle === "personio" ? "personio" : "manuell",
            created_at: (row.created_at as string) ?? "",
          };
        }
      );
      setAbwesenheiten(list);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Laden fehlgeschlagen.";
      toast.error(msg);
    } finally {
      setLaden(false);
    }
  }, [supabase]);

  useEffect(() => {
    void ladenDaten();
  }, [ladenDaten]);

  const form = useForm<AbwesenheitFormWerte>({
    resolver: zodResolver(schema),
    defaultValues: {
      employee_id: "",
      type: "urlaub",
      start_date: "",
      end_date: "",
      status: "beantragt",
      notes: "",
    },
  });

  useEffect(() => {
    if (!sheetOffen) return;
    setKonflikte([]);
    if (bearbeitenId) {
      const row = abwesenheiten.find((x) => x.id === bearbeitenId);
      if (row) {
        form.reset({
          employee_id: row.employee_id,
          type: row.type,
          start_date: row.start_date,
          end_date: row.end_date,
          status: row.status,
          notes: row.notes ?? "",
        });
      }
    } else {
      form.reset({
        employee_id: "",
        type: "urlaub",
        start_date: "",
        end_date: "",
        status: "beantragt",
        notes: "",
      });
    }
  }, [sheetOffen, bearbeitenId, abwesenheiten, form]);

  async function pruefeKonflikte(
    employeeId: string,
    von: string,
    bis: string
  ): Promise<{ datum: string; projekt: string }[]> {
    const vonK = toDateKey(von);
    const bisK = toDateKey(bis);
    const { data, error } = await supabase
      .from("assignments")
      .select("date, projects(title), project_title")
      .eq("employee_id", employeeId)
      .gte("date", vonK)
      .lte("date", bisK);

    if (error || !data?.length) return [];

    return data.map((row) => {
      const p = row.projects as
        | { title?: string }
        | { title?: string }[]
        | null;
      const proj = Array.isArray(p) ? p[0] : p;
      const titel =
        proj?.title?.trim() ||
        (row.project_title as string | null)?.trim() ||
        "Projekt";
      return {
        datum: formatDatum(String(row.date)),
        projekt: titel,
      };
    });
  }

  async function onSubmit(werte: AbwesenheitFormWerte) {
    setSpeichern(true);
    setKonflikte([]);
    try {
      const payload = {
        employee_id: werte.employee_id,
        type: werte.type,
        start_date: toDateKey(werte.start_date),
        end_date: toDateKey(werte.end_date),
        status: werte.status,
        notes: werte.notes?.trim() || null,
        quelle: "manuell" as const,
      };

      if (bearbeitenId) {
        const { error } = await supabase
          .from("absences")
          .update(payload)
          .eq("id", bearbeitenId);
        if (error) throw error;
        toast.success("Abwesenheit gespeichert.");
      } else {
        const { error } = await supabase.from("absences").insert(payload);
        if (error) throw error;
        toast.success("Abwesenheit erfasst.");
      }

      const k = await pruefeKonflikte(
        werte.employee_id,
        werte.start_date,
        werte.end_date
      );
      setKonflikte(k);
      void ladenDaten();
      if (k.length === 0) {
        setSheetOffen(false);
        setBearbeitenId(null);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Speichern fehlgeschlagen.";
      toast.error(msg);
    } finally {
      setSpeichern(false);
    }
  }

  function bearbeiten(abs: Abwesenheit) {
    setBearbeitenId(abs.id);
    setSheetOffen(true);
  }

  async function setStatus(
    id: string,
    status: "genehmigt" | "abgelehnt"
  ) {
    setStatusUpdate({ id, to: status });
    try {
      const { error } = await supabase
        .from("absences")
        .update({ status })
        .eq("id", id);
      if (error) throw error;
      toast.success(
        status === "genehmigt" ? "Genehmigt." : "Abgelehnt."
      );
      void ladenDaten();
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : "Status konnte nicht gesetzt werden.";
      toast.error(msg);
    } finally {
      setStatusUpdate(null);
    }
  }

  async function loeschenBestaetigt() {
    if (!loeschenDialog) return;
    const { error } = await supabase
      .from("absences")
      .delete()
      .eq("id", loeschenDialog.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Abwesenheit gelöscht.");
    setLoeschenDialog(null);
    void ladenDaten();
  }

  function loeschen(id: string) {
    const abs = abwesenheiten.find((a) => a.id === id);
    setLoeschenDialog({
      id,
      name: abs?.employee_name ?? "",
    });
  }

  const heuteStr = format(new Date(), "yyyy-MM-dd");
  const wVon = wocheStartStr();
  const wBis = wocheEndeStr();

  const statUrlaubWoche = useMemo(() => {
    return abwesenheiten.filter(
      (a) =>
        istUrlaubStat(a) &&
        intervalleUeberlappen(a.start_date, a.end_date, wVon, wBis)
    ).length;
  }, [abwesenheiten, wVon, wBis]);

  const statKrankHeute = useMemo(() => {
    return abwesenheiten.filter(
      (a) =>
        istKrankStat(a) &&
        intervalleUeberlappen(a.start_date, a.end_date, heuteStr, heuteStr)
    ).length;
  }, [abwesenheiten, heuteStr]);

  const statAusstehend = useMemo(() => {
    return abwesenheiten.filter(
      (a) =>
        a.status === "beantragt" ||
        ["ausstehend", "pending", "offen"].includes(
          String(a.status ?? "").toLowerCase().trim()
        )
    ).length;
  }, [abwesenheiten]);

  const typFilterAktiv = filter.typ;

  const gefilterteAbwesenheiten = useMemo(() => {
    const q = filter.suche.trim().toLowerCase();
    return abwesenheiten.filter((a) => {
      if (q && !a.employee_name.toLowerCase().includes(q)) return false;
      if (filter.typ === "urlaub" && a.type !== "urlaub") return false;
      if (filter.typ === "krank" && a.type !== "krank") return false;
      if (
        filter.typ === "sonstige" &&
        a.type !== "sonstiges" &&
        a.type !== "fortbildung"
      )
        return false;
      if (filter.status !== "all" && a.status !== filter.status) return false;
      if (filter.monat !== "all") {
        const [y, m] = filter.monat.split("-").map(Number);
        const monthStart = `${y}-${String(m).padStart(2, "0")}-01`;
        const monthEnd = format(endOfMonth(parseISO(monthStart)), "yyyy-MM-dd");
        if (!intervalleUeberlappen(a.start_date, a.end_date, monthStart, monthEnd))
          return false;
      }
      return true;
    });
  }, [abwesenheiten, filter]);

  const gewaehlterMitarbeiter = mitarbeiter.find(
    (m) => m.id === form.watch("employee_id")
  );

  const typButtons: { label: string; value: FilterTyp }[] = [
    { label: "Alle", value: "all" },
    { label: "Urlaub", value: "urlaub" },
    { label: "Krank", value: "krank" },
    { label: "Sonstige", value: "sonstige" },
  ];

  function oeffneErfassen() {
    setBearbeitenId(null);
    setSheetOffen(true);
  }

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-50">
            Abwesenheiten
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            Erfassen, filtern und Status setzen für dein Team.
          </p>
        </div>
        <Button type="button" onClick={oeffneErfassen}>
          <Plus size={16} className="mr-2" />
          Abwesenheit erfassen
        </Button>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {(
          [
            {
              label: "URLAUB DIESE WOCHE",
              wert: statUrlaubWoche,
              subtext: "Im Zeitraum der aktuellen Kalenderwoche",
              farbe: "#3b82f6",
              Icon: Palmtree,
            },
            {
              label: "KRANK HEUTE",
              wert: statKrankHeute,
              subtext: "Heute als krank geführt",
              farbe: "#ef4444",
              Icon: Thermometer,
            },
            {
              label: "AUSSTEHEND",
              wert: statAusstehend,
              subtext: "Noch nicht genehmigt oder abgelehnt",
              farbe: "#f59e0b",
              Icon: Clock,
            },
          ] as const
        ).map(({ label, wert, subtext, farbe, Icon }) => (
          <div
            key={label}
            className="group relative overflow-hidden rounded-2xl border border-zinc-800/60 bg-zinc-900 p-5 transition-colors hover:border-zinc-700"
          >
            <div
              className="absolute -top-4 -left-4 h-16 w-16 rounded-full opacity-20 blur-xl transition-opacity group-hover:opacity-30"
              style={{ background: farbe }}
            />
            <div className="flex items-start justify-between">
              <div>
                <p className="mb-1 text-xs font-semibold tracking-wider text-zinc-500 uppercase">
                  {label}
                </p>
                <p className="text-3xl font-bold tabular-nums text-zinc-100">
                  {wert}
                </p>
              </div>
              <div
                className="rounded-xl p-2.5"
                style={{ background: `${farbe}20` }}
              >
                <Icon size={18} style={{ color: farbe }} />
              </div>
            </div>
            <p className="mt-3 text-xs text-zinc-600">{subtext}</p>
          </div>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search
            size={13}
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-zinc-500"
          />
          <input
            placeholder="Mitarbeiter suchen…"
            className="w-44 rounded-lg border border-zinc-800 bg-zinc-900 py-2 pr-3 pl-8 text-sm text-zinc-200 transition-colors placeholder:text-zinc-600 focus:border-zinc-700 focus:outline-none"
            value={filter.suche}
            onChange={(e) =>
              setFilter((f) => ({ ...f, suche: e.target.value }))
            }
          />
        </div>

        <div className="flex gap-1 rounded-lg border border-zinc-800 bg-zinc-900 p-1">
          {typButtons.map((tb) => (
            <button
              key={tb.value}
              type="button"
              onClick={() => setFilter((f) => ({ ...f, typ: tb.value }))}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium transition-all",
                typFilterAktiv === tb.value
                  ? "bg-zinc-700 text-zinc-100"
                  : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              {tb.label}
            </button>
          ))}
        </div>

        <Select
          value={filter.status}
          onValueChange={(v) =>
            setFilter((f) => ({
              ...f,
              status: (v ?? "all") as "all" | AbwesenheitStatus,
            }))
          }
        >
          <SelectTrigger className="h-9 w-36 border-zinc-800 bg-zinc-900 text-sm text-zinc-300">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent className="border-zinc-800 bg-zinc-900">
            <SelectItem value="all">Alle Status</SelectItem>
            <SelectItem value="beantragt">Ausstehend</SelectItem>
            <SelectItem value="genehmigt">Genehmigt</SelectItem>
            <SelectItem value="abgelehnt">Abgelehnt</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filter.monat}
          onValueChange={(v) =>
            setFilter((f) => ({ ...f, monat: v ?? "all" }))
          }
        >
          <SelectTrigger className="h-9 w-[180px] border-zinc-800 bg-zinc-900 text-sm text-zinc-300">
            <SelectValue placeholder="Monat" />
          </SelectTrigger>
          <SelectContent className="border-zinc-800 bg-zinc-900">
            {monatOptionen.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-hidden rounded-xl border border-zinc-800">
        {laden ? (
          <div className="divide-y divide-zinc-800 p-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="py-3">
                <Skeleton className="h-14 w-full bg-zinc-800" />
              </div>
            ))}
          </div>
        ) : gefilterteAbwesenheiten.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 py-16">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
              <CalendarOff size={28} className="text-zinc-600" />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-zinc-400">
                Keine Abwesenheiten gefunden
              </p>
              <p className="mt-1 text-xs text-zinc-600">
                {filter.suche ||
                filter.typ !== "all" ||
                filter.status !== "all" ||
                filter.monat !== "all"
                  ? "Filter anpassen oder zurücksetzen"
                  : "Erfasse die erste Abwesenheit für dein Team"}
              </p>
            </div>
            {!filter.suche &&
              filter.typ === "all" &&
              filter.status === "all" &&
              filter.monat === "all" && (
                <Button
                  type="button"
                  onClick={oeffneErfassen}
                  className="border border-zinc-700 bg-zinc-800 text-sm text-zinc-200 hover:bg-zinc-700"
                >
                  <Plus size={14} className="mr-1.5" />
                  Abwesenheit erfassen
                </Button>
              )}
          </div>
        ) : (
          <div className="divide-y divide-zinc-800">
            {gefilterteAbwesenheiten.map((abs) => {
              const st = STATUS_STYLE[abs.status];
              const typMeta = typBadgeMeta(abs.type_raw, abs.type);
              const statusBusy =
                statusUpdate?.id === abs.id ? statusUpdate : null;
              return (
                <div
                  key={abs.id}
                  className="flex flex-wrap items-center gap-4 p-4 transition-colors hover:bg-zinc-900/40"
                >
                  <div className="flex min-w-[200px] flex-1 items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-xs font-semibold text-zinc-200">
                      {mitarbeiterInitialen(abs.employee_name)}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-zinc-100">
                        {abs.employee_name}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {formatZeitraum(abs.start_date, abs.end_date)}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={cn(
                        "inline-flex rounded-md border px-2.5 py-0.5 text-xs font-medium",
                        typMeta.className
                      )}
                    >
                      {typMeta.label}
                    </span>
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-0.5 text-xs font-medium",
                        st.bg,
                        st.text,
                        st.border
                      )}
                    >
                      <span
                        className={cn(
                          "size-1.5 shrink-0 rounded-full",
                          abs.status === "beantragt" &&
                            "animate-pulse bg-amber-400",
                          abs.status === "genehmigt" && "bg-emerald-400",
                          abs.status === "abgelehnt" && "bg-red-400"
                        )}
                      />
                      {st.label}
                    </span>
                  </div>
                  {abs.notes ? (
                    <p className="max-w-[200px] truncate text-xs text-zinc-500">
                      {abs.notes}
                    </p>
                  ) : null}
                  <div className="ml-auto flex flex-wrap items-center justify-end gap-1">
                    {abs.status === "beantragt" ? (
                      <>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 gap-1 text-xs text-emerald-400 hover:bg-emerald-950/40 hover:text-emerald-300"
                          disabled={!!statusBusy}
                          onClick={() => void setStatus(abs.id, "genehmigt")}
                        >
                          {statusBusy?.to === "genehmigt" ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <Check size={14} />
                          )}
                          Genehmigen
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 gap-1 text-xs text-red-400 hover:bg-red-950/40 hover:text-red-300"
                          disabled={!!statusBusy}
                          onClick={() => void setStatus(abs.id, "abgelehnt")}
                        >
                          {statusBusy?.to === "abgelehnt" ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <X size={14} />
                          )}
                          Ablehnen
                        </Button>
                      </>
                    ) : null}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => bearbeiten(abs)}
                    >
                      <Pencil size={14} />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => loeschen(abs.id)}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Sheet open={sheetOffen} onOpenChange={setSheetOffen}>
        <SheetContent className="flex flex-col border-zinc-800 bg-zinc-950 sm:max-w-[480px]">
          <SheetHeader>
            <SheetTitle className="text-zinc-50">
              {bearbeitenId ? "Abwesenheit bearbeiten" : "Abwesenheit erfassen"}
            </SheetTitle>
          </SheetHeader>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-1 flex-col gap-4 overflow-y-auto py-2"
          >
            <div className="space-y-2">
              <Label className="text-zinc-300">Mitarbeiter</Label>
              <Controller
                control={form.control}
                name="employee_id"
                render={({ field }) => (
                  <Popover open={maComboOffen} onOpenChange={setMaComboOffen}>
                    <PopoverTrigger
                      className={cn(
                        "inline-flex h-9 w-full items-center justify-between rounded-md border border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-100"
                      )}
                      nativeButton
                    >
                      {gewaehlterMitarbeiter ? (
                        <span className="truncate">
                          {gewaehlterMitarbeiter.name}
                        </span>
                      ) : (
                        <span className="text-zinc-500">Mitarbeiter wählen…</span>
                      )}
                      <ChevronsUpDown size={14} />
                    </PopoverTrigger>
                    <PopoverContent
                      className="w-[var(--anchor-width)] p-0"
                      align="start"
                    >
                      <Command>
                        <CommandInput placeholder="Suchen…" />
                        <CommandList>
                          <CommandEmpty>Kein Treffer.</CommandEmpty>
                          <CommandGroup>
                            {mitarbeiter.map((ma) => (
                              <CommandItem
                                key={ma.id}
                                value={`${ma.name} ${ma.department ?? ""} ${ma.id}`}
                                onSelect={() => {
                                  field.onChange(ma.id);
                                  setMaComboOffen(false);
                                }}
                              >
                                <div className="flex flex-1 items-center gap-2">
                                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-700 text-xs">
                                    {ma.name.charAt(0)}
                                  </div>
                                  <span>{ma.name}</span>
                                  {ma.department ? (
                                    <span className="text-xs text-zinc-500">
                                      {ma.department}
                                    </span>
                                  ) : null}
                                </div>
                                <Check
                                  size={14}
                                  className={
                                    field.value === ma.id ? "" : "opacity-0"
                                  }
                                />
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                )}
              />
              {form.formState.errors.employee_id && (
                <p className="text-xs text-red-400">
                  {form.formState.errors.employee_id.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-zinc-300">Typ</Label>
              <Controller
                control={form.control}
                name="type"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="border-zinc-800 bg-zinc-900">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="border-zinc-800 bg-zinc-950">
                      {ABWESENHEIT_TYPEN.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.emoji} {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-zinc-300">Von *</Label>
                <Input
                  type="date"
                  className="border-zinc-800 bg-zinc-900"
                  {...form.register("start_date")}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-zinc-300">Bis *</Label>
                <Input
                  type="date"
                  className="border-zinc-800 bg-zinc-900"
                  {...form.register("end_date")}
                />
              </div>
            </div>
            {form.formState.errors.end_date && (
              <p className="text-xs text-red-400">
                {form.formState.errors.end_date.message}
              </p>
            )}

            <div className="space-y-2">
              <Label className="text-zinc-300">Status</Label>
              <Controller
                control={form.control}
                name="status"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="border-zinc-800 bg-zinc-900">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="border-zinc-800 bg-zinc-950">
                      {ABWESENHEIT_STATUS.map((s) => (
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
              <Label className="text-zinc-300">Notiz (optional)</Label>
              <Textarea
                placeholder="Kurze Bemerkung…"
                className="resize-none border-zinc-800 bg-zinc-900"
                rows={3}
                {...form.register("notes")}
              />
            </div>

            {konflikte.length > 0 && (
              <Alert variant="destructive" className="mt-2 border-red-900/80">
                <AlertTriangle size={16} />
                <AlertTitle>Planungskonflikt erkannt</AlertTitle>
                <AlertDescription>
                  {konflikte.map((k) => (
                    <div key={`${k.datum}-${k.projekt}`}>
                      ⚠ Am {k.datum} für Projekt „{k.projekt}“ eingeplant
                    </div>
                  ))}
                  <p className="mt-2 text-sm">
                    Bitte Planung unter /planung anpassen.
                  </p>
                </AlertDescription>
              </Alert>
            )}

            <SheetFooter className="mt-auto flex-col gap-2 border-t border-zinc-800 pt-4 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setSheetOffen(false);
                  setBearbeitenId(null);
                  setKonflikte([]);
                }}
              >
                Abbrechen
              </Button>
              <Button type="submit" disabled={speichern}>
                {speichern ? (
                  <Loader2 className="mr-1 size-4 animate-spin" />
                ) : null}
                {bearbeitenId ? "Speichern" : "Erfassen"}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      <Dialog
        open={!!loeschenDialog}
        onOpenChange={(o) => !o && setLoeschenDialog(null)}
      >
        <DialogContent className="border-zinc-800 bg-zinc-950 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-zinc-50">Abwesenheit löschen?</DialogTitle>
            <DialogDescription>
              Abwesenheit von {loeschenDialog?.name ?? ""} wirklich löschen?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setLoeschenDialog(null)}
            >
              Abbrechen
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void loeschenBestaetigt()}
            >
              Löschen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

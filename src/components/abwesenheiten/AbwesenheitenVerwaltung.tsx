"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  AlertCircle,
  AlertTriangle,
  Check,
  ChevronsUpDown,
  Loader2,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { addDays, differenceInCalendarDays, format, parseISO } from "date-fns";
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
import { logFehler } from "@/lib/logger";
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

const SELECT_ABSENCES_BASE = `
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
    department_id,
    teams!team_id(id, name, farbe),
    departments!department_id(id, name, color)
  )
`;

const SELECT_ABSENCES_WITH_PIVOT = `
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
    department_id,
    teams!team_id(id, name, farbe),
    departments!department_id(id, name, color),
    employee_departments(
      department_id,
      ist_primaer,
      departments(id, name, color)
    )
  )
`;

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
      differenceInCalendarDays(
        parseISO(toDateKey(end)),
        parseISO(toDateKey(start))
      ) + 1
    );
  } catch {
    return 0;
  }
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
  return name.slice(0, 2).toUpperCase() || "??";
}

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

function parseMitarbeiterAbteilung(emp: Record<string, unknown> | undefined): {
  label: string | null;
  ids: string[];
} {
  if (!emp) return { label: null, ids: [] };
  const ids = new Set<string>();
  let label: string | null = null;

  const edRaw = emp.employee_departments;
  const edArr = Array.isArray(edRaw)
    ? edRaw
    : edRaw
      ? [edRaw]
      : [];
  const rows = edArr
    .filter((x): x is Record<string, unknown> => Boolean(x && typeof x === "object"))
    .sort((a, b) =>
      Boolean(a.ist_primaer) === Boolean(b.ist_primaer)
        ? 0
        : (a.ist_primaer as boolean)
          ? -1
          : 1
    );

  for (const r of rows) {
    const did = r.department_id as string | undefined;
    if (did) ids.add(did);
    const dep = r.departments as
      | { name?: string }
      | { name?: string }[]
      | null;
    const one = Array.isArray(dep) ? dep[0] : dep;
    if (!label && one?.name) label = String(one.name);
  }

  const depId = emp.department_id as string | undefined;
  if (depId) ids.add(depId);
  if (!label) {
    const d = emp.departments as
      | { name?: string }
      | { name?: string }[]
      | null;
    const one = Array.isArray(d) ? d[0] : d;
    if (one?.name) label = String(one.name);
  }

  return { label, ids: Array.from(ids) };
}

const ABWESENHEIT_TYPEN_MAP = ABWESENHEIT_TYPEN;

function TypBadge({ type_raw, typ }: { type_raw: string; typ: AbwesenheitTyp }) {
  const r = type_raw.toLowerCase().trim();
  let c: { label: string; farbe: string } = {
    label: "Sonstige",
    farbe: "#8b5cf6",
  };
  if (["urlaub", "bezahlter_urlaub", "urlaubstag"].includes(r) || typ === "urlaub") {
    c = { label: "Urlaub", farbe: "#3b82f6" };
  } else if (
    ["krank", "krankheit", "krankmeldung"].includes(r) ||
    typ === "krank"
  ) {
    c = { label: "Krank", farbe: "#ef4444" };
  } else if (r.includes("kind") && r.includes("krank")) {
    c = { label: type_raw || "Kind krank", farbe: "#ec4899" };
  } else if (r.includes("eltern")) {
    c = { label: "Elternzeit", farbe: "#10b981" };
  } else if (r.includes("freizeit") || r.includes("gleitzeit")) {
    c = { label: "Freizeitausgleich", farbe: "#14b8a6" };
  } else if (typ === "fortbildung") {
    const fromEnum = ABWESENHEIT_TYPEN_MAP.find((t) => t.value === "fortbildung");
    c = {
      label: fromEnum?.label ?? "Fortbildung",
      farbe: "#8b5cf6",
    };
  } else if (typ === "sonstiges") {
    const fromEnum = ABWESENHEIT_TYPEN_MAP.find((t) => t.value === "sonstiges");
    c = {
      label: fromEnum?.label ?? "Sonstiges",
      farbe: "#71717a",
    };
  }

  return (
    <span
      className="rounded-full border px-2 py-0.5 text-xs font-semibold"
      style={{
        color: c.farbe,
        background: `${c.farbe}15`,
        borderColor: `${c.farbe}40`,
      }}
    >
      {c.label}
    </span>
  );
}

function StatusBadge({ status }: { status: AbwesenheitStatus }) {
  const u = String(status).toLowerCase();
  const key = u === "beantragt" ? "ausstehend" : u;
  const config: Record<string, { label: string; farbe: string }> = {
    ausstehend: { label: "Ausstehend", farbe: "#f59e0b" },
    genehmigt: { label: "Genehmigt", farbe: "#10b981" },
    abgelehnt: { label: "Abgelehnt", farbe: "#ef4444" },
  };
  const c = config[key] ?? { label: status, farbe: "#71717a" };
  return (
    <div className="flex items-center gap-1.5">
      <div
        className="size-1.5 shrink-0 rounded-full"
        style={{ background: c.farbe }}
      />
      <span className="text-xs font-medium text-zinc-400">{c.label}</span>
    </div>
  );
}

type FilterTyp = "all" | "urlaub" | "krank" | "sonstige";

type KiAbwesenheitVorschlag = {
  mitarbeiter: { id: string; name: string; abteilung: string }[];
  typ: "krankheit" | "urlaub" | "sonstiges";
  start_date: string;
  end_date: string;
  tage: number;
  begruendung: string;
  error?: string;
};

type KiZielTyp = "mitarbeiter" | "team" | "abteilung";
type KiTypAuswahl = "krank" | "urlaub" | "fortbildung" | "sonstiges";
type KiDatumModus = "heute" | "morgen" | "datum" | "zeitraum";

export function AbwesenheitenVerwaltung() {
  const supabase = useMemo(() => createClient(), []);
  const [abwesenheiten, setAbwesenheiten] = useState<Abwesenheit[]>([]);
  const [mitarbeiter, setMitarbeiter] = useState<
    { id: string; name: string; department?: string }[]
  >([]);
  const [abteilungen, setAbteilungen] = useState<{ id: string; name: string }[]>(
    []
  );
  const [teams, setTeams] = useState<{ id: string; name: string }[]>([]);
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
    abteilung: "all",
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
  const [kiEingabe, setKiEingabe] = useState("");
  const [kiLaed, setKiLaed] = useState(false);
  const [kiVorschlag, setKiVorschlag] = useState<KiAbwesenheitVorschlag | null>(
    null
  );
  const [kiZielTyp, setKiZielTyp] = useState<KiZielTyp>("mitarbeiter");
  const [kiZielId, setKiZielId] = useState("");
  const [kiTypAuswahl, setKiTypAuswahl] = useState<KiTypAuswahl>("krank");
  const [kiDatumModus, setKiDatumModus] = useState<KiDatumModus>("morgen");
  const [kiDatumVon, setKiDatumVon] = useState(format(new Date(), "yyyy-MM-dd"));
  const [kiDatumBis, setKiDatumBis] = useState(format(new Date(), "yyyy-MM-dd"));
  const [kiGrund, setKiGrund] = useState("");
  const [meineOrgId, setMeineOrgId] = useState<string | null>(null);

  const ladenDaten = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      let orgId: string | null = null;
      if (user) {
        const { data: meRow } = await supabase
          .from("employees")
          .select("organization_id")
          .eq("auth_user_id", user.id)
          .eq("active", true)
          .maybeSingle();
        orgId = (meRow?.organization_id as string | null) ?? null;
      }
      setMeineOrgId(orgId);

      const [resAb, resM, resT] = await Promise.all([
        supabase.from("departments").select("id,name").order("name"),
        supabase
          .from("employees")
          .select("id,name,departments!department_id(name)")
          .eq("active", true)
          .order("name"),
        supabase.from("teams").select("id,name").order("name"),
      ]);

      setAbteilungen((resAb.data ?? []) as { id: string; name: string }[]);
      setTeams((resT.data ?? []) as { id: string; name: string }[]);

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

      const resMitPivot = await supabase
        .from("absences")
        .select(SELECT_ABSENCES_WITH_PIVOT)
        .order("start_date", { ascending: false });

      const pivotFehlt =
        resMitPivot.error &&
        (resMitPivot.error.message.includes("employee_departments") ||
          resMitPivot.error.message.includes("Could not find"));

      const resAbs = pivotFehlt
        ? await supabase
            .from("absences")
            .select(SELECT_ABSENCES_BASE)
            .order("start_date", { ascending: false })
        : resMitPivot;

      if (resAbs.error) {
        console.error("Absences Query Error:", resAbs.error);
        toast.error(
          resAbs.error.message ||
            "Abwesenheiten konnten nicht geladen werden."
        );
        setAbwesenheiten([]);
        return;
      }

      const rohdaten = (resAbs.data ?? []) as Record<string, unknown>[];
      const tageDiff = (start: string, end: string): number => {
        const s = Date.parse(`${toDateKey(start)}T00:00:00`);
        const e = Date.parse(`${toDateKey(end)}T00:00:00`);
        if (Number.isNaN(s) || Number.isNaN(e)) return 0;
        return e - s;
      };
      const dedupliziert = rohdaten.filter((eintrag, _, alle) => {
        const eintragStart = toDateKey(String(eintrag.start_date ?? ""));
        const eintragEnd = toDateKey(String(eintrag.end_date ?? ""));
        const eintragType = String(
          (eintrag.absence_type as string | undefined) ?? eintrag.type ?? ""
        );
        const ueberlappend = alle.find((other) => {
          if (other.id === eintrag.id) return false;
          const otherType = String(
            (other.absence_type as string | undefined) ?? other.type ?? ""
          );
          if (other.employee_id !== eintrag.employee_id) return false;
          if (otherType !== eintragType) return false;
          const otherStart = toDateKey(String(other.start_date ?? ""));
          const otherEnd = toDateKey(String(other.end_date ?? ""));
          return (
            otherStart <= eintragEnd &&
            otherEnd >= eintragStart &&
            tageDiff(otherStart, otherEnd) > tageDiff(eintragStart, eintragEnd)
          );
        });
        return !ueberlappend;
      });

      const list: Abwesenheit[] = dedupliziert.map(
        (row) => {
          const e = row.employee;
          const empRaw = Array.isArray(e) ? e[0] : e;
          const emp =
            empRaw && typeof empRaw === "object"
              ? (empRaw as Record<string, unknown>)
              : undefined;
          const quelle = row.quelle as string;
          const rawType = String(row.type ?? "");
          const startD = toDateKey(String(row.start_date ?? ""));
          const endD = toDateKey(String(row.end_date ?? ""));
          const abInfo = parseMitarbeiterAbteilung(emp);

          return {
            id: row.id as string,
            employee_id: row.employee_id as string,
            employee_name: (emp?.name as string) ?? "—",
            type_raw: rawType,
            type: normalisiereTyp(rawType),
            start_date: startD,
            end_date: endD,
            status: normalisiereStatus(String(row.status ?? "")),
            notes: (row.notes as string | null) ?? null,
            quelle: quelle === "personio" ? "personio" : "manuell",
            created_at: (row.created_at as string) ?? "",
            tage: berecheDauer(startD, endD),
            mitarbeiter_abteilung_label: abInfo.label,
            mitarbeiter_abteilung_ids: abInfo.ids,
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
      if (!meineOrgId) {
        toast.error(
          "Organisation nicht ermittelt. Bitte Seite neu laden oder Admin kontaktieren."
        );
        return;
      }

      const payload = {
        employee_id: werte.employee_id,
        organization_id: meineOrgId,
        type: werte.type,
        absence_type: werte.type,
        start_date: toDateKey(werte.start_date),
        end_date: toDateKey(werte.end_date),
        status: werte.status,
        notes: werte.notes?.trim() || null,
        quelle: "manuell" as const,
      };

      if (bearbeitenId) {
        const { organization_id: _o, ...updateFields } = payload;
        const { error } = await supabase
          .from("absences")
          .update(updateFields)
          .eq("id", bearbeitenId);
        if (error) throw error;
        toast.success("Abwesenheit gespeichert.");
      } else {
        const { data: existing } = await supabase
          .from("absences")
          .select("id")
          .eq("employee_id", payload.employee_id)
          .eq("start_date", payload.start_date)
          .eq("absence_type", payload.type)
          .maybeSingle();
        if (existing) {
          toast.error(
            "Für diesen Mitarbeiter existiert bereits eine Abwesenheit an diesem Datum."
          );
          return;
        }

        const { error } = await supabase.from("absences").upsert(payload, {
          onConflict: "employee_id,start_date,absence_type",
          ignoreDuplicates: true,
        });
        if (error) throw error;
        if (payload.type === "krank") {
          void fetch("/api/automations/trigger", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              typ: "krankmeldung",
              payload: {
                mitarbeiter_id: payload.employee_id,
                datum: payload.start_date,
              },
            }),
          }).catch((e) => logFehler("AbwesenheitenVerwaltung:automation", e));
        }
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

  async function setStatus(id: string, status: "genehmigt" | "abgelehnt") {
    setStatusUpdate({ id, to: status });
    try {
      const { error } = await supabase
        .from("absences")
        .update({ status })
        .eq("id", id);
      if (error) throw error;
      toast.success(status === "genehmigt" ? "Genehmigt." : "Abgelehnt.");
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

  const statKarten = [
    {
      label: "URLAUB DIESE WOCHE",
      wert: statUrlaubWoche,
      subtext: "Im Zeitraum der aktuellen Kalenderwoche",
    },
    {
      label: "KRANK HEUTE",
      wert: statKrankHeute,
      subtext: "Heute als krank geführt",
    },
    {
      label: "AUSSTEHEND",
      wert: statAusstehend,
      subtext: "Noch nicht genehmigt oder abgelehnt",
    },
  ];

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
      if (filter.abteilung !== "all") {
        if (a.mitarbeiter_abteilung_ids.includes(filter.abteilung)) {
          /* passt */
        } else {
          const ma = mitarbeiter.find((m) => m.id === a.employee_id);
          const abt = abteilungen.find((x) => x.id === filter.abteilung);
          if (!(abt && ma?.department === abt.name)) return false;
        }
      }
      return true;
    });
  }, [abwesenheiten, filter, mitarbeiter, abteilungen]);

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

  const filterLeer =
    !filter.suche &&
    filter.typ === "all" &&
    filter.status === "all" &&
    filter.abteilung === "all";

  function baueKiVorlage() {
    const zielText =
      kiZielTyp === "mitarbeiter"
        ? mitarbeiter.find((m) => m.id === kiZielId)?.name
        : kiZielTyp === "team"
          ? teams.find((t) => t.id === kiZielId)?.name
          : abteilungen.find((a) => a.id === kiZielId)?.name;
    if (!zielText) {
      toast.error("Bitte zuerst Mitarbeiter, Team oder Abteilung wählen.");
      return;
    }

    const typText =
      kiTypAuswahl === "krank"
        ? "krank"
        : kiTypAuswahl === "urlaub"
          ? "im Urlaub"
          : kiTypAuswahl === "fortbildung"
            ? "in Fortbildung"
            : "abwesend";

    const datumText =
      kiDatumModus === "heute"
        ? "heute"
        : kiDatumModus === "morgen"
          ? "morgen"
          : kiDatumModus === "datum"
            ? `am ${kiDatumVon}`
            : `von ${kiDatumVon} bis ${kiDatumBis}`;

    const prefix =
      kiZielTyp === "mitarbeiter"
        ? zielText
        : kiZielTyp === "team"
          ? `${zielText}-Team`
          : `${zielText}-Abteilung`;

    const grundText = kiGrund.trim() ? `, Grund: ${kiGrund.trim()}` : "";
    setKiEingabe(`${prefix} ist ${datumText} ${typText}${grundText}`);
  }

  async function kiAbwesenheitAnalysieren() {
    if (!kiEingabe.trim()) return;
    setKiLaed(true);
    setKiVorschlag(null);
    try {
      const heute = format(new Date(), "yyyy-MM-dd");
      const res = await fetch("/api/abwesenheit/ki-parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eingabe: kiEingabe,
          mitarbeiter: mitarbeiter.map((m) => ({
            id: m.id,
            name: m.name,
            abteilung: m.department ?? "unbekannt",
          })),
          heute,
          morgen: format(addDays(new Date(), 1), "yyyy-MM-dd"),
        }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as {
          error?: string;
          message?: string;
        };
        setKiVorschlag({
          mitarbeiter: [],
          typ: "sonstiges",
          start_date: "",
          end_date: "",
          tage: 0,
          begruendung: "",
          error: err.error ?? "parse_fehler",
        });
        toast.error(
          err.message ??
            "KI konnte die Eingabe nicht verstehen. Bitte präziser formulieren."
        );
        return;
      }
      const v = (await res.json()) as KiAbwesenheitVorschlag;
      setKiVorschlag(v);
    } catch (e) {
      setKiVorschlag({
        mitarbeiter: [],
        typ: "sonstiges",
        start_date: "",
        end_date: "",
        tage: 0,
        begruendung: "",
        error: "netzwerk_fehler",
      });
      const msg = e instanceof Error ? e.message : "";
      toast.error(
        msg || "KI konnte die Eingabe nicht verstehen. Bitte präziser formulieren."
      );
    } finally {
      setKiLaed(false);
    }
  }

  async function abwesenheitAusKiErstellen(v: KiAbwesenheitVorschlag) {
    if (!meineOrgId) {
      toast.error(
        "Organisation nicht ermittelt. Bitte Seite neu laden oder Admin kontaktieren."
      );
      return;
    }

    let fehler = 0;
    let ersteFehlerMsg: string | null = null;
    const typMapped: AbwesenheitTyp =
      v.typ === "krankheit" ? "krank" : v.typ === "urlaub" ? "urlaub" : "sonstiges";

    for (const ma of v.mitarbeiter) {
      const { error } = await supabase.from("absences").upsert(
        {
          employee_id: ma.id,
          organization_id: meineOrgId,
          start_date: toDateKey(v.start_date),
          end_date: toDateKey(v.end_date),
          type: typMapped,
          absence_type: typMapped,
          status: "genehmigt",
          notes: v.begruendung || null,
          quelle: "manuell",
        },
        {
          onConflict: "employee_id,start_date,absence_type",
          ignoreDuplicates: true,
        }
      );
      if (error) {
        console.error("[KI Abwesenheit]", error);
        fehler++;
        if (!ersteFehlerMsg) ersteFehlerMsg = error.message;
      } else if (typMapped === "krank") {
        void fetch("/api/automations/trigger", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            typ: "krankmeldung",
            payload: { mitarbeiter_id: ma.id, datum: toDateKey(v.start_date) },
          }),
        }).catch((e) => logFehler("AbwesenheitenVerwaltung:ki-automation", e));
      }
    }

    if (fehler > 0) {
      toast.error(
        ersteFehlerMsg
          ? `${fehler} Einträge fehlgeschlagen: ${ersteFehlerMsg}`
          : `${fehler} Einträge fehlgeschlagen`
      );
      return;
    }

    toast.success(`${v.mitarbeiter.length} Abwesenheit(en) eingetragen`);
    setKiVorschlag(null);
    setKiEingabe("");
    void ladenDaten();
  }

  return (
    <div>
      <div className="mb-6 flex items-start justify-between">
        <h1 className="text-2xl font-bold text-zinc-100">Abwesenheiten</h1>
        <Button
          type="button"
          onClick={oeffneErfassen}
          className="bg-zinc-100 font-semibold text-sm text-zinc-900 hover:bg-white"
        >
          <Plus size={15} className="mr-1.5" />
          Abwesenheit erfassen
        </Button>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {statKarten.map((k) => (
          <div
            key={k.label}
            className="rounded-2xl border border-zinc-800/60 bg-zinc-900 p-5 transition-all hover:border-zinc-700/60"
          >
            <p className="mb-4 text-xs font-semibold tracking-wider text-zinc-500 uppercase">
              {k.label}
            </p>
            <p className="mb-1 text-4xl font-bold tabular-nums text-zinc-100">
              {k.wert}
            </p>
            <p className="text-xs text-zinc-600">{k.subtext}</p>
          </div>
        ))}
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search
            size={13}
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-zinc-500"
          />
          <input
            placeholder="Mitarbeiter suchen…"
            className="w-52 rounded-lg border border-zinc-800 bg-zinc-900 py-2 pr-3 pl-8 text-sm text-zinc-200 transition-colors placeholder:text-zinc-600 focus:border-zinc-700 focus:outline-none"
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
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                typFilterAktiv === tb.value
                  ? "bg-zinc-700 text-zinc-100"
                  : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              {tb.label}
            </button>
          ))}
        </div>

        <select
          value={filter.status}
          onChange={(e) =>
            setFilter((f) => ({
              ...f,
              status: e.target.value as "all" | AbwesenheitStatus,
            }))
          }
          className="cursor-pointer appearance-none rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-400 transition-colors focus:border-zinc-700 focus:outline-none"
        >
          <option value="all">Alle Status</option>
          <option value="beantragt">Ausstehend</option>
          <option value="genehmigt">Genehmigt</option>
          <option value="abgelehnt">Abgelehnt</option>
        </select>

        <select
          value={filter.abteilung}
          onChange={(e) =>
            setFilter((f) => ({ ...f, abteilung: e.target.value }))
          }
          className="cursor-pointer appearance-none rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-400 transition-colors focus:border-zinc-700 focus:outline-none"
        >
          <option value="all">Alle Abteilungen</option>
          {abteilungen.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-hidden rounded-2xl border border-zinc-800/60">
        {laden ? (
          <div className="divide-y divide-zinc-800/40 p-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="py-3">
                <Skeleton className="h-14 w-full bg-zinc-800" />
              </div>
            ))}
          </div>
        ) : gefilterteAbwesenheiten.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-20">
            <p className="text-sm font-semibold text-zinc-500">
              Keine Abwesenheiten gefunden
            </p>
            <p className="text-xs text-zinc-700">
              {filterLeer
                ? "Erfasse die erste Abwesenheit für dein Team"
                : "Filter anpassen oder zurücksetzen"}
            </p>
            {filterLeer ? (
              <Button
                type="button"
                onClick={oeffneErfassen}
                className="mt-2 border border-zinc-700 bg-zinc-800 text-sm text-zinc-200 hover:bg-zinc-700"
              >
                <Plus size={14} className="mr-1.5" />
                Abwesenheit erfassen
              </Button>
            ) : null}
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-800/60 bg-zinc-900/40">
                {[
                  "Mitarbeiter",
                  "Typ",
                  "Zeitraum",
                  "Tage",
                  "Status",
                  "Notiz",
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
              {gefilterteAbwesenheiten.map((abs) => {
                const statusBusy =
                  statusUpdate?.id === abs.id ? statusUpdate : null;
                return (
                  <tr
                    key={abs.id}
                    className="group transition-colors hover:bg-zinc-900/40"
                  >
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <div
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-zinc-700 bg-zinc-800 text-xs font-bold text-zinc-400"
                          aria-hidden
                        >
                          {mitarbeiterInitialen(abs.employee_name)}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-zinc-300">
                            {abs.employee_name}
                          </p>
                          <p className="text-xs text-zinc-600">
                            {abs.mitarbeiter_abteilung_label ?? ""}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <TypBadge type_raw={abs.type_raw} typ={abs.type} />
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="text-sm text-zinc-300 tabular-nums">
                        {formatDatum(abs.start_date)}
                      </p>
                      <p className="text-xs text-zinc-600">
                        bis {formatDatum(abs.end_date)}
                      </p>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-sm font-semibold tabular-nums text-zinc-300">
                        {abs.tage}
                      </span>
                      <span className="ml-1 text-xs text-zinc-600">T</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <StatusBadge status={abs.status} />
                    </td>
                    <td className="max-w-32 px-4 py-3.5">
                      <p className="truncate text-xs text-zinc-600">
                        {abs.notes ?? "–"}
                      </p>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex flex-wrap items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                        {abs.status === "beantragt" ? (
                          <>
                            <button
                              type="button"
                              className="rounded-md p-1.5 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-emerald-400 disabled:opacity-50"
                              disabled={!!statusBusy}
                              title="Genehmigen"
                              onClick={() => void setStatus(abs.id, "genehmigt")}
                            >
                              {statusBusy?.to === "genehmigt" ? (
                                <Loader2 className="size-[13px] animate-spin" />
                              ) : (
                                <Check size={13} />
                              )}
                            </button>
                            <button
                              type="button"
                              className="rounded-md p-1.5 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-red-400 disabled:opacity-50"
                              disabled={!!statusBusy}
                              title="Ablehnen"
                              onClick={() => void setStatus(abs.id, "abgelehnt")}
                            >
                              {statusBusy?.to === "abgelehnt" ? (
                                <Loader2 className="size-[13px] animate-spin" />
                              ) : (
                                <X size={13} />
                              )}
                            </button>
                          </>
                        ) : null}
                        <button
                          type="button"
                          className="rounded-md p-1.5 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
                          title="Bearbeiten"
                          onClick={() => bearbeiten(abs)}
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          type="button"
                          className="rounded-md p-1.5 text-zinc-500 transition-colors hover:bg-red-950 hover:text-red-400"
                          title="Löschen"
                          onClick={() => loeschen(abs.id)}
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
        )}
      </div>

      <div className="mt-6 rounded-2xl bg-zinc-900/80 border border-zinc-800/50 overflow-hidden backdrop-blur-sm">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-zinc-800/50">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500/20 to-violet-600/10 border border-violet-500/20 flex items-center justify-center flex-shrink-0">
            <Sparkles size={13} className="text-violet-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-zinc-100 tracking-tight">
              KI-Schnelleingabe
            </p>
            <p className="text-xs text-zinc-500 mt-0.5">
              Abwesenheit per Freitext erfassen
            </p>
          </div>
        </div>

        <div className="px-5 pt-4">
          <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/70 p-3">
            <p className="mb-2 text-[10px] font-semibold tracking-wider text-zinc-500 uppercase">
              Vorauswahl-Hilfe
            </p>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              <select
                value={kiZielTyp}
                onChange={(e) => {
                  setKiZielTyp(e.target.value as KiZielTyp);
                  setKiZielId("");
                }}
                className="rounded-lg border border-zinc-700/40 bg-zinc-800/60 px-3 py-2 text-xs text-zinc-300 focus:outline-none focus:border-violet-500/40"
              >
                <option value="mitarbeiter">Mitarbeiter</option>
                <option value="team">Team</option>
                <option value="abteilung">Abteilung</option>
              </select>

              <select
                value={kiZielId}
                onChange={(e) => setKiZielId(e.target.value)}
                className="rounded-lg border border-zinc-700/40 bg-zinc-800/60 px-3 py-2 text-xs text-zinc-300 focus:outline-none focus:border-violet-500/40"
              >
                <option value="">Auswahl treffen…</option>
                {(kiZielTyp === "mitarbeiter"
                  ? mitarbeiter.map((m) => ({ id: m.id, name: m.name }))
                  : kiZielTyp === "team"
                    ? teams
                    : abteilungen
                ).map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>

              <select
                value={kiTypAuswahl}
                onChange={(e) => setKiTypAuswahl(e.target.value as KiTypAuswahl)}
                className="rounded-lg border border-zinc-700/40 bg-zinc-800/60 px-3 py-2 text-xs text-zinc-300 focus:outline-none focus:border-violet-500/40"
              >
                <option value="krank">Krank</option>
                <option value="urlaub">Urlaub</option>
                <option value="fortbildung">Fortbildung</option>
                <option value="sonstiges">Sonstiges</option>
              </select>

              <select
                value={kiDatumModus}
                onChange={(e) => setKiDatumModus(e.target.value as KiDatumModus)}
                className="rounded-lg border border-zinc-700/40 bg-zinc-800/60 px-3 py-2 text-xs text-zinc-300 focus:outline-none focus:border-violet-500/40"
              >
                <option value="heute">Heute</option>
                <option value="morgen">Morgen</option>
                <option value="datum">Datum</option>
                <option value="zeitraum">Zeitraum</option>
              </select>

              {(kiDatumModus === "datum" || kiDatumModus === "zeitraum") && (
                <input
                  type="date"
                  value={kiDatumVon}
                  onChange={(e) => setKiDatumVon(e.target.value)}
                  className="rounded-lg border border-zinc-700/40 bg-zinc-800/60 px-3 py-2 text-xs text-zinc-300 focus:outline-none focus:border-violet-500/40"
                />
              )}
              {kiDatumModus === "zeitraum" && (
                <input
                  type="date"
                  value={kiDatumBis}
                  onChange={(e) => setKiDatumBis(e.target.value)}
                  className="rounded-lg border border-zinc-700/40 bg-zinc-800/60 px-3 py-2 text-xs text-zinc-300 focus:outline-none focus:border-violet-500/40"
                />
              )}

              <input
                value={kiGrund}
                onChange={(e) => setKiGrund(e.target.value)}
                placeholder="Grund (optional)"
                className="rounded-lg border border-zinc-700/40 bg-zinc-800/60 px-3 py-2 text-xs text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:border-violet-500/40 md:col-span-2"
              />
            </div>

            <div className="mt-2 flex items-center justify-between rounded-lg border border-zinc-800/60 bg-zinc-800/30 px-3 py-2">
              <p className="text-xs text-zinc-500 truncate pr-3">
                Vorschau: {kiEingabe || "Noch keine Vorlage übernommen"}
              </p>
              <button
                type="button"
                onClick={baueKiVorlage}
                className="rounded-lg border border-zinc-700/60 bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-200 transition-colors hover:border-violet-500/40 hover:text-white"
              >
                In Text übernehmen
              </button>
            </div>
          </div>
        </div>

        <div className="p-4 pt-3">
          <div className="relative group">
            <textarea
              value={kiEingabe}
              onChange={(e) => setKiEingabe(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void kiAbwesenheitAnalysieren();
                }
              }}
              placeholder="Beschreibe die Abwesenheit…"
              rows={2}
              className="w-full px-4 py-3 pr-36 text-sm bg-zinc-800/50 border border-zinc-700/40 rounded-xl text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-violet-500/30 focus:border-violet-500/40 resize-none transition-all duration-150"
            />
            <button
              onClick={() => void kiAbwesenheitAnalysieren()}
              disabled={!kiEingabe.trim() || kiLaed}
              className="absolute right-2.5 bottom-2.5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-violet-600 hover:bg-violet-500 text-white shadow-sm shadow-violet-900/40 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-150"
            >
              {kiLaed ? (
                <>
                  <Loader2 size={11} className="animate-spin" />
                  Analysiere…
                </>
              ) : (
                <>
                  <Sparkles size={11} />
                  Analysieren
                </>
              )}
            </button>
          </div>

          {!kiEingabe && (
            <p className="mt-2 text-xs text-zinc-600 pl-1">
              Enter ↵ zum Analysieren · Shift+Enter für neue Zeile
            </p>
          )}

          {kiVorschlag?.error && (
            <div className="mt-3 flex items-start gap-2.5 px-4 py-3 rounded-xl bg-red-950/30 border border-red-900/30">
              <AlertCircle size={13} className="text-red-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-medium text-red-300">
                  Eingabe nicht verstanden
                </p>
                <p className="text-xs text-red-500/80 mt-0.5">
                  Tipp: Mitarbeiternamen exakt schreiben, z.B. &quot;Ali ist morgen
                  krank&quot;
                </p>
              </div>
            </div>
          )}

          {kiVorschlag && !kiVorschlag.error && (
            <div className="mt-3 flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-zinc-800/60 border border-zinc-700/40">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-1.5 h-1.5 rounded-full bg-violet-400 flex-shrink-0" />
                <p className="text-sm text-zinc-300 truncate">
                  <span className="font-medium">
                    {kiVorschlag.mitarbeiter?.[0]?.name}
                  </span>
                  <span className="text-zinc-500 mx-1.5">·</span>
                  <span className="text-zinc-400 capitalize">
                    {kiVorschlag.typ === "krankheit"
                      ? "Krank"
                      : kiVorschlag.typ === "urlaub"
                        ? "Urlaub"
                        : "Sonstiges"}
                  </span>
                  <span className="text-zinc-500 mx-1.5">·</span>
                  <span className="text-zinc-500 text-xs">
                    {kiVorschlag.start_date}
                    {kiVorschlag.end_date !== kiVorschlag.start_date
                      ? ` – ${kiVorschlag.end_date}`
                      : ""}
                    {" "}({kiVorschlag.tage}T)
                  </span>
                </p>
              </div>
              <button
                onClick={() => void abwesenheitAusKiErstellen(kiVorschlag)}
                className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-100 text-zinc-900 hover:bg-white transition-colors"
              >
                Speichern
              </button>
            </div>
          )}
        </div>
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

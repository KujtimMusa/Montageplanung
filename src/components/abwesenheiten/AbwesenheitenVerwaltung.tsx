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
  Thermometer,
  Trash2,
} from "lucide-react";
import {
  differenceInCalendarDays,
  endOfMonth,
  format,
  parseISO,
  startOfWeek,
  endOfWeek,
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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

function formatDatum(iso: string): string {
  try {
    return format(parseISO(iso), "dd.MM.yyyy", { locale: de });
  } catch {
    return iso;
  }
}

function berecheDauer(start: string, end: string): number {
  try {
    return (
      differenceInCalendarDays(parseISO(end), parseISO(start)) + 1
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
  const s = raw as AbwesenheitStatus;
  return ABWESENHEIT_STATUS.some((x) => x.value === s) ? s : "beantragt";
}

function intervalleUeberlappen(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string
): boolean {
  return aStart <= bEnd && aEnd >= bStart;
}

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
    typ: "all",
    status: "all",
    monat: "all",
  });
  const [speichern, setSpeichern] = useState(false);
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
      const [{ data: m }, { data: a }] = await Promise.all([
        supabase
          .from("employees")
          .select("id,name,departments(name)")
          .eq("active", true)
          .order("name"),
        supabase
          .from("absences")
          .select(
            "id,employee_id,type,start_date,end_date,status,notes,quelle,created_at,employees(name)"
          )
          .order("start_date", { ascending: false }),
      ]);

      setMitarbeiter(
        (m ?? []).map((row) => {
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

      if (a) {
        const list: Abwesenheit[] = (a as Record<string, unknown>[]).map(
          (row) => {
            const e = row.employees;
            const emp = Array.isArray(e) ? e[0] : e;
            const quelle = row.quelle as string;
            return {
              id: row.id as string,
              employee_id: row.employee_id as string,
              employee_name: (emp as { name?: string })?.name ?? "—",
              type: normalisiereTyp(row.type as string),
              start_date: row.start_date as string,
              end_date: row.end_date as string,
              status: normalisiereStatus(row.status as string),
              notes: (row.notes as string | null) ?? null,
              quelle: quelle === "personio" ? "personio" : "manuell",
              created_at: (row.created_at as string) ?? "",
            };
          }
        );
        setAbwesenheiten(list);
      } else setAbwesenheiten([]);
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
    const { data, error } = await supabase
      .from("assignments")
      .select("date, projects(title), project_title")
      .eq("employee_id", employeeId)
      .gte("date", von)
      .lte("date", bis);

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
        datum: formatDatum(row.date as string),
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
        start_date: werte.start_date,
        end_date: werte.end_date,
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
  const wocheStart = format(
    startOfWeek(new Date(), { weekStartsOn: 1 }),
    "yyyy-MM-dd"
  );
  const wocheEnde = format(
    endOfWeek(new Date(), { weekStartsOn: 1 }),
    "yyyy-MM-dd"
  );

  const statUrlaubWoche = useMemo(() => {
    return abwesenheiten.filter(
      (a) =>
        a.type === "urlaub" &&
        intervalleUeberlappen(a.start_date, a.end_date, wocheStart, wocheEnde)
    ).length;
  }, [abwesenheiten, wocheStart, wocheEnde]);

  const statKrankHeute = useMemo(() => {
    return abwesenheiten.filter(
      (a) =>
        a.type === "krank" &&
        intervalleUeberlappen(a.start_date, a.end_date, heuteStr, heuteStr)
    ).length;
  }, [abwesenheiten, heuteStr]);

  const statAusstehend = useMemo(() => {
    return abwesenheiten.filter((a) => a.status === "beantragt").length;
  }, [abwesenheiten]);

  const gefilterteAbwesenheiten = useMemo(() => {
    const q = filter.suche.trim().toLowerCase();
    return abwesenheiten.filter((a) => {
      if (q && !a.employee_name.toLowerCase().includes(q)) return false;
      if (filter.typ !== "all" && a.type !== filter.typ) return false;
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

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-50">
            Abwesenheiten
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            Manuell erfassen oder mit Personio synchronisieren.
          </p>
        </div>
        <Button
          type="button"
          onClick={() => {
            setBearbeitenId(null);
            setSheetOffen(true);
          }}
        >
          <Plus size={16} className="mr-2" />
          Abwesenheit erfassen
        </Button>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="rounded-xl border border-zinc-800 bg-zinc-900/50">
          <CardContent className="flex items-center gap-3 p-4">
            <Palmtree className="size-8 shrink-0 text-blue-400" />
            <div>
              <p className="text-2xl font-bold text-zinc-50">{statUrlaubWoche}</p>
              <p className="text-xs text-zinc-500">Urlaub diese Woche</p>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-xl border border-zinc-800 bg-zinc-900/50">
          <CardContent className="flex items-center gap-3 p-4">
            <Thermometer className="size-8 shrink-0 text-red-400" />
            <div>
              <p className="text-2xl font-bold text-zinc-50">{statKrankHeute}</p>
              <p className="text-xs text-zinc-500">Krank heute</p>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-xl border border-zinc-800 bg-zinc-900/50">
          <CardContent className="flex items-center gap-3 p-4">
            <Clock className="size-8 shrink-0 text-yellow-400" />
            <div>
              <p className="text-2xl font-bold text-zinc-50">{statAusstehend}</p>
              <p className="text-xs text-zinc-500">Ausstehend</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mb-4 flex flex-wrap gap-3">
        <Input
          placeholder="Mitarbeiter suchen..."
          className="w-full max-w-md border-zinc-800 bg-zinc-900 sm:w-48"
          value={filter.suche}
          onChange={(e) =>
            setFilter((f) => ({ ...f, suche: e.target.value }))
          }
        />
        <Select
          value={filter.typ}
          onValueChange={(v) =>
            setFilter((f) => ({ ...f, typ: v ?? "all" }))
          }
        >
          <SelectTrigger className="w-[160px] border-zinc-800 bg-zinc-900">
            <SelectValue placeholder="Typ" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Typen</SelectItem>
            {ABWESENHEIT_TYPEN.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.emoji} {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
            {ABWESENHEIT_STATUS.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filter.monat}
          onValueChange={(v) =>
            setFilter((f) => ({ ...f, monat: v ?? "all" }))
          }
        >
          <SelectTrigger className="w-[180px] border-zinc-800 bg-zinc-900">
            <SelectValue placeholder="Monat" />
          </SelectTrigger>
          <SelectContent>
            {monatOptionen.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-x-auto rounded-lg border border-zinc-800">
        {laden ? (
          <Table>
            <TableBody>
              {Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i} className="border-zinc-800">
                  <TableCell colSpan={8}>
                    <Skeleton className="h-10 w-full bg-zinc-800" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : gefilterteAbwesenheiten.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-zinc-600">
            <CalendarOff size={40} className="mb-3" />
            <p className="text-sm font-medium">Keine Abwesenheiten gefunden</p>
            <p className="mt-1 text-xs">
              {filter.suche ||
              filter.typ !== "all" ||
              filter.status !== "all" ||
              filter.monat !== "all"
                ? "Filter anpassen oder zurücksetzen"
                : "Erfasse die erste Abwesenheit"}
            </p>
            {!filter.suche &&
              filter.typ === "all" &&
              filter.status === "all" &&
              filter.monat === "all" && (
              <Button
                size="sm"
                className="mt-3"
                type="button"
                onClick={() => {
                  setBearbeitenId(null);
                  setSheetOffen(true);
                }}
              >
                + Abwesenheit erfassen
              </Button>
            )}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-zinc-800 hover:bg-transparent">
                <TableHead>Mitarbeiter</TableHead>
                <TableHead>Typ</TableHead>
                <TableHead>Von</TableHead>
                <TableHead>Bis</TableHead>
                <TableHead>Dauer</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Notiz</TableHead>
                <TableHead className="text-right">Aktionen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {gefilterteAbwesenheiten.map((abs) => {
                const typMeta = ABWESENHEIT_TYPEN.find((t) => t.value === abs.type);
                const stMeta = ABWESENHEIT_STATUS.find((s) => s.value === abs.status);
                return (
                  <TableRow
                    key={abs.id}
                    className="border-zinc-800 hover:bg-zinc-900/50"
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-700 text-xs font-medium text-zinc-200">
                          {abs.employee_name.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-sm">{abs.employee_name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={cn("font-normal", typMeta?.farbe)}
                      >
                        {typMeta?.emoji} {typMeta?.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-zinc-300">
                      {formatDatum(abs.start_date)}
                    </TableCell>
                    <TableCell className="text-sm text-zinc-300">
                      {formatDatum(abs.end_date)}
                    </TableCell>
                    <TableCell className="text-sm text-zinc-500">
                      {berecheDauer(abs.start_date, abs.end_date)} Tage
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={cn("font-normal", stMeta?.farbe)}
                      >
                        {stMeta?.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[120px] truncate text-xs text-zinc-500">
                      {abs.notes || "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          type="button"
                          onClick={() => bearbeiten(abs)}
                        >
                          <Pencil size={13} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          type="button"
                          onClick={() => loeschen(abs.id)}
                        >
                          <Trash2 size={13} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
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
                    <PopoverContent className="w-[var(--anchor-width)] p-0" align="start">
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
                    <SelectContent>
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
                    <SelectContent>
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

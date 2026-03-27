"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  AlertTriangleIcon,
  CalendarIcon,
  CheckIcon,
  ChevronsUpDownIcon,
} from "lucide-react";
import { de } from "date-fns/locale";
import { eachDayOfInterval, format, parseISO } from "date-fns";
import type { DateRange } from "react-day-picker";
import { createClient } from "@/lib/supabase/client";
import {
  pruefeAbwesenheitKonfliktText,
  pruefeEinsatzKonflikt,
} from "@/lib/utils/conflicts";
import { getRepresentativeEmployeeId } from "@/lib/planung/team-representative";
import { dbPrioritaetZuUi, uiPrioritaetZuDb } from "@/lib/utils/priority";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  PRIORITAET_FARBEN,
  STATUS_FARBEN,
  planungStatusLabel,
} from "@/lib/constants/planung-farben";
import type {
  BearbeitenZuweisung,
  DienstleisterOption,
  EinsatzPrioritaetUi,
  ProjektOption,
  TeamOption,
} from "@/types/planung";

const prioritaetEnum = z.enum(["niedrig", "mittel", "hoch", "kritisch"]);

const schema = z
  .object({
    projekt_id: z.string().uuid("Projekt wählen."),
    team_ids: z.array(z.string()),
    dienstleister_ids: z.array(z.string()),
    date_von: z.string().min(1, "Von-Datum erforderlich."),
    date_bis: z.string().min(1, "Bis-Datum erforderlich."),
    start_time: z.string().optional(),
    end_time: z.string().optional(),
    notes: z.string().optional(),
    prioritaet: prioritaetEnum,
  })
  .refine((d) => d.date_von <= d.date_bis, {
    message: "Ende muss nach oder gleich Start sein.",
    path: ["date_bis"],
  });

export type EinsatzFormularWerte = z.infer<typeof schema>;

export type {
  TeamOption,
  ProjektOption,
  BearbeitenZuweisung,
  DienstleisterOption,
};

/** Einheitlicher Look für Planungs-Eingaben (Sheet) */
const fieldClass =
  "h-10 rounded-lg border border-zinc-600/90 bg-zinc-900/85 px-3 text-sm text-zinc-100 shadow-[inset_0_1px_2px_rgba(0,0,0,0.4)] transition-colors placeholder:text-zinc-500 focus-visible:border-zinc-500 focus-visible:bg-zinc-900 focus-visible:ring-2 focus-visible:ring-blue-500/30 focus-visible:outline-none";

const triggerClass =
  "h-10 w-full rounded-lg border border-zinc-600/90 bg-zinc-900/85 px-3 text-sm text-zinc-100 shadow-[inset_0_1px_2px_rgba(0,0,0,0.4)] transition-colors hover:border-zinc-500 hover:bg-zinc-900 focus-visible:ring-2 focus-visible:ring-blue-500/30 focus-visible:outline-none";

const textareaClass =
  "rounded-lg border border-zinc-600/90 bg-zinc-900/85 px-3 py-2 text-sm text-zinc-100 shadow-[inset_0_1px_2px_rgba(0,0,0,0.4)] transition-colors placeholder:text-zinc-500 focus-visible:border-zinc-500 focus-visible:ring-2 focus-visible:ring-blue-500/30 focus-visible:outline-none";

const SCHICHT_PRESETS = [
  { id: "ganz", label: "Ganztag", start: "07:00", end: "16:00" },
  { id: "vm", label: "Vormittag", start: "07:00", end: "12:00" },
  { id: "nm", label: "Nachmittag", start: "12:00", end: "16:00" },
  { id: "kurz", label: "Kurz", start: "08:00", end: "12:00" },
] as const;

function normalisiereUhrzeit(eingabe: string | undefined, fallback: string): string {
  const e = (eingabe ?? "").trim();
  if (!e) return fallback;
  if (/^\d{1,2}:\d{2}$/.test(e)) {
    const [h, m] = e.split(":");
    return `${h!.padStart(2, "0")}:${m}:00`;
  }
  if (/^\d{1,2}:\d{2}:\d{2}$/.test(e)) {
    const [h, m, s] = e.split(":");
    return `${h!.padStart(2, "0")}:${m}:${s!.padStart(2, "0")}`;
  }
  return fallback;
}

const STATUS_BADGE: Record<string, string> = {
  neu: "bg-zinc-700 text-zinc-200",
  geplant: "bg-blue-900/50 text-blue-200",
  aktiv: "bg-emerald-900/40 text-emerald-200",
  abgeschlossen: "bg-zinc-800 text-zinc-400",
};

function statusLabel(s: string) {
  const m: Record<string, string> = {
    neu: "Neu",
    geplant: "Geplant",
    aktiv: "Aktiv",
    abgeschlossen: "Abgeschlossen",
  };
  return m[s] ?? s;
}

const PRIORITAET_FARBE: Record<EinsatzPrioritaetUi, string> = {
  niedrig: "bg-zinc-500",
  mittel: "bg-blue-500",
  hoch: "bg-orange-500",
  kritisch: "bg-red-500",
};

type Props = {
  open: boolean;
  onOpenChange: (offen: boolean) => void;
  teams: TeamOption[];
  projekte: ProjektOption[];
  dienstleister: DienstleisterOption[];
  bearbeiten: BearbeitenZuweisung | null;
  vorgaben: {
    team_id?: string;
    date: string;
    start_time?: string;
    end_time?: string;
    projekt_id?: string;
    dienstleister_id?: string;
    dienstleister_name?: string;
  } | null;
  eigeneMitarbeiterId: string | null;
  formularSchluessel: number;
  onGespeichert: () => void;
};

export function EinsatzNeuDialog({
  open,
  onOpenChange,
  teams,
  projekte,
  dienstleister,
  bearbeiten,
  vorgaben,
  eigeneMitarbeiterId,
  formularSchluessel,
  onGespeichert,
}: Props) {
  const supabase = useMemo(() => createClient(), []);
  const [konfliktText, setKonfliktText] = useState<string | null>(null);
  const [abwesenheitWarnung, setAbwesenheitWarnung] = useState<string | null>(
    null
  );
  const [comboOffen, setComboOffen] = useState(false);
  const [rangeOpen, setRangeOpen] = useState(false);

  const form = useForm<EinsatzFormularWerte>({
    resolver: zodResolver(schema),
    defaultValues: {
      projekt_id: "",
      team_ids: [] as string[],
      dienstleister_ids: [] as string[],
      date_von: "",
      date_bis: "",
      start_time: "",
      end_time: "",
      notes: "",
      prioritaet: "mittel",
    },
  });

  const dateVon = form.watch("date_von");
  const dateBis = form.watch("date_bis");

  const rangeSelected: DateRange | undefined = useMemo(() => {
    if (!dateVon) return undefined;
    try {
      const from = parseISO(dateVon);
      const to = dateBis ? parseISO(dateBis) : from;
      return { from, to };
    } catch {
      return undefined;
    }
  }, [dateVon, dateBis]);

  useEffect(() => {
    if (!open) return;
    setKonfliktText(null);
    setAbwesenheitWarnung(null);
    if (bearbeiten) {
      const pri = dbPrioritaetZuUi(
        bearbeiten.prioritaet ??
          projekte.find((x) => x.id === bearbeiten.project_id)?.priority
      );
      form.reset({
        projekt_id: bearbeiten.project_id ?? "",
        team_ids: bearbeiten.team_id ? [bearbeiten.team_id] : [],
        dienstleister_ids: bearbeiten.dienstleister_id
          ? [bearbeiten.dienstleister_id]
          : [],
        date_von: bearbeiten.date,
        date_bis: bearbeiten.date,
        start_time: bearbeiten.start_time.slice(0, 5),
        end_time: bearbeiten.end_time.slice(0, 5),
        notes: bearbeiten.notes ?? "",
        prioritaet: pri,
      });
    } else if (vorgaben) {
      const p = vorgaben.projekt_id
        ? projekte.find((x) => x.id === vorgaben.projekt_id)
        : undefined;
      form.reset({
        projekt_id: vorgaben.projekt_id ?? "",
        team_ids: vorgaben.team_id ? [vorgaben.team_id] : [],
        dienstleister_ids: vorgaben.dienstleister_id
          ? [vorgaben.dienstleister_id]
          : [],
        date_von: vorgaben.date,
        date_bis: vorgaben.date,
        start_time: vorgaben.start_time ?? "07:00",
        end_time: vorgaben.end_time ?? "16:00",
        notes: "",
        prioritaet: p ? dbPrioritaetZuUi(p.priority) : "mittel",
      });
    } else {
      form.reset({
        projekt_id: "",
        team_ids: [],
        dienstleister_ids: [],
        date_von: "",
        date_bis: "",
        start_time: "08:00",
        end_time: "16:00",
        notes: "",
        prioritaet: "mittel",
      });
    }
  }, [open, bearbeiten, vorgaben, formularSchluessel, form, projekte]);

  async function benachrichtigungFireAndForget(
    teamId: string,
    projectId: string,
    datum: string
  ) {
    try {
      const { data: proj } = await supabase
        .from("projects")
        .select("title, customers(city, address)")
        .eq("id", projectId)
        .maybeSingle();

      const cust = proj?.customers as
        | { city?: string | null; address?: string | null }
        | { city?: string | null; address?: string | null }[]
        | null;
      const c = Array.isArray(cust) ? cust[0] : cust;
      const ort = [c?.city, c?.address].filter(Boolean).join(", ");

      void fetch("/api/notifications/einsatz-neu", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamId,
          projektName: (proj?.title as string) ?? "",
          datum,
          ort,
        }),
      }).catch(() => {});
    } catch {
      /* fire-and-forget */
    }
  }

  async function onSubmit(werte: EinsatzFormularWerte) {
    setKonfliktText(null);
    setAbwesenheitWarnung(null);
    const startNorm = normalisiereUhrzeit(werte.start_time, "08:00:00");
    const endNorm = normalisiereUhrzeit(werte.end_time, "16:00:00");
    const prioritaetDb = uiPrioritaetZuDb(werte.prioritaet);

    const teamListe = Array.from(
      new Set(werte.team_ids.map((x) => x.trim()).filter(Boolean))
    );
    const dlListe = Array.from(
      new Set(werte.dienstleister_ids.map((x) => x.trim()).filter(Boolean))
    );

    if (!bearbeiten && teamListe.length + dlListe.length === 0) {
      toast.error("Mindestens ein Team oder Partner auswählen.");
      return;
    }

    if (bearbeiten) {
      if (teamListe.length > 1 || dlListe.length > 1) {
        toast.error("Beim Bearbeiten nur ein Team oder ein Partner.");
        return;
      }
      if (teamListe.length === 0 && dlListe.length === 0) {
        toast.error("Team oder Dienstleister wählen.");
        return;
      }
      if (teamListe.length > 0 && dlListe.length > 0) {
        toast.error("Bitte entweder Team oder Partner – nicht beides beim Bearbeiten.");
        return;
      }
    }

    const teamIdTrim = bearbeiten ? teamListe[0] ?? "" : "";
    const dlIdTrim = bearbeiten ? dlListe[0] ?? "" : "";

    async function resolveEmpId(einTeam: string, einDl: string): Promise<string | null> {
      if (einTeam) {
        const id = await getRepresentativeEmployeeId(supabase, einTeam);
        if (!id) {
          toast.error("Im Team ist kein Mitarbeiter hinterlegt (Vertreter fehlt).");
          return null;
        }
        return id;
      }
      if (einDl) {
        if (!eigeneMitarbeiterId) {
          toast.error(
            "Für Einsätze nur mit Dienstleister ist ein verknüpfter Mitarbeiter-Account nötig."
          );
          return null;
        }
        return eigeneMitarbeiterId;
      }
      return null;
    }

    if (bearbeiten) {
      const empId = await resolveEmpId(teamIdTrim, dlIdTrim);
      if (!empId) return;

      const abwText = await pruefeAbwesenheitKonfliktText(supabase, {
        mitarbeiterId: empId,
        von: werte.date_von,
        bis: werte.date_bis,
      });
      if (abwText) {
        setAbwesenheitWarnung(abwText);
        return;
      }

      const k = await pruefeEinsatzKonflikt(supabase, {
        mitarbeiterId: empId,
        datum: werte.date_von,
        startZeit: startNorm,
        endZeit: endNorm,
        ausserhalbEinsatzId: bearbeiten.id,
      });
      if (k.hatKonflikt) {
        setKonfliktText(k.nachricht);
        return;
      }

      const updatePayload: Record<string, unknown> = {
        employee_id: empId,
        project_id: werte.projekt_id,
        project_title: null,
        team_id: teamIdTrim || null,
        dienstleister_id: dlIdTrim || null,
        date: werte.date_von,
        start_time: startNorm,
        end_time: endNorm,
        notes: werte.notes?.trim() || null,
        prioritaet: prioritaetDb,
      };

      const { error } = await supabase
        .from("assignments")
        .update(updatePayload)
        .eq("id", bearbeiten.id);

      if (error) {
        if (error.message.includes("prioritaet") || error.code === "42703") {
          delete updatePayload.prioritaet;
          const { error: e2 } = await supabase
            .from("assignments")
            .update(updatePayload)
            .eq("id", bearbeiten.id);
          if (e2) {
            toast.error(e2.message);
            return;
          }
        } else if (
          error.message.includes("dienstleister_id") ||
          error.code === "42703"
        ) {
          delete updatePayload.dienstleister_id;
          const { error: e2 } = await supabase
            .from("assignments")
            .update(updatePayload)
            .eq("id", bearbeiten.id);
          if (e2) {
            toast.error(e2.message);
            return;
          }
        } else {
          toast.error(error.message);
          return;
        }
      }

      await supabase
        .from("projects")
        .update({ priority: prioritaetDb })
        .eq("id", werte.projekt_id);

      toast.success("Einsatz gespeichert.");
      onOpenChange(false);
      onGespeichert();
      return;
    }

    const tage = eachDayOfInterval({
      start: parseISO(werte.date_von),
      end: parseISO(werte.date_bis),
    });

    const kombos: { team: string; dl: string }[] = [
      ...teamListe.map((t) => ({ team: t, dl: "" })),
      ...dlListe.map((d) => ({ team: "", dl: d })),
    ];

    for (const { team: einTeam, dl: einDl } of kombos) {
      const empId = await resolveEmpId(einTeam, einDl);
      if (!empId) return;
      const abwText = await pruefeAbwesenheitKonfliktText(supabase, {
        mitarbeiterId: empId,
        von: werte.date_von,
        bis: werte.date_bis,
      });
      if (abwText) {
        setAbwesenheitWarnung(abwText);
        return;
      }
      for (const tag of tage) {
        const d = format(tag, "yyyy-MM-dd");
        const k = await pruefeEinsatzKonflikt(supabase, {
          mitarbeiterId: empId,
          datum: d,
          startZeit: startNorm,
          endZeit: endNorm,
        });
        if (k.hatKonflikt) {
          setKonfliktText(`${k.nachricht} (Datum ${format(tag, "dd.MM.yyyy")})`);
          return;
        }
      }
    }

    let insgesamt = 0;
    for (const { team: einTeam, dl: einDl } of kombos) {
      const empId = await resolveEmpId(einTeam, einDl);
      if (!empId) return;
      const insertBase: Record<string, unknown> = {
        employee_id: empId,
        project_id: werte.projekt_id,
        project_title: null,
        team_id: einTeam || null,
        dienstleister_id: einDl || null,
        start_time: startNorm,
        end_time: endNorm,
        notes: werte.notes?.trim() || null,
        prioritaet: prioritaetDb,
      };
      if (eigeneMitarbeiterId) insertBase.created_by = eigeneMitarbeiterId;

      for (const tag of tage) {
        const d = format(tag, "yyyy-MM-dd");
        const payload: Record<string, unknown> = { ...insertBase, date: d };
        const { error } = await supabase.from("assignments").insert(payload);
        if (error) {
          if (error.message.includes("prioritaet") || error.code === "42703") {
            delete payload.prioritaet;
            const { error: e2 } = await supabase.from("assignments").insert(payload);
            if (e2) {
              toast.error(e2.message);
              return;
            }
          } else if (
            error.message.includes("dienstleister_id") ||
            error.code === "42703"
          ) {
            delete payload.dienstleister_id;
            const { error: e2 } = await supabase.from("assignments").insert(payload);
            if (e2) {
              toast.error(e2.message);
              return;
            }
          } else {
            toast.error(error.message);
            return;
          }
        }
        insgesamt += 1;
      }
      if (einTeam) {
        try {
          void benachrichtigungFireAndForget(einTeam, werte.projekt_id, werte.date_von);
        } catch {
          /* nicht blockieren */
        }
      }
    }

    await supabase
      .from("projects")
      .update({ priority: prioritaetDb })
      .eq("id", werte.projekt_id);

    toast.success(
      insgesamt > 1 ? `${insgesamt} Einsätze gespeichert.` : "Einsatz gespeichert."
    );
    onOpenChange(false);
    onGespeichert();
  }

  async function loeschen() {
    if (!bearbeiten) return;
    const { error } = await supabase.from("assignments").delete().eq("id", bearbeiten.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Einsatz gelöscht.");
    onOpenChange(false);
    onGespeichert();
  }

  const titel = bearbeiten ? "Einsatz bearbeiten" : "Neuer Einsatz";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col border-zinc-700/80 bg-zinc-950 sm:max-w-[520px]"
      >
        <SheetHeader>
          <SheetTitle className="text-zinc-50">{titel}</SheetTitle>
        </SheetHeader>

        {!bearbeiten && vorgaben?.dienstleister_id ? (
          <Alert className="border-cyan-900/40 bg-cyan-950/25">
            <AlertTitle className="text-cyan-100">Dienstleister</AlertTitle>
            <AlertDescription className="text-cyan-200/90">
              Einsatz mit Partner{" "}
              <span className="font-medium">
                {vorgaben.dienstleister_name ??
                  dienstleister.find((x) => x.id === vorgaben.dienstleister_id)
                    ?.firma ??
                  "—"}
              </span>
            </AlertDescription>
          </Alert>
        ) : null}

        {!bearbeiten && vorgaben?.projekt_id ? (() => {
          const p = projekte.find((x) => x.id === vorgaben.projekt_id);
          const team = teams.find((t) => t.id === vorgaben.team_id);
          if (!p) return null;
          const st = (p.status ?? "neu").toLowerCase();
          const prio = (p.priority ?? "normal").toLowerCase();
          const prioHex =
            PRIORITAET_FARBEN[prio] ?? PRIORITAET_FARBEN.normal ?? "#3b82f6";
          return (
            <div className="mb-4 space-y-2">
              <div className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900 p-3">
                <div
                  className="h-3 w-3 shrink-0 rounded-full"
                  style={{ background: prioHex }}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-zinc-100">{p.title}</p>
                  {p.customerLabel ? (
                    <p className="text-xs text-zinc-500">{p.customerLabel}</p>
                  ) : null}
                </div>
                <Badge
                  className={cn(
                    "ml-auto shrink-0",
                    STATUS_FARBEN[st] ?? "bg-zinc-800 text-zinc-300"
                  )}
                >
                  {planungStatusLabel(st)}
                </Badge>
              </div>
              <p className="text-xs text-zinc-500">
                Einsatz für{" "}
                <span className="font-medium text-zinc-300">{p.title}</span> am{" "}
                {format(parseISO(vorgaben.date), "dd.MM.yyyy", { locale: de })}{" "}
                {vorgaben.dienstleister_id ? (
                  <>
                    mit Partner{" "}
                    <span className="font-medium text-zinc-300">
                      {vorgaben.dienstleister_name ??
                        dienstleister.find((x) => x.id === vorgaben.dienstleister_id)
                          ?.firma ??
                        "Dienstleister"}
                    </span>{" "}
                  </>
                ) : (
                  <>
                    mit{" "}
                    <span className="font-medium text-zinc-300">
                      {team?.name ?? "Team"}
                    </span>{" "}
                  </>
                )}
                planen
              </p>
            </div>
          );
        })() : null}

        {(konfliktText || abwesenheitWarnung) && (
          <Alert variant="destructive" className="border-red-900/80 bg-red-950/35">
            <AlertTriangleIcon className="size-4 shrink-0" />
            <AlertTitle>Konflikt</AlertTitle>
            <AlertDescription>
              {abwesenheitWarnung && (
                <span>
                  {abwesenheitWarnung.startsWith("⚠") ? "" : "⚠ "}
                  {abwesenheitWarnung}
                </span>
              )}
              {konfliktText && <span>{konfliktText}</span>}
            </AlertDescription>
          </Alert>
        )}

        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-1 flex-col gap-4 overflow-y-auto py-2"
        >
          <div className="space-y-2">
            <Label className="text-zinc-300">Projekt</Label>
            <Controller
              control={form.control}
              name="projekt_id"
              render={({ field }) => (
                <Popover open={comboOffen} onOpenChange={setComboOffen}>
                  <PopoverTrigger
                    className={cn(
                      triggerClass,
                      "inline-flex items-center justify-between font-normal"
                    )}
                    nativeButton
                  >
                    <span className="flex min-w-0 flex-1 items-center gap-2 truncate">
                      {field.value ? (
                        <>
                          <span className="truncate">
                            {projekte.find((p) => p.id === field.value)?.title ??
                              "Projekt"}
                          </span>
                          {(() => {
                            const p = projekte.find((x) => x.id === field.value);
                            if (!p) return null;
                            return (
                              <>
                                <Badge
                                  variant="secondary"
                                  className={cn(
                                    "shrink-0 text-[10px]",
                                    STATUS_BADGE[p.status] ?? "bg-zinc-800"
                                  )}
                                >
                                  {statusLabel(p.status)}
                                </Badge>
                                <span
                                  className={cn(
                                    "size-2 shrink-0 rounded-full",
                                    PRIORITAET_FARBE[dbPrioritaetZuUi(p.priority)]
                                  )}
                                  title="Priorität"
                                />
                              </>
                            );
                          })()}
                        </>
                      ) : (
                        "Projekt suchen …"
                      )}
                    </span>
                    <ChevronsUpDownIcon className="ml-2 size-4 shrink-0 opacity-50" />
                  </PopoverTrigger>
                  <PopoverContent className="w-[var(--anchor-width)] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Titel oder Kunde …" />
                      <CommandList>
                        <CommandEmpty>Kein Treffer.</CommandEmpty>
                        <CommandGroup>
                          {projekte.map((p) => (
                            <CommandItem
                              key={p.id}
                              value={`${p.title} ${p.customerLabel} ${p.id}`}
                              onSelect={() => {
                                field.onChange(p.id);
                                form.setValue(
                                  "prioritaet",
                                  dbPrioritaetZuUi(p.priority)
                                );
                                setComboOffen(false);
                              }}
                            >
                              <CheckIcon
                                className={cn(
                                  "mr-2 size-4",
                                  field.value === p.id ? "opacity-100" : "opacity-0"
                                )}
                              />
                              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                                <span className="flex items-center gap-2 truncate font-medium">
                                  {p.title}
                                  <Badge
                                    variant="secondary"
                                    className={cn(
                                      "text-[10px]",
                                      STATUS_BADGE[p.status] ?? "bg-zinc-800"
                                    )}
                                  >
                                    {statusLabel(p.status)}
                                  </Badge>
                                  <span
                                    className={cn(
                                      "size-2 rounded-full",
                                      PRIORITAET_FARBE[dbPrioritaetZuUi(p.priority)]
                                    )}
                                  />
                                </span>
                                {p.customerLabel ? (
                                  <span className="truncate text-xs text-zinc-500">
                                    {p.customerLabel}
                                  </span>
                                ) : null}
                              </span>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              )}
            />
            {form.formState.errors.projekt_id && (
              <p className="text-xs text-red-400">
                {form.formState.errors.projekt_id.message}
              </p>
            )}
          </div>

          {bearbeiten ? (
            <>
              <div className="space-y-2">
                <Label className="text-zinc-300">Team</Label>
                <Controller
                  control={form.control}
                  name="team_ids"
                  render={({ field }) => {
                    const tid = field.value?.[0]?.trim();
                    const teamEntry = tid ? teams.find((t) => t.id === tid) : null;
                    return (
                      <Select
                        value={tid ? tid : "__none__"}
                        onValueChange={(v) => {
                          if (v === "__none__") {
                            field.onChange([]);
                          } else {
                            field.onChange([v]);
                            form.setValue("dienstleister_ids", []);
                          }
                        }}
                      >
                        <SelectTrigger className={cn(triggerClass, "gap-2")}>
                          {teamEntry ? (
                            <>
                              <span
                                className="inline-block size-2 shrink-0 rounded-full"
                                style={{ backgroundColor: teamEntry.farbe }}
                              />
                              <SelectValue>{teamEntry.name}</SelectValue>
                            </>
                          ) : tid ? (
                            <span className="truncate text-amber-200/90">
                              Team wird geladen…
                            </span>
                          ) : (
                            <SelectValue placeholder="Kein Team" />
                          )}
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">— kein Team</SelectItem>
                          {teams.map((t) => (
                            <SelectItem key={t.id} value={t.id}>
                              <span className="flex items-center gap-2">
                                <span
                                  className="inline-block size-2 rounded-full"
                                  style={{ backgroundColor: t.farbe }}
                                />
                                {t.name}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    );
                  }}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-zinc-300">Dienstleister</Label>
                <Controller
                  control={form.control}
                  name="dienstleister_ids"
                  render={({ field }) => {
                    const did = field.value?.[0]?.trim();
                    const dlEntry = did
                      ? dienstleister.find((d) => d.id === did)
                      : null;
                    return (
                      <Select
                        value={did ? did : "__none__"}
                        onValueChange={(v) => {
                          if (v === "__none__") {
                            field.onChange([]);
                          } else {
                            field.onChange([v]);
                            form.setValue("team_ids", []);
                          }
                        }}
                      >
                        <SelectTrigger className={triggerClass}>
                          {dlEntry ? (
                            <SelectValue>{dlEntry.firma}</SelectValue>
                          ) : did ? (
                            <span className="truncate text-amber-200/90">
                              Partner wird geladen…
                            </span>
                          ) : (
                            <SelectValue placeholder="Kein Partner" />
                          )}
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">— kein Partner</SelectItem>
                          {dienstleister.map((d) => (
                            <SelectItem key={d.id} value={d.id}>
                              {d.firma}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    );
                  }}
                />
              </div>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <Label className="text-zinc-300">
                  Teams <span className="text-zinc-500">(mehrfach)</span>
                </Label>
                <Controller
                  control={form.control}
                  name="team_ids"
                  render={({ field }) => (
                    <div className="max-h-40 space-y-2 overflow-y-auto rounded-lg border border-zinc-700/80 bg-zinc-900/50 p-2">
                      {teams.length === 0 ? (
                        <p className="text-xs text-zinc-500">Keine Teams.</p>
                      ) : (
                        teams.map((t) => {
                          const checked = field.value.includes(t.id);
                          return (
                            <label
                              key={t.id}
                              className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-1.5 hover:bg-zinc-800/60"
                            >
                              <Checkbox
                                checked={checked}
                                onCheckedChange={(c) => {
                                  const on = c === true;
                                  if (on) {
                                    field.onChange([...field.value, t.id]);
                                  } else {
                                    field.onChange(
                                      field.value.filter((id) => id !== t.id)
                                    );
                                  }
                                }}
                              />
                              <span
                                className="size-2 shrink-0 rounded-full"
                                style={{ backgroundColor: t.farbe }}
                              />
                              <span className="text-sm text-zinc-200">{t.name}</span>
                            </label>
                          );
                        })
                      )}
                    </div>
                  )}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-zinc-300">
                  Partner <span className="text-zinc-500">(mehrfach)</span>
                </Label>
                <Controller
                  control={form.control}
                  name="dienstleister_ids"
                  render={({ field }) => (
                    <div className="max-h-36 space-y-2 overflow-y-auto rounded-lg border border-zinc-700/80 bg-zinc-900/50 p-2">
                      {dienstleister.length === 0 ? (
                        <p className="text-xs text-zinc-500">Keine Partner.</p>
                      ) : (
                        dienstleister.map((d) => {
                          const checked = field.value.includes(d.id);
                          return (
                            <label
                              key={d.id}
                              className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-1.5 hover:bg-zinc-800/60"
                            >
                              <Checkbox
                                checked={checked}
                                onCheckedChange={(c) => {
                                  const on = c === true;
                                  if (on) {
                                    field.onChange([...field.value, d.id]);
                                  } else {
                                    field.onChange(
                                      field.value.filter((id) => id !== d.id)
                                    );
                                  }
                                }}
                              />
                              <span className="text-sm text-zinc-200">{d.firma}</span>
                            </label>
                          );
                        })
                      )}
                    </div>
                  )}
                />
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label className="text-zinc-300">Zeitraum</Label>
            <Popover open={rangeOpen} onOpenChange={setRangeOpen}>
              <PopoverTrigger
                className={cn(
                  triggerClass,
                  "inline-flex items-center justify-start gap-2 font-normal"
                )}
                nativeButton
              >
                <CalendarIcon className="size-4 opacity-60" />
                {dateVon ? (
                  dateBis && dateBis !== dateVon ? (
                    <>
                      {format(parseISO(dateVon), "dd.MM.yyyy", { locale: de })} –{" "}
                      {format(parseISO(dateBis), "dd.MM.yyyy", { locale: de })}
                    </>
                  ) : (
                    format(parseISO(dateVon), "dd.MM.yyyy", { locale: de })
                  )
                ) : (
                  "Datum wählen"
                )}
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="range"
                  locale={de}
                  numberOfMonths={1}
                  selected={rangeSelected}
                  onSelect={(r) => {
                    if (!r?.from) return;
                    form.setValue("date_von", format(r.from, "yyyy-MM-dd"));
                    form.setValue(
                      "date_bis",
                      format(r.to ?? r.from, "yyyy-MM-dd")
                    );
                    if (r.to) setRangeOpen(false);
                  }}
                />
              </PopoverContent>
            </Popover>
            {(form.formState.errors.date_von || form.formState.errors.date_bis) && (
              <p className="text-xs text-red-400">
                {form.formState.errors.date_von?.message ??
                  form.formState.errors.date_bis?.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Label className="text-zinc-300">Arbeitszeit / Schicht</Label>
              <span className="text-[10px] text-zinc-600">
                Halbtag oder mehrere Baustellen: Zeiten anpassen, Details in
                Notizen
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {SCHICHT_PRESETS.map((s) => (
                <Button
                  key={s.id}
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 rounded-md border-zinc-600/80 bg-zinc-900/60 text-xs text-zinc-300 hover:border-zinc-500 hover:bg-zinc-800 hover:text-zinc-50"
                  onClick={() => {
                    form.setValue("start_time", s.start);
                    form.setValue("end_time", s.end);
                  }}
                >
                  {s.label}{" "}
                  <span className="tabular-nums text-zinc-500">
                    ({s.start}–{s.end})
                  </span>
                </Button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="einsatz-start" className="text-zinc-300">
                Start
              </Label>
              <Input
                id="einsatz-start"
                type="time"
                className={fieldClass}
                {...form.register("start_time")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="einsatz-ende" className="text-zinc-300">
                Ende
              </Label>
              <Input
                id="einsatz-ende"
                type="time"
                className={fieldClass}
                {...form.register("end_time")}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-zinc-300">Priorität</Label>
            <Controller
              control={form.control}
              name="prioritaet"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className={triggerClass}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(
                      [
                        "niedrig",
                        "mittel",
                        "hoch",
                        "kritisch",
                      ] as EinsatzPrioritaetUi[]
                    ).map((p) => (
                      <SelectItem key={p} value={p}>
                        <span className="flex items-center gap-2">
                          <span
                            className={cn("size-2 rounded-full", PRIORITAET_FARBE[p])}
                          />
                          {p === "niedrig" && "Niedrig"}
                          {p === "mittel" && "Mittel"}
                          {p === "hoch" && "Hoch"}
                          {p === "kritisch" && "Kritisch"}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="einsatz-notiz" className="text-zinc-300">
              Notizen (optional)
            </Label>
            <Textarea
              id="einsatz-notiz"
              rows={3}
              className={textareaClass}
              placeholder="z. B. 2 Baustellen, Wechsel nachmittags, Anfahrt …"
              {...form.register("notes")}
            />
          </div>

          <SheetFooter className="mt-auto flex-col gap-2 border-t border-zinc-800 pt-4 sm:flex-row">
            {bearbeiten && (
              <Button
                type="button"
                variant="destructive"
                className="w-full sm:mr-auto sm:w-auto"
                onClick={() => void loeschen()}
                disabled={form.formState.isSubmitting}
              >
                Löschen
              </Button>
            )}
            <Button
              type="button"
              variant="secondary"
              onClick={() => onOpenChange(false)}
            >
              Abbrechen
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Speichern…" : "Speichern"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

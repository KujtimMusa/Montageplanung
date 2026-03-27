"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CheckIcon, ChevronsUpDownIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { pruefeEinsatzKonflikt } from "@/lib/utils/conflicts";
import { getRepresentativeEmployeeId } from "@/lib/planung/team-representative";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const schema = z.object({
  projekt_id: z.string().uuid("Projekt wählen."),
  team_id: z.string().uuid("Team wählen."),
  date: z.string().min(1, "Datum erforderlich."),
  start_time: z.string().optional(),
  end_time: z.string().optional(),
  notes: z.string().optional(),
});

export type EinsatzFormularWerte = z.infer<typeof schema>;

export type TeamOption = { id: string; name: string; farbe: string };
export type ProjektOption = { id: string; title: string };

export type BearbeitenZuweisung = {
  id: string;
  employee_id: string;
  project_id: string | null;
  team_id: string | null;
  date: string;
  start_time: string;
  end_time: string;
  notes: string | null;
};

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

type Props = {
  open: boolean;
  onOpenChange: (offen: boolean) => void;
  teams: TeamOption[];
  projekte: ProjektOption[];
  bearbeiten: BearbeitenZuweisung | null;
  vorgaben: {
    team_id: string;
    date: string;
    start_time?: string;
    end_time?: string;
    projekt_id?: string;
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
  bearbeiten,
  vorgaben,
  eigeneMitarbeiterId,
  formularSchluessel,
  onGespeichert,
}: Props) {
  const supabase = useMemo(() => createClient(), []);
  const [konfliktText, setKonfliktText] = useState<string | null>(null);
  const [comboOffen, setComboOffen] = useState(false);

  const form = useForm<EinsatzFormularWerte>({
    resolver: zodResolver(schema),
    defaultValues: {
      projekt_id: "",
      team_id: "",
      date: "",
      start_time: "",
      end_time: "",
      notes: "",
    },
  });

  useEffect(() => {
    if (!open) return;
    setKonfliktText(null);
    if (bearbeiten) {
      form.reset({
        projekt_id: bearbeiten.project_id ?? "",
        team_id: bearbeiten.team_id ?? "",
        date: bearbeiten.date,
        start_time: bearbeiten.start_time.slice(0, 5),
        end_time: bearbeiten.end_time.slice(0, 5),
        notes: bearbeiten.notes ?? "",
      });
    } else if (vorgaben) {
      form.reset({
        projekt_id: vorgaben.projekt_id ?? "",
        team_id: vorgaben.team_id,
        date: vorgaben.date,
        start_time: vorgaben.start_time ?? "08:00",
        end_time: vorgaben.end_time ?? "16:00",
        notes: "",
      });
    } else {
      form.reset({
        projekt_id: "",
        team_id: "",
        date: "",
        start_time: "08:00",
        end_time: "16:00",
        notes: "",
      });
    }
  }, [open, bearbeiten, vorgaben, formularSchluessel, form]);

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
    const startNorm = normalisiereUhrzeit(werte.start_time, "08:00:00");
    const endNorm = normalisiereUhrzeit(werte.end_time, "16:00:00");

    const empId = await getRepresentativeEmployeeId(supabase, werte.team_id);
    if (!empId) {
      toast.error("Im Team ist kein Mitarbeiter hinterlegt (Vertreter fehlt).");
      return;
    }

    const k = await pruefeEinsatzKonflikt(supabase, {
      mitarbeiterId: empId,
      datum: werte.date,
      startZeit: startNorm,
      endZeit: endNorm,
      ausserhalbEinsatzId: bearbeiten?.id,
    });

    if (k.hatKonflikt) {
      setKonfliktText(k.nachricht);
      return;
    }

    if (bearbeiten) {
      const { error } = await supabase
        .from("assignments")
        .update({
          employee_id: empId,
          project_id: werte.projekt_id,
          project_title: null,
          team_id: werte.team_id,
          date: werte.date,
          start_time: startNorm,
          end_time: endNorm,
          notes: werte.notes?.trim() || null,
        })
        .eq("id", bearbeiten.id);

      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success("Einsatz gespeichert.");
      onOpenChange(false);
      onGespeichert();
      return;
    }

    const payload: Record<string, unknown> = {
      employee_id: empId,
      project_id: werte.projekt_id,
      project_title: null,
      team_id: werte.team_id,
      date: werte.date,
      start_time: startNorm,
      end_time: endNorm,
      notes: werte.notes?.trim() || null,
    };
    if (eigeneMitarbeiterId) payload.created_by = eigeneMitarbeiterId;

    const { error } = await supabase.from("assignments").insert(payload);
    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Einsatz gespeichert.");
    try {
      void benachrichtigungFireAndForget(werte.team_id, werte.projekt_id, werte.date);
    } catch {
      /* nicht blockieren */
    }
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto border-zinc-700 bg-zinc-900 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-zinc-50">{titel}</DialogTitle>
        </DialogHeader>

        {konfliktText && (
          <Alert variant="destructive" className="border-red-900 bg-red-950/40">
            <AlertTitle>Konflikt</AlertTitle>
            <AlertDescription>{konfliktText}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-3 py-2">
          <div className="space-y-2">
            <Label className="text-zinc-300">Projekt</Label>
            <Controller
              control={form.control}
              name="projekt_id"
              render={({ field }) => (
                <Popover open={comboOffen} onOpenChange={setComboOffen}>
                  <PopoverTrigger
                    className={cn(
                      "inline-flex h-9 w-full items-center justify-between rounded-md border border-zinc-700 bg-zinc-950 px-3 text-sm font-normal text-zinc-100 shadow-sm outline-none hover:bg-zinc-900 focus-visible:ring-2 focus-visible:ring-zinc-600"
                    )}
                    nativeButton
                  >
                    <span className="truncate">
                      {field.value
                        ? projekte.find((p) => p.id === field.value)?.title ?? "Projekt wählen"
                        : "Projekt suchen …"}
                    </span>
                    <ChevronsUpDownIcon className="ml-2 size-4 shrink-0 opacity-50" />
                  </PopoverTrigger>
                  <PopoverContent className="w-[var(--anchor-width)] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Suchen …" />
                      <CommandList>
                        <CommandEmpty>Kein Treffer.</CommandEmpty>
                        <CommandGroup>
                          {projekte.map((p) => (
                            <CommandItem
                              key={p.id}
                              value={`${p.title} ${p.id}`}
                              onSelect={() => {
                                field.onChange(p.id);
                                setComboOffen(false);
                              }}
                            >
                              <CheckIcon
                                className={cn(
                                  "mr-2 size-4",
                                  field.value === p.id ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {p.title}
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
              <p className="text-xs text-red-400">{form.formState.errors.projekt_id.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-zinc-300">Team</Label>
            <Controller
              control={form.control}
              name="team_id"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="border-zinc-700 bg-zinc-950">
                    <SelectValue placeholder="Team wählen" />
                  </SelectTrigger>
                  <SelectContent>
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
              )}
            />
            {form.formState.errors.team_id && (
              <p className="text-xs text-red-400">{form.formState.errors.team_id.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="einsatz-datum" className="text-zinc-300">
              Datum
            </Label>
            <Input
              id="einsatz-datum"
              type="date"
              className="border-zinc-700 bg-zinc-950"
              {...form.register("date")}
            />
            {form.formState.errors.date && (
              <p className="text-xs text-red-400">{form.formState.errors.date.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-2">
              <Label htmlFor="einsatz-start" className="text-zinc-300">
                Start (optional)
              </Label>
              <Input
                id="einsatz-start"
                type="time"
                className="border-zinc-700 bg-zinc-950"
                {...form.register("start_time")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="einsatz-ende" className="text-zinc-300">
                Ende (optional)
              </Label>
              <Input
                id="einsatz-ende"
                type="time"
                className="border-zinc-700 bg-zinc-950"
                {...form.register("end_time")}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="einsatz-notiz" className="text-zinc-300">
              Notizen (optional)
            </Label>
            <Textarea
              id="einsatz-notiz"
              rows={2}
              className="border-zinc-700 bg-zinc-950 text-zinc-100"
              placeholder="Optional"
              {...form.register("notes")}
            />
          </div>

          <DialogFooter className="flex-col gap-2 sm:flex-row">
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
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

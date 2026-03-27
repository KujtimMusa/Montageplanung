"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Calendar,
  Check,
  CheckCircle,
  CheckIcon,
  ChevronDown,
  ChevronsUpDownIcon,
  Loader2,
  User,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { cn } from "@/lib/utils";
import { formatDatum } from "@/lib/utils/datum";
import type { NotfallSteuerungProps } from "@/components/notfall/types";

function projektLabel(e: NotfallSteuerungProps["einsätze"][0]): string {
  if (e.projects?.title) return e.projects.title;
  if (e.project_title?.trim()) return e.project_title.trim();
  return "Einsatz";
}

export function NotfallSteuerung({
  mitarbeiter,
  ausfallId,
  setAusfallId,
  datum,
  setDatum,
  schritt,
  kiLaed,
  onNotfallAnalysieren,
  einsätze,
  kandidatenProEinsatz,
  kiErsatz,
  manuellerErsatz,
  ersatzManuellSetzen,
  ersatzBestaetigen,
  alleKiErsatzBestaetigen,
  lädt,
}: NotfallSteuerungProps) {
  const [comboOffen, setComboOffen] = useState(false);

  const ausfall = useMemo(
    () => mitarbeiter.find((m) => m.id === ausfallId),
    [mitarbeiter, ausfallId]
  );

  const kiErsatzVorhanden = useMemo(
    () => Object.keys(kiErsatz).length > 0,
    [kiErsatz]
  );

  const schritte = [
    { nr: 1, titel: "Wer fällt aus?", icon: User },
    { nr: 2, titel: "Einsätze laden", icon: Calendar },
    { nr: 3, titel: "Ersatz bestätigen", icon: CheckCircle },
  ];

  return (
    <div className="min-w-0 space-y-6 text-zinc-100">
      <div className="mb-6 flex flex-wrap items-center gap-3 rounded-2xl border border-red-900/40 bg-red-950/30 p-5">
        <div className="rounded-xl bg-red-500/20 p-3">
          <AlertTriangle size={24} className="text-red-400" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-bold text-red-100">Notfallplan</h1>
          <p className="text-sm text-red-300/60">
            Kurzfristiger Ausfall — KI findet sofort Ersatz
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <div
            className={cn(
              "size-2 rounded-full",
              kiLaed ? "animate-pulse bg-violet-400" : "bg-emerald-400"
            )}
          />
          <span className="text-xs text-zinc-500">
            {kiLaed ? "KI analysiert…" : "KI bereit"}
          </span>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {schritte.map((s) => {
          const aktiv = schritt >= s.nr;
          const Icon = s.icon;
          return (
            <div
              key={s.nr}
              className={cn(
                "rounded-xl border p-3 transition-all",
                aktiv
                  ? "border-red-800/60 bg-red-950/40"
                  : "border-zinc-800 bg-zinc-900/50"
              )}
            >
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    "flex size-5 items-center justify-center rounded-full text-[10px] font-bold",
                    aktiv
                      ? "bg-red-500/30 text-red-400"
                      : "bg-zinc-800 text-zinc-600"
                  )}
                >
                  {s.nr}
                </div>
                <Icon
                  className={cn(
                    "size-3.5 shrink-0",
                    aktiv ? "text-red-400/90" : "text-zinc-600"
                  )}
                />
                <span
                  className={cn(
                    "text-xs font-medium",
                    aktiv ? "text-red-300" : "text-zinc-600"
                  )}
                >
                  {s.titel}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mb-4 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[180px] flex-1 space-y-1">
            <Label className="text-xs text-zinc-500">Wer fällt aus?</Label>
            <Popover open={comboOffen} onOpenChange={setComboOffen}>
              <PopoverTrigger
                className={cn(
                  "inline-flex h-10 w-full items-center justify-between rounded-lg border border-zinc-600/80 bg-zinc-900/90 px-3 text-sm text-zinc-100 shadow-inner",
                  "hover:bg-zinc-900 focus-visible:ring-2 focus-visible:ring-red-500/30 focus-visible:outline-none"
                )}
                nativeButton
              >
                <span className="flex min-w-0 items-center gap-2 truncate">
                  {ausfall ? (
                    <>
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-zinc-700 text-[10px] font-medium">
                        {ausfall.name.charAt(0)}
                      </span>
                      <span className="truncate">
                        <span className="block truncate">{ausfall.name}</span>
                        {ausfall.abteilung ? (
                          <span className="block truncate text-[10px] text-zinc-500">
                            {ausfall.abteilung}
                          </span>
                        ) : null}
                      </span>
                    </>
                  ) : (
                    <span className="text-zinc-500">Mitarbeiter wählen…</span>
                  )}
                </span>
                <ChevronsUpDownIcon className="size-4 shrink-0 opacity-50" />
              </PopoverTrigger>
              <PopoverContent className="w-[var(--anchor-width)] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Suchen…" />
                  <CommandList>
                    <CommandEmpty>Kein Treffer.</CommandEmpty>
                    <CommandGroup>
                      {mitarbeiter.map((m) => (
                        <CommandItem
                          key={m.id}
                          value={`${m.name} ${m.abteilung ?? ""}`}
                          onSelect={() => {
                            setAusfallId(m.id);
                            setComboOffen(false);
                          }}
                        >
                          <CheckIcon
                            className={cn(
                              "mr-2 size-4",
                              ausfallId === m.id ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <div className="flex items-center gap-2">
                            <div className="flex size-6 items-center justify-center rounded-full bg-zinc-700 text-[10px]">
                              {m.name.charAt(0)}
                            </div>
                            <div>
                              <p className="text-sm">{m.name}</p>
                              {m.abteilung ? (
                                <p className="text-[10px] text-zinc-500">
                                  {m.abteilung}
                                </p>
                              ) : null}
                            </div>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-1">
            <Label htmlFor="nf-datum" className="text-xs text-zinc-500">
              Ab wann?
            </Label>
            <Input
              id="nf-datum"
              type="date"
              value={datum}
              onChange={(e) => setDatum(e.target.value)}
              className="h-10 w-[160px] rounded-lg border-zinc-600/80 bg-zinc-900/90 text-zinc-100"
            />
          </div>

          <Button
            type="button"
            className="bg-red-600 text-white hover:bg-red-500"
            onClick={onNotfallAnalysieren}
            disabled={!ausfallId || kiLaed || lädt}
          >
            {kiLaed || lädt ? (
              <>
                <Loader2 size={14} className="mr-2 animate-spin" />
                Analysiert…
              </>
            ) : (
              <>
                <Zap size={14} className="mr-2" />
                Notfall analysieren
              </>
            )}
          </Button>
        </div>
      </div>

      {!ausfall?.department_id && ausfallId ? (
        <p className="text-sm text-amber-400">
          Dieser Mitarbeiter hat keine Abteilung — Ersatzfilter greift nicht.
        </p>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-zinc-800">
        <Table>
          <TableHeader className="bg-zinc-900/80">
            <TableRow className="border-zinc-800 hover:bg-transparent">
              <TableHead className="text-xs text-zinc-400">
                Projekt / Einsatz
              </TableHead>
              <TableHead className="text-xs text-zinc-400">Zeit</TableHead>
              <TableHead className="text-xs text-zinc-400">
                KI-Ersatz (beste Wahl)
              </TableHead>
              <TableHead className="w-[120px] text-xs text-zinc-400">
                Aktionen
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {einsätze.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-zinc-500">
                  {ausfallId
                    ? "Keine Einsätze — zuerst „Notfall analysieren“."
                    : "Mitarbeiter wählen und analysieren."}
                </TableCell>
              </TableRow>
            ) : (
              einsätze.map((e) => {
                const ki = kiErsatz[e.id];
                const manual = manuellerErsatz[e.id];
                const kandidaten = kandidatenProEinsatz[e.id] ?? [];
                const effektivId = manual ?? ki?.employeeId;

                return (
                  <TableRow key={e.id} className="border-zinc-800">
                    <TableCell>
                      <p className="text-sm font-medium text-zinc-200">
                        {projektLabel(e)}
                      </p>
                      {e.teamName ? (
                        <p className="text-xs text-zinc-500">{e.teamName}</p>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-sm text-zinc-400">
                      {formatDatum(e.date)}
                      <br />
                      <span className="text-xs tabular-nums">
                        {e.start_time.slice(0, 5)}–{e.end_time.slice(0, 5)}
                      </span>
                    </TableCell>
                    <TableCell>
                      {ki ? (
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="flex size-7 items-center justify-center rounded-full bg-violet-800/50 text-[10px] font-bold text-violet-300">
                            {ki.name.charAt(0)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-medium text-zinc-200">
                              {ki.name}
                            </p>
                            <p className="text-[10px] text-violet-400">
                              KI · {ki.grund}
                            </p>
                          </div>
                          <Select
                            value={manual ?? "__ki__"}
                            onValueChange={(v) =>
                              ersatzManuellSetzen(
                                e.id,
                                v === "__ki__" ? null : v
                              )
                            }
                          >
                            <SelectTrigger className="h-7 w-7 shrink-0 border-none bg-transparent p-0">
                              <ChevronDown size={12} className="text-zinc-600" />
                            </SelectTrigger>
                            <SelectContent align="end">
                              <SelectItem value="__ki__">
                                KI: {ki.name}
                              </SelectItem>
                              {kandidaten.map((emp) => (
                                <SelectItem key={emp.id} value={emp.id}>
                                  {emp.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      ) : (
                        <Select
                          value={manual ?? "__none__"}
                          onValueChange={(v) =>
                            ersatzManuellSetzen(
                              e.id,
                              v === "__none__" ? null : v
                            )
                          }
                        >
                          <SelectTrigger className="h-8 max-w-[220px] border-zinc-700 bg-zinc-900 text-xs">
                            <SelectValue placeholder="Ersatz wählen…" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__" disabled>
                              Ersatz wählen…
                            </SelectItem>
                            {kandidaten.map((emp) => (
                              <SelectItem key={emp.id} value={emp.id}>
                                {emp.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        size="sm"
                        className="h-7 bg-emerald-600 text-xs hover:bg-emerald-500"
                        disabled={!effektivId}
                        onClick={() => ersatzBestaetigen(e.id)}
                      >
                        <Check size={12} className="mr-1" />
                        Bestätigen
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>

        {kiErsatzVorhanden && einsätze.length > 0 ? (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-zinc-800 bg-zinc-900/50 p-3">
            <p className="text-xs text-zinc-500">
              KI hat {Object.keys(kiErsatz).length} Empfehlung(en)
            </p>
            <Button
              type="button"
              size="sm"
              className="bg-red-600 hover:bg-red-500"
              onClick={alleKiErsatzBestaetigen}
              disabled={lädt || kiLaed}
            >
              <Zap size={12} className="mr-1.5" />
              Alle KI-Empfehlungen übernehmen
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

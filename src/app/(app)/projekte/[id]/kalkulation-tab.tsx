"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  Calculator,
  ChevronDown,
  ChevronRight,
  Loader2,
  Plus,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type CalcListItem = {
  id: string;
  title: string;
  status: string;
  project_id: string | null;
  updated_at: string;
};

type TimeRow = {
  position_id: string;
  title: string;
  position_type: string;
  planned_hours: number | null;
  actual_hours: number;
  deviation_pct: number | null;
  confidence: string;
};

type TimeComparisonPayload = {
  positions: TimeRow[];
  summary: {
    total_planned_hours: number;
    total_actual_hours: number;
    total_deviation_pct: number | null;
    project_id: string | null;
  };
};

function formatH(n: number): string {
  return n.toLocaleString("de-DE", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

function formatPct(p: number | null): string {
  if (p == null || !Number.isFinite(p)) return "—";
  const sign = p > 0 ? "+" : "";
  return `${sign}${p.toFixed(1)} %`;
}

function Ampel({ planned, deviationPct }: { planned: number | null; deviationPct: number | null }) {
  if (planned == null || planned <= 0) {
    return <span className="text-zinc-600">—</span>;
  }
  if (deviationPct == null || !Number.isFinite(deviationPct)) {
    return (
      <div
        className="mx-auto h-3 w-3 rounded-full bg-zinc-600"
        title="Keine Abweichung berechenbar"
      />
    );
  }
  const a = Math.abs(deviationPct);
  const cls =
    a <= 10 ? "bg-emerald-500" : a <= 25 ? "bg-amber-400" : "bg-red-500";
  return (
    <div
      className={cn("mx-auto h-3 w-3 rounded-full", cls)}
      title={`Abweichung ${formatPct(deviationPct)}`}
    />
  );
}

function statusBadgeClass(status: string): string {
  switch (status) {
    case "entwurf":
      return "bg-zinc-700 text-zinc-300";
    case "aktiv":
      return "border border-emerald-800 bg-emerald-900/50 text-emerald-400";
    case "archiviert":
      return "bg-zinc-800 text-zinc-500";
    default:
      return "bg-zinc-800 text-zinc-400";
  }
}

export function KalkulationTab({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [rows, setRows] = useState<CalcListItem[]>([]);
  const [laden, setLaden] = useState(true);
  const [fehler, setFehler] = useState<string | null>(null);

  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [comparisonByCalc, setComparisonByCalc] = useState<
    Record<string, TimeComparisonPayload | "loading" | "error">
  >({});

  const [neuOffen, setNeuOffen] = useState(false);
  const [neuTitel, setNeuTitel] = useState("");
  const [neuLaden, setNeuLaden] = useState(false);

  const loadList = useCallback(async () => {
    setLaden(true);
    setFehler(null);
    try {
      const res = await fetch(
        `/api/calculations?project_id=${encodeURIComponent(projectId)}`
      );
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j as { error?: string }).error ?? "Liste fehlgeschlagen");
      }
      const j = (await res.json()) as { calculations: CalcListItem[] };
      setRows(j.calculations ?? []);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Laden fehlgeschlagen";
      setFehler(msg);
      toast.error(msg);
    } finally {
      setLaden(false);
    }
  }, [projectId]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  const toggleExpand = async (calcId: string) => {
    const wasExpanded = expanded.has(calcId);
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(calcId)) next.delete(calcId);
      else next.add(calcId);
      return next;
    });

    if (wasExpanded) return;

    const cached = comparisonByCalc[calcId];
    if (cached && cached !== "loading" && cached !== "error") return;

    setComparisonByCalc((m) => ({ ...m, [calcId]: "loading" }));
    try {
      const res = await fetch(`/api/calculations/${calcId}/time-comparison`);
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j as { error?: string }).error ?? "Vergleich fehlgeschlagen");
      }
      const data = (await res.json()) as TimeComparisonPayload;
      setComparisonByCalc((m) => ({ ...m, [calcId]: data }));
    } catch {
      setComparisonByCalc((m) => ({ ...m, [calcId]: "error" }));
      toast.error("Plan/Ist konnte nicht geladen werden");
    }
  };

  const handleNeu = async () => {
    const t = neuTitel.trim();
    if (!t) {
      toast.error("Titel erforderlich");
      return;
    }
    setNeuLaden(true);
    try {
      const res = await fetch("/api/calculations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: t,
          project_id: projectId,
          status: "entwurf",
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j as { error?: string }).error ?? "Anlegen fehlgeschlagen");
      }
      const j = (await res.json()) as { calculation: { id: string } };
      const newId = j.calculation?.id;
      if (!newId) throw new Error("Keine ID");
      toast.success("Kalkulation angelegt");
      setNeuOffen(false);
      setNeuTitel("");
      router.push(`/kalkulation/${newId}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Fehler");
    } finally {
      setNeuLaden(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-zinc-500">
          Kalkulationen dieses Projekts, Plan/Ist pro Position (Zeiterfassung).
        </p>
        <Button
          type="button"
          size="sm"
          className="bg-zinc-100 text-zinc-900 hover:bg-white"
          onClick={() => setNeuOffen(true)}
        >
          <Plus className="mr-1.5 h-4 w-4" />
          Neue Kalkulation für dieses Projekt
        </Button>
      </div>

      {laden ? (
        <div className="flex items-center gap-2 text-sm text-zinc-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Laden…
        </div>
      ) : fehler ? (
        <p className="text-sm text-red-400">{fehler}</p>
      ) : rows.length === 0 ? (
        <p className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 text-sm text-zinc-500">
          Noch keine Kalkulation verknüpft. Legen Sie eine an oder verknüpfen Sie eine bestehende
          Kalkulation im Kalkulations-Editor mit diesem Projekt.
        </p>
      ) : (
        <div className="space-y-2">
          {rows.map((c) => {
            const isOpen = expanded.has(c.id);
            const cmp = comparisonByCalc[c.id];
            return (
              <div
                key={c.id}
                className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/40"
              >
                <div className="flex flex-wrap items-center gap-2 px-3 py-2.5">
                  <button
                    type="button"
                    onClick={() => void toggleExpand(c.id)}
                    className="flex flex-1 items-center gap-2 text-left min-w-0"
                  >
                    {isOpen ? (
                      <ChevronDown className="h-4 w-4 shrink-0 text-zinc-500" />
                    ) : (
                      <ChevronRight className="h-4 w-4 shrink-0 text-zinc-500" />
                    )}
                    <Calculator className="h-4 w-4 shrink-0 text-zinc-500" />
                    <span className="truncate font-medium text-zinc-200">{c.title}</span>
                    <Badge className={cn("shrink-0 text-xs", statusBadgeClass(c.status))}>
                      {c.status}
                    </Badge>
                  </button>
                  <Link
                    href={`/kalkulation/${c.id}`}
                    className={cn(
                      buttonVariants({ variant: "secondary", size: "sm" }),
                      "no-underline"
                    )}
                  >
                    Zur Kalkulation
                  </Link>
                </div>

                {isOpen && (
                  <div className="border-t border-zinc-800 px-3 pb-3 pt-1">
                    {cmp === "loading" || cmp === undefined ? (
                      <div className="flex items-center gap-2 py-4 text-sm text-zinc-500">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Plan/Ist wird geladen…
                      </div>
                    ) : cmp === "error" ? (
                      <p className="py-2 text-sm text-red-400">Vergleich nicht verfügbar.</p>
                    ) : (
                      <>
                        <div className="overflow-x-auto rounded-lg border border-zinc-800/80">
                          <Table>
                            <TableHeader>
                              <TableRow className="border-zinc-800 hover:bg-transparent">
                                <TableHead className="text-zinc-400">Position</TableHead>
                                <TableHead className="text-right text-zinc-400">
                                  Geplant h
                                </TableHead>
                                <TableHead className="text-right text-zinc-400">Ist h</TableHead>
                                <TableHead className="text-right text-zinc-400">
                                  Abweichung %
                                </TableHead>
                                <TableHead className="w-16 text-center text-zinc-400">
                                  Ampel
                                </TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {cmp.positions.map((p) => (
                                <TableRow
                                  key={p.position_id}
                                  className="border-zinc-800/60 hover:bg-zinc-800/20"
                                >
                                  <TableCell className="max-w-[220px]">
                                    <span className="font-medium text-zinc-200">{p.title}</span>
                                    <span className="ml-2 text-xs text-zinc-500">
                                      {p.position_type}
                                    </span>
                                  </TableCell>
                                  <TableCell className="text-right tabular-nums text-zinc-300">
                                    {p.planned_hours != null ? formatH(p.planned_hours) : "—"}
                                  </TableCell>
                                  <TableCell className="text-right tabular-nums text-zinc-300">
                                    {formatH(p.actual_hours)}
                                  </TableCell>
                                  <TableCell className="text-right tabular-nums text-zinc-300">
                                    {formatPct(p.deviation_pct)}
                                  </TableCell>
                                  <TableCell>
                                    <Ampel
                                      planned={p.planned_hours}
                                      deviationPct={p.deviation_pct}
                                    />
                                  </TableCell>
                                </TableRow>
                              ))}
                              <TableRow className="border-t border-zinc-700 bg-zinc-950/50 hover:bg-zinc-950/50">
                                <TableCell className="font-semibold text-zinc-200">
                                  Gesamt
                                </TableCell>
                                <TableCell className="text-right font-semibold tabular-nums text-zinc-200">
                                  {formatH(cmp.summary.total_planned_hours)}
                                </TableCell>
                                <TableCell className="text-right font-semibold tabular-nums text-zinc-200">
                                  {formatH(cmp.summary.total_actual_hours)}
                                </TableCell>
                                <TableCell className="text-right font-semibold tabular-nums text-zinc-200">
                                  {formatPct(cmp.summary.total_deviation_pct)}
                                </TableCell>
                                <TableCell>
                                  <Ampel
                                    planned={
                                      cmp.summary.total_planned_hours > 0
                                        ? cmp.summary.total_planned_hours
                                        : null
                                    }
                                    deviationPct={cmp.summary.total_deviation_pct}
                                  />
                                </TableCell>
                              </TableRow>
                            </TableBody>
                          </Table>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={neuOffen} onOpenChange={setNeuOffen}>
        <DialogContent className="border-zinc-800 bg-zinc-900 text-zinc-100">
          <DialogHeader>
            <DialogTitle>Neue Kalkulation</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label className="text-zinc-400">Titel</Label>
            <Input
              className="border-zinc-700 bg-zinc-950"
              value={neuTitel}
              onChange={(e) => setNeuTitel(e.target.value)}
              placeholder="z. B. Angebot Elektro EG"
              onKeyDown={(e) => {
                if (e.key === "Enter") void handleNeu();
              }}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setNeuOffen(false)}>
              Abbrechen
            </Button>
            <Button type="button" disabled={neuLaden} onClick={() => void handleNeu()}>
              {neuLaden ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Anlegen…
                </>
              ) : (
                "Anlegen & öffnen"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

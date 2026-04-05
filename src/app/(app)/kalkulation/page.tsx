"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format, parseISO } from "date-fns";
import { de } from "date-fns/locale";
import { FileText, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type CalcStatus = "entwurf" | "aktiv" | "archiviert";

type CalcListItem = {
  id: string;
  title: string;
  status: CalcStatus;
  project_id: string | null;
  quick_mode: boolean;
  created_at: string;
  updated_at: string;
  projects: { title: string; status: string } | null;
};

type ApiCalculationRow = {
  id: string;
  title: string;
  status: string;
  project_id: string | null;
  quick_mode: boolean;
  created_at: string;
  updated_at: string;
};

type StatusFilter = "alle" | "entwurf" | "aktiv" | "archiviert";

function statusLabel(status: CalcStatus): string {
  switch (status) {
    case "entwurf":
      return "Entwurf";
    case "aktiv":
      return "Aktiv";
    case "archiviert":
      return "Archiviert";
    default:
      return status;
  }
}

function statusBadgeClass(status: CalcStatus): string {
  switch (status) {
    case "entwurf":
      return "border border-zinc-600 bg-zinc-700 text-zinc-300";
    case "aktiv":
      return "border border-emerald-800 bg-emerald-950 text-emerald-400";
    case "archiviert":
      return "bg-zinc-800 text-zinc-500";
    default:
      return "bg-zinc-800 text-zinc-400";
  }
}

function isCalcStatus(s: string): s is CalcStatus {
  return s === "entwurf" || s === "aktiv" || s === "archiviert";
}

export default function KalkulationenSeite() {
  const router = useRouter();
  const [searchInput, setSearchInput] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("alle");
  const [showArchived, setShowArchived] = useState(false);

  const [rows, setRows] = useState<CalcListItem[]>([]);
  const [laden, setLaden] = useState(true);
  const [fehler, setFehler] = useState<string | null>(null);

  const [dialogOffen, setDialogOffen] = useState(false);
  const [createTitel, setCreateTitel] = useState("");
  const [createProjektId, setCreateProjektId] = useState<string>("none");
  const [createQuick, setCreateQuick] = useState(false);
  const [createLaden, setCreateLaden] = useState(false);
  const [projektOptionen, setProjektOptionen] = useState<
    { id: string; title: string }[]
  >([]);
  const [projekteLaden, setProjekteLaden] = useState(false);
  const [projekteFehler, setProjekteFehler] = useState<string | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => setSearchDebounced(searchInput), 400);
    return () => window.clearTimeout(t);
  }, [searchInput]);

  const projekteLadenFn = useCallback(async () => {
    setProjekteLaden(true);
    setProjekteFehler(null);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("projects")
        .select("id, title, status")
        .eq("status", "aktiv")
        .order("title", { ascending: true });
      if (error) {
        const msg = `Projekte konnten nicht geladen werden: ${error.message}`;
        toast.error(msg);
        setProjekteFehler(msg);
        setProjektOptionen([]);
        return;
      }
      setProjektOptionen(
        (data ?? []).map((p) => ({
          id: p.id as string,
          title: (p.title as string) ?? "",
        }))
      );
    } catch {
      const msg = "Projekte konnten nicht geladen werden.";
      toast.error(msg);
      setProjekteFehler(msg);
      setProjektOptionen([]);
    } finally {
      setProjekteLaden(false);
    }
  }, []);

  useEffect(() => {
    if (dialogOffen) {
      void projekteLadenFn();
    }
  }, [dialogOffen, projekteLadenFn]);

  const listeLaden = useCallback(async () => {
    setLaden(true);
    setFehler(null);
    try {
      const params = new URLSearchParams();
      if (searchDebounced.trim()) {
        params.set("search", searchDebounced.trim());
      }
      if (statusFilter !== "alle") {
        params.set("status", statusFilter);
      }

      const r = await fetch(`/api/calculations?${params.toString()}`);
      const j = (await r.json()) as {
        calculations?: ApiCalculationRow[];
        error?: string;
      };

      if (!r.ok) {
        setFehler(j.error ?? "Fehler beim Laden");
        setRows([]);
        return;
      }

      let raw = j.calculations ?? [];

      if (statusFilter === "alle" && !showArchived) {
        raw = raw.filter((c) => c.status !== "archiviert");
      }

      const ids = Array.from(
        new Set(
          raw.map((c) => c.project_id).filter((id): id is string => Boolean(id))
        )
      );

      let projectById = new Map<
        string,
        { title: string; status: string }
      >();
      if (ids.length > 0) {
        const supabase = createClient();
        const { data: projRows, error: pErr } = await supabase
          .from("projects")
          .select("id, title, status")
          .in("id", ids);

        if (!pErr && projRows) {
          projectById = new Map(
            projRows.map((p) => [
              p.id as string,
              {
                title: (p.title as string) ?? "",
                status: (p.status as string) ?? "",
              },
            ])
          );
        }
      }

      const merged: CalcListItem[] = raw.map((c) => {
        const st = c.status;
        const status: CalcStatus = isCalcStatus(st) ? st : "entwurf";
        const pid = c.project_id;
        return {
          id: c.id,
          title: c.title,
          status,
          project_id: pid,
          quick_mode: Boolean(c.quick_mode),
          created_at: c.created_at,
          updated_at: c.updated_at,
          projects: pid ? projectById.get(pid) ?? null : null,
        };
      });

      setRows(merged);
    } catch {
      setFehler("Netzwerkfehler");
      setRows([]);
    } finally {
      setLaden(false);
    }
  }, [searchDebounced, statusFilter, showArchived]);

  useEffect(() => {
    void listeLaden();
  }, [listeLaden]);

  const archivieren = useCallback(
    async (id: string) => {
      try {
        const r = await fetch(`/api/calculations/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "archiviert" }),
        });
        const j = (await r.json()) as { error?: string };
        if (!r.ok) {
          toast.error(j.error ?? "Archivieren fehlgeschlagen");
          return;
        }
        toast.success("Kalkulation archiviert");
        void listeLaden();
      } catch {
        toast.error("Netzwerkfehler beim Archivieren");
      }
    },
    [listeLaden]
  );

  const kalkulationErstellen = useCallback(async () => {
    const titel = createTitel.trim();
    if (titel.length < 1) {
      toast.error("Bitte einen Titel eingeben.");
      return;
    }

    setCreateLaden(true);
    try {
      const body: Record<string, unknown> = {
        title: titel,
        quick_mode: createQuick,
        project_id: createProjektId === "none" ? null : createProjektId,
      };

      const r = await fetch("/api/calculations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = (await r.json()) as {
        calculation?: { id: string };
        error?: string;
      };

      if (!r.ok) {
        toast.error(j.error ?? "Kalkulation konnte nicht erstellt werden.");
        return;
      }

      const newId = j.calculation?.id;
      if (!newId) {
        toast.error("Ungültige Antwort vom Server.");
        return;
      }

      toast.success("Kalkulation erstellt");
      setDialogOffen(false);
      setCreateTitel("");
      setCreateProjektId("none");
      setCreateQuick(false);
      router.push(`/kalkulation/${newId}`);
    } catch {
      toast.error("Netzwerkfehler");
    } finally {
      setCreateLaden(false);
    }
  }, [createTitel, createProjektId, createQuick, router]);

  const zeilenClick = useCallback(
    (id: string) => {
      router.push(`/kalkulation/${id}`);
    },
    [router]
  );

  const filterLeiste = useMemo(
    () => (
      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-3">
        <Input
          placeholder="Kalkulation suchen..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="max-w-xs border-zinc-700 bg-zinc-800/80 text-zinc-100 placeholder:text-zinc-600 focus:border-zinc-500 focus:ring-0"
        />
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as StatusFilter)}
        >
          <SelectTrigger className="w-[180px] border-zinc-700 bg-zinc-800/80 text-zinc-100 focus:ring-0">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent className="border-zinc-800 bg-zinc-900 text-zinc-100">
            <SelectItem value="alle">Alle (ohne Archiv)</SelectItem>
            <SelectItem value="entwurf">Entwurf</SelectItem>
            <SelectItem value="aktiv">Aktiv</SelectItem>
            <SelectItem value="archiviert">Archiviert</SelectItem>
          </SelectContent>
        </Select>
        {statusFilter === "alle" ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn(
              "text-zinc-400 transition-colors hover:text-zinc-200",
              showArchived && "bg-zinc-800 text-zinc-200"
            )}
            onClick={() => setShowArchived((v) => !v)}
          >
            Archivierte anzeigen
          </Button>
        ) : null}
      </div>
    ),
    [searchInput, statusFilter, showArchived]
  );

  return (
    <div className="mx-auto min-h-0 max-w-6xl bg-zinc-950 px-4 pb-8 pt-4">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-50">Kalkulationen</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Erstelle und verwalte Angebotskalkulationen
          </p>
        </div>
        <Button
          type="button"
          className="shrink-0 rounded-xl bg-zinc-100 px-4 py-2 text-zinc-900 transition-colors hover:bg-zinc-200"
          onClick={() => setDialogOffen(true)}
        >
          <Plus size={18} className="mr-2" />
          Neue Kalkulation
        </Button>
      </div>

      {filterLeiste}

      {fehler ? (
        <p className="mb-4 text-sm text-red-400">{fehler}</p>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900">
        {laden ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 rounded-xl bg-zinc-800" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div className="flex min-h-[300px] flex-col items-center justify-center gap-3 px-4 text-center">
            <FileText size={48} className="text-zinc-700" aria-hidden />
            <p className="font-medium text-zinc-400">Noch keine Kalkulationen</p>
            <p className="max-w-sm text-sm text-zinc-600">
              Erstelle deine erste Kalkulation und starte mit der Positionsplanung
            </p>
            <Button
              type="button"
              className="mt-1 rounded-xl bg-zinc-100 text-zinc-900 transition-colors hover:bg-zinc-200"
              onClick={() => setDialogOffen(true)}
            >
              <Plus size={18} className="mr-2" />
              Erste Kalkulation erstellen
            </Button>
          </div>
        ) : (
          <Table className="border-0">
            <TableHeader>
              <TableRow className="border-zinc-800 hover:bg-transparent">
                <TableHead className="bg-zinc-800/50 text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Titel
                </TableHead>
                <TableHead className="bg-zinc-800/50 text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Status
                </TableHead>
                <TableHead className="bg-zinc-800/50 text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Projekt
                </TableHead>
                <TableHead className="bg-zinc-800/50 text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Erstellt
                </TableHead>
                <TableHead className="w-[200px] bg-zinc-800/50 text-right text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Aktionen
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow
                  key={row.id}
                  className="group cursor-pointer border-zinc-800 transition-colors hover:bg-zinc-800/40"
                  onClick={() => zeilenClick(row.id)}
                >
                  <TableCell className="font-medium text-zinc-100">
                    {row.title}
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={cn(
                        "px-2.5 py-1 text-xs font-medium",
                        statusBadgeClass(row.status)
                      )}
                    >
                      {statusLabel(row.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-zinc-500">
                    {row.project_id && row.projects?.title
                      ? row.projects.title
                      : "—"}
                  </TableCell>
                  <TableCell className="text-zinc-400">
                    {format(parseISO(row.created_at), "dd.MM.yyyy", {
                      locale: de,
                    })}
                  </TableCell>
                  <TableCell className="text-right">
                    <div
                      className="flex justify-end gap-2 opacity-0 transition-opacity group-hover:opacity-100"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Link
                        href={`/kalkulation/${row.id}`}
                        className={cn(
                          buttonVariants({ variant: "ghost", size: "sm" }),
                          "text-zinc-300 transition-colors"
                        )}
                        onClick={(e) => e.stopPropagation()}
                      >
                        Öffnen
                      </Link>
                      {row.status !== "archiviert" ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-zinc-500 transition-colors hover:text-zinc-300"
                          onClick={() => void archivieren(row.id)}
                        >
                          Archivieren
                        </Button>
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog open={dialogOffen} onOpenChange={setDialogOffen}>
        <DialogContent className="border-zinc-800 bg-zinc-900 text-zinc-100">
          <DialogHeader>
            <DialogTitle className="font-bold">Neue Kalkulation</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label
                htmlFor="kalk-titel"
                className="mb-1 block text-sm text-zinc-400"
              >
                Titel *
              </Label>
              <Input
                id="kalk-titel"
                value={createTitel}
                onChange={(e) => setCreateTitel(e.target.value)}
                placeholder="z. B. Elektro Neubau Musterstraße"
                className="rounded-xl border-zinc-700 bg-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus:border-zinc-500 focus:ring-0"
              />
            </div>
            <div>
              <Label className="mb-1 block text-sm text-zinc-400">
                Projekt verknüpfen (optional)
              </Label>
              <Select
                value={createProjektId}
                onValueChange={(v) => setCreateProjektId(v ?? "none")}
                disabled={projekteLaden}
              >
                <SelectTrigger className="rounded-xl border-zinc-700 bg-zinc-800 text-zinc-100 focus:ring-0">
                  <SelectValue
                    placeholder={projekteLaden ? "Lade …" : "Kein Projekt"}
                  />
                </SelectTrigger>
                <SelectContent className="border-zinc-800 bg-zinc-900 text-zinc-100">
                  <SelectItem value="none">Kein Projekt</SelectItem>
                  {projektOptionen.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {projekteFehler ? (
                <p className="mt-1 text-xs text-red-400">{projekteFehler}</p>
              ) : null}
              {!projekteLaden && projektOptionen.length === 0 && !projekteFehler ? (
                <p className="mt-1 text-xs text-zinc-500">
                  Keine aktiven Projekte vorhanden
                </p>
              ) : null}
            </div>
            <label
              htmlFor="kalk-quick"
              className={cn(
                "flex cursor-pointer items-start gap-3 rounded-xl border border-zinc-800 bg-zinc-800/50 p-3 transition-colors hover:border-zinc-600"
              )}
            >
              <Checkbox
                id="kalk-quick"
                checked={createQuick}
                onCheckedChange={(c) => setCreateQuick(c === true)}
                className="mt-0.5 border-zinc-600"
              />
              <div>
                <span className="text-sm font-medium text-zinc-200">
                  Schnellkalkulation (Quick Mode)
                </span>
                <p className="mt-1 text-xs text-zinc-500">
                  Für schnelle Telefonschätzungen ohne vollständige Kalkulation
                </p>
              </div>
            </label>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              className="rounded-xl border-zinc-700 bg-transparent text-zinc-200 transition-colors"
              onClick={() => setDialogOffen(false)}
            >
              Abbrechen
            </Button>
            <Button
              type="button"
              disabled={createLaden}
              className="rounded-xl bg-zinc-100 text-zinc-900 transition-colors hover:bg-zinc-200"
              onClick={() => void kalkulationErstellen()}
            >
              {createLaden ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Wird erstellt …
                </>
              ) : (
                "Kalkulation erstellen"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

// ─── Typen (lokal, analog F2) ─────────────────────────────────────────────────

export type PositionType =
  | "arbeit"
  | "material"
  | "pauschal"
  | "fremdleistung"
  | "nachlass";

export type CalculationPosition = {
  id: string;
  calculation_id: string;
  trade_category_id: string | null;
  position_type: PositionType;
  sort_order: number;
  title: string;
  details: Record<string, unknown>;
  line_total_net: number | null;
  library_item_id: string | null;
  trade_categories: { id: string; name: string } | null;
};

export type TradeCategory = { id: string; name: string };

type HistoryConfidence = "hoch" | "mittel" | "niedrig" | "keine_daten";

type HistoryEstimate = {
  avg_hours: number | null;
  min_hours: number | null;
  max_hours: number | null;
  data_points: number;
  confidence: HistoryConfidence;
};

export type PositionDetailModalProps = {
  positionId: string | null;
  calculationId: string;
  positions: CalculationPosition[];
  tradeCategories: TradeCategory[];
  onClose: () => void;
  onUpdate: (
    id: string,
    updates: Partial<CalculationPosition> & {
      details?: Record<string, unknown>;
    }
  ) => void;
  onSave: () => void;
};

// ─── Hilfen ───────────────────────────────────────────────────────────────────

function formatEuro(n: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(n);
}

function positionTypeBadgeClass(type: PositionType): string {
  switch (type) {
    case "arbeit":
      return "bg-sky-900/50 text-sky-300 border border-sky-800";
    case "material":
      return "bg-amber-900/50 text-amber-300 border border-amber-800";
    case "pauschal":
      return "bg-violet-900/50 text-violet-300 border border-violet-800";
    case "fremdleistung":
      return "bg-orange-900/50 text-orange-300 border border-orange-800";
    case "nachlass":
      return "bg-rose-900/50 text-rose-300 border border-rose-800";
    default:
      return "bg-zinc-800 text-zinc-400";
  }
}

/** Details aus API → lokale Draft-Werte (Zahlen als String für leere Inputs). */
function detailsToDraft(d: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...d };
  for (const k of Object.keys(out)) {
    const v = out[k];
    if (typeof v === "number") out[k] = String(v);
    else if (v === null || v === undefined) out[k] = "";
  }
  return out;
}

function parseOptNumber(raw: unknown): number | undefined {
  const s = String(raw ?? "").trim().replace(",", ".");
  if (s === "") return undefined;
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : undefined;
}

function buildDetailsForSave(
  positionType: PositionType,
  draft: Record<string, unknown>
): Record<string, unknown> {
  const o: Record<string, unknown> = {};

  const copyStr = (k: string) => {
    const v = draft[k];
    if (v === undefined || v === null || String(v).trim() === "") return;
    o[k] = typeof v === "string" ? v : String(v);
  };

  switch (positionType) {
    case "arbeit": {
      copyStr("taetigkeit");
      copyStr("einheit");
      const m = parseOptNumber(draft.menge);
      const st = parseOptNumber(draft.stundensatz);
      const stunden = parseOptNumber(draft.stunden);
      if (m !== undefined) o.menge = m;
      if (st !== undefined) o.stundensatz = st;
      if (stunden !== undefined) o.stunden = stunden;
      return o;
    }
    case "material": {
      copyStr("artikelnummer");
      copyStr("bezeichnung");
      const menge = parseOptNumber(draft.menge);
      const ek = parseOptNumber(draft.ek_preis);
      const auf = parseOptNumber(draft.aufschlag_pct);
      const vk = parseOptNumber(draft.vk_preis);
      if (menge !== undefined) o.menge = menge;
      if (ek !== undefined) o.ek_preis = ek;
      if (auf !== undefined) o.aufschlag_pct = auf;
      if (vk !== undefined) o.vk_preis = vk;
      return o;
    }
    case "pauschal": {
      copyStr("beschreibung");
      const b = parseOptNumber(draft.betrag);
      if (b !== undefined) o.betrag = b;
      return o;
    }
    case "fremdleistung": {
      copyStr("subunternehmer_name");
      copyStr("leistungsbeschreibung");
      const b = parseOptNumber(draft.betrag);
      const auf = parseOptNumber(draft.aufschlag_pct);
      if (b !== undefined) o.betrag = b;
      if (auf !== undefined) o.aufschlag_pct = auf;
      return o;
    }
    case "nachlass": {
      const mode = draft.mode;
      if (mode === "pct" || mode === "fix") o.mode = mode;
      const w = parseOptNumber(draft.wert);
      if (w !== undefined) o.wert = w;
      return o;
    }
    default:
      return draft;
  }
}

function confidenceBannerClass(c: HistoryConfidence): string {
  switch (c) {
    case "hoch":
      return "border-emerald-800 bg-emerald-950/50";
    case "mittel":
      return "border-yellow-800 bg-yellow-950/50";
    case "niedrig":
      return "border-zinc-700 bg-zinc-800/50";
    default:
      return "border-zinc-700 bg-zinc-800/50";
  }
}

// ─── Komponente ───────────────────────────────────────────────────────────────

export function PositionDetailModal({
  positionId,
  calculationId,
  positions,
  tradeCategories,
  onClose,
  onUpdate,
  onSave,
}: PositionDetailModalProps) {
  void calculationId;
  const [draft, setDraft] = useState<Record<string, unknown>>({});
  const [draftTitle, setDraftTitle] = useState("");
  const [draftTradeCategory, setDraftTradeCategory] = useState("");
  const [draftLineTotal, setDraftLineTotal] = useState("");
  const [historyEstimate, setHistoryEstimate] = useState<HistoryEstimate | null>(
    null
  );
  const [historyLaden, setHistoryLaden] = useState(false);
  const [historyFehler, setHistoryFehler] = useState<string | null>(null);

  const pos = positionId ? positions.find((p) => p.id === positionId) : undefined;

  /** GET history-estimate — nur Aufruf von hier, kein eigener State außerhalb. */
  const fetchHistoryEstimate = useCallback(async (tradeCategoryId: string, taskTitle: string) => {
    setHistoryLaden(true);
    setHistoryFehler(null);
    try {
      const params = new URLSearchParams({
        trade_category_id: tradeCategoryId,
      });
      if (taskTitle.trim()) {
        params.set("task_description", taskTitle.trim());
      }
      const res = await fetch(`/api/calculations/history-estimate?${params.toString()}`);
      if (!res.ok) {
        throw new Error("request failed");
      }
      const data = (await res.json()) as HistoryEstimate;
      setHistoryEstimate(data);
    } catch {
      setHistoryFehler("Keine Historik verfügbar");
      setHistoryEstimate(null);
    } finally {
      setHistoryLaden(false);
    }
  }, []);

  useEffect(() => {
    if (!positionId) return;
    const p = positions.find((x) => x.id === positionId);
    if (!p) return;

    setDraftTitle(p.title);
    setDraftTradeCategory(p.trade_category_id ?? "");
    setDraftLineTotal(p.line_total_net != null ? String(p.line_total_net) : "");
    setDraft(detailsToDraft({ ...p.details }));
    setHistoryEstimate(null);
    setHistoryFehler(null);

    if (p.position_type === "arbeit" && p.trade_category_id) {
      void fetchHistoryEstimate(p.trade_category_id, p.title);
    }
    // Nur bei geöffneter anderer Position neu initialisieren — nicht bei jedem positions-Update.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- positions bewusst nur zum Lesen beim Öffnen
  }, [positionId, fetchHistoryEstimate]);

  const pt = pos?.position_type;

  const applyHistoryAvg = (avg: number) => {
    const s = String(avg);
    setDraft((d) => ({ ...d, stunden: s, menge: s }));
    toast.success("Vorschlag übernommen");
  };

  const handleSpeichern = () => {
    if (!pos) return;
    const details = buildDetailsForSave(pos.position_type, draft);
    const line =
      draftLineTotal.trim() === ""
        ? null
        : parseFloat(draftLineTotal.trim().replace(",", "."));
    const line_total_net =
      line !== undefined && Number.isFinite(line) ? line : null;

    onUpdate(pos.id, {
      title: draftTitle.trim() || pos.title,
      trade_category_id: draftTradeCategory ? draftTradeCategory : null,
      details,
      line_total_net,
    });
    onSave();
    onClose();
    toast.success("Position gespeichert");
  };

  const berechnetArbeit =
    pt === "arbeit"
      ? (() => {
          const m = parseOptNumber(draft.menge);
          const st = parseOptNumber(draft.stundensatz);
          if (m === undefined || st === undefined) return null;
          return m * st;
        })()
      : null;

  const berechnetFremd =
    pt === "fremdleistung"
      ? (() => {
          const b = parseOptNumber(draft.betrag);
          const pct = parseOptNumber(draft.aufschlag_pct) ?? 0;
          if (b === undefined) return null;
          return b * (1 + pct / 100);
        })()
      : null;

  const nachlassMode =
    draft.mode === "fix" ? "fix" : "pct";

  return (
    <Dialog
      open={positionId !== null}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent
        className="max-h-[90vh] max-w-2xl overflow-y-auto border-zinc-800 bg-zinc-900 text-zinc-100"
      >
        <DialogHeader>
          <DialogTitle>Position editieren</DialogTitle>
          <DialogDescription className="sr-only">
            {pos ? `${pos.position_type}: ${pos.title}` : "Position"}
          </DialogDescription>
          {pos && (
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Badge
                variant="outline"
                className={cn("text-xs", positionTypeBadgeClass(pos.position_type))}
              >
                {pos.position_type}
              </Badge>
              <span className="text-sm text-zinc-400">{pos.title}</span>
            </div>
          )}
        </DialogHeader>

        {!pos ? null : (
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-zinc-400">Bezeichnung / Tätigkeit</Label>
              <Input
                className="border-zinc-700 bg-zinc-950"
                value={draftTitle}
                onChange={(e) => setDraftTitle(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-zinc-400">Gewerk</Label>
              <Select
                value={draftTradeCategory || "__none__"}
                onValueChange={(v) => {
                  const next = !v || v === "__none__" ? "" : v;
                  setDraftTradeCategory(next);
                  if (pt === "arbeit" && next) {
                    void fetchHistoryEstimate(next, draftTitle);
                  } else if (pt === "arbeit" && !next) {
                    setHistoryEstimate(null);
                    setHistoryFehler(null);
                  }
                }}
              >
                <SelectTrigger className="border-zinc-700 bg-zinc-950">
                  <SelectValue placeholder="Kein Gewerk" />
                </SelectTrigger>
                <SelectContent className="border-zinc-800 bg-zinc-900">
                  <SelectItem value="__none__">Kein Gewerk</SelectItem>
                  {tradeCategories.map((tc) => (
                    <SelectItem key={tc.id} value={tc.id}>
                      {tc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-zinc-400">Gesamtbetrag (überschreibt Berechnung)</Label>
              <Input
                type="text"
                inputMode="decimal"
                className="border-zinc-700 bg-zinc-950"
                placeholder="Leer lassen für automatische Berechnung"
                value={draftLineTotal}
                onChange={(e) => setDraftLineTotal(e.target.value)}
              />
              <p className="text-xs text-zinc-500">
                Wenn gesetzt, wird dieser Betrag direkt verwendet
              </p>
            </div>

            {pt === "arbeit" && (
              <>
                <div className="space-y-2">
                  <Label className="text-zinc-400">Tätigkeit</Label>
                  <Input
                    className="border-zinc-700 bg-zinc-950"
                    value={String(draft.taetigkeit ?? "")}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, taetigkeit: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-zinc-400">Einheit</Label>
                  <Input
                    className="border-zinc-700 bg-zinc-950"
                    placeholder="Std"
                    value={String(draft.einheit ?? "")}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, einheit: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-zinc-400">Menge / Stunden</Label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    className="border-zinc-700 bg-zinc-950"
                    value={String(draft.menge ?? "")}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, menge: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-zinc-400">Stundensatz (€/Std)</Label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    className="border-zinc-700 bg-zinc-950"
                    value={String(draft.stundensatz ?? "")}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, stundensatz: e.target.value }))
                    }
                  />
                </div>

                {historyLaden && <Skeleton className="h-10 rounded-xl bg-zinc-800" />}

                {!historyLaden &&
                  historyEstimate &&
                  historyEstimate.data_points > 0 &&
                  historyEstimate.confidence !== "keine_daten" && (
                    <div
                      className={cn(
                        "rounded-xl border p-3",
                        confidenceBannerClass(historyEstimate.confidence)
                      )}
                    >
                      <p className="text-xs text-zinc-400">
                        📊 KI-Vorschlag aus {historyEstimate.data_points} Projekten
                      </p>
                      <p className="mt-1 text-sm font-medium text-zinc-200">
                        Ø {historyEstimate.avg_hours != null ? historyEstimate.avg_hours.toFixed(1) : "—"}h
                        {"  "}| Min{" "}
                        {historyEstimate.min_hours != null ? historyEstimate.min_hours.toFixed(1) : "—"}h
                        {"  "}| Max{" "}
                        {historyEstimate.max_hours != null ? historyEstimate.max_hours.toFixed(1) : "—"}h
                      </p>
                      {historyEstimate.avg_hours != null && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="mt-2 h-7 text-xs"
                          onClick={() => applyHistoryAvg(historyEstimate.avg_hours!)}
                        >
                          Übernehmen
                        </Button>
                      )}
                    </div>
                  )}

                {historyFehler && (
                  <p className="text-xs italic text-zinc-500">{historyFehler}</p>
                )}

                <p className="text-sm text-zinc-400">
                  Berechnet:{" "}
                  {berechnetArbeit != null
                    ? `${formatEuro(berechnetArbeit)} (Menge × Stundensatz)`
                    : "—"}
                </p>
              </>
            )}

            {pt === "material" && (
              <>
                <div className="space-y-2">
                  <Label className="text-zinc-400">Artikelnummer</Label>
                  <Input
                    className="border-zinc-700 bg-zinc-950"
                    value={String(draft.artikelnummer ?? "")}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, artikelnummer: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-zinc-400">Bezeichnung</Label>
                  <Input
                    className="border-zinc-700 bg-zinc-950"
                    value={String(draft.bezeichnung ?? "")}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, bezeichnung: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-zinc-400">Menge</Label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    className="border-zinc-700 bg-zinc-950"
                    value={String(draft.menge ?? "")}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, menge: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-zinc-400">Einkaufspreis (€)</Label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    className="border-zinc-700 bg-zinc-950"
                    value={String(draft.ek_preis ?? "")}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, ek_preis: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-zinc-400">Aufschlag %</Label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    className="border-zinc-700 bg-zinc-950"
                    value={String(draft.aufschlag_pct ?? "")}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, aufschlag_pct: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-zinc-400">Verkaufspreis (€)</Label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    className="border-zinc-700 bg-zinc-950"
                    value={String(draft.vk_preis ?? "")}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, vk_preis: e.target.value }))
                    }
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => {
                      const ek = parseOptNumber(draft.ek_preis);
                      const pct = parseOptNumber(draft.aufschlag_pct) ?? 0;
                      if (ek === undefined) {
                        toast.error("EK-Preis erforderlich");
                        return;
                      }
                      const vk = ek * (1 + pct / 100);
                      setDraft((d) => ({ ...d, vk_preis: String(vk) }));
                    }}
                  >
                    Auto-berechnen
                  </Button>
                </div>
              </>
            )}

            {pt === "pauschal" && (
              <>
                <div className="space-y-2">
                  <Label className="text-zinc-400">Beschreibung</Label>
                  <Textarea
                    rows={3}
                    className="border-zinc-700 bg-zinc-950"
                    value={String(draft.beschreibung ?? "")}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, beschreibung: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-zinc-400">Pauschalbetrag (€)</Label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    className="border-zinc-700 bg-zinc-950"
                    value={String(draft.betrag ?? "")}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, betrag: e.target.value }))
                    }
                  />
                </div>
              </>
            )}

            {pt === "fremdleistung" && (
              <>
                <div className="space-y-2">
                  <Label className="text-zinc-400">Subunternehmer</Label>
                  <Input
                    className="border-zinc-700 bg-zinc-950"
                    value={String(draft.subunternehmer_name ?? "")}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        subunternehmer_name: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-zinc-400">Leistungsbeschreibung</Label>
                  <Textarea
                    rows={3}
                    className="border-zinc-700 bg-zinc-950"
                    value={String(draft.leistungsbeschreibung ?? "")}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        leistungsbeschreibung: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-zinc-400">Fremdleistungsbetrag (€)</Label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    className="border-zinc-700 bg-zinc-950"
                    value={String(draft.betrag ?? "")}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, betrag: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-zinc-400">Aufschlag %</Label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    className="border-zinc-700 bg-zinc-950"
                    value={String(draft.aufschlag_pct ?? "")}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, aufschlag_pct: e.target.value }))
                    }
                  />
                </div>
                <p className="text-sm text-zinc-400">
                  Gesamt:{" "}
                  {berechnetFremd != null
                    ? `${formatEuro(berechnetFremd)} (mit Aufschlag)`
                    : "—"}
                </p>
              </>
            )}

            {pt === "nachlass" && (
              <>
                <div className="space-y-2">
                  <Label className="text-zinc-400">Modus</Label>
                  <Select
                    value={nachlassMode}
                    onValueChange={(v) =>
                      setDraft((d) => ({
                        ...d,
                        mode: v === "fix" ? "fix" : "pct",
                      }))
                    }
                  >
                    <SelectTrigger className="border-zinc-700 bg-zinc-950">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="border-zinc-800 bg-zinc-900">
                      <SelectItem value="pct">Prozentualer Nachlass</SelectItem>
                      <SelectItem value="fix">Fixer Betrag</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-zinc-400">
                    {nachlassMode === "pct" ? "Nachlass (%)" : "Nachlass (€)"}
                  </Label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    className="border-zinc-700 bg-zinc-950"
                    value={String(draft.wert ?? "")}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, wert: e.target.value }))
                    }
                  />
                </div>
                <p className="text-xs text-zinc-500">
                  Nachlässe werden von der Nettosumme abgezogen
                </p>
              </>
            )}
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={onClose}>
            Abbrechen
          </Button>
          <Button type="button" onClick={handleSpeichern} disabled={!pos}>
            Speichern
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

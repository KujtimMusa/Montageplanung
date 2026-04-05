"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

function formatEuro(n: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(n);
}

function safeFilenamePart(s: string): string {
  return s.replace(/[/\\?%*:|"<>]/g, "-").slice(0, 80) || "Kalkulation";
}

const SECTION_KEYS = [
  { key: "zahlungsbedingungen", label: "Zahlungsbedingungen" },
  { key: "gewaehrleistung", label: "Gewährleistung" },
  { key: "agb", label: "AGB-Verweis" },
  { key: "ausschluesse", label: "Ausschlüsse & Voraussetzungen" },
] as const;

export type OfferModalProps = {
  open: boolean;
  calculationId: string;
  calculationTitle: string;
  nettoGesamt: number;
  bruttoGesamt: number;
  onClose: () => void;
};

export function OfferModal({
  open,
  calculationId,
  calculationTitle,
  nettoGesamt,
  bruttoGesamt,
  onClose,
}: OfferModalProps) {
  const [positionDisplay, setPositionDisplay] = useState<"detail" | "aggregiert">(
    "detail"
  );
  const [includeSections, setIncludeSections] = useState<string[]>([
    "zahlungsbedingungen",
    "gewaehrleistung",
  ]);
  const [validityDays, setValidityDays] = useState(30);
  const [introText, setIntroText] = useState("");
  const [laden, setLaden] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setPositionDisplay("detail");
    setIncludeSections(["zahlungsbedingungen", "gewaehrleistung"]);
    setValidityDays(30);
    setIntroText("");
    setFehler(null);
    setLaden(false);
  }, [open]);

  const toggleSection = (key: string) => {
    setIncludeSections((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const handleGenerate = async () => {
    setLaden(true);
    setFehler(null);
    try {
      const res = await fetch(
        `/api/calculations/${calculationId}/generate-offer`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            position_display: positionDisplay,
            include_sections: includeSections,
            validity_days: validityDays,
            intro_text: introText.trim() || undefined,
          }),
        }
      );

      const contentType = res.headers.get("content-type");

      if (contentType?.includes("application/pdf")) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        const version = res.headers.get("X-Offer-Version") ?? "1";
        const titlePart = safeFilenamePart(calculationTitle);
        a.download = `Angebot-${titlePart}-V${version}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
        toast.success("Angebot wurde heruntergeladen");
        onClose();
        return;
      }

      let data: { error?: string } = {};
      try {
        data = (await res.json()) as { error?: string };
      } catch {
        data = {};
      }
      setFehler(data.error ?? "PDF konnte nicht generiert werden");
    } catch {
      setFehler("Netzwerkfehler beim Generieren");
    } finally {
      setLaden(false);
    }
  };

  const mwst = nettoGesamt * 0.19;

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogContent className="max-w-lg border-zinc-800 bg-zinc-900 text-zinc-100">
        <DialogHeader>
          <DialogTitle>Angebot generieren</DialogTitle>
          <DialogDescription className="text-zinc-500">
            PDF wird auf Basis der aktuellen Kalkulation erstellt
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-1">
          <div className="space-y-2">
            <Label className="text-zinc-400">Positionsdarstellung im Angebot</Label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPositionDisplay("detail")}
                className={cn(
                  "flex-1 rounded-xl border py-2 text-sm transition-colors",
                  positionDisplay === "detail"
                    ? "border-zinc-500 bg-zinc-700 text-zinc-100"
                    : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-600"
                )}
              >
                Detailauflistung
              </button>
              <button
                type="button"
                onClick={() => setPositionDisplay("aggregiert")}
                className={cn(
                  "flex-1 rounded-xl border py-2 text-sm transition-colors",
                  positionDisplay === "aggregiert"
                    ? "border-zinc-500 bg-zinc-700 text-zinc-100"
                    : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-600"
                )}
              >
                Nach Gewerk zusammengefasst
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-zinc-400">Enthaltene Klauseln</Label>
            <div className="grid grid-cols-2 gap-2">
              {SECTION_KEYS.map(({ key, label }) => (
                <label
                  key={key}
                  className="flex cursor-pointer items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-950/50 px-2 py-2 text-sm text-zinc-300 hover:border-zinc-700"
                >
                  <Checkbox
                    checked={includeSections.includes(key)}
                    onCheckedChange={() => toggleSection(key)}
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-zinc-400">Angebot gültig bis</Label>
            <Select
              value={String(validityDays)}
              onValueChange={(v) => setValidityDays(Number(v))}
            >
              <SelectTrigger className="border-zinc-700 bg-zinc-950">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-zinc-800 bg-zinc-900">
                <SelectItem value="14">14 Tage</SelectItem>
                <SelectItem value="30">30 Tage</SelectItem>
                <SelectItem value="60">60 Tage</SelectItem>
                <SelectItem value="90">90 Tage</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-zinc-400">Einleitungstext (optional)</Label>
            <Textarea
              rows={4}
              placeholder={
                "Sehr geehrte Damen und Herren,\nvielen Dank für Ihre Anfrage..."
              }
              value={introText}
              onChange={(e) => setIntroText(e.target.value)}
              className="resize-none border-zinc-700 bg-zinc-800 text-zinc-200 placeholder:text-zinc-600"
            />
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
            <div className="flex justify-between text-sm">
              <span className="text-zinc-400">Nettobetrag</span>
              <span className="text-zinc-200">{formatEuro(nettoGesamt)}</span>
            </div>
            <div className="mt-1 flex justify-between text-sm">
              <span className="text-zinc-400">MwSt. 19%</span>
              <span className="text-zinc-400">{formatEuro(mwst)}</span>
            </div>
            <div className="my-2 border-t border-zinc-800" />
            <div className="flex justify-between">
              <span className="text-sm font-semibold text-zinc-100">Bruttobetrag</span>
              <span className="text-base font-bold text-zinc-50">
                {formatEuro(bruttoGesamt)}
              </span>
            </div>
          </div>

          {fehler && (
            <div className="rounded-xl border border-red-900 bg-red-950/50 p-3 text-sm text-red-400">
              {fehler}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={onClose} disabled={laden}>
            Abbrechen
          </Button>
          <Button
            type="button"
            disabled={laden}
            onClick={() => void handleGenerate()}
          >
            {laden ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Wird generiert…
              </>
            ) : (
              <>📄 PDF herunterladen</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

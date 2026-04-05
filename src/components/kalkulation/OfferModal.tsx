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

const INTRO_TEMPLATES: { label: string; text: string }[] = [
  {
    label: "Standard",
    text:
      "Sehr geehrte Damen und Herren,\n\nvielen Dank für Ihre Anfrage. Gerne unterbreiten wir Ihnen nachfolgend unser Angebot für die beschriebene Leistung. Bei Rückfragen stehen wir Ihnen jederzeit zur Verfügung.\n\nMit freundlichen Grüßen",
  },
  {
    label: "Kurz",
    text:
      "Sehr geehrte Damen und Herren,\n\nanbei erhalten Sie unser Angebot gemäß Besprechung.\n\nMit freundlichen Grüßen",
  },
  {
    label: "Sanierung",
    text:
      "Sehr geehrte Damen und Herren,\n\nvielen Dank für das Vertrauen in unsere Firma. Das Angebot umfasst die ausführlich beschriebenen Leistungen. Termine und Details abstimmen wir nach Auftragserteilung.\n\nMit freundlichen Grüßen",
  },
];

const STORAGE_SNIPPETS = "kalkulation-offer-intro-snippets";

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
  const [savedSnippets, setSavedSnippets] = useState<string[]>([]);
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
    try {
      const raw = localStorage.getItem(STORAGE_SNIPPETS);
      if (raw) {
        const parsed = JSON.parse(raw) as unknown;
        if (Array.isArray(parsed)) {
          setSavedSnippets(
            parsed.filter((x): x is string => typeof x === "string").slice(0, 12)
          );
        }
      } else {
        setSavedSnippets([]);
      }
    } catch {
      setSavedSnippets([]);
    }
  }, [open]);

  const persistSnippet = (text: string) => {
    const t = text.trim();
    if (t.length < 8) {
      toast.error("Text zu kurz zum Speichern");
      return;
    }
    const next = [t, ...savedSnippets.filter((s) => s !== t)].slice(0, 12);
    setSavedSnippets(next);
    try {
      localStorage.setItem(STORAGE_SNIPPETS, JSON.stringify(next));
      toast.success("Textbaustein gespeichert");
    } catch {
      toast.error("Speichern nicht möglich");
    }
  };

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
                    ? "border-zinc-800 bg-zinc-700 text-zinc-100 ring-2 ring-zinc-400"
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
                    ? "border-zinc-800 bg-zinc-700 text-zinc-100 ring-2 ring-zinc-400"
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
              {SECTION_KEYS.map(({ key, label }) => {
                const active = includeSections.includes(key);
                return (
                  <label
                    key={key}
                    className={cn(
                      "flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-left text-sm text-zinc-300 transition-colors",
                      active
                        ? "border-zinc-500 bg-zinc-800"
                        : "border-zinc-800 bg-zinc-900 hover:border-zinc-700"
                    )}
                  >
                    <Checkbox
                      checked={active}
                      onCheckedChange={() => toggleSection(key)}
                      className="mt-0.5"
                    />
                    <span>{label}</span>
                  </label>
                );
              })}
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
            <div className="flex flex-wrap gap-1.5">
              {INTRO_TEMPLATES.map((tpl) => (
                <button
                  key={tpl.label}
                  type="button"
                  className="rounded-full border border-zinc-700 bg-zinc-900 px-2.5 py-1 text-[11px] text-zinc-400 transition-colors hover:border-zinc-500 hover:text-zinc-200"
                  onClick={() => setIntroText(tpl.text)}
                >
                  {tpl.label}
                </button>
              ))}
              {savedSnippets.map((s, i) => (
                <button
                  key={`sv-${i}`}
                  type="button"
                  title="Gespeicherter Textbaustein"
                  className="max-w-[10rem] truncate rounded-full border border-zinc-700 bg-zinc-900 px-2.5 py-1 text-[11px] text-zinc-400 transition-colors hover:border-zinc-500 hover:text-zinc-200"
                  onClick={() => setIntroText(s)}
                >
                  {s.slice(0, 24)}
                  {s.length > 24 ? "…" : ""}
                </button>
              ))}
            </div>
            <Textarea
              rows={5}
              placeholder={
                "Sehr geehrte Damen und Herren,\nvielen Dank für Ihre Anfrage..."
              }
              value={introText}
              onChange={(e) => setIntroText(e.target.value)}
              className="resize-none border-zinc-700 bg-zinc-800 text-zinc-200 placeholder:text-zinc-600"
            />
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 text-xs text-zinc-500"
                onClick={() => persistSnippet(introText)}
                disabled={introText.trim().length < 8}
              >
                Aktuellen Text als Vorlage speichern
              </Button>
            </div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
            <p className="text-xs text-zinc-500">Angebotssumme</p>
            <p className="mt-1 text-2xl font-bold text-zinc-50">
              {formatEuro(bruttoGesamt)}
            </p>
            <div className="mt-4 flex justify-between text-sm">
              <span className="text-zinc-400">Nettobetrag</span>
              <span className="text-zinc-200">{formatEuro(nettoGesamt)}</span>
            </div>
            <div className="mt-1 flex justify-between text-sm">
              <span className="text-zinc-400">MwSt. 19%</span>
              <span className="text-zinc-400">{formatEuro(mwst)}</span>
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

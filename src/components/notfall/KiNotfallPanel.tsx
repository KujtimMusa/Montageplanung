"use client";

import { Bot, Copy, MessageCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import type { KiNotfallAntwort } from "@/types/notfall-ki";

type Props = {
  kiLaed: boolean;
  kiStream: string;
  kiAntwort: KiNotfallAntwort | null;
  onNeuAnalysieren: () => void;
  kommunikationWhatsapp?: string | null;
};

export function KiNotfallPanel({
  kiLaed,
  kiStream,
  kiAntwort,
  onNeuAnalysieren,
  kommunikationWhatsapp,
}: Props) {
  const showStream = kiLaed && kiStream.length > 0 && !kiAntwort;

  async function kopiere(text: string) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="flex h-full min-h-[480px] flex-col overflow-hidden rounded-2xl border border-violet-800/30 bg-violet-950/20 lg:min-h-[calc(100vh-220px)]">
      <div className="flex shrink-0 items-center gap-2 border-b border-violet-800/20 p-4">
        <div className="rounded-lg bg-violet-500/20 p-1.5">
          <Bot size={16} className="text-violet-400" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-violet-200">
            KI-Notfall-Assistent
          </p>
          <p className="text-[10px] text-violet-400/60">Powered by Gemini</p>
        </div>
        {kiLaed ? (
          <div className="flex items-center gap-1.5">
            <div className="size-1.5 animate-pulse rounded-full bg-violet-400" />
            <span className="text-[10px] text-violet-400">analysiert…</span>
          </div>
        ) : null}
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="p-4">
          {!kiAntwort && !kiLaed && (
            <div className="flex flex-col items-center justify-center py-12 text-violet-800/90">
              <Bot size={40} className="mb-3 text-violet-700" />
              <p className="max-w-[260px] text-center text-sm text-violet-700/90">
                Wähle einen ausgefallenen Mitarbeiter und klicke „Notfall
                analysieren“ — ich erstelle sofort einen Plan.
              </p>
            </div>
          )}

          {kiLaed && !kiStream && !kiAntwort && (
            <div className="space-y-2 p-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton
                  key={i}
                  className="h-4 rounded bg-violet-900/30"
                  style={{ width: `${70 + i * 5}%` }}
                />
              ))}
              <p className="mt-3 animate-pulse text-xs text-violet-500">
                Analysiere Einsätze, verfügbare Kräfte und Qualifikationen…
              </p>
            </div>
          )}

          {showStream && (
            <pre className="whitespace-pre-wrap break-words font-mono text-[11px] leading-relaxed text-violet-200/80">
              {kiStream}
            </pre>
          )}

          {kiAntwort && (
            <div className="space-y-4">
              <div className="rounded-xl border border-violet-800/30 bg-violet-900/30 p-3">
                <p className="mb-1 text-xs font-semibold text-violet-300">
                  KI-Analyse
                </p>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-violet-100">
                  {kiAntwort.zusammenfassung}
                </p>
              </div>

              {kiAntwort.empfehlungen?.map((emp, i) => (
                <div
                  key={`${emp.einsatzId}-${i}`}
                  className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3"
                >
                  <div className="mb-1.5 flex items-center gap-2">
                    <div className="flex size-6 items-center justify-center rounded-full bg-zinc-700 text-[10px] font-bold text-zinc-300">
                      {emp.name.charAt(0)}
                    </div>
                    <p className="text-sm font-semibold text-zinc-200">
                      {emp.name}
                    </p>
                    <Badge className="ml-auto bg-emerald-500/20 text-[10px] text-emerald-400">
                      Empfohlen
                    </Badge>
                  </div>
                  <p className="text-xs leading-relaxed text-zinc-500">
                    {emp.begruendung}
                  </p>
                  <p className="mt-1 text-[10px] text-zinc-700">
                    Für: {emp.einsatz}
                  </p>
                </div>
              ))}

              {kiAntwort.risiken?.length > 0 ? (
                <div className="rounded-xl border border-orange-800/30 bg-orange-950/30 p-3">
                  <p className="mb-1.5 text-xs font-semibold text-orange-400">
                    Risiko-Hinweise
                  </p>
                  {kiAntwort.risiken.map((r, i) => (
                    <p key={i} className="text-xs leading-relaxed text-orange-200/70">
                      • {r}
                    </p>
                  ))}
                </div>
              ) : null}

              {kiAntwort.kommunikation ? (
                <div className="rounded-xl border border-blue-800/30 bg-blue-950/30 p-3">
                  <p className="mb-1.5 text-xs font-semibold text-blue-400">
                    Empfohlene Benachrichtigung
                  </p>
                  <p className="whitespace-pre-wrap text-xs text-blue-200/70">
                    {kiAntwort.kommunikation}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 border-blue-800 text-[10px] text-blue-400 hover:bg-blue-900/30"
                      onClick={() => void kopiere(kiAntwort.kommunikation)}
                    >
                      <Copy size={10} className="mr-1" /> Kopieren
                    </Button>
                    {kommunikationWhatsapp ? (
                      <a
                        href={`https://wa.me/${kommunikationWhatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(kiAntwort.kommunikation)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-7 border-green-800 text-[10px] text-green-400 hover:bg-green-900/30"
                        >
                          <MessageCircle size={10} className="mr-1" /> WhatsApp
                        </Button>
                      </a>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </ScrollArea>

      {kiAntwort ? (
        <div className="shrink-0 border-t border-violet-800/20 p-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full border-violet-800 text-xs text-violet-400 hover:bg-violet-900/30"
            onClick={onNeuAnalysieren}
            disabled={kiLaed}
          >
            <RefreshCw size={12} className="mr-1.5" /> Neu analysieren
          </Button>
        </div>
      ) : null}
    </div>
  );
}

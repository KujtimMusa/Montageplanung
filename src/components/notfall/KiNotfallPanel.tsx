"use client";

import { Bot, Copy, MessageCircle, RefreshCw } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { KiNotfallAntwort } from "@/types/notfall-ki";

type Props = {
  kiLaed: boolean;
  kiStream: string;
  kiAntwort: KiNotfallAntwort | null;
  onNeuAnalysieren: () => void;
  kommunikationWhatsapp?: string | null;
};

function KINachricht({
  text,
  typ,
}: {
  text: string;
  typ: "ki" | "system";
}) {
  return (
    <div
      className={cn(
        "rounded-2xl px-4 py-3 text-sm leading-relaxed",
        typ === "ki"
          ? "border border-zinc-700/50 bg-zinc-800/80 text-zinc-300"
          : "border border-zinc-800/50 bg-zinc-900 text-zinc-500"
      )}
    >
      <ReactMarkdown
        components={{
          p: ({ children }) => (
            <p className="mb-2 text-sm leading-relaxed last:mb-0">{children}</p>
          ),
          strong: ({ children }) => (
            <strong className="font-bold text-zinc-200">{children}</strong>
          ),
          ul: ({ children }) => (
            <ul className="my-2 list-none space-y-1">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="my-2 list-decimal space-y-1 pl-4">{children}</ol>
          ),
          li: ({ children }) => (
            <li className="flex items-start gap-2">
              <span className="mt-0.5 flex-shrink-0 text-zinc-600">·</span>
              <span>{children}</span>
            </li>
          ),
          h3: ({ children }) => (
            <h3 className="mt-3 mb-1.5 text-xs font-bold tracking-wider text-zinc-400 uppercase first:mt-0">
              {children}
            </h3>
          ),
          h2: ({ children }) => (
            <h2 className="mt-3 mb-1.5 text-sm font-bold text-zinc-200 first:mt-0">
              {children}
            </h2>
          ),
          code: ({ children }) => (
            <code className="rounded bg-zinc-900 px-1.5 py-0.5 font-mono text-xs text-zinc-400">
              {children}
            </code>
          ),
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}

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
    <div className="flex h-full min-h-[480px] flex-col overflow-hidden rounded-2xl border border-zinc-800/60 bg-zinc-900 lg:min-h-[calc(100vh-108px)]">
      <div className="flex shrink-0 items-center gap-2.5 border-b border-zinc-800/60 p-4">
        <div className="flex size-8 items-center justify-center rounded-xl border border-zinc-700 bg-zinc-800">
          <Bot size={16} className="text-zinc-400" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-zinc-200">KI-Notfall-Assistent</p>
          <p className="text-xs text-zinc-600">Powered by Gemini</p>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <div
            className={cn(
              "size-1.5 rounded-full",
              kiLaed ? "animate-pulse bg-amber-500" : "animate-pulse bg-emerald-500"
            )}
          />
          <span className="text-xs text-zinc-600">
            {kiLaed ? "Analyse…" : "Aktiv"}
          </span>
        </div>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-3 p-4">
          {!kiAntwort && !kiLaed && (
            <div className="flex flex-col items-center justify-center gap-3 py-12">
              <div className="flex size-12 items-center justify-center rounded-2xl border border-zinc-700 bg-zinc-800">
                <Bot size={22} className="text-zinc-600" />
              </div>
              <p className="max-w-[240px] text-center text-xs text-zinc-600">
                Wähle einen ausgefallenen Mitarbeiter — ich analysiere sofort
                alle betroffenen Einsätze und schlage die besten Ersatzkräfte
                vor.
              </p>
            </div>
          )}

          {kiLaed && !kiStream && !kiAntwort && (
            <div className="space-y-2 p-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton
                  key={i}
                  className="h-4 rounded bg-zinc-800"
                  style={{ width: `${70 + i * 5}%` }}
                />
              ))}
              <p className="mt-3 animate-pulse text-xs text-zinc-500">
                Analysiere Einsätze und verfügbare Kräfte…
              </p>
            </div>
          )}

          {showStream ? (
            <>
              <KINachricht text={kiStream} typ="ki" />
              <div className="flex w-fit gap-1 rounded-2xl border border-zinc-700/50 bg-zinc-800/80 px-4 py-3">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="size-1.5 animate-bounce rounded-full bg-zinc-500"
                    style={{ animationDelay: `${i * 150}ms` }}
                  />
                ))}
              </div>
            </>
          ) : null}

          {kiAntwort ? (
            <div className="space-y-4">
              <div>
                <p className="mb-2 text-xs font-semibold text-zinc-500">
                  KI-Analyse
                </p>
                <KINachricht text={kiAntwort.zusammenfassung} typ="ki" />
              </div>

              {kiAntwort.empfehlungen?.map((emp, i) => (
                <div
                  key={`${emp.einsatzId}-${i}`}
                  className="rounded-xl border border-zinc-800 bg-zinc-800/40 p-3"
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
                  <KINachricht text={emp.begruendung} typ="system" />
                  <p className="mt-2 text-[10px] text-zinc-600">
                    Für: {emp.einsatz}
                  </p>
                </div>
              ))}

              {kiAntwort.risiken?.length ? (
                <div className="rounded-xl border border-orange-900/40 bg-orange-950/25 p-3">
                  <p className="mb-1.5 text-xs font-semibold text-orange-400">
                    Risiko-Hinweise
                  </p>
                  {kiAntwort.risiken.map((r, i) => (
                    <p
                      key={i}
                      className="text-xs leading-relaxed text-orange-200/80"
                    >
                      • {r}
                    </p>
                  ))}
                </div>
              ) : null}

              {kiAntwort.kommunikation ? (
                <div className="rounded-xl border border-blue-900/40 bg-blue-950/25 p-3">
                  <p className="mb-1.5 text-xs font-semibold text-blue-400">
                    Empfohlene Benachrichtigung
                  </p>
                  <KINachricht
                    text={kiAntwort.kommunikation}
                    typ="system"
                  />
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 border-zinc-700 text-[10px] text-zinc-300 hover:bg-zinc-800"
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
                          className="h-7 border-zinc-700 text-[10px] text-emerald-400 hover:bg-zinc-800"
                        >
                          <MessageCircle size={10} className="mr-1" /> WhatsApp
                        </Button>
                      </a>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </ScrollArea>

      {kiAntwort ? (
        <div className="shrink-0 border-t border-zinc-800/60 p-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full border-zinc-700 text-xs text-zinc-300 hover:bg-zinc-800"
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

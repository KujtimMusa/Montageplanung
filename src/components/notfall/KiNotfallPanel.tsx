"use client";

import { Bot, Loader2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { KiNotfallAntwort } from "@/types/notfall-ki";

type Props = {
  kiLaed: boolean;
  kiStream: string;
  kiAntwort: KiNotfallAntwort | null;
  onNeuAnalysieren: () => void;
  ausgewaehlterErsatz: Record<string, string>;
  onErsatzWaehlen: (einsatzId: string, mitarbeiterId: string) => void;
};

export function KiNotfallPanel(props: Props) {
  const { kiLaed, kiStream, kiAntwort, onNeuAnalysieren } = props;
  void props.ausgewaehlterErsatz;
  void props.onErsatzWaehlen;
  const antwortText = kiAntwort ? JSON.stringify(kiAntwort, null, 2) : "";

  return (
    <div className="flex h-[220px] flex-row overflow-hidden rounded-2xl border border-zinc-800/60 bg-zinc-900">
      <div className="flex w-56 flex-shrink-0 flex-col justify-between border-r border-zinc-800/60 p-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg border border-zinc-700/60 bg-zinc-800">
            <Bot size={13} className="text-zinc-400" />
          </div>
          <div>
            <p className="text-sm font-semibold tracking-tight text-zinc-200">
              KI-Notfall-Assistent
            </p>
            <p className="text-xs text-zinc-500">Powered by Gemini</p>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-1.5">
          <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
          <span className="text-xs text-zinc-500">Aktiv</span>
        </div>

        {kiAntwort && (
          <button
            onClick={onNeuAnalysieren}
            className="mt-3 rounded-lg border border-zinc-700/50 bg-zinc-800 px-2.5 py-1.5 text-xs text-zinc-400 transition-all hover:border-zinc-600 hover:text-zinc-200"
          >
            Neu analysieren
          </button>
        )}
      </div>

      <ScrollArea className="h-full min-w-0 flex-1">
        <div className="p-4">
          {kiLaed && !kiStream && (
            <div className="flex items-center gap-2 text-sm text-zinc-500">
              <Loader2 size={13} className="animate-spin" />
              Analysiere Einsätze…
            </div>
          )}

          {kiStream && (
            <div className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-300">
              {kiStream}
              <span className="ml-0.5 inline-block h-3.5 w-1.5 animate-pulse rounded-sm bg-zinc-400 align-middle" />
            </div>
          )}

          {kiAntwort && !kiStream && (
            <pre className="whitespace-pre-wrap text-xs leading-relaxed text-zinc-300">
              {antwortText}
            </pre>
          )}

          {!kiLaed && !kiStream && !kiAntwort && (
            <p className="text-sm text-zinc-600">
              Wähle einen ausgefallenen Mitarbeiter — ich analysiere sofort alle
              betroffenen Einsätze und schlage die besten Ersatzkräfte vor.
            </p>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

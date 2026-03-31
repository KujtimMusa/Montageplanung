"use client";

import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { KiNotfallAntwort } from "@/types/notfall-ki";

interface Props {
  kiLaed: boolean;
  kiStream: string;
  kiAntwort: string | KiNotfallAntwort | null;
  onNeuAnalysieren: () => void;
  ausgewaehlterErsatz?: Record<string, string>;
  onErsatzWaehlen: (einsatzId: string, mitarbeiterId: string) => void;
}

export function KiNotfallPanel({
  kiLaed,
  kiStream,
  kiAntwort,
  onNeuAnalysieren,
}: Props) {
  let analyse: KiNotfallAntwort | null = null;
  if (kiAntwort) {
    if (typeof kiAntwort === "string") {
      try {
        analyse = JSON.parse(kiAntwort) as KiNotfallAntwort;
      } catch {
        analyse = null;
      }
    } else {
      analyse = kiAntwort;
    }
  }

  return (
    <div
      className="flex flex-row overflow-hidden rounded-2xl border border-zinc-800/60 bg-zinc-900"
      style={{ minHeight: "120px", maxHeight: "200px" }}
    >
      <div className="flex w-48 flex-shrink-0 flex-col justify-between border-r border-zinc-800/60 p-4">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg border border-zinc-700/60 bg-zinc-800">
            <Bot size={13} className="text-zinc-400" />
          </div>
          <div>
            <p className="text-xs font-semibold leading-tight text-zinc-200">
              KI-Notfall-Assistent
            </p>
            <p className="text-[10px] text-zinc-500">Powered by Gemini</p>
          </div>
        </div>

        <div className="mt-3 flex flex-col gap-2">
          <div className="flex items-center gap-1.5">
            <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
            <span className="text-[10px] text-zinc-500">Aktiv</span>
          </div>
          {kiAntwort && (
            <button
              onClick={onNeuAnalysieren}
              className="flex items-center gap-1 rounded-lg border border-zinc-700/50 bg-zinc-800 px-2 py-1 text-[10px] text-zinc-400 transition-all hover:border-zinc-600 hover:text-zinc-200"
            >
              <RefreshCw size={9} />
              Neu analysieren
            </button>
          )}
        </div>
      </div>

      <ScrollArea className="h-full min-w-0 flex-1">
        <div className="p-4">
          {kiLaed && !kiStream && (
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <Loader2 size={12} className="animate-spin" />
              Analysiere Einsätze…
            </div>
          )}

          {kiStream && !analyse && (
            <p className="text-xs leading-relaxed text-zinc-400">
              {kiStream}
              <span className="ml-0.5 inline-block h-3 w-1 animate-pulse rounded-sm bg-zinc-400 align-middle" />
            </p>
          )}

          {analyse && (
            <div className="space-y-2">
              {analyse.zusammenfassung && (
                <p className="mb-3 text-xs leading-relaxed text-zinc-400">
                  {analyse.zusammenfassung}
                </p>
              )}

              {analyse.einsaetze?.map((einsatz) => {
                const bester = einsatz.vorschlaege
                  ?.filter((v) => !v.konflikt && v.verfuegbar)
                  ?.sort((a, b) => b.score - a.score)[0];

                return (
                  <div
                    key={einsatz.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-zinc-700/40 bg-zinc-800/60 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium text-zinc-300">
                        {einsatz.projekt}
                      </p>
                      {bester ? (
                        <p className="mt-0.5 text-[10px] text-zinc-500">
                          Empfehlung:
                          <span className="ml-1 text-zinc-300">{bester.name}</span>
                          <span className="ml-1 text-emerald-500">
                            {bester.score}%
                          </span>
                        </p>
                      ) : (
                        <p className="mt-0.5 text-[10px] text-amber-500">
                          Kein Ersatz verfügbar
                        </p>
                      )}
                    </div>
                    {bester ? (
                      <CheckCircle2
                        size={14}
                        className="flex-shrink-0 text-emerald-500"
                      />
                    ) : (
                      <AlertTriangle
                        size={14}
                        className="flex-shrink-0 text-amber-500"
                      />
                    )}
                  </div>
                );
              })}

              {analyse.sofortmassnahme && (
                <p className="mt-2 border-t border-zinc-800/60 pt-2 text-[10px] text-zinc-600">
                  💡 {analyse.sofortmassnahme}
                </p>
              )}
            </div>
          )}

          {!kiLaed && !kiStream && !kiAntwort && (
            <p className="text-xs text-zinc-600">
              Wähle einen ausgefallenen Mitarbeiter — ich analysiere sofort alle
              betroffenen Einsätze und schlage die besten Ersatzkräfte vor.
            </p>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

"use client";

import {
  AlertCircle,
  AlertTriangle,
  Bot,
  CalendarX,
  Check,
  RefreshCw,
  Users,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { KiNotfallAntwort } from "@/types/notfall-ki";

type Props = {
  kiLaed: boolean;
  kiStream: string;
  kiAntwort: KiNotfallAntwort | null;
  onNeuAnalysieren: () => void;
  ausgewaehlterErsatz: Record<string, string>;
  onErsatzWaehlen: (einsatzId: string, mitarbeiterId: string) => void;
};

export function KiNotfallPanel({
  kiLaed,
  kiStream,
  kiAntwort,
  onNeuAnalysieren,
  ausgewaehlterErsatz,
  onErsatzWaehlen,
}: Props) {
  const showStream = kiLaed && kiStream.length > 0 && !kiAntwort;

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
              <div className="flex items-center gap-2 rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-3">
                <div className="flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="size-1.5 animate-bounce rounded-full bg-zinc-500"
                      style={{ animationDelay: `${i * 150}ms` }}
                    />
                  ))}
                </div>
                <span className="text-xs text-zinc-500">KI analysiert…</span>
              </div>
            </>
          ) : null}

          {kiAntwort ? (
            <div className="space-y-3 overflow-y-auto">
              {/* LAGE */}
              <div className="rounded-xl bg-zinc-800/60 border border-zinc-700/50 p-3.5">
                <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                  Lage
                </p>
                <p className="text-sm text-zinc-300 leading-relaxed">
                  {kiAntwort.zusammenfassung}
                </p>
              </div>

              {/* SOFORTMASSNAHME */}
              <div className="rounded-xl bg-amber-950/40 border border-amber-800/50 p-3.5">
                <div className="flex items-start gap-2.5">
                  <Zap
                    size={14}
                    className="text-amber-400 mt-0.5 flex-shrink-0"
                  />
                  <div>
                    <p className="text-[10px] font-semibold text-amber-500 uppercase tracking-wider mb-1">
                      Sofortmaßnahme
                    </p>
                    <p className="text-sm font-semibold text-amber-200 leading-relaxed">
                      {kiAntwort.sofortmassnahme}
                    </p>
                  </div>
                </div>
              </div>

              {/* EINSÄTZE + VORSCHLÄGE */}
              {kiAntwort.einsaetze?.map((einsatz, i) => (
                <div
                  key={einsatz.id ?? i}
                  className="rounded-xl bg-zinc-900 border border-zinc-800/60 overflow-hidden"
                >
                  {/* Einsatz-Header */}
                  <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-zinc-800/60 bg-zinc-800/30">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-1.5 h-1.5 rounded-full"
                        style={{
                          background:
                            einsatz.dringlichkeit === "hoch"
                              ? "#f59e0b"
                              : "#f59e0b",
                        }}
                      />
                      <p className="text-sm font-bold text-zinc-200">
                        {einsatz.projekt}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-zinc-600 tabular-nums">
                        {einsatz.datum}
                      </span>
                      <span
                        className={cn(
                          "text-[10px] font-bold px-2 py-0.5 rounded-full",
                          einsatz.dringlichkeit === "hoch"
                            ? "bg-amber-950/60 text-amber-400 border border-amber-900/50"
                            : "bg-amber-950/60 text-amber-400 border border-amber-900/50"
                        )}
                      >
                        {einsatz.dringlichkeit === "hoch"
                          ? "Dringend"
                          : "Normal"}
                      </span>
                    </div>
                  </div>

                  {/* Vorschläge */}
                  <div className="p-2.5 space-y-1.5">
                    <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-wider mb-2 px-1">
                      KI-Vorschläge
                    </p>

                    {einsatz.vorschlaege?.map((v, j) => (
                      <div
                        key={v.mitarbeiter_id ?? j}
                        onClick={() =>
                          onErsatzWaehlen(einsatz.id, v.mitarbeiter_id)
                        }
                        className={cn(
                          "flex items-center gap-2.5 px-3 py-2.5 rounded-lg border transition-all cursor-pointer",
                          ausgewaehlterErsatz?.[einsatz.id] ===
                            v.mitarbeiter_id
                            ? "border-emerald-700/60 bg-emerald-950/30"
                            : "border-zinc-800/60 bg-zinc-800/20 hover:border-zinc-700"
                        )}
                      >
                        {/* Rang */}
                        <div
                          className={cn(
                            "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0",
                            j === 0
                              ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                              : "bg-zinc-800 text-zinc-600 border border-zinc-700"
                          )}
                        >
                          {j + 1}
                        </div>

                        {/* Avatar */}
                        <div className="w-7 h-7 rounded-full bg-zinc-700 border border-zinc-600 flex items-center justify-center text-[10px] font-bold text-zinc-300 flex-shrink-0">
                          {v.name?.slice(0, 2).toUpperCase()}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="text-sm font-semibold text-zinc-200">
                              {v.name}
                            </p>
                            {v.konflikt && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-950/60 border border-amber-900/50 text-amber-400">
                                Konflikt
                              </span>
                            )}
                            {!v.verfuegbar && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-500">
                                Nicht frei
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-zinc-600 truncate">
                            {v.grund}
                          </p>
                        </div>

                        {/* Score + Auswahl */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <div className="text-right">
                            <p
                              className="text-sm font-bold tabular-nums"
                              style={{
                                color:
                                  v.score >= 70
                                    ? "#10b981"
                                    : v.score > 0
                                      ? "#f59e0b"
                                      : "#52525b",
                              }}
                            >
                              {v.score > 0 ? `${v.score}%` : "–"}
                            </p>
                            <p className="text-[9px] text-zinc-700">
                              Match
                            </p>
                          </div>

                          <div
                            className={cn(
                              "w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all",
                              ausgewaehlterErsatz?.[einsatz.id] ===
                                v.mitarbeiter_id
                                ? "border-emerald-500 bg-emerald-500"
                                : "border-zinc-700"
                            )}
                          >
                            {ausgewaehlterErsatz?.[einsatz.id] ===
                              v.mitarbeiter_id && (
                              <Check size={9} className="text-white" />
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {/* WARNUNGEN */}
              {kiAntwort.warnungen?.length > 0 && (
                <div className="rounded-xl border border-zinc-800/60 overflow-hidden">
                  <div className="px-3.5 py-2 bg-zinc-800/30 border-b border-zinc-800/60">
                    <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
                      Risikohinweise
                    </p>
                  </div>
                  <div className="p-2.5 space-y-1.5">
                    {kiAntwort.warnungen.map((w, idx) => {
                      const cfg =
                        {
                          personalengpass: {
                            icon: Users,
                            color: "#f59e0b",
                            bg: "bg-amber-950/30",
                            border: "border-amber-900/40",
                          },
                          konflikt: {
                            icon: AlertTriangle,
                            color: "#f59e0b",
                            bg: "bg-amber-950/30",
                            border: "border-amber-900/40",
                          },
                          abwesenheit: {
                            icon: CalendarX,
                            color: "#f59e0b",
                            bg: "bg-amber-950/30",
                            border: "border-amber-900/40",
                          },
                        }[w.typ] ?? {
                          icon: AlertCircle,
                          color: "#f59e0b",
                          bg: "bg-amber-950/30",
                          border: "border-amber-900/40",
                        };

                      const Icon = cfg.icon;
                      return (
                        <div
                          key={idx}
                          className={cn(
                            "flex items-start gap-2.5 px-3 py-2.5 rounded-lg border",
                            cfg.bg,
                            cfg.border
                          )}
                        >
                          <Icon
                            size={13}
                            className="mt-0.5 flex-shrink-0"
                            style={{ color: cfg.color }}
                          />
                          <p className="text-xs text-zinc-400 leading-relaxed">
                            {w.text}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
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

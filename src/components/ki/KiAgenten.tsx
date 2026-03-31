"use client";

import {
  AlertTriangle,
  BarChart2,
  CalendarDays,
  Cloud,
  Copy,
  FileText,
  Lightbulb,
  Loader2,
  Sparkles,
} from "lucide-react";
import { useCallback, useState, type ComponentProps } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { KiAction, KiStrukturierteAgentAntwort } from "@/types/ki-actions";

type AgentDef = {
  id: string;
  titel: string;
  beschreibung: string;
  icon: "calendar" | "alert" | "chart" | "file" | "cloud" | "lightbulb";
  api: string;
  buttonLabel: string;
};

const AGENTEN: AgentDef[] = [
  {
    id: "planungsoptimierer",
    api: "/api/agents/planning",
    titel: "Planungsoptimierer",
    beschreibung:
      "Analysiert offene Projekte und schlägt optimale Team-Zuweisung vor",
    icon: "calendar",
    buttonLabel: "Analyse starten",
  },
  {
    id: "konflikt-resolver",
    api: "/api/agents/conflict",
    titel: "Konflikt-Resolver",
    beschreibung:
      "Findet alle Planungskonflikte und erstellt Lösungsvorschläge",
    icon: "alert",
    buttonLabel: "Konflikte scannen",
  },
  {
    id: "kapazitaetsplaner",
    api: "/api/agents/capacity",
    titel: "Kapazitätsplaner",
    beschreibung:
      "Zeigt Auslastung pro Team, Engpässe und freie Kapazitäten",
    icon: "chart",
    buttonLabel: "Kapazität analysieren",
  },
  {
    id: "wochenbericht",
    api: "/api/agents/weekly",
    titel: "Wochenbericht",
    beschreibung: "Erstellt automatisch einen vollständigen Wochenbericht",
    icon: "file",
    buttonLabel: "Bericht erstellen",
  },
  {
    id: "wettercheck",
    api: "/api/agents/weather",
    titel: "Wetter-Prüfer",
    beschreibung:
      "Prüft Wetter für geplante Außeneinsätze und warnt bei Risiken",
    icon: "cloud",
    buttonLabel: "Wetter prüfen",
  },
  {
    id: "lernassistent",
    api: "/api/agents/learning",
    titel: "Optimierungshinweise",
    beschreibung:
      "Lernt aus vergangenen Einsätzen und gibt Optimierungshinweise",
    icon: "lightbulb",
    buttonLabel: "Hinweise laden",
  },
];

async function kopiereText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success("In Zwischenablage kopiert.");
  } catch {
    toast.error("Kopieren fehlgeschlagen.");
  }
}

function AgentErgebnis({
  daten,
  onAktion,
}: {
  daten: KiStrukturierteAgentAntwort;
  onAktion: (a: KiAction) => Promise<void>;
}) {
  const [ausgefuehrt, setAusgefuehrt] = useState<
    Record<number, "pending" | "ok" | "fehler">
  >({});
  const mdComponentsKompakt = {
    p: (props: ComponentProps<"p">) => (
      <p className="my-1 text-xs leading-relaxed text-zinc-400" {...props} />
    ),
    table: (props: ComponentProps<"table">) => (
      <div className="my-1 overflow-x-auto">
        <table className="w-full border-collapse text-[11px]" {...props} />
      </div>
    ),
    th: (props: ComponentProps<"th">) => (
      <th className="border-b border-zinc-700/60 px-2 py-1 text-left text-zinc-500" {...props} />
    ),
    td: (props: ComponentProps<"td">) => (
      <td className="border-b border-zinc-800/40 px-2 py-1 text-zinc-300" {...props} />
    ),
  };

  return (
    <div className="mt-3 space-y-3 border-t border-zinc-800/40 pt-3">
      <p className="text-xs font-medium text-zinc-400">{daten.zusammenfassung}</p>

      {daten.abschnitte?.map((ab, i) => (
        <div key={i}>
          <div className="mb-1.5 flex items-center gap-2">
            {(ab.typ === "kritisch" || ab.typ === "warnung") && (
              <AlertTriangle
                size={11}
                className={ab.typ === "kritisch" ? "text-red-400" : "text-amber-500"}
              />
            )}
            {ab.typ === "erfolg" && (
              <span className="text-[11px] text-emerald-500">OK</span>
            )}
            <p
              className={
                ab.typ === "kritisch"
                  ? "text-[11px] font-semibold text-red-400"
                  : ab.typ === "warnung"
                    ? "text-[11px] font-semibold text-amber-500"
                    : ab.typ === "erfolg"
                      ? "text-[11px] font-semibold text-emerald-500"
                      : "text-[11px] font-semibold text-zinc-400"
              }
            >
              {ab.ueberschrift}
            </p>
          </div>
          <div className="pl-4 text-xs text-zinc-400">
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponentsKompakt}>
              {ab.inhalt}
            </ReactMarkdown>
          </div>
        </div>
      ))}

      {daten.aktionen?.length > 0 && (
        <div className="space-y-2 border-t border-zinc-800/40 pt-2">
          <p className="text-[10px] uppercase tracking-wider text-zinc-600">
            Direkt ausführen
          </p>
          {daten.aktionen.map((a, i) => {
            const state = ausgefuehrt[i];
            return (
              <button
                key={i}
                disabled={Boolean(state)}
                onClick={async () => {
                  setAusgefuehrt((p) => ({ ...p, [i]: "pending" }));
                  try {
                    await onAktion(a);
                    setAusgefuehrt((p) => ({ ...p, [i]: "ok" }));
                  } catch {
                    setAusgefuehrt((p) => ({ ...p, [i]: "fehler" }));
                  }
                }}
                className={
                  state === "ok"
                    ? "w-full rounded-xl border border-emerald-900/40 bg-emerald-950/30 px-3 py-2 text-left text-xs text-emerald-500"
                    : state === "fehler"
                      ? "w-full rounded-xl border border-red-900/40 bg-red-950/30 px-3 py-2 text-left text-xs text-red-400"
                      : "w-full rounded-xl border border-zinc-700/40 bg-zinc-800/40 px-3 py-2 text-left text-xs text-zinc-300 hover:bg-zinc-800/80"
                }
              >
                {state === "pending" ? "..." : state === "ok" ? "OK " : state === "fehler" ? "X " : "⚡ "}
                {a.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function AgentIcon({ name }: { name: AgentDef["icon"] }) {
  const props = { size: 14, className: "text-violet-400" };
  const icons = {
    calendar: <CalendarDays {...props} />,
    alert: <AlertTriangle {...props} />,
    chart: <BarChart2 {...props} />,
    file: <FileText {...props} />,
    cloud: <Cloud {...props} />,
    lightbulb: <Lightbulb {...props} />,
  };
  return icons[name] ?? <Sparkles {...props} />;
}

function AgentKarte({
  agent,
  laed,
  ergebnis,
  onStart,
  onAktion,
}: {
  agent: AgentDef;
  laed: boolean;
  ergebnis: KiStrukturierteAgentAntwort | null;
  onStart: () => void;
  onAktion: (a: KiAction) => Promise<void>;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-800/60 bg-zinc-900 transition-colors hover:border-zinc-700/60">
      <div className="p-4 pb-3">
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl border border-zinc-700/60 bg-zinc-800">
            <AgentIcon name={agent.icon} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold tracking-tight text-zinc-100">
              {agent.titel}
            </p>
            <p className="mt-0.5 text-xs leading-relaxed text-zinc-500">
              {agent.beschreibung}
            </p>
          </div>
        </div>
      </div>

      {ergebnis && (
        <div className="max-h-40 overflow-y-auto px-4 pb-3">
          <AgentErgebnis daten={ergebnis} onAktion={onAktion} />
        </div>
      )}

      <div className="px-4 pb-4">
        <button
          onClick={onStart}
          disabled={laed}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-violet-500/20 bg-violet-600/10 px-3 py-2 text-xs font-medium text-violet-400 transition-all duration-150 hover:border-violet-500/30 hover:bg-violet-600/20 hover:text-violet-300 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {laed ? (
            <>
              <Loader2 size={12} className="animate-spin" />
              Analysiere…
            </>
          ) : (
            <>
              <Sparkles size={12} />
              {agent.buttonLabel}
            </>
          )}
        </button>
      </div>
    </div>
  );
}

export function KiAgenten() {
  const [ergebnis, setErgebnis] = useState<Record<string, KiStrukturierteAgentAntwort>>({});
  const [laed, setLaed] = useState<Record<string, boolean>>({});

  async function aktionAusfuehren(a: KiAction) {
    const res = await fetch("/api/ki-actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: a }),
    });
    if (!res.ok) throw new Error("Aktion fehlgeschlagen");
  }

  const agentenStarten = useCallback(async (agent: AgentDef) => {
    setLaed((s) => ({ ...s, [agent.id]: true }));
    setErgebnis((s) => {
      const n = { ...s };
      delete n[agent.id];
      return n;
    });
    try {
      const init: RequestInit = {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      };
      if (agent.id === "wettercheck") {
        init.body = JSON.stringify({ lat: 50.1, lng: 8.68 });
      } else if (agent.id === "lernassistent") {
        init.body = JSON.stringify({});
      } else {
        init.body = JSON.stringify({});
      }

      const response = await fetch(agent.api, init);

      if (!response.ok) {
        toast.error(`${agent.titel} nicht erreichbar.`);
        return;
      }

      const json = (await response.json()) as KiStrukturierteAgentAntwort;
      setErgebnis((prev) => ({ ...prev, [agent.id]: json }));
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Netzwerkfehler.";
      toast.error(msg);
    } finally {
      setLaed((s) => ({ ...s, [agent.id]: false }));
    }
  }, []);

  return (
    <div className="grid grid-cols-1 gap-4 p-6 lg:grid-cols-2 xl:grid-cols-3">
      {AGENTEN.map((agent) => (
        <div key={agent.id} className="relative">
          <AgentKarte
            agent={agent}
            laed={Boolean(laed[agent.id])}
            ergebnis={ergebnis[agent.id] ?? null}
            onStart={() => void agentenStarten(agent)}
            onAktion={aktionAusfuehren}
          />
          {ergebnis[agent.id] ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="absolute right-4 top-4 h-7 w-7 border-zinc-700 bg-zinc-900 p-0 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
              onClick={() => void kopiereText(JSON.stringify(ergebnis[agent.id], null, 2))}
            >
              <Copy size={12} />
            </Button>
          ) : null}
        </div>
      ))}
    </div>
  );
}

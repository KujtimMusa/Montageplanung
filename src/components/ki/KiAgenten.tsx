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
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

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

function AgentErgebnis({ text }: { text: string }) {
  let parsed: Record<string, unknown> | null = null;
  try {
    parsed = JSON.parse(text) as Record<string, unknown>;
  } catch {
    parsed = null;
  }

  if (parsed) {
    return (
      <div className="mt-3 space-y-2">
        {Object.entries(parsed).map(([k, v]) => (
          <div
            key={k}
            className="rounded-xl border border-zinc-700/40 bg-zinc-800/60 px-3 py-2"
          >
            <p className="mb-1 text-[10px] uppercase tracking-wider text-zinc-500">
              {k.replace(/_/g, " ")}
            </p>
            <p className="text-xs leading-relaxed text-zinc-300">
              {typeof v === "string" ? v : JSON.stringify(v)}
            </p>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="mt-3 max-h-48 overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed text-zinc-300">
      {text}
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
}: {
  agent: AgentDef;
  laed: boolean;
  ergebnis: string;
  onStart: () => void;
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
          <AgentErgebnis text={ergebnis} />
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
  const [ergebnis, setErgebnis] = useState<Record<string, string>>({});
  const [laed, setLaed] = useState<Record<string, boolean>>({});

  const agentenStarten = useCallback(async (agent: AgentDef) => {
    setLaed((s) => ({ ...s, [agent.id]: true }));
    setErgebnis((s) => ({ ...s, [agent.id]: "" }));
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
      const ct = response.headers.get("content-type") ?? "";

      if (!response.ok) {
        if (ct.includes("application/json")) {
          const j = (await response.json()) as Record<string, unknown>;
          const msg =
            (typeof j.fehler === "string" && j.fehler) ||
            (typeof j.error === "string" && j.error) ||
            (typeof j.nachricht === "string" && j.nachricht) ||
            (typeof j.analyse === "string" && j.analyse) ||
            (typeof j.antwort === "string" && j.antwort) ||
            JSON.stringify(j);
          setErgebnis((prev) => ({ ...prev, [agent.id]: msg }));
          toast.info("Antwort ohne KI-Stream (Konfiguration prüfen).");
        } else {
          toast.error(`${agent.titel} nicht erreichbar.`);
        }
        return;
      }

      if (ct.includes("application/json")) {
        const j = await response.json();
        setErgebnis((prev) => ({
          ...prev,
          [agent.id]: JSON.stringify(j, null, 2),
        }));
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) {
        toast.error("Keine Antwort-Stream.");
        return;
      }
      const decoder = new TextDecoder();
      let text = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        text += decoder.decode(value, { stream: true });
        setErgebnis((prev) => ({ ...prev, [agent.id]: text }));
      }
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
            ergebnis={ergebnis[agent.id] ?? ""}
            onStart={() => void agentenStarten(agent)}
          />
          {ergebnis[agent.id] ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="absolute right-4 top-4 h-7 w-7 border-zinc-700 bg-zinc-900 p-0 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
              onClick={() => void kopiereText(ergebnis[agent.id])}
            >
              <Copy size={12} />
            </Button>
          ) : null}
        </div>
      ))}
    </div>
  );
}

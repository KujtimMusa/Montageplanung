"use client";

import {
  AlertTriangle,
  BarChart3,
  Calendar,
  Cloud,
  Copy,
  FileText,
  Lightbulb,
  Loader2,
  Zap,
} from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type AgentDef = {
  id: string;
  titel: string;
  beschreibung: string;
  icon: typeof Calendar;
  api: string;
  buttonText: string;
  farbe: keyof typeof FARBE;
};

const FARBE = {
  blue: {
    card: "border-blue-800/40 bg-blue-950/20",
    iconBg: "bg-blue-500/15",
    icon: "text-blue-400",
    btn: "bg-blue-600/90 hover:bg-blue-500",
  },
  orange: {
    card: "border-orange-800/40 bg-orange-950/20",
    iconBg: "bg-orange-500/15",
    icon: "text-orange-400",
    btn: "bg-orange-600/90 hover:bg-orange-500",
  },
  violet: {
    card: "border-violet-800/40 bg-violet-950/20",
    iconBg: "bg-violet-500/15",
    icon: "text-violet-400",
    btn: "bg-violet-600/90 hover:bg-violet-500",
  },
  emerald: {
    card: "border-emerald-800/40 bg-emerald-950/20",
    iconBg: "bg-emerald-500/15",
    icon: "text-emerald-400",
    btn: "bg-emerald-600/90 hover:bg-emerald-500",
  },
  sky: {
    card: "border-sky-800/40 bg-sky-950/20",
    iconBg: "bg-sky-500/15",
    icon: "text-sky-400",
    btn: "bg-sky-600/90 hover:bg-sky-500",
  },
  yellow: {
    card: "border-yellow-800/40 bg-yellow-950/30",
    iconBg: "bg-yellow-500/15",
    icon: "text-yellow-400",
    btn: "bg-yellow-600/90 hover:bg-yellow-500",
  },
} as const;

const AGENTEN: AgentDef[] = [
  {
    id: "planungsoptimierer",
    titel: "Planungsoptimierer",
    beschreibung:
      "Analysiert alle offenen Projekte und schlägt optimale Team-Zuweisungen vor",
    icon: Calendar,
    farbe: "blue",
    api: "/api/agents/planning",
    buttonText: "Analyse starten",
  },
  {
    id: "konflikt-resolver",
    titel: "Konflikt-Resolver",
    beschreibung:
      "Findet alle Planungskonflikte und erstellt Lösungsvorschläge",
    icon: AlertTriangle,
    farbe: "orange",
    api: "/api/agents/conflict",
    buttonText: "Konflikte scannen",
  },
  {
    id: "kapazitaetsplaner",
    titel: "Kapazitätsplaner",
    beschreibung:
      "Zeigt Auslastung pro Team, Engpässe und freie Kapazitäten",
    icon: BarChart3,
    farbe: "violet",
    api: "/api/agents/capacity",
    buttonText: "Kapazität analysieren",
  },
  {
    id: "wochenbericht",
    titel: "Wochenbericht",
    beschreibung: "Erstellt automatisch einen vollständigen Wochenbericht",
    icon: FileText,
    farbe: "emerald",
    api: "/api/agents/weekly",
    buttonText: "Bericht erstellen",
  },
  {
    id: "wettercheck",
    titel: "Wetter-Prüfer",
    beschreibung:
      "Prüft Wetter für geplante Außeneinsätze und warnt bei Risiken",
    icon: Cloud,
    farbe: "sky",
    api: "/api/agents/weather",
    buttonText: "Wetter prüfen",
  },
  {
    id: "lernassistent",
    titel: "Optimierungshinweise",
    beschreibung:
      "Lernt aus vergangenen Einsätzen und gibt Optimierungshinweise",
    icon: Lightbulb,
    farbe: "yellow",
    api: "/api/agents/learning",
    buttonText: "Hinweise laden",
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
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {AGENTEN.map((agent) => {
        const f = FARBE[agent.farbe];
        const Icon = agent.icon;
        return (
          <div
            key={agent.id}
            className={cn(
              "rounded-2xl border p-4 transition-all",
              f.card
            )}
          >
            <div className="mb-3 flex items-start gap-3">
              <div className={cn("rounded-xl p-2", f.iconBg)}>
                <Icon size={18} className={f.icon} />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-semibold text-zinc-200">
                  {agent.titel}
                </h3>
                <p className="mt-0.5 text-xs leading-relaxed text-zinc-500">
                  {agent.beschreibung}
                </p>
              </div>
            </div>

            {ergebnis[agent.id] ? (
              <div className="mb-3 max-h-48 overflow-y-auto rounded-xl border border-zinc-800 bg-zinc-950/50 p-3">
                <p className="whitespace-pre-wrap text-xs leading-relaxed text-zinc-300">
                  {ergebnis[agent.id]}
                </p>
              </div>
            ) : null}

            {laed[agent.id] && !ergebnis[agent.id] ? (
              <div className="mb-3 space-y-1.5">
                {[0, 1, 2].map((i) => (
                  <Skeleton
                    key={i}
                    className="h-3 bg-zinc-800"
                    style={{ width: `${80 - i * 10}%` }}
                  />
                ))}
              </div>
            ) : null}

            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                className={cn("h-8 flex-1 text-xs text-white", f.btn)}
                onClick={() => void agentenStarten(agent)}
                disabled={laed[agent.id]}
              >
                {laed[agent.id] ? (
                  <>
                    <Loader2 size={12} className="mr-1.5 animate-spin" />
                    Läuft…
                  </>
                ) : (
                  <>
                    <Zap size={12} className="mr-1.5" />
                    {agent.buttonText}
                  </>
                )}
              </Button>
              {ergebnis[agent.id] ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 w-8 shrink-0 border-zinc-700 p-0"
                  onClick={() => void kopiereText(ergebnis[agent.id])}
                >
                  <Copy size={12} />
                </Button>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}

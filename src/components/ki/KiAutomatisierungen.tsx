"use client";

import {
  AlertTriangle,
  Bell,
  Building2,
  Clock,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Switch } from "@/components/ui/switch";

const APP_KEY = "app";

type AutoRow = {
  id: string;
  dbSpalte: keyof DbRow;
  titel: string;
  beschreibung: string;
  Icon: typeof AlertTriangle;
  triggerLabel: string;
};

type DbRow = {
  automation_krankmeldung: boolean;
  automation_neuer_einsatz: boolean;
  automation_projekt_ueberfaellig: boolean;
  automation_dienstleister_absage: boolean;
};

const AUTOMATISIERUNGEN: AutoRow[] = [
  {
    id: "krankmeldung",
    dbSpalte: "automation_krankmeldung",
    titel: "Krankmeldung → Notfallplan",
    beschreibung:
      "Bei neuer Krankmeldung startet automatisch der KI-Notfallplan und sucht Ersatz",
    triggerLabel: "Bei Krankmeldung",
    Icon: AlertTriangle,
  },
  {
    id: "neuer_einsatz",
    dbSpalte: "automation_neuer_einsatz",
    titel: "Neuer Einsatz → Monteur benachrichtigen",
    beschreibung:
      "Generiert automatisch einen WhatsApp-Link wenn ein Einsatz zugewiesen wird",
    triggerLabel: "Bei Einsatz-Zuweisung",
    Icon: Bell,
  },
  {
    id: "projekt_ueberfaellig",
    dbSpalte: "automation_projekt_ueberfaellig",
    titel: "Projekt überfällig → Bereichsleiter",
    beschreibung:
      "Tägliche Prüfung: überfällige Projekte werden als Hinweis markiert",
    triggerLabel: "Täglich (Cron)",
    Icon: Clock,
  },
  {
    id: "dienstleister_absage",
    dbSpalte: "automation_dienstleister_absage",
    titel: "Dienstleister inaktiv → Notfallkarte",
    beschreibung:
      "Wenn ein Partner auf inaktiv gesetzt wird, erscheint ein Hinweis im Notfallplan",
    triggerLabel: "Bei Status-Änderung",
    Icon: Building2,
  },
];

export function KiAutomatisierungen() {
  const supabase = createClient();
  const [aktiv, setAktiv] = useState<Record<string, boolean>>({});
  const [letzterLog, setLetzterLog] = useState<Record<string, string | null>>({});
  const [lädt, setLädt] = useState(true);

  const laden = useCallback(async () => {
    setLädt(true);
    const { data, error } = await supabase
      .from("settings")
      .select(
        "id, automation_krankmeldung, automation_neuer_einsatz, automation_projekt_ueberfaellig, automation_dienstleister_absage"
      )
      .eq("key", APP_KEY)
      .maybeSingle();

    if (error) {
      toast.error(error.message);
      setLädt(false);
      return;
    }

    if (!data) {
      const insert: DbRow & { key: string; value: string } = {
        key: APP_KEY,
        value: "config",
        automation_krankmeldung: false,
        automation_neuer_einsatz: false,
        automation_projekt_ueberfaellig: false,
        automation_dienstleister_absage: false,
      };
      const { error: insErr } = await supabase.from("settings").insert(insert);
      if (insErr) {
        toast.error(insErr.message);
        setLädt(false);
        return;
      }
      setAktiv({
        krankmeldung: false,
        neuer_einsatz: false,
        projekt_ueberfaellig: false,
        dienstleister_absage: false,
      });
      setLädt(false);
      return;
    }

    const row = data as DbRow;
    const { data: logs } = await supabase
      .from("agent_log")
      .select("agent_type, created_at")
      .in("agent_type", [
        "automation_krankmeldung",
        "automation_neuer_einsatz",
        "automation_projekt_ueberfaellig",
        "automation_dienstleister_absage",
      ])
      .order("created_at", { ascending: false })
      .limit(20);

    const map = new Map(
      [
        "krankmeldung",
        "neuer_einsatz",
        "projekt_ueberfaellig",
        "dienstleister_absage",
      ].map((typ) => [
        typ,
        (logs as Array<{ agent_type?: string; created_at?: string }> | null)?.find(
          (l) => l.agent_type === `automation_${typ}`
        )?.created_at ?? null,
      ])
    );

    setAktiv({
      krankmeldung: row.automation_krankmeldung,
      neuer_einsatz: row.automation_neuer_einsatz,
      projekt_ueberfaellig: row.automation_projekt_ueberfaellig,
      dienstleister_absage: row.automation_dienstleister_absage,
    });
    setLetzterLog({
      krankmeldung: map.get("krankmeldung") ?? null,
      neuer_einsatz: map.get("neuer_einsatz") ?? null,
      projekt_ueberfaellig: map.get("projekt_ueberfaellig") ?? null,
      dienstleister_absage: map.get("dienstleister_absage") ?? null,
    });
    setLädt(false);
  }, [supabase]);

  useEffect(() => {
    void laden();
  }, [laden]);

  const toggleAutomation = async (
    id: string,
    dbSpalte: keyof DbRow,
    wert: boolean,
    titel: string
  ) => {
    const { error } = await supabase
      .from("settings")
      .update({ [dbSpalte]: wert })
      .eq("key", APP_KEY);

    if (error) {
      toast.error(error.message);
      return;
    }

    setAktiv((prev) => ({ ...prev, [id]: wert }));
    toast.success(wert ? `${titel} aktiviert` : `${titel} deaktiviert`);
  };

  if (lädt) {
    return (
      <p className="text-sm text-zinc-500">Automatisierungen werden geladen…</p>
    );
  }

  return (
    <div className="space-y-3 p-6">
      {AUTOMATISIERUNGEN.map((a) => {
        const Icon = a.Icon;
        const on = aktiv[a.id] ?? false;
        return (
          <div
            key={a.id}
            className="flex items-center gap-4 rounded-2xl border border-zinc-800/60 bg-zinc-900 px-5 py-4 transition-colors hover:border-zinc-700/60"
          >
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border border-zinc-700/60 bg-zinc-800">
              <Icon size={15} className="text-zinc-400" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-zinc-100">{a.titel}</p>
                <span className="rounded-full border border-zinc-700/50 bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-500">
                  {a.triggerLabel}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-zinc-500">{a.beschreibung}</p>
              <p className="mt-1 text-[10px] text-zinc-600">
                {letzterLog[a.id]
                  ? `Zuletzt: ${new Date(letzterLog[a.id] as string).toLocaleDateString("de-DE")}`
                  : "Noch nie ausgeführt"}
              </p>
            </div>

            <div className="flex flex-shrink-0 items-center gap-3">
              {on && (
                <span className="flex items-center gap-1">
                  <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                  <span className="text-[10px] text-emerald-500">Aktiv</span>
                </span>
              )}
              <Switch
                checked={on}
                onCheckedChange={(val) =>
                  void toggleAutomation(a.id, a.dbSpalte, val, a.titel)
                }
                className="data-[state=checked]:bg-violet-600"
              />
              {!on && (
                <span className="text-[10px] text-zinc-600">Inaktiv</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

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
import { cn } from "@/lib/utils";

const APP_KEY = "app";

type AutoRow = {
  id: string;
  dbSpalte: keyof DbRow;
  titel: string;
  beschreibung: string;
  icon: typeof AlertTriangle;
  farbe: keyof typeof FARBE;
  trigger: string;
  aktion: string;
};

type DbRow = {
  automation_krankmeldung: boolean;
  automation_neuer_einsatz: boolean;
  automation_projekt_ueberfaellig: boolean;
  automation_dienstleister_absage: boolean;
};

const FARBE = {
  red: {
    iconOn: "bg-red-500/20",
    iconOff: "bg-zinc-800",
    textOn: "text-red-400",
    textOff: "text-zinc-600",
    dotOn: "bg-red-400",
  },
  blue: {
    iconOn: "bg-blue-500/20",
    iconOff: "bg-zinc-800",
    textOn: "text-blue-400",
    textOff: "text-zinc-600",
    dotOn: "bg-blue-400",
  },
  orange: {
    iconOn: "bg-orange-500/20",
    iconOff: "bg-zinc-800",
    textOn: "text-orange-400",
    textOff: "text-zinc-600",
    dotOn: "bg-orange-400",
  },
  yellow: {
    iconOn: "bg-yellow-500/20",
    iconOff: "bg-zinc-800",
    textOn: "text-yellow-400",
    textOff: "text-zinc-600",
    dotOn: "bg-yellow-400",
  },
} as const;

const AUTOMATISIERUNGEN: AutoRow[] = [
  {
    id: "krankmeldung",
    dbSpalte: "automation_krankmeldung",
    titel: "Krankmeldung → Notfallplan",
    beschreibung:
      "Wenn Abwesenheit type=krank eingetragen wird, kann der KI-Notfallplan und Teamleiter-Benachrichtigung genutzt werden (Trigger in App-Logik).",
    icon: AlertTriangle,
    farbe: "red",
    trigger: "INSERT auf absences WHERE type=krank",
    aktion: "POST /api/agents/emergency + Teamleiter-Benachrichtigung",
  },
  {
    id: "neuer_einsatz",
    dbSpalte: "automation_neuer_einsatz",
    titel: "Neuer Einsatz → Monteur benachrichtigen",
    beschreibung:
      "Wenn ein neuer Einsatz angelegt wird, kann der zugewiesene Monteur per WhatsApp-Link informiert werden.",
    icon: Bell,
    farbe: "blue",
    trigger: "INSERT auf assignments",
    aktion: "WhatsApp via wa.me Link + Toast",
  },
  {
    id: "projekt_ueberfaellig",
    dbSpalte: "automation_projekt_ueberfaellig",
    titel: "Projekt überfällig → Bereichsleiter",
    beschreibung:
      "Wenn planned_end überschritten und Projekt noch aktiv, Hinweis an Bereichsleiter (Cron/täglich).",
    icon: Clock,
    farbe: "orange",
    trigger: "Täglich geprüft (Cron oder bei Seitenaufruf)",
    aktion: "mailto: Link mit Projektdetails",
  },
  {
    id: "dienstleister_absage",
    dbSpalte: "automation_dienstleister_absage",
    titel: "Dienstleister-Absage → Notfallkarte",
    beschreibung:
      "Wenn Dienstleister-Status auf inaktiv gesetzt wird, Kontext für Notfallplan bereitstellen.",
    icon: Building2,
    farbe: "yellow",
    trigger: "UPDATE auf subcontractors SET status=inaktiv",
    aktion: "Redirect zu /notfall mit Kontext",
  },
];

export function KiAutomatisierungen() {
  const supabase = createClient();
  const [aktiv, setAktiv] = useState<Record<string, boolean>>({});
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
    setAktiv({
      krankmeldung: row.automation_krankmeldung,
      neuer_einsatz: row.automation_neuer_einsatz,
      projekt_ueberfaellig: row.automation_projekt_ueberfaellig,
      dienstleister_absage: row.automation_dienstleister_absage,
    });
    setLädt(false);
  }, [supabase]);

  useEffect(() => {
    void laden();
  }, [laden]);

  const toggleAutomatisierung = async (
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
    <div className="grid gap-4 md:grid-cols-2">
      {AUTOMATISIERUNGEN.map((a) => {
        const f = FARBE[a.farbe];
        const Icon = a.icon;
        const on = aktiv[a.id] ?? false;
        return (
          <div
            key={a.id}
            className="rounded-2xl border border-zinc-800 bg-zinc-900/50 transition-all hover:border-zinc-700"
          >
            <div className="flex items-start justify-between gap-3 p-4">
              <div className="flex min-w-0 items-center gap-3">
                <div
                  className={cn(
                    "rounded-xl p-2",
                    on ? f.iconOn : f.iconOff
                  )}
                >
                  <Icon
                    size={16}
                    className={on ? f.textOn : f.textOff}
                  />
                </div>
                <div>
                  <h3
                    className={cn(
                      "text-sm font-semibold",
                      on ? "text-zinc-200" : "text-zinc-500"
                    )}
                  >
                    {a.titel}
                  </h3>
                </div>
              </div>
              <Switch
                checked={on}
                onCheckedChange={(val) =>
                  void toggleAutomatisierung(a.id, a.dbSpalte, val, a.titel)
                }
                className="data-[state=checked]:bg-violet-600"
              />
            </div>
            <p className="px-4 pb-3 text-xs leading-relaxed text-zinc-500">
              {a.beschreibung}
            </p>
            <details className="group border-t border-zinc-800/80 px-4 py-2">
              <summary className="cursor-pointer select-none text-[10px] text-zinc-700 hover:text-zinc-500">
                Technische Details ▸
              </summary>
              <div className="mt-2 space-y-1 pb-2">
                <p className="text-[10px] text-zinc-700">Trigger: {a.trigger}</p>
                <p className="text-[10px] text-zinc-700">Aktion: {a.aktion}</p>
              </div>
            </details>
            <div className="flex items-center gap-1.5 px-4 pb-4">
              <div
                className={cn(
                  "size-1.5 rounded-full",
                  on ? f.dotOn : "bg-zinc-700"
                )}
              />
              <span className="text-[10px] text-zinc-600">
                {on ? "Aktiv" : "Inaktiv"}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Bell, Loader2Icon } from "lucide-react";
import { useSettings } from "@/lib/hooks/useSettings";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

const zeitSchema = z.object({
  daily_report_time: z.string().regex(/^\d{2}:\d{2}$/, "Uhrzeit wählen."),
});

const TOGGLES: {
  key: string;
  titel: string;
  beschreibung: string;
}[] = [
  {
    key: "notif_einsatz_whatsapp",
    titel: "Neuer Einsatz → WhatsApp an Monteure",
    beschreibung: "Monteure des Teams erhalten WhatsApp bei neuem Einsatz",
  },
  {
    key: "notif_planung_teams",
    titel: "Planungsänderung → Microsoft Teams Nachricht",
    beschreibung: "Bei Änderung oder Verschiebung eines Einsatzes",
  },
  {
    key: "notif_dienstleister_notfall",
    titel: "Dienstleister-Absage → Notfallplan",
    beschreibung: "Erstellt automatisch Notfallkarte bei Absage",
  },
  {
    key: "notif_projekt_ueberfaellig",
    titel: "Projekt überfällig → E-Mail an Bereichsleiter",
    beschreibung:
      "Täglich prüfen ob Projekte das geplante Enddatum überschritten haben",
  },
  {
    key: "notif_krank_teamleiter",
    titel: "Krankmeldung → Teamleiter benachrichtigen",
    beschreibung: "Automatisch bei Eintragung einer Krankmeldung",
  },
  {
    key: "daily_report_enabled",
    titel: "Taeglicher Report aktiv",
    beschreibung: "Steuert den taeglichen KI-Reportlauf",
  },
];

export function BenachrichtigungenTab() {
  const { getSetting, updateSetting } = useSettings();
  const [geladen, setGeladen] = useState(false);
  const [toggleStates, setToggleStates] = useState<Record<string, boolean>>({});
  const [sZeit, setSZeit] = useState(false);

  const zeitF = useForm<z.infer<typeof zeitSchema>>({
    resolver: zodResolver(zeitSchema),
    defaultValues: { daily_report_time: "06:00" },
  });

  const laden = useCallback(async () => {
    const entries = await Promise.all(
      TOGGLES.map(async (t) => {
        const v = await getSetting(t.key);
        return [t.key, v === "true"] as const;
      })
    );
    setToggleStates(Object.fromEntries(entries));

    const zeit = await getSetting("daily_report_time");
    zeitF.reset({
      daily_report_time: zeit?.trim() || "06:00",
    });
    setGeladen(true);
  }, [getSetting, zeitF]);

  useEffect(() => {
    void laden();
  }, [laden]);

  async function onToggle(key: string, checked: boolean) {
    setToggleStates((s) => ({ ...s, [key]: checked }));
    const ok = await updateSetting(key, checked ? "true" : "false");
    if (!ok) {
      toast.error("Einstellung konnte nicht gespeichert werden.");
      void laden();
      return;
    }
    toast.success("Gespeichert.");
  }

  async function speichernZeit(w: z.infer<typeof zeitSchema>) {
    setSZeit(true);
    try {
      const ok = await updateSetting("daily_report_time", w.daily_report_time);
      if (!ok) {
        toast.error("Zeit konnte nicht gespeichert werden.");
        return;
      }
      toast.success("Tägliche Prüfzeit gespeichert.");
    } finally {
      setSZeit(false);
    }
  }

  if (!geladen) {
    return (
      <div className="flex items-center gap-2 text-sm text-zinc-500">
        <Loader2Icon className="size-4 animate-spin" />
        Benachrichtigungen werden geladen…
      </div>
    );
  }

  function ToggleZeile({
    titel,
    beschreibung,
    aktiv,
    onChange,
    badge,
  }: {
    titel: string;
    beschreibung: string;
    aktiv: boolean;
    onChange: (v: boolean) => void;
    badge?: string;
  }) {
    return (
      <div className="flex items-center justify-between gap-4 border-b border-zinc-800/40 py-3 last:border-0">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm text-zinc-200">{titel}</p>
            {badge && (
              <span className="rounded-full border border-zinc-700/50 bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-500">
                {badge}
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-zinc-500">{beschreibung}</p>
        </div>
        <Switch
          checked={aktiv}
          onCheckedChange={onChange}
          className="flex-shrink-0 data-[state=checked]:bg-violet-600"
        />
      </div>
    );
  }

  const t = toggleStates;
  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-2xl border border-zinc-800/60 bg-zinc-900">
        <div className="flex items-center gap-2.5 border-b border-zinc-800/60 px-5 py-4">
          <Bell size={14} className="text-zinc-500" />
          <p className="text-sm font-semibold tracking-tight text-zinc-200">
            Echtzeit-Benachrichtigungen
          </p>
        </div>
        <div className="p-5">
          <ToggleZeile
            titel="Neuer Einsatz -> WhatsApp"
            beschreibung="Monteure des Teams erhalten WhatsApp bei neuem Einsatz"
            aktiv={t.notif_einsatz_whatsapp ?? false}
            onChange={(v) => void onToggle("notif_einsatz_whatsapp", v)}
            badge="WhatsApp"
          />
          <ToggleZeile
            titel="Krankmeldung -> Teamleiter"
            beschreibung="Automatisch bei Eintragung einer Krankmeldung"
            aktiv={t.notif_krank_teamleiter ?? false}
            onChange={(v) => void onToggle("notif_krank_teamleiter", v)}
            badge="Teams/WhatsApp"
          />
          <ToggleZeile
            titel="Dienstleister-Absage -> Notfallplan"
            beschreibung="Erstellt automatisch Notfallkarte bei Absage"
            aktiv={t.notif_dienstleister_notfall ?? false}
            onChange={(v) => void onToggle("notif_dienstleister_notfall", v)}
            badge="Notfall"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-zinc-800/60 bg-zinc-900">
        <div className="flex items-center gap-2.5 border-b border-zinc-800/60 px-5 py-4">
          <Bell size={14} className="text-zinc-500" />
          <p className="text-sm font-semibold tracking-tight text-zinc-200">
            Planungshinweise
          </p>
        </div>
        <div className="p-5">
          <ToggleZeile
            titel="Planungsaenderung -> Microsoft Teams Nachricht"
            beschreibung="Bei Aenderung oder Verschiebung eines Einsatzes"
            aktiv={t.notif_planung_teams ?? false}
            onChange={(v) => void onToggle("notif_planung_teams", v)}
            badge="Teams"
          />
          <ToggleZeile
            titel="Projekt ueberfaellig -> E-Mail an Bereichsleiter"
            beschreibung="Taegliche Pruefung auf ueberschrittenes Enddatum"
            aktiv={t.notif_projekt_ueberfaellig ?? false}
            onChange={(v) => void onToggle("notif_projekt_ueberfaellig", v)}
            badge="E-Mail"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-zinc-800/60 bg-zinc-900">
        <div className="flex items-center gap-2.5 border-b border-zinc-800/60 px-5 py-4">
          <Bell size={14} className="text-zinc-500" />
          <p className="text-sm font-semibold tracking-tight text-zinc-200">
            Taegliche Zusammenfassung
          </p>
        </div>
        <div className="space-y-3 p-5">
          <ToggleZeile
            titel="Taeglicher Report aktiv"
            beschreibung="Steuert den taeglichen KI-Reportlauf"
            aktiv={Boolean(t.daily_report_enabled)}
            onChange={(v) => void onToggle("daily_report_enabled", v)}
            badge="Gemini"
          />
          <form
            onSubmit={zeitF.handleSubmit(speichernZeit)}
            className="flex flex-wrap items-end gap-3"
          >
            <div className="space-y-1.5">
              <Label htmlFor="daily_report_time">Taeglicher Report um:</Label>
              <Input
                id="daily_report_time"
                type="time"
                className="border-zinc-700 bg-zinc-950"
                {...zeitF.register("daily_report_time")}
              />
            </div>
            <button
              type="submit"
              disabled={sZeit}
              className="rounded-xl border border-zinc-700/40 bg-zinc-800 px-3 py-2 text-xs font-medium text-zinc-300 transition-all hover:bg-zinc-700 hover:text-zinc-100 disabled:opacity-40"
            >
              {sZeit ? "Speichern..." : "Speichern"}
            </button>
          </form>
          <p className="text-xs text-zinc-500">
            Wird taeglich um {zeitF.watch("daily_report_time")} an Gemini gesendet.
          </p>
        </div>
      </div>
    </div>
  );
}

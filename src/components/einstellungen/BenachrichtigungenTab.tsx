"use client";

import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2Icon } from "lucide-react";
import { useSettings } from "@/lib/hooks/useSettings";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
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

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        {TOGGLES.map((t) => (
          <Card key={t.key} className="border-zinc-800 bg-zinc-900">
            <CardContent className="flex flex-col gap-3 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1 pr-4">
                <CardTitle className="text-base text-zinc-50">{t.titel}</CardTitle>
                <CardDescription className="text-zinc-500">{t.beschreibung}</CardDescription>
              </div>
              <Switch
                checked={toggleStates[t.key] ?? false}
                onCheckedChange={(c) => void onToggle(t.key, Boolean(c))}
                className="shrink-0"
              />
            </CardContent>
          </Card>
        ))}
      </div>

      <Separator className="bg-zinc-800" />

      <Card className="border-zinc-800 bg-zinc-900">
        <CardHeader>
          <CardTitle className="text-zinc-50">Tägliche Prüfungen</CardTitle>
          <CardDescription className="text-zinc-500">
            Zeitpunkt für automatische Reports und Überfälligkeits-Checks
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={zeitF.handleSubmit(speichernZeit)}
            className="flex flex-wrap items-end gap-3"
          >
            <div className="space-y-1.5">
              <Label htmlFor="daily_report_time">Täglicher Report um:</Label>
              <Input
                id="daily_report_time"
                type="time"
                className="border-zinc-700 bg-zinc-950"
                {...zeitF.register("daily_report_time")}
              />
            </div>
            <Button type="submit" disabled={sZeit}>
              {sZeit && <Loader2Icon className="mr-2 size-4 animate-spin" />}
              Speichern
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

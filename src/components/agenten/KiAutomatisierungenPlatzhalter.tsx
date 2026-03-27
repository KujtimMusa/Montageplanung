"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Card, CardDescription, CardHeader } from "@/components/ui/card";

const eintraege = [
  {
    id: "krank_notfall",
    label: "Krankmeldung → Notfallplan prüfen + Teamleiter benachrichtigen",
  },
  {
    id: "einsatz_wa",
    label: "Neuer Einsatz → Monteure per WhatsApp benachrichtigen",
  },
  {
    id: "projekt_faellig",
    label: "Projekt überfällig → Bereichsleiter per E-Mail",
  },
  {
    id: "dl_absage",
    label: "Dienstleister-Absage → Notfallplan-Karte erstellen",
  },
] as const;

/**
 * Toggles werden in `settings` persistiert (automation_*), sobald Hook angebunden ist.
 */
export function KiAutomatisierungenPlatzhalter() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Trigger-Definitionen — Speicherung in `settings` (automation_*) folgt.
      </p>
      <div className="grid gap-3">
        {eintraege.map((e) => (
          <Card key={e.id} className="border-zinc-800 bg-zinc-900">
            <CardHeader className="flex flex-row items-start gap-3 space-y-0 pb-2">
              <Checkbox id={e.id} disabled />
              <div className="space-y-1">
                <Label htmlFor={e.id} className="text-sm font-medium leading-snug">
                  {e.label}
                </Label>
                <CardDescription className="text-xs">
                  Inaktiv bis Persistenz angebunden ist.
                </CardDescription>
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  );
}

"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";

/**
 * Agenten-Übersicht — Anbindung an /api/agents/* und Bulk-Aktionen folgen.
 */
export function KiAgentenPlatzhalter() {
  return (
    <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-3">
      <Card className="border-zinc-800 bg-zinc-900">
        <CardHeader>
          <CardTitle className="text-base">Planungsoptimierer</CardTitle>
          <CardDescription>
            Analysiert Projekte und schlägt Team-Zuweisungen vor.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            type="button"
            variant="secondary"
            onClick={() =>
              toast.info("Endpunkt „Analyse starten“ wird mit Paketplan angebunden.")
            }
          >
            Analyse starten
          </Button>
        </CardContent>
      </Card>
      <Card className="border-zinc-800 bg-zinc-900">
        <CardHeader>
          <CardTitle className="text-base">Konflikt-Resolver</CardTitle>
          <CardDescription>
            Scannt Konflikte und schlägt Lösungen vor (API /api/agents/conflict).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            type="button"
            variant="secondary"
            onClick={() =>
              toast.info("Tiefe Integration in einem Folgeschritt.")
            }
          >
            Jetzt scannen
          </Button>
        </CardContent>
      </Card>
      <Card className="border-zinc-800 bg-zinc-900">
        <CardHeader>
          <CardTitle className="text-base">Kapazitätsplaner</CardTitle>
          <CardDescription>
            Heatmap-Auslastung pro Team und Kalenderwoche.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button type="button" variant="outline" disabled>
            Heatmap (in Arbeit)
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

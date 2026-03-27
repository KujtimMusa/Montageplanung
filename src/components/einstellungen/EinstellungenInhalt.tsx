"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { KundenListe } from "@/components/kunden/KundenListe";
import { AbteilungenVerwaltung } from "@/components/abteilungen/AbteilungenVerwaltung";
import { AbwesenheitenVerwaltung } from "@/components/abwesenheiten/AbwesenheitenVerwaltung";

const tabIds = [
  "kunden",
  "abteilungen",
  "abwesenheiten",
  "integrationen",
] as const;

export function EinstellungenInhalt() {
  const sp = useSearchParams();
  const tabParam = sp.get("tab");
  const initial =
    tabParam && tabIds.includes(tabParam as (typeof tabIds)[number])
      ? tabParam
      : "kunden";
  const [tab, setTab] = useState(initial);

  useEffect(() => {
    if (
      tabParam &&
      tabIds.includes(tabParam as (typeof tabIds)[number])
    ) {
      setTab(tabParam);
    }
  }, [tabParam]);

  return (
    <Tabs value={tab} onValueChange={setTab} className="w-full space-y-6">
      <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 bg-zinc-900 p-1">
        <TabsTrigger
          value="kunden"
          className="data-[state=active]:bg-zinc-800 data-[state=active]:text-zinc-100"
        >
          Kunden
        </TabsTrigger>
        <TabsTrigger
          value="abteilungen"
          className="data-[state=active]:bg-zinc-800 data-[state=active]:text-zinc-100"
        >
          Abteilungen
        </TabsTrigger>
        <TabsTrigger
          value="abwesenheiten"
          className="data-[state=active]:bg-zinc-800 data-[state=active]:text-zinc-100"
        >
          Abwesenheiten
        </TabsTrigger>
        <TabsTrigger
          value="integrationen"
          className="data-[state=active]:bg-zinc-800 data-[state=active]:text-zinc-100"
        >
          Integrationen
        </TabsTrigger>
      </TabsList>

      <TabsContent value="kunden" className="mt-0">
        <p className="mb-4 text-sm text-zinc-500">
          Stammdaten für spätere Projektverknüpfungen — in der Planung können Sie
          zusätzlich Freitext verwenden.
        </p>
        <KundenListe />
      </TabsContent>

      <TabsContent value="abteilungen" className="mt-0">
        <p className="mb-4 text-sm text-zinc-500">
          Farben für Kalender-Balken und Filter.
        </p>
        <AbteilungenVerwaltung />
      </TabsContent>

      <TabsContent value="abwesenheiten" className="mt-0">
        <p className="mb-4 text-sm text-zinc-500">
          Urlaub und Krankheit erscheinen als Hintergrund im Kalender.
        </p>
        <AbwesenheitenVerwaltung />
      </TabsContent>

      <TabsContent value="integrationen" className="mt-0">
        <IntegrationenKarte />
      </TabsContent>
    </Tabs>
  );
}

function IntegrationenKarte() {
  const [s, setS] = useState<{ outlook: boolean; whatsapp: boolean } | null>(
    null
  );
  useEffect(() => {
    void fetch("/api/integrationen/status")
      .then((r) => r.json())
      .then((j: { outlook?: boolean; whatsapp?: boolean }) =>
        setS({ outlook: !!j.outlook, whatsapp: !!j.whatsapp })
      )
      .catch(() => setS({ outlook: false, whatsapp: false }));
  }, []);

  return (
    <Card className="border-zinc-800 bg-zinc-900">
      <CardHeader>
        <CardTitle className="text-zinc-50">Outlook &amp; WhatsApp</CardTitle>
        <CardDescription className="text-zinc-500">
          Server-seitige Konfiguration (Umgebungsvariablen). Ohne Setup bleiben
          Aktionen in der Planung ausgegraut.
        </CardDescription>
      </CardHeader>
      <div className="space-y-3 px-6 pb-6 text-sm text-zinc-300">
        <p>
          <strong className="text-zinc-100">Microsoft Outlook / Graph:</strong>{" "}
          {s === null ? (
            "…"
          ) : s.outlook ? (
            <span className="text-emerald-400">AZURE_CLIENT_ID gesetzt</span>
          ) : (
            <span className="text-zinc-500">
              nicht konfiguriert (Kalender-Sync ist derzeit Platzhalter)
            </span>
          )}
        </p>
        <p>
          <strong className="text-zinc-100">WhatsApp (Twilio):</strong>{" "}
          {s === null ? (
            "…"
          ) : s.whatsapp ? (
            <span className="text-emerald-400">Twilio-Konto aktiv</span>
          ) : (
            <span className="text-zinc-500">TWILIO_* nicht gesetzt</span>
          )}
        </p>
      </div>
    </Card>
  );
}

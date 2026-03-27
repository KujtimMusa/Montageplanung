"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { KundenListe } from "@/components/kunden/KundenListe";
import { AbteilungenVerwaltung } from "@/components/abteilungen/AbteilungenVerwaltung";
import { AbwesenheitenVerwaltung } from "@/components/abwesenheiten/AbwesenheitenVerwaltung";

const tabIds = [
  "anleitung",
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
      : "anleitung";
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
          value="anleitung"
          className="data-[state=active]:bg-zinc-800 data-[state=active]:text-zinc-100"
        >
          So geht&apos;s
        </TabsTrigger>
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

      <TabsContent value="anleitung" className="mt-0">
        <ArbeitshilfeKarte />
      </TabsContent>

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

function ArbeitshilfeKarte() {
  return (
    <Card className="border-zinc-800 bg-zinc-900">
      <CardHeader>
        <CardTitle className="text-zinc-50">Reihenfolge für die Planung</CardTitle>
        <CardDescription className="text-zinc-500">
          Kurz erklärt für Abteilungsleitung und Büro — damit Stammdaten und
          Kalender zusammenpassen.
        </CardDescription>
      </CardHeader>
      <div className="space-y-4 px-6 pb-6 text-sm leading-relaxed text-zinc-300">
        <ol className="list-decimal space-y-3 pl-5">
          <li>
            <strong className="text-zinc-100">Abteilungen</strong> anlegen (Farben
            erscheinen im Kalender).
          </li>
          <li>
            Unter <strong className="text-zinc-100">Teams &amp; Stammdaten</strong>{" "}
            Mitarbeiter pflegen, optional Teams bilden,{" "}
            <strong className="text-zinc-100">Projekte</strong> anlegen.
          </li>
          <li>
            <strong className="text-zinc-100">Urlaub &amp; Krankheit</strong>{" "}
            eintragen — im Kalender als Hintergrund sichtbar.
          </li>
          <li>
            In der <strong className="text-zinc-100">Planung</strong> Einsätze
            ziehen oder klicken: Mitarbeiter, Zeit, Projekt/Freitext, optional
            Team-Label. Mehrere Blöcke pro Tag sind möglich.
          </li>
        </ol>
        <p className="rounded-md border border-zinc-700 bg-zinc-950/60 p-3 text-xs text-zinc-400">
          <strong className="text-zinc-200">Profil fehlt?</strong> Oben erscheint
          ein gelber Hinweis — Button „Profil jetzt anlegen“ (benötigt{" "}
          <code className="rounded bg-zinc-800 px-1">SUPABASE_SERVICE_ROLE_KEY</code>{" "}
          auf dem Server). Ohne Service-Role: Admin legt Sie in Supabase unter{" "}
          <code className="rounded bg-zinc-800 px-1">employees</code> an.
        </p>
        <p className="text-xs text-zinc-500">
          Rolle <strong className="text-zinc-400">Monteur</strong>: nur Kalender,
          keine Stammdaten — Admin kann die Rolle unter Teams → Mitarbeiter
          ändern.
        </p>
      </div>
    </Card>
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

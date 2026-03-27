"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TeamsVerwaltung } from "@/components/teams/TeamsVerwaltung";
import { MitarbeiterVerwaltung } from "@/components/mitarbeiter/MitarbeiterVerwaltung";
import { AbwesenheitenVerwaltung } from "@/components/abwesenheiten/AbwesenheitenVerwaltung";
import { ProjekteVerwaltung } from "@/components/projekte/ProjekteVerwaltung";

const tabs = ["teams", "mitarbeiter", "abwesenheiten", "projekte"] as const;

export function TeamsBereich() {
  const sp = useSearchParams();
  const param = sp.get("tab");
  const initial =
    param && tabs.includes(param as (typeof tabs)[number])
      ? param
      : "teams";
  const [tab, setTab] = useState(initial);

  useEffect(() => {
    if (param && tabs.includes(param as (typeof tabs)[number])) {
      setTab(param);
    }
  }, [param]);

  return (
    <Tabs value={tab} onValueChange={setTab} className="w-full space-y-6">
      <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 bg-zinc-900 p-1">
        <TabsTrigger
          value="teams"
          className="data-[state=active]:bg-zinc-800 data-[state=active]:text-zinc-100"
        >
          Teams zusammenstellen
        </TabsTrigger>
        <TabsTrigger
          value="mitarbeiter"
          className="data-[state=active]:bg-zinc-800 data-[state=active]:text-zinc-100"
        >
          Mitarbeiter
        </TabsTrigger>
        <TabsTrigger
          value="abwesenheiten"
          className="data-[state=active]:bg-zinc-800 data-[state=active]:text-zinc-100"
        >
          Urlaub &amp; Krankheit
        </TabsTrigger>
        <TabsTrigger
          value="projekte"
          className="data-[state=active]:bg-zinc-800 data-[state=active]:text-zinc-100"
        >
          Projekte
        </TabsTrigger>
      </TabsList>

      <TabsContent value="teams" className="mt-0">
        <p className="mb-4 text-sm text-zinc-500">
          Teams anlegen und Mitglieder per Drag &amp; Drop zuordnen. Im Kalender
          wählen Sie optional ein Team als Label pro Einsatz.
        </p>
        <TeamsVerwaltung />
      </TabsContent>

      <TabsContent value="mitarbeiter" className="mt-0">
        <p className="mb-4 text-sm text-zinc-500">
          Profile, Rollen und Einladungen per E-Mail.
        </p>
        <MitarbeiterVerwaltung />
      </TabsContent>

      <TabsContent value="abwesenheiten" className="mt-0">
        <p className="mb-4 text-sm text-zinc-500">
          Abwesenheiten erscheinen als farbiger Hintergrund im Kalender.
        </p>
        <AbwesenheitenVerwaltung />
      </TabsContent>

      <TabsContent value="projekte" className="mt-0">
        <p className="mb-4 text-sm text-zinc-500">
          Projekte hier pflegen — in der Planung wählen Sie sie beim Einsatz oder
          tragen eine Freitext-Bezeichnung ein. Pro Tag sind mehrere Einsätze
          möglich.
        </p>
        <ProjekteVerwaltung />
      </TabsContent>
    </Tabs>
  );
}

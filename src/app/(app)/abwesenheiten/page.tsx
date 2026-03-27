"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AbwesenheitenVerwaltung } from "@/components/abwesenheiten/AbwesenheitenVerwaltung";
import { PersonioSyncPanel } from "@/components/abwesenheiten/PersonioSyncPanel";

export default function AbwesenheitenSeite() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Abwesenheiten</h1>
        <p className="text-muted-foreground">
          Manuell erfassen oder mit Personio synchronisieren.
        </p>
      </div>
      <Tabs defaultValue="manuell" className="w-full">
        <TabsList className="bg-zinc-900">
          <TabsTrigger value="manuell">Manuell</TabsTrigger>
          <TabsTrigger value="personio">Personio-Sync</TabsTrigger>
        </TabsList>
        <TabsContent value="manuell" className="mt-6">
          <AbwesenheitenVerwaltung />
        </TabsContent>
        <TabsContent value="personio" className="mt-6">
          <PersonioSyncPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}

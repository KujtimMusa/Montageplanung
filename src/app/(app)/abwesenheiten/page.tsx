"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AbwesenheitenVerwaltung } from "@/components/abwesenheiten/AbwesenheitenVerwaltung";
import { PersonioSyncPanel } from "@/components/abwesenheiten/PersonioSyncPanel";

export default function AbwesenheitenSeite() {
  return (
    <div className="space-y-6">
      <Tabs defaultValue="manuell" className="w-full">
        <TabsList className="border border-zinc-800 bg-zinc-900/50">
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

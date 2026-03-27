"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AbwesenheitenVerwaltung } from "@/components/abwesenheiten/AbwesenheitenVerwaltung";
import { PersonioSyncPanel } from "@/components/abwesenheiten/PersonioSyncPanel";

export default function AbwesenheitenSeite() {
  return (
    <div className="space-y-6">
      <Tabs defaultValue="manuell" className="w-full">
        <TabsList className="h-auto w-full flex-wrap justify-start gap-1 rounded-xl border border-zinc-800 bg-zinc-900 p-1 sm:w-auto">
          <TabsTrigger
            value="manuell"
            className="rounded-lg data-[state=active]:bg-zinc-800"
          >
            Manuell
          </TabsTrigger>
          <TabsTrigger
            value="personio"
            className="rounded-lg data-[state=active]:bg-zinc-800"
          >
            Personio-Sync
          </TabsTrigger>
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

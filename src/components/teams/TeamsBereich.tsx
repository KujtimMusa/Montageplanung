"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TeamsVerwaltung } from "@/components/teams/TeamsVerwaltung";
import { MitarbeiterVerwaltung } from "@/components/mitarbeiter/MitarbeiterVerwaltung";
import { AbteilungenVerwaltung } from "@/components/abteilungen/AbteilungenVerwaltung";

const tabs = ["mitarbeiter", "teams", "abteilungen"] as const;

export function TeamsBereich() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const param = sp.get("tab");
  const initial =
    param && tabs.includes(param as (typeof tabs)[number])
      ? param
      : "mitarbeiter";
  const [tab, setTab] = useState(initial);

  useEffect(() => {
    if (param && tabs.includes(param as (typeof tabs)[number])) {
      setTab(param);
    }
  }, [param]);

  function onTabChange(v: string) {
    setTab(v);
    router.replace(`${pathname}?tab=${v}`, { scroll: false });
  }

  return (
    <Tabs value={tab} onValueChange={onTabChange} className="w-full space-y-6">
      <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 bg-zinc-900 p-1">
        <TabsTrigger
          value="mitarbeiter"
          className="data-[state=active]:bg-zinc-800 data-[state=active]:text-zinc-100"
        >
          Mitarbeiter
        </TabsTrigger>
        <TabsTrigger
          value="teams"
          className="data-[state=active]:bg-zinc-800 data-[state=active]:text-zinc-100"
        >
          Teams
        </TabsTrigger>
        <TabsTrigger
          value="abteilungen"
          className="data-[state=active]:bg-zinc-800 data-[state=active]:text-zinc-100"
        >
          Abteilungen
        </TabsTrigger>
      </TabsList>

      <TabsContent value="mitarbeiter" className="mt-0">
        <MitarbeiterVerwaltung />
      </TabsContent>

      <TabsContent value="teams" className="mt-0">
        <TeamsVerwaltung />
      </TabsContent>

      <TabsContent value="abteilungen" className="mt-0">
        <AbteilungenVerwaltung />
      </TabsContent>
    </Tabs>
  );
}

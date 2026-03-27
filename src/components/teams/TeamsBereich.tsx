"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Building2, Users, UsersRound } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { TeamsVerwaltung } from "@/components/teams/TeamsVerwaltung";
import { MitarbeiterVerwaltung } from "@/components/mitarbeiter/MitarbeiterVerwaltung";
import { AbteilungenVerwaltung } from "@/components/abteilungen/AbteilungenVerwaltung";
import { cn } from "@/lib/utils";

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
    <Card className="overflow-hidden border-zinc-800/80 bg-zinc-900/35 shadow-xl ring-1 ring-white/5">
      <CardHeader className="space-y-1 border-b border-zinc-800/80 bg-zinc-900/50 pb-4">
        <CardTitle className="text-base font-semibold text-zinc-100">
          Stammdaten
        </CardTitle>
        <CardDescription className="text-zinc-500">
          Wechsle zwischen Mitarbeitern, Teams und Abteilungen — der aktive Tab
          wird in der URL gespeichert.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <Tabs
          value={tab}
          onValueChange={onTabChange}
          className="w-full gap-0"
        >
          <TabsList
            variant="line"
            className={cn(
              "h-auto w-full justify-start gap-0 rounded-none border-b border-zinc-800/80 bg-transparent p-0"
            )}
          >
            <TabsTrigger
              value="mitarbeiter"
              className={cn(
                "relative flex-1 gap-2 rounded-none border-0 bg-transparent py-3 text-zinc-500 shadow-none",
                "data-active:bg-transparent data-active:text-zinc-50",
                "data-active:after:absolute data-active:after:bottom-0 data-active:after:left-2 data-active:after:right-2 data-active:after:h-0.5 data-active:after:rounded-full data-active:after:bg-sky-500"
              )}
            >
              <Users className="size-4 opacity-80" aria-hidden />
              Mitarbeiter
            </TabsTrigger>
            <TabsTrigger
              value="teams"
              className={cn(
                "relative flex-1 gap-2 rounded-none border-0 bg-transparent py-3 text-zinc-500 shadow-none",
                "data-active:bg-transparent data-active:text-zinc-50",
                "data-active:after:absolute data-active:after:bottom-0 data-active:after:left-2 data-active:after:right-2 data-active:after:h-0.5 data-active:after:rounded-full data-active:after:bg-sky-500"
              )}
            >
              <UsersRound className="size-4 opacity-80" aria-hidden />
              Teams
            </TabsTrigger>
            <TabsTrigger
              value="abteilungen"
              className={cn(
                "relative flex-1 gap-2 rounded-none border-0 bg-transparent py-3 text-zinc-500 shadow-none",
                "data-active:bg-transparent data-active:text-zinc-50",
                "data-active:after:absolute data-active:after:bottom-0 data-active:after:left-2 data-active:after:right-2 data-active:after:h-0.5 data-active:after:rounded-full data-active:after:bg-sky-500"
              )}
            >
              <Building2 className="size-4 opacity-80" aria-hidden />
              Abteilungen
            </TabsTrigger>
          </TabsList>

          <div className="bg-zinc-950/40 p-4 md:p-6">
            <TabsContent value="mitarbeiter" className="mt-0 outline-none">
              <MitarbeiterVerwaltung />
            </TabsContent>

            <TabsContent value="teams" className="mt-0 outline-none">
              <TeamsVerwaltung />
            </TabsContent>

            <TabsContent value="abteilungen" className="mt-0 outline-none">
              <AbteilungenVerwaltung />
            </TabsContent>
          </div>
        </Tabs>
      </CardContent>
    </Card>
  );
}

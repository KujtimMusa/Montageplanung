"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
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

  /** Tab nur per History aktualisieren — kein router.replace (vermeidet RSC-Reload & Toasts). */
  useEffect(() => {
    function onPopState() {
      const p = new URL(window.location.href).searchParams.get("tab");
      if (p && tabs.includes(p as (typeof tabs)[number])) {
        setTab(p);
      } else {
        setTab("mitarbeiter");
      }
    }
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  function onTabChange(v: string) {
    setTab(v);
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    url.searchParams.set("tab", v);
    window.history.replaceState(null, "", url.pathname + url.search + url.hash);
  }

  return (
    <Card className="overflow-hidden border-zinc-800/80 bg-zinc-900/40 shadow-xl ring-1 ring-white/[0.06]">
      <CardHeader className="space-y-1 border-b border-zinc-800/80 px-5 pb-4 pt-5 sm:px-6">
        <CardTitle className="text-base font-semibold tracking-tight text-zinc-100">
          Stammdaten
        </CardTitle>
        <CardDescription className="text-sm text-zinc-500">
          Mitarbeiter, Teams und Abteilungen — der gewählte Bereich bleibt in der
          Adresszeile erhalten.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <Tabs
          value={tab}
          onValueChange={onTabChange}
          className="w-full gap-0"
        >
          <div className="border-b border-zinc-800/80 px-4 py-3 sm:px-5">
            <TabsList
              variant="default"
              className={cn(
                "grid h-auto w-full grid-cols-3 gap-1 rounded-lg bg-zinc-950/80 p-1 ring-1 ring-zinc-800/90"
              )}
            >
              <TabsTrigger
                value="mitarbeiter"
                className={cn(
                  "gap-2 py-2.5 text-xs font-medium text-zinc-400 shadow-none sm:text-sm",
                  "data-active:bg-zinc-800 data-active:text-zinc-50 data-active:shadow-sm"
                )}
              >
                <Users className="size-4 shrink-0 opacity-90" aria-hidden />
                <span className="truncate">Mitarbeiter</span>
              </TabsTrigger>
              <TabsTrigger
                value="teams"
                className={cn(
                  "gap-2 py-2.5 text-xs font-medium text-zinc-400 shadow-none sm:text-sm",
                  "data-active:bg-zinc-800 data-active:text-zinc-50 data-active:shadow-sm"
                )}
              >
                <UsersRound className="size-4 shrink-0 opacity-90" aria-hidden />
                <span className="truncate">Teams</span>
              </TabsTrigger>
              <TabsTrigger
                value="abteilungen"
                className={cn(
                  "gap-2 py-2.5 text-xs font-medium text-zinc-400 shadow-none sm:text-sm",
                  "data-active:bg-zinc-800 data-active:text-zinc-50 data-active:shadow-sm"
                )}
              >
                <Building2 className="size-4 shrink-0 opacity-90" aria-hidden />
                <span className="truncate">Abteilungen</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="px-4 py-5 sm:px-6 sm:py-6">
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

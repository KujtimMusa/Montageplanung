"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Building2, Users, UsersRound } from "lucide-react";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { TeamsVerwaltung } from "@/components/teams/TeamsVerwaltung";
import { MitarbeiterVerwaltung } from "@/components/mitarbeiter/MitarbeiterVerwaltung";
import { AbteilungenVerwaltung } from "@/components/abteilungen/AbteilungenVerwaltung";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

const tabIds = ["mitarbeiter", "teams", "abteilungen"] as const;
type TabId = (typeof tabIds)[number];

export function TeamsBereich() {
  const supabase = useMemo(() => createClient(), []);
  const sp = useSearchParams();
  const param = sp.get("tab");
  const initial: TabId =
    param && tabIds.includes(param as TabId) ? (param as TabId) : "mitarbeiter";
  const [tab, setTab] = useState<TabId>(initial);
  const [anzahl, setAnzahl] = useState({
    mitarbeiter: 0,
    teams: 0,
    abteilungen: 0,
  });

  const zaehlungenLaden = useCallback(async () => {
    const [m, t, a] = await Promise.all([
      supabase.from("employees").select("id", { count: "exact", head: true }),
      supabase.from("teams").select("id", { count: "exact", head: true }),
      supabase.from("departments").select("id", { count: "exact", head: true }),
    ]);
    setAnzahl({
      mitarbeiter: m.count ?? 0,
      teams: t.count ?? 0,
      abteilungen: a.count ?? 0,
    });
  }, [supabase]);

  useEffect(() => {
    void zaehlungenLaden();
  }, [zaehlungenLaden]);

  useEffect(() => {
    if (param && tabIds.includes(param as TabId)) {
      setTab(param as TabId);
    }
  }, [param]);

  useEffect(() => {
    function onPopState() {
      const p = new URL(window.location.href).searchParams.get("tab");
      if (p && tabIds.includes(p as TabId)) {
        setTab(p as TabId);
      } else {
        setTab("mitarbeiter");
      }
    }
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  function onTabChange(v: string) {
    const id = v as TabId;
    if (!tabIds.includes(id)) return;
    setTab(id);
    void zaehlungenLaden();
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    url.searchParams.set("tab", id);
    window.history.replaceState(null, "", url.pathname + url.search + url.hash);
  }

  const tabsKonfig = [
    {
      id: "mitarbeiter" as const,
      label: "Mitarbeiter",
      icon: Users,
      anzahl: anzahl.mitarbeiter,
    },
    {
      id: "teams" as const,
      label: "Teams",
      icon: UsersRound,
      anzahl: anzahl.teams,
    },
    {
      id: "abteilungen" as const,
      label: "Abteilungen",
      icon: Building2,
      anzahl: anzahl.abteilungen,
    },
  ];

  return (
    <Card className="overflow-hidden border-zinc-800/80 bg-zinc-900/40 shadow-xl ring-1 ring-white/[0.06]">
      <CardContent className="p-0">
        <div className="px-4 pt-4 sm:px-5 sm:pt-5">
          <div
            className="mb-6 flex gap-1 rounded-xl border border-zinc-800 bg-zinc-900 p-1"
            role="tablist"
          >
            {tabsKonfig.map((cfg) => {
              const Icon = cfg.icon;
              const aktiv = tab === cfg.id;
              return (
                <button
                  key={cfg.id}
                  type="button"
                  role="tab"
                  aria-selected={aktiv}
                  onClick={() => onTabChange(cfg.id)}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-200",
                    aktiv
                      ? "bg-zinc-800 text-zinc-100 shadow-sm"
                      : "text-zinc-500 hover:text-zinc-300"
                  )}
                >
                  <Icon size={15} className="shrink-0 opacity-90" aria-hidden />
                  <span className="truncate">{cfg.label}</span>
                  <span
                    className={cn(
                      "rounded-md px-1.5 py-0.5 text-xs font-semibold tabular-nums",
                      aktiv
                        ? "bg-zinc-700 text-zinc-300"
                        : "bg-zinc-800/50 text-zinc-600"
                    )}
                  >
                    {cfg.anzahl}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="px-4 py-5 sm:px-6 sm:py-6">
          <Tabs value={tab} onValueChange={onTabChange} className="w-full gap-0">
            <TabsContent value="mitarbeiter" className="mt-0 outline-none">
              {tab === "mitarbeiter" ? (
                <MitarbeiterVerwaltung onDatenGeaendert={zaehlungenLaden} />
              ) : null}
            </TabsContent>

            <TabsContent value="teams" className="mt-0 outline-none">
              {tab === "teams" ? (
                <TeamsVerwaltung onDatenGeaendert={zaehlungenLaden} />
              ) : null}
            </TabsContent>

            <TabsContent value="abteilungen" className="mt-0 outline-none">
              {tab === "abteilungen" ? (
                <AbteilungenVerwaltung onDatenGeaendert={zaehlungenLaden} />
              ) : null}
            </TabsContent>
          </Tabs>
        </div>
      </CardContent>
    </Card>
  );
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Building2, FolderOpen, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  ProjekteVerwaltung,
  type ProjekteVerwaltungHandle,
} from "@/components/projekte/ProjekteVerwaltung";
import {
  KundenVerwaltung,
  type KundenVerwaltungHandle,
} from "@/components/kunden/KundenVerwaltung";

export function ProjekteKundenBereichInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabFromUrl = searchParams.get("tab") === "kunden" ? "kunden" : "projekte";
  const [aktivTab, setAktivTab] = useState<"projekte" | "kunden">(tabFromUrl);
  const [anzahlProjekte, setAnzahlProjekte] = useState(0);
  const [anzahlKunden, setAnzahlKunden] = useState(0);

  const projekteRef = useRef<ProjekteVerwaltungHandle>(null);
  const kundenRef = useRef<KundenVerwaltungHandle>(null);

  useEffect(() => {
    setAktivTab(tabFromUrl);
  }, [tabFromUrl]);

  const tabZaehlerAktualisieren = useCallback(async () => {
    const supabase = createClient();
    const [{ count: pc }, { count: kc }] = await Promise.all([
      supabase.from("projects").select("id", { count: "exact", head: true }),
      supabase.from("customers").select("id", { count: "exact", head: true }),
    ]);
    setAnzahlProjekte(pc ?? 0);
    setAnzahlKunden(kc ?? 0);
  }, []);

  useEffect(() => {
    void tabZaehlerAktualisieren();
  }, [aktivTab, tabZaehlerAktualisieren]);

  const tabSetzen = useCallback(
    (tab: "projekte" | "kunden") => {
      setAktivTab(tab);
      router.replace(tab === "kunden" ? "/projekte?tab=kunden" : "/projekte", {
        scroll: false,
      });
    },
    [router]
  );

  return (
    <div>
      <div className="mb-6 rounded-2xl border border-zinc-800/60 bg-zinc-900/30 p-1">
        <div className="grid grid-cols-2 gap-1">
          {(
            [
              {
                key: "projekte" as const,
                label: "Projekte",
                icon: FolderOpen,
                count: anzahlProjekte,
              },
              {
                key: "kunden" as const,
                label: "Kunden",
                icon: Building2,
                count: anzahlKunden,
              },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => tabSetzen(tab.key)}
              className={cn(
                "flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition-all",
                aktivTab === tab.key
                  ? "bg-zinc-800 text-zinc-100 shadow-sm"
                  : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              <tab.icon size={15} />
              {tab.label}
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-xs font-bold",
                  aktivTab === tab.key
                    ? "bg-zinc-700 text-zinc-300"
                    : "bg-zinc-800 text-zinc-600"
                )}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="mb-6 flex items-start justify-between">
        <h1 className="text-2xl font-bold text-zinc-100">Projekte &amp; Kunden</h1>
        <Button
          type="button"
          onClick={() =>
            aktivTab === "projekte"
              ? projekteRef.current?.openNeu()
              : kundenRef.current?.openNeu()
          }
          className="bg-zinc-100 text-sm font-semibold text-zinc-900 hover:bg-white"
        >
          <Plus size={15} className="mr-1.5" />
          {aktivTab === "projekte" ? "Neues Projekt" : "Neuer Kunde"}
        </Button>
      </div>

      {aktivTab === "projekte" ? (
        <ProjekteVerwaltung
          ref={projekteRef}
          hideChrome
          onAnzahlProjekteChange={setAnzahlProjekte}
        />
      ) : (
        <KundenVerwaltung
          ref={kundenRef}
          embedded
          tabAktiv={aktivTab === "kunden"}
          onAnzahlKundenChange={setAnzahlKunden}
        />
      )}
    </div>
  );
}


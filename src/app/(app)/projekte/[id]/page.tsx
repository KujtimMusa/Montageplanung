"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, FolderKanban, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatDatum } from "@/lib/utils/datum";
import { normalisiereStatus } from "@/types/projekte";
import { STATUS_CONFIG } from "@/lib/projekt-status";
import { buttonVariants } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { KalkulationTab } from "./kalkulation-tab";
import { cn } from "@/lib/utils";

type ProjektKopf = {
  id: string;
  title: string;
  status: string;
  priority: string;
  planned_start: string | null;
  planned_end: string | null;
  description: string | null;
  notes: string | null;
  customers: { company_name: string } | null;
};

const tabIds = ["uebersicht", "kalkulation"] as const;
type TabId = (typeof tabIds)[number];

function parseTab(raw: string | null): TabId {
  return raw && tabIds.includes(raw as TabId) ? (raw as TabId) : "uebersicht";
}

export default function ProjektDetailSeite() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = params.id as string;

  const aktivTab = parseTab(searchParams.get("tab"));

  const [projekt, setProjekt] = useState<ProjektKopf | null>(null);
  const [laden, setLaden] = useState(true);
  const [fehler, setFehler] = useState<string | null>(null);

  const projektLaden = useCallback(async () => {
    setLaden(true);
    setFehler(null);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("projects")
        .select(
          "id, title, status, priority, planned_start, planned_end, description, notes, customers ( company_name )"
        )
        .eq("id", id)
        .maybeSingle();

      if (error) {
        throw new Error(error.message);
      }
      if (!data) {
        setProjekt(null);
        setFehler("Projekt nicht gefunden.");
        return;
      }
      const raw = data as Record<string, unknown>;
      const cust = raw.customers;
      const customers =
        cust == null
          ? null
          : Array.isArray(cust)
            ? (cust[0] as { company_name: string } | undefined) ?? null
            : (cust as { company_name: string });
      setProjekt({
        ...(raw as unknown as ProjektKopf),
        customers,
      });
    } catch (e) {
      setFehler(e instanceof Error ? e.message : "Laden fehlgeschlagen");
      setProjekt(null);
    } finally {
      setLaden(false);
    }
  }, [id]);

  useEffect(() => {
    void projektLaden();
  }, [projektLaden]);

  const tabSetzen = (tab: TabId) => {
    router.replace(tab === "uebersicht" ? `/projekte/${id}` : `/projekte/${id}?tab=${tab}`, {
      scroll: false,
    });
  };

  if (laden) {
    return (
      <div className="mx-auto flex max-w-4xl items-center gap-2 py-16 text-zinc-500">
        <Loader2 className="h-5 w-5 animate-spin" />
        Projekt wird geladen…
      </div>
    );
  }

  if (fehler || !projekt) {
    return (
      <div className="mx-auto max-w-4xl py-16 text-center">
        <p className="text-zinc-400">{fehler ?? "Projekt nicht gefunden."}</p>
        <Link href="/projekte" className={cn(buttonVariants({ variant: "outline" }), "mt-4 inline-flex")}>
          Zurück zur Projekte-Übersicht
        </Link>
      </div>
    );
  }

  const st = normalisiereStatus(projekt.status);
  const stCfg = STATUS_CONFIG[st] ?? { label: projekt.status, dot: "#71717a" };

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <div className="flex flex-wrap items-start gap-4">
        <Link
          href="/projekte"
          className={cn(
            buttonVariants({ variant: "ghost", size: "icon" }),
            "shrink-0 text-zinc-400"
          )}
          aria-label="Zurück"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <FolderKanban className="h-5 w-5 text-zinc-500" />
            <h1 className="truncate text-2xl font-bold text-zinc-50">{projekt.title}</h1>
            <span
              className="inline-flex items-center gap-1.5 rounded-full border border-zinc-700 px-2 py-0.5 text-xs text-zinc-400"
              style={{ borderColor: `${stCfg.dot}55` }}
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: stCfg.dot }} />
              {stCfg.label}
            </span>
          </div>
          <p className="text-sm text-zinc-500">
            {projekt.customers?.company_name ?? "Kein Kunde"} ·{" "}
            {projekt.planned_start || projekt.planned_end
              ? `${projekt.planned_start ? formatDatum(projekt.planned_start) : "—"} → ${projekt.planned_end ? formatDatum(projekt.planned_end) : "—"}`
              : "Kein Zeitraum"}
          </p>
        </div>
      </div>

      <Tabs
        value={aktivTab}
        onValueChange={(v) => tabSetzen(parseTab(v))}
        className="flex w-full flex-col gap-4"
      >
        <TabsList className="h-auto w-full flex-wrap justify-start gap-1 rounded-xl border border-zinc-800/60 bg-zinc-900 p-1 sm:w-auto">
          <TabsTrigger
            value="uebersicht"
            className="rounded-lg data-[state=active]:bg-zinc-800 data-[state=active]:text-zinc-100"
          >
            Übersicht
          </TabsTrigger>
          <TabsTrigger
            value="kalkulation"
            className="rounded-lg data-[state=active]:bg-zinc-800 data-[state=active]:text-zinc-100"
          >
            Kalkulation
          </TabsTrigger>
        </TabsList>

        <TabsContent value="uebersicht" className="mt-0 space-y-4 rounded-xl border border-zinc-800/60 bg-zinc-900/30 p-5">
          <div>
            <h2 className="mb-2 text-xs font-semibold tracking-wider text-zinc-500 uppercase">
              Beschreibung
            </h2>
            <p className="text-sm text-zinc-300 whitespace-pre-wrap">
              {projekt.description?.trim() || "—"}
            </p>
          </div>
          <div>
            <h2 className="mb-2 text-xs font-semibold tracking-wider text-zinc-500 uppercase">
              Notizen
            </h2>
            <p className="text-sm text-zinc-400 whitespace-pre-wrap">
              {projekt.notes?.trim() || "—"}
            </p>
          </div>
        </TabsContent>

        <TabsContent value="kalkulation" className="mt-0 rounded-xl border border-zinc-800/60 bg-zinc-900/30 p-5">
          <KalkulationTab projectId={id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

import { Bot, MessageSquare, Sparkles, Zap } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { KiAgenten } from "@/components/ki/KiAgenten";
import { KiAutomatisierungen } from "@/components/ki/KiAutomatisierungen";
import { KiChat } from "@/components/ki/KiChat";

const kiTabIds = ["chat", "agenten", "automatisierungen"] as const;
type KiTabId = (typeof kiTabIds)[number];

function parseKiTab(tab: string | string[] | undefined): KiTabId {
  const v = Array.isArray(tab) ? tab[0] : tab;
  return v && kiTabIds.includes(v as KiTabId) ? (v as KiTabId) : "chat";
}

type KiSeiteProps = {
  searchParams?: { tab?: string | string[] };
};

export default function KiSeite({ searchParams }: KiSeiteProps) {
  const aktivTab = parseKiTab(searchParams?.tab);

  return (
    <div className="flex min-h-[calc(100dvh-6rem)] flex-col gap-6">
      <div className="mb-2 flex flex-wrap items-center gap-3">
        <div className="rounded-xl bg-violet-500/20 p-2.5">
          <Sparkles size={20} className="text-violet-400" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-50">
            KI-Assistent
          </h1>
          <p className="text-sm text-zinc-400">
            Chat, Agenten und Automatisierungen mit Zugriff auf deine Daten
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900 px-3 py-1.5">
          <div className="size-2 animate-pulse rounded-full bg-emerald-400" />
          <span className="text-xs text-zinc-400">Gemini verbunden</span>
        </div>
      </div>

      <Tabs
        defaultValue={aktivTab}
        className="flex w-full flex-1 flex-col gap-4"
      >
        <TabsList className="h-auto w-full flex-wrap justify-start gap-1 rounded-xl border border-zinc-800 bg-zinc-900/50 p-1 sm:w-auto">
          <TabsTrigger
            value="chat"
            className="rounded-lg data-[state=active]:bg-zinc-800"
          >
            <MessageSquare size={14} className="mr-1.5" />
            Chat
          </TabsTrigger>
          <TabsTrigger
            value="agenten"
            className="rounded-lg data-[state=active]:bg-zinc-800"
          >
            <Bot size={14} className="mr-1.5" />
            Agenten
          </TabsTrigger>
          <TabsTrigger
            value="automatisierungen"
            className="rounded-lg data-[state=active]:bg-zinc-800"
          >
            <Zap size={14} className="mr-1.5" />
            Automatisierungen
          </TabsTrigger>
        </TabsList>
        <TabsContent value="chat" className="mt-0 flex min-h-0 flex-1 flex-col">
          <KiChat />
        </TabsContent>
        <TabsContent value="agenten" className="mt-0">
          <KiAgenten />
        </TabsContent>
        <TabsContent value="automatisierungen" className="mt-0">
          <KiAutomatisierungen />
        </TabsContent>
      </Tabs>
    </div>
  );
}

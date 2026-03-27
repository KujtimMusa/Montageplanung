import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { KiAssistentSeite } from "@/components/agenten/KiAssistentSeite";
import { KiAgentenPlatzhalter } from "@/components/agenten/KiAgentenPlatzhalter";
import { KiAutomatisierungenPlatzhalter } from "@/components/agenten/KiAutomatisierungenPlatzhalter";

export default function KiAssistentRoute() {
  return (
    <div className="flex min-h-[calc(100dvh-6rem)] flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-50">
          KI-Assistent
        </h1>
        <p className="text-sm text-zinc-400">
          Chat, Agenten und Automatisierungen — mit Kontext aus Ihrer Datenbank.
        </p>
      </div>
      <Tabs defaultValue="chat" className="flex w-full flex-1 flex-col gap-4">
        <TabsList className="w-full justify-start bg-zinc-900 sm:w-auto">
          <TabsTrigger value="chat">Chat</TabsTrigger>
          <TabsTrigger value="agenten">Agenten</TabsTrigger>
          <TabsTrigger value="automation">Automatisierungen</TabsTrigger>
        </TabsList>
        <TabsContent value="chat" className="mt-0 flex-1">
          <KiAssistentSeite />
        </TabsContent>
        <TabsContent value="agenten" className="mt-0">
          <KiAgentenPlatzhalter />
        </TabsContent>
        <TabsContent value="automation" className="mt-0">
          <KiAutomatisierungenPlatzhalter />
        </TabsContent>
      </Tabs>
    </div>
  );
}

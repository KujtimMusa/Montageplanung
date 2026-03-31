"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Bell, Building2, Plug, User } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { IntegrationenTab, type EnvFlags } from "@/components/einstellungen/IntegrationenTab";
import { BenachrichtigungenTab } from "@/components/einstellungen/BenachrichtigungenTab";
import { ProfilTab } from "@/components/einstellungen/ProfilTab";
import { BetriebTab } from "@/components/einstellungen/BetriebTab";

const tabIds = [
  "betrieb",
  "integrationen",
  "benachrichtigungen",
  "profil",
] as const;

const defaultEnvFlags: EnvFlags = {
  gemini_api_key: false,
  twilio_account_sid: false,
  twilio_auth_token: false,
  twilio_from_number: false,
  resend_api_key: false,
  resend_from_email: false,
  teams_webhook_url: false,
};

export function EinstellungenInhalt() {
  const sp = useSearchParams();
  const tabParam = sp.get("tab");
  const initial =
    tabParam && tabIds.includes(tabParam as (typeof tabIds)[number])
      ? tabParam
      : "betrieb";
  const [tab, setTab] = useState(initial);
  const [envFlags, setEnvFlags] = useState<EnvFlags>(defaultEnvFlags);
  const tabs = [
    { id: "betrieb", label: "Betrieb", icon: <Building2 size={14} /> },
    { id: "integrationen", label: "Integrationen", icon: <Plug size={14} /> },
    {
      id: "benachrichtigungen",
      label: "Benachrichtigungen",
      icon: <Bell size={14} />,
    },
    { id: "profil", label: "Profil", icon: <User size={14} /> },
  ] as const;

  useEffect(() => {
    if (
      tabParam &&
      tabIds.includes(tabParam as (typeof tabIds)[number])
    ) {
      setTab(tabParam);
    }
  }, [tabParam]);

  useEffect(() => {
    void fetch("/api/einstellungen/env-flags")
      .then((r) => r.json())
      .then((j: Partial<EnvFlags> & { error?: string }) => {
        if (j.error) return;
        setEnvFlags({
          gemini_api_key: Boolean(j.gemini_api_key),
          twilio_account_sid: Boolean(j.twilio_account_sid),
          twilio_auth_token: Boolean(j.twilio_auth_token),
          twilio_from_number: Boolean(j.twilio_from_number),
          resend_api_key: Boolean(j.resend_api_key),
          resend_from_email: Boolean(j.resend_from_email),
          teams_webhook_url: Boolean(j.teams_webhook_url),
        });
      })
      .catch(() => {});
  }, []);

  return (
    <Tabs value={tab} onValueChange={setTab} className="w-full space-y-6">
      <TabsList className="h-auto w-full rounded-xl border border-zinc-800/60 bg-zinc-900 p-1">
        {tabs.map((t) => (
          <TabsTrigger
            key={t.id}
            value={t.id}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-xs text-zinc-500 transition-all data-[state=active]:border data-[state=active]:border-zinc-700/60 data-[state=active]:bg-zinc-800 data-[state=active]:text-zinc-100"
          >
            {t.icon}
            {t.label}
          </TabsTrigger>
        ))}
      </TabsList>

      <TabsContent value="betrieb" className="mt-0">
        <BetriebTab />
      </TabsContent>

      <TabsContent value="integrationen" className="mt-0">
        <IntegrationenTab envFlags={envFlags} />
      </TabsContent>

      <TabsContent value="benachrichtigungen" className="mt-0">
        <BenachrichtigungenTab />
      </TabsContent>

      <TabsContent value="profil" className="mt-0">
        <ProfilTab />
      </TabsContent>
    </Tabs>
  );
}

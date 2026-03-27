"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { useSettings } from "@/lib/hooks/useSettings";

export function PersonioSyncPanel() {
  const { getSetting, updateSetting, loading } = useSettings();
  const [apiKey, setApiKey] = useState("");
  const [subdomain, setSubdomain] = useState("");
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [autoSync, setAutoSync] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const laden = useCallback(async () => {
    const [k, s, l, a] = await Promise.all([
      getSetting("personio_api_key"),
      getSetting("personio_subdomain"),
      getSetting("personio_last_sync"),
      getSetting("personio_auto_sync"),
    ]);
    setApiKey(k ?? "");
    setSubdomain(s ?? "");
    setLastSync(l);
    setAutoSync(a === "true");
  }, [getSetting]);

  useEffect(() => {
    void laden();
  }, [laden]);

  async function speichern() {
    const ok =
      (await updateSetting("personio_api_key", apiKey || null)) &&
      (await updateSetting("personio_subdomain", subdomain || null)) &&
      (await updateSetting("personio_auto_sync", autoSync ? "true" : "false"));
    if (ok) toast.success("Personio-Einstellungen gespeichert.");
    else toast.error("Speichern fehlgeschlagen.");
  }

  async function synchronisieren() {
    setSyncing(true);
    try {
      const res = await fetch("/api/personio/sync", { method: "POST" });
      const data = (await res.json()) as { message?: string; syncedAt?: string };
      if (!res.ok) {
        toast.error(data.message ?? "Sync fehlgeschlagen.");
        return;
      }
      toast.success(data.message ?? "Synchronisation ausgelöst.");
      if (data.syncedAt) setLastSync(data.syncedAt);
    } catch {
      toast.error("Netzwerkfehler.");
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        API-Zugang aus dem Personio-Konto. Vollständiger Datenimport folgt mit
        der nächsten Ausbaustufe.
      </p>
      <div className="grid gap-4 sm:max-w-md">
        <div className="space-y-2">
          <Label htmlFor="personio-sub">Subdomain</Label>
          <Input
            id="personio-sub"
            placeholder="firma"
            value={subdomain}
            onChange={(e) => setSubdomain(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            z. B. <code className="rounded bg-zinc-800 px-1">firma</code> für
            firma.personio.de
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="personio-key">API-Key</Label>
          <Input
            id="personio-key"
            type="password"
            autoComplete="off"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
          />
        </div>
        <div className="flex items-start gap-3 rounded-lg border border-zinc-800 p-3">
          <Checkbox
            id="personio-auto"
            checked={autoSync}
            onCheckedChange={(v) => setAutoSync(v === true)}
          />
          <div>
            <Label htmlFor="personio-auto" className="text-sm font-medium">
              Täglicher Auto-Sync (06:00 Uhr)
            </Label>
            <p className="text-xs text-muted-foreground">
              Erfordert Cron / Edge Function auf der Serverseite.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={() => void speichern()} disabled={loading}>
            Speichern
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => void synchronisieren()}
            disabled={syncing}
          >
            {syncing ? "Synchronisiere…" : "Jetzt synchronisieren"}
          </Button>
        </div>
        {lastSync && (
          <p className="text-xs text-muted-foreground">
            Letzter Sync: {new Date(lastSync).toLocaleString("de-DE")}
          </p>
        )}
      </div>
    </div>
  );
}

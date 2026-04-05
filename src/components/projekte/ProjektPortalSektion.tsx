"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { templateKundenZugang } from "@/lib/email-templates";

type Props = {
  projectId: string;
  customerToken: string;
  projectTitle: string;
  orgName: string;
  appUrl: string;
};

type DocRow = {
  id: string;
  type: string;
  title: string | null;
  content: string | null;
  file_url: string | null;
  created_at: string;
};

export function ProjektPortalSektion({
  projectId,
  customerToken,
  projectTitle,
  orgName,
  appUrl,
}: Props) {
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [laedt, setLaedt] = useState(true);
  const [mailTo, setMailTo] = useState("");
  const [sende, setSende] = useState(false);

  const kundenUrl = `${appUrl.replace(/\/$/, "")}/k/${customerToken}`;

  useEffect(() => {
    setLaedt(true);
    void (async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("site_docs")
        .select("id,type,title,content,file_url,created_at")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });
      if (!error && data) setDocs(data as DocRow[]);
      setLaedt(false);
    })();
  }, [projectId]);

  async function kopierenLink() {
    try {
      await navigator.clipboard.writeText(kundenUrl);
      toast.success("Kunden-Link kopiert");
    } catch {
      toast.error("Kopieren fehlgeschlagen");
    }
  }

  async function emailSenden() {
    const to = mailTo.trim();
    if (!to) {
      toast.error("E-Mail-Adresse eingeben");
      return;
    }
    setSende(true);
    try {
      const { subject, html } = templateKundenZugang({
        kundenName: "geehrte Kundin, geehrter Kunde",
        projektName: projectTitle,
        firmenName: orgName,
        kundenLink: kundenUrl,
      });
      const res = await fetch("/api/email/senden", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to, subject, html }),
      });
      if (res.ok) toast.success("E-Mail ausgelöst");
      else toast.error("Versand fehlgeschlagen");
    } finally {
      setSende(false);
    }
  }

  if (laedt) {
    return (
      <div className="flex items-center gap-2 text-sm text-zinc-500">
        <Loader2 className="size-4 animate-spin" />
        Baudokumentation…
      </div>
    );
  }

  const fotos = docs.filter((d) => d.type.startsWith("foto"));
  const notizen = docs.filter((d) => d.type === "notiz");

  return (
    <div className="space-y-6 border-t border-zinc-800 pt-4">
      <div>
        <p className="mb-2 text-sm font-medium text-zinc-300">Kunden-Zugang</p>
        <p className="break-all font-mono text-xs text-zinc-500">{customerToken}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="secondary" onClick={kopierenLink}>
            Link kopieren
          </Button>
        </div>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
          <input
            type="email"
            placeholder="kunde@…"
            value={mailTo}
            onChange={(e) => setMailTo(e.target.value)}
            className="h-9 flex-1 rounded-md border border-zinc-800 bg-zinc-900 px-3 text-sm text-zinc-100"
          />
          <Button
            type="button"
            size="sm"
            disabled={sende}
            onClick={() => void emailSenden()}
          >
            {sende ? <Loader2 className="size-4 animate-spin" /> : "Per E-Mail senden"}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="fotos">
        <TabsList className="bg-zinc-900">
          <TabsTrigger value="fotos">Fotos</TabsTrigger>
          <TabsTrigger value="notizen">Notizen</TabsTrigger>
        </TabsList>
        <TabsContent value="fotos" className="mt-3">
          {fotos.length === 0 ? (
            <p className="text-sm text-zinc-500">Noch keine Fotos.</p>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {fotos.map((f) => (
                <a
                  key={f.id}
                  href={f.file_url ?? "#"}
                  target="_blank"
                  rel="noreferrer"
                  className="aspect-square overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={f.file_url ?? ""} alt="" className="size-full object-cover" />
                </a>
              ))}
            </div>
          )}
        </TabsContent>
        <TabsContent value="notizen" className="mt-3">
          <ul className="space-y-2">
            {notizen.map((n) => (
              <li
                key={n.id}
                className="rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2 text-sm text-zinc-300"
              >
                <p className="text-xs text-zinc-500">
                  {new Date(n.created_at).toLocaleString("de-DE")}
                </p>
                <p className="mt-1 whitespace-pre-wrap">{n.content}</p>
              </li>
            ))}
          </ul>
        </TabsContent>
      </Tabs>
    </div>
  );
}

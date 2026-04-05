"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

type DocRow = {
  id: string;
  type: string;
  title: string | null;
  content: string | null;
  file_url: string | null;
  file_name: string | null;
  created_at: string;
};

type Props = {
  token: string;
  projectId: string;
  assignmentId: string;
};

const FOTO_TYPEN = [
  { value: "foto_vorher", label: "Vorher" },
  { value: "foto_nachher", label: "Nachher" },
  { value: "foto_problem", label: "Problem" },
  { value: "foto_sonstiges", label: "Sonstiges" },
];

export function EinsatzBaudoku({ token, projectId, assignmentId }: Props) {
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [laedt, setLaedt] = useState(true);
  const [notizTyp, setNotizTyp] = useState("Allgemein");
  const [notizText, setNotizText] = useState("");
  const [uploadTyp, setUploadTyp] = useState("foto_sonstiges");
  const [uploading, setUploading] = useState(false);

  const laden = useCallback(async () => {
    setLaedt(true);
    try {
      const u = new URL("/api/pwa/site-docs", window.location.origin);
      u.searchParams.set("token", token);
      u.searchParams.set("assignmentId", assignmentId);
      u.searchParams.set("projectId", projectId);
      const res = await fetch(u.toString());
      const j = (await res.json()) as { docs?: DocRow[] };
      setDocs(j.docs ?? []);
    } catch {
      setDocs([]);
    } finally {
      setLaedt(false);
    }
  }, [token, assignmentId, projectId]);

  useEffect(() => {
    void laden();
  }, [laden]);

  async function notizSpeichern() {
    const t = notizText.trim();
    if (!t) {
      toast.error("Bitte Text eingeben.");
      return;
    }
    const res = await fetch("/api/pwa/site-docs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token,
        project_id: projectId,
        assignment_id: assignmentId,
        type: "notiz",
        title: notizTyp,
        content: t,
      }),
    });
    if (res.ok) {
      toast.success("Notiz gespeichert");
      setNotizText("");
      void laden();
    } else {
      toast.error("Speichern fehlgeschlagen");
    }
  }

  async function dateiHochladen(file: File, typ: string) {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.set("token", token);
      fd.set("project_id", projectId);
      fd.set("assignment_id", assignmentId);
      fd.set("type", typ);
      fd.set("file", file);
      const res = await fetch("/api/pwa/foto-upload", { method: "POST", body: fd });
      if (res.ok) {
        toast.success("Hochgeladen");
        void laden();
      } else {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error(j.error ?? "Upload fehlgeschlagen");
      }
    } finally {
      setUploading(false);
    }
  }

  const fotos = docs.filter((d) => d.type.startsWith("foto"));
  const notizen = docs.filter((d) => d.type === "notiz");
  const dokumente = docs.filter((d) => d.type === "dokument");

  return (
    <Tabs defaultValue="fotos" className="w-full">
      <TabsList className="grid w-full grid-cols-3 bg-zinc-900">
        <TabsTrigger value="fotos">Fotos</TabsTrigger>
        <TabsTrigger value="notizen">Notizen</TabsTrigger>
        <TabsTrigger value="dokumente">Dokumente</TabsTrigger>
      </TabsList>
      <TabsContent value="fotos" className="space-y-4 pt-4">
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={uploadTyp}
            onValueChange={(v) => {
              if (v) setUploadTyp(v);
            }}
          >
            <SelectTrigger className="w-full max-w-[200px] text-base">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FOTO_TYPEN.map((x) => (
                <SelectItem key={x.value} value={x.value}>
                  {x.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <label className="touch-target inline-flex cursor-pointer items-center justify-center rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-200">
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="sr-only"
              disabled={uploading}
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (f) void dateiHochladen(f, uploadTyp);
              }}
            />
            {uploading ? <Loader2 className="size-4 animate-spin" /> : "Kamera / Foto"}
          </label>
        </div>
        {laedt ? (
          <Loader2 className="size-6 animate-spin text-zinc-500" />
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {fotos.map((d) => (
              <a
                key={d.id}
                href={d.file_url ?? "#"}
                target="_blank"
                rel="noreferrer"
                className="relative aspect-square overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={d.file_url ?? ""}
                  alt=""
                  className="size-full object-cover"
                />
                <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1 text-[10px] text-white">
                  {d.type.replace("foto_", "")}
                </span>
              </a>
            ))}
          </div>
        )}
      </TabsContent>
      <TabsContent value="notizen" className="space-y-3 pt-4">
        <Select
          value={notizTyp}
          onValueChange={(v) => {
            if (v) setNotizTyp(v);
          }}
        >
          <SelectTrigger className="text-base">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {["Allgemein", "Problem", "Erledigt", "Rückfrage"].map((x) => (
              <SelectItem key={x} value={x}>
                {x}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Textarea
          value={notizText}
          onChange={(e) => setNotizText(e.target.value)}
          placeholder="Notiz…"
          className="min-h-[120px] text-base"
        />
        <Button type="button" className="w-full" onClick={() => void notizSpeichern()}>
          Speichern
        </Button>
        <ul className="space-y-2 border-t border-zinc-800 pt-4">
          {notizen.map((n) => (
            <li
              key={n.id}
              className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3 text-sm"
            >
              <p className="text-xs text-zinc-500">
                {n.title} · {new Date(n.created_at).toLocaleString("de-DE")}
              </p>
              <p className="mt-1 whitespace-pre-wrap text-zinc-200">{n.content}</p>
            </li>
          ))}
        </ul>
      </TabsContent>
      <TabsContent value="dokumente" className="space-y-4 pt-4">
        <label className="touch-target inline-flex cursor-pointer items-center justify-center rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm font-medium">
          <input
            type="file"
            accept=".pdf,.doc,.docx,image/jpeg,image/png"
            className="sr-only"
            disabled={uploading}
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (f) void dateiHochladen(f, "dokument");
            }}
          />
          PDF / Dokument hochladen
        </label>
        <ul className="space-y-2">
          {dokumente.map((d) => (
            <li
              key={d.id}
              className="flex items-center justify-between gap-2 rounded-lg border border-zinc-800 px-3 py-2 text-sm"
            >
              <span className="truncate">{d.file_name ?? "Dokument"}</span>
              {d.file_url ? (
                <a
                  href={d.file_url}
                  target="_blank"
                  rel="noreferrer"
                  className="shrink-0 text-blue-400"
                >
                  Öffnen
                </a>
              ) : null}
            </li>
          ))}
        </ul>
      </TabsContent>
    </Tabs>
  );
}

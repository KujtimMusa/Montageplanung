"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

type Doc = {
  id: string;
  type: string;
  file_url: string | null;
  created_at: string;
};

export function PwaFotosClient({ token }: { token: string }) {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [laedt, setLaedt] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const u = new URL("/api/pwa/site-docs", window.location.origin);
        u.searchParams.set("token", token);
        u.searchParams.set("type", "foto");
        const res = await fetch(u.toString());
        const j = (await res.json()) as { docs?: Doc[] };
        if (!cancelled) setDocs(j.docs ?? []);
      } finally {
        if (!cancelled) setLaedt(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (laedt) {
    return <Loader2 className="mx-auto mt-8 size-8 animate-spin text-zinc-500" />;
  }

  if (docs.length === 0) {
    return (
      <p className="mt-8 text-center text-sm text-zinc-500">Noch keine Fotos.</p>
    );
  }

  return (
    <div className="mt-4 grid grid-cols-2 gap-2">
      {docs.map((d) => (
        <a
          key={d.id}
          href={d.file_url ?? "#"}
          target="_blank"
          rel="noreferrer"
          className="relative aspect-square overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={d.file_url ?? ""} alt="" className="size-full object-cover" />
          <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1 text-[10px] text-white">
            {d.type.replace("foto_", "")}
          </span>
        </a>
      ))}
    </div>
  );
}

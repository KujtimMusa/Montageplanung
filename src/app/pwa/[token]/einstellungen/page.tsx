"use client";

import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useKoordinatorPwa } from "@/lib/pwa/koordinator-context";
import { rolleLabel } from "@/lib/rollen";

export default function KoordinatorPwaEinstellungenPage() {
  const params = useParams<{ token: string }>();
  const token = params.token;
  const { resolved } = useKoordinatorPwa();
  const [qrOffen, setQrOffen] = useState(false);

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
  const pwaUrl = `${appUrl}/pwa/${token}`;

  async function kopieren() {
    try {
      await navigator.clipboard.writeText(pwaUrl);
      toast.success("Link kopiert");
    } catch {
      toast.error("Kopieren fehlgeschlagen");
    }
  }

  return (
    <div className="space-y-6 p-4">
      <h1 className="text-xl font-bold text-zinc-50">Einstellungen</h1>
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
        <p className="text-sm font-medium text-zinc-200">{resolved.employeeName}</p>
        <p className="text-xs text-zinc-500">{rolleLabel(resolved.employeeRole)}</p>
        <p className="mt-1 text-xs text-zinc-600">{resolved.orgName}</p>
      </div>

      <div className="space-y-2">
        <Button type="button" variant="secondary" className="w-full" onClick={kopieren}>
          Diesen PWA-Link kopieren
        </Button>
        <Button
          type="button"
          variant="outline"
          className="w-full border-zinc-700"
          onClick={() => setQrOffen((o) => !o)}
        >
          QR-Code anzeigen
        </Button>
        {qrOffen ? (
          <div className="flex flex-col items-center rounded-xl border border-zinc-800 bg-zinc-950 p-4">
            <QRCodeSVG value={pwaUrl} size={200} level="M" fgColor="#e4e4e7" bgColor="#09090b" />
          </div>
        ) : null}
      </div>

      <Link
        href="/dashboard"
        className="block text-center text-sm font-medium text-[#01696f]"
      >
        Volle App im Browser öffnen →
      </Link>
    </div>
  );
}

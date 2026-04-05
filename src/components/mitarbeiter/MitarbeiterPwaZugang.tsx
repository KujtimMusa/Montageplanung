"use client";

import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

type Props = {
  mitarbeiterId: string;
  pwaToken: string;
  appUrl: string;
};

export function MitarbeiterPwaZugang({ mitarbeiterId, pwaToken, appUrl }: Props) {
  const [qrOffen, setQrOffen] = useState(false);
  const [setzeZurueck, setSetzeZurueck] = useState(false);

  const vollUrl = `${appUrl.replace(/\/$/, "")}/m/${pwaToken}/projekte`;

  async function kopieren() {
    try {
      await navigator.clipboard.writeText(vollUrl);
      toast.success("Link kopiert");
    } catch {
      toast.error("Kopieren fehlgeschlagen");
    }
  }

  async function tokenZuruecksetzen() {
    setSetzeZurueck(true);
    try {
      const res = await fetch(`/api/admin/mitarbeiter/${mitarbeiterId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ regenerate_pwa_token: true }),
      });
      const j = (await res.json().catch(() => ({}))) as { fehler?: string };
      if (!res.ok) {
        toast.error(j.fehler ?? "Fehler");
        return;
      }
      toast.success("Neuer Token gesetzt — Seite neu laden.");
      window.location.reload();
    } finally {
      setSetzeZurueck(false);
    }
  }

  return (
    <div className="rounded-xl border border-violet-900/40 bg-violet-950/20 px-4 py-4">
      <p className="text-sm font-semibold text-violet-200">PWA-Zugang (Monteur)</p>
      <p className="mt-1 break-all font-mono text-xs text-zinc-500">{pwaToken}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="secondary" onClick={kopieren}>
          Link kopieren
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setQrOffen(true)}
        >
          QR-Code
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={setzeZurueck}
          onClick={() => void tokenZuruecksetzen()}
        >
          {setzeZurueck ? <Loader2 className="size-4 animate-spin" /> : "Token zurücksetzen"}
        </Button>
      </div>

      <Dialog open={qrOffen} onOpenChange={setQrOffen}>
        <DialogContent className="border-zinc-800 bg-zinc-950 sm:max-w-md print:border-0 print:shadow-none">
          <DialogHeader>
            <DialogTitle className="text-zinc-100">Monteur-Link</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 print:p-4">
            <QRCodeSVG value={vollUrl} size={256} level="M" fgColor="#e4e4e7" bgColor="#09090b" />
            <Button
              type="button"
              variant="secondary"
              className="print:hidden"
              onClick={() => window.print()}
            >
              QR-Code drucken
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

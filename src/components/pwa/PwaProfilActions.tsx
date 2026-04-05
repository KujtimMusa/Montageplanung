"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { PwaPushSubscribe } from "@/components/pwa/PwaPushSubscribe";

export function PwaProfilActions({
  token,
  vapidKonfiguriert,
}: {
  token: string;
  vapidKonfiguriert: boolean;
}) {
  const [busy, setBusy] = useState(false);

  function kopieren() {
    const base =
      typeof window !== "undefined"
        ? `${window.location.origin}/m/${token}/projekte`
        : "";
    setBusy(true);
    void navigator.clipboard
      .writeText(base)
      .then(() => {
        toast.success("Link kopiert");
      })
      .catch(() => toast.error("Kopieren fehlgeschlagen"))
      .finally(() => setBusy(false));
  }

  return (
    <div className="space-y-3">
      <PwaPushSubscribe token={token} vapidKonfiguriert={vapidKonfiguriert} />
      <Button
        type="button"
        variant="secondary"
        className="touch-target w-full"
        disabled={busy}
        onClick={kopieren}
      >
        Link kopieren (PWA)
      </Button>
    </div>
  );
}

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function PwaProfilActions({ token }: { token: string }) {
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
    <Button
      type="button"
      variant="secondary"
      className="touch-target w-full"
      disabled={busy}
      onClick={kopieren}
    >
      Link kopieren (PWA)
    </Button>
  );
}

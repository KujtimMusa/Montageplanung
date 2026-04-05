"use client";

import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

type Props = {
  token: string;
  assignmentId: string;
  projectId: string | null;
};

export function ZeiterfassungWidget({
  token,
  assignmentId,
  projectId,
}: Props) {
  const [laedt, setLaedt] = useState(true);
  const [aktion, setAktion] = useState(false);
  const [openEntry, setOpenEntry] = useState<{
    id: string;
    checkin_at: string;
  } | null>(null);
  const [fertigMin, setFertigMin] = useState<number | null>(null);

  const laden = useCallback(async () => {
    setLaedt(true);
    try {
      const u = new URL("/api/pwa/time-entries", window.location.origin);
      u.searchParams.set("token", token);
      u.searchParams.set("assignmentId", assignmentId);
      const res = await fetch(u.toString());
      const j = (await res.json()) as {
        hasOpenEntry?: boolean;
        entry?: { id: string; checkin_at: string };
      };
      if (j.hasOpenEntry && j.entry) {
        setOpenEntry(j.entry);
      } else {
        setOpenEntry(null);
      }
    } catch {
      setOpenEntry(null);
    } finally {
      setLaedt(false);
    }
  }, [token, assignmentId]);

  useEffect(() => {
    void laden();
  }, [laden]);

  async function einstempeln() {
    setAktion(true);
    setFertigMin(null);
    let lat: number | undefined;
    let lng: number | undefined;
    if (typeof navigator !== "undefined" && navigator.geolocation) {
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            timeout: 5000,
            maximumAge: 60_000,
          });
        });
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
      } catch {
        /* optional */
      }
    }
    try {
      const res = await fetch("/api/pwa/time-entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          assignment_id: assignmentId,
          project_id: projectId,
          lat: lat ?? null,
          lng: lng ?? null,
        }),
      });
      if (res.ok) {
        const j = (await res.json()) as { entry_id: string; checkin_at: string };
        setOpenEntry({ id: j.entry_id, checkin_at: j.checkin_at });
      }
    } finally {
      setAktion(false);
    }
  }

  async function ausstempeln() {
    if (!openEntry) return;
    setAktion(true);
    try {
      const res = await fetch("/api/pwa/time-entries", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, entry_id: openEntry.id }),
      });
      if (res.ok) {
        const j = (await res.json()) as { duration_minutes: number };
        setOpenEntry(null);
        setFertigMin(j.duration_minutes ?? 0);
      }
    } finally {
      setAktion(false);
    }
  }

  if (laedt) {
    return (
      <div className="flex items-center gap-2 py-6 text-zinc-500">
        <Loader2 className="size-5 animate-spin" />
        Zeiterfassung…
      </div>
    );
  }

  if (fertigMin !== null) {
    const h = Math.floor(fertigMin / 60);
    const m = fertigMin % 60;
    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 text-center">
        <p className="text-lg font-semibold text-emerald-400">
          Heute: {h > 0 ? `${h} Std. ` : ""}
          {m} Min. ✓
        </p>
        <Button
          type="button"
          variant="outline"
          className="mt-3"
          onClick={() => setFertigMin(null)}
        >
          Schließen
        </Button>
      </div>
    );
  }

  if (openEntry) {
    const seit = format(new Date(openEntry.checkin_at), "HH:mm", { locale: de });
    return (
      <div className="space-y-3">
        <p className="text-center text-sm text-emerald-400">
          Eingestempelt seit {seit}
        </p>
        <Button
          type="button"
          className="btn-checkout h-20 w-full rounded-2xl text-xl font-bold text-white"
          disabled={aktion}
          onClick={() => void ausstempeln()}
        >
          {aktion ? <Loader2 className="mx-auto size-6 animate-spin" /> : "AUSSTEMPELN"}
        </Button>
      </div>
    );
  }

  return (
    <Button
      type="button"
      className="btn-checkin h-20 w-full rounded-2xl text-xl font-bold"
      disabled={aktion}
      onClick={() => void einstempeln()}
    >
      {aktion ? <Loader2 className="mx-auto size-6 animate-spin" /> : "EINSTEMPELN"}
    </Button>
  );
}

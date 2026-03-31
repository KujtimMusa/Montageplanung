"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Building2 } from "lucide-react";

export default function OnboardingPage() {
  const router = useRouter();
  const [betrieb, setBetrieb] = useState("");
  const [vorname, setVorname] = useState("");
  const [laedt, setLaedt] = useState(false);
  const [fehler, setFehler] = useState("");

  async function gruenden() {
    if (!betrieb.trim()) return;
    setLaedt(true);
    setFehler("");

    const res = await fetch("/api/org/gruenden", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        betrieb_name: betrieb,
        vorname,
      }),
    });

    if (!res.ok) {
      const data = (await res.json()) as { error?: string };
      setFehler(data.error ?? "Fehler beim Einrichten");
      setLaedt(false);
      return;
    }

    router.push("/dashboard");
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-8">
        <div>
          <div className="w-10 h-10 rounded-2xl bg-violet-600/20 border border-violet-500/20 flex items-center justify-center mb-4">
            <Building2 size={18} className="text-violet-400" />
          </div>
          <h1 className="text-2xl font-bold text-zinc-100">Betrieb einrichten</h1>
          <p className="text-sm text-zinc-500 mt-2">
            Richte deinen Betrieb ein. Du kannst danach Koordinatoren per Link
            einladen.
          </p>
        </div>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-400">
              Betriebsname *
            </label>
            <input
              type="text"
              value={betrieb}
              onChange={(e) => setBetrieb(e.target.value)}
              placeholder="Mustermann GmbH"
              autoFocus
              className="w-full px-4 py-3 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-violet-500/50 text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-400">Dein Name</label>
            <input
              type="text"
              value={vorname}
              onChange={(e) => setVorname(e.target.value)}
              placeholder="Max Mustermann"
              className="w-full px-4 py-3 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-violet-500/50 text-sm"
            />
          </div>

          {fehler && <p className="text-xs text-red-400">{fehler}</p>}

          <button
            onClick={() => void gruenden()}
            disabled={laedt || !betrieb.trim()}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-sm disabled:opacity-40 transition-all"
          >
            {laedt ? (
              "Wird eingerichtet..."
            ) : (
              <>
                Betrieb einrichten
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </div>

        <p className="text-xs text-zinc-600 text-center">
          Monteure brauchen keinen Login — sie erhalten ihre Einsaetze per E-Mail
          und Kalender.
        </p>
      </div>
    </div>
  );
}

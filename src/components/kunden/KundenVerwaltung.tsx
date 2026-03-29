"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
} from "react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { Building2, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { nachrichtAusUnbekannt } from "@/lib/fehler";

const INPUT_CLASS = `w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100
  placeholder:text-zinc-600 focus:border-zinc-700 focus:ring-1 focus:ring-zinc-700/50
  focus:outline-none transition-all`;

type ProjektMini = { id: string; title: string; status: string };

type KundeZeile = {
  id: string;
  company_name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  address: string;
  notes: string | null;
  created_at: string;
  projekte: ProjektMini[];
};

type FormState = {
  name: string;
  ansprechpartner: string;
  telefon: string;
  email: string;
  adresse: string;
  notiz: string;
};

function FormField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <span className="text-xs font-semibold tracking-wide text-zinc-400 uppercase">
        {label}
      </span>
      {children}
    </div>
  );
}

export type KundenVerwaltungHandle = { openNeu: () => void };

type KundenVerwaltungProps = {
  embedded?: boolean;
  tabAktiv?: boolean;
  onAnzahlKundenChange?: (n: number) => void;
};

export const KundenVerwaltung = forwardRef<
  KundenVerwaltungHandle,
  KundenVerwaltungProps
>(function KundenVerwaltung(
  { embedded = false, tabAktiv = true, onAnzahlKundenChange },
  ref
) {
  const supabase = useMemo(() => createClient(), []);
  const [zeilen, setZeilen] = useState<KundeZeile[]>([]);
  const [dialogOffen, setDialogOffen] = useState(false);
  const [bearbeite, setBearbeite] = useState<KundeZeile | null>(null);
  const [form, setForm] = useState<FormState>({
    name: "",
    ansprechpartner: "",
    telefon: "",
    email: "",
    adresse: "",
    notiz: "",
  });
  const [suche, setSuche] = useState("");
  const [laedt, setLaedt] = useState(true);
  const [speichert, setSpeichert] = useState(false);

  const monatStart = useMemo(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).getTime();
  }, []);

  const laden = useCallback(async () => {
    setLaedt(true);
    try {
      const { data: kunden, error: e1 } = await supabase
        .from("customers")
        .select(
          "id,company_name,contact_name,email,phone,address,notes,created_at, projects(id,title,status)"
        )
        .order("company_name");

      if (e1) throw e1;

      const mapped: KundeZeile[] = (kunden ?? []).map((row) => {
        const pr = row.projects as ProjektMini[] | ProjektMini | null;
        const projekte = Array.isArray(pr) ? pr : pr ? [pr] : [];
        return {
          id: row.id as string,
          company_name: row.company_name as string,
          contact_name: (row.contact_name as string | null) ?? null,
          email: (row.email as string | null) ?? null,
          phone: (row.phone as string | null) ?? null,
          address: (row.address as string) ?? "",
          notes: (row.notes as string | null) ?? null,
          created_at: (row.created_at as string) ?? "",
          projekte,
        };
      });
      setZeilen(mapped);
    } catch (e) {
      toast.error(nachrichtAusUnbekannt(e, "Kunden konnten nicht geladen werden."));
    } finally {
      setLaedt(false);
    }
  }, [supabase]);

  useEffect(() => {
    if (!tabAktiv) return;
    void laden();
  }, [tabAktiv, laden]);

  useEffect(() => {
    onAnzahlKundenChange?.(zeilen.length);
  }, [zeilen, onAnzahlKundenChange]);

  const neuDiesenMonat = useMemo(() => {
    return zeilen.filter((z) => {
      const t = new Date(z.created_at).getTime();
      return !Number.isNaN(t) && t >= monatStart;
    }).length;
  }, [zeilen, monatStart]);

  const mitAktivenProjekten = useMemo(() => {
    return zeilen.filter((z) =>
      z.projekte.some((p) => p.status !== "abgeschlossen")
    ).length;
  }, [zeilen]);

  const gefiltert = useMemo(() => {
    const q = suche.trim().toLowerCase();
    if (!q) return zeilen;
    return zeilen.filter(
      (z) =>
        z.company_name.toLowerCase().includes(q) ||
        (z.contact_name ?? "").toLowerCase().includes(q) ||
        (z.email ?? "").toLowerCase().includes(q)
    );
  }, [zeilen, suche]);

  function formLeeren() {
    setForm({
      name: "",
      ansprechpartner: "",
      telefon: "",
      email: "",
      adresse: "",
      notiz: "",
    });
    setBearbeite(null);
  }

  function neuOeffnen() {
    formLeeren();
    setDialogOffen(true);
  }

  useImperativeHandle(ref, () => ({
    openNeu: neuOeffnen,
  }));

  function bearbeiten(k: KundeZeile) {
    setBearbeite(k);
    setForm({
      name: k.company_name,
      ansprechpartner: k.contact_name ?? "",
      telefon: k.phone ?? "",
      email: k.email ?? "",
      adresse: k.address,
      notiz: k.notes ?? "",
    });
    setDialogOffen(true);
  }

  async function speichern() {
    if (!form.name.trim()) {
      toast.error("Firmenname ist Pflicht.");
      return;
    }
    if (!form.adresse.trim()) {
      toast.error("Adresse ist Pflicht (Kurzform z. B. „nur Projekt“ möglich).");
      return;
    }
    setSpeichert(true);
    try {
      const payload = {
        company_name: form.name.trim(),
        contact_name: form.ansprechpartner.trim() || null,
        phone: form.telefon.trim() || null,
        email: form.email.trim() || null,
        address: form.adresse.trim(),
        notes: form.notiz.trim() || null,
      };
      if (bearbeite) {
        const { error } = await supabase
          .from("customers")
          .update(payload)
          .eq("id", bearbeite.id);
        if (error) throw error;
        toast.success("Kunde gespeichert.");
      } else {
        const { error } = await supabase.from("customers").insert(payload);
        if (error) throw error;
        toast.success("Kunde angelegt.");
      }
      setDialogOffen(false);
      formLeeren();
      void laden();
    } catch (e) {
      toast.error(nachrichtAusUnbekannt(e, "Speichern fehlgeschlagen."));
    } finally {
      setSpeichert(false);
    }
  }

  async function loeschen(id: string) {
    if (
      !globalThis.confirm(
        "Kunde wirklich löschen? Zugehörige Projekte behalten den Eintrag ohne Auftraggeber."
      )
    ) {
      return;
    }
    try {
      const { error } = await supabase.from("customers").delete().eq("id", id);
      if (error) throw error;
      toast.success("Kunde gelöscht.");
      setDialogOffen(false);
      formLeeren();
      void laden();
    } catch (e) {
      toast.error(nachrichtAusUnbekannt(e, "Löschen fehlgeschlagen."));
    }
  }

  const statKarten = [
    { label: "GESAMT KUNDEN", wert: zeilen.length, sub: "Im Auftraggeber-Stamm" },
    {
      label: "MIT AKTIVEN PROJEKTEN",
      wert: mitAktivenProjekten,
      sub: "Mind. ein nicht abgeschlossenes Projekt",
    },
    {
      label: "NEU DIESEN MONAT",
      wert: neuDiesenMonat,
      sub: "Erstellungsdatum",
    },
  ] as const;

  return (
    <div>
      {!embedded ? (
        <div className="mb-6 flex flex-col gap-4 sm:flex-col sm:items-start sm:justify-between">
          <div className="flex w-full flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-zinc-100">Kunden</h1>
              <p className="mt-0.5 text-sm text-zinc-500">
                Auftraggeber verwalten und Projekte zuordnen.
              </p>
            </div>
            <Button
              type="button"
              onClick={neuOeffnen}
              className="bg-zinc-100 font-semibold text-sm text-zinc-900 hover:bg-white"
            >
              <Plus size={15} className="mr-1.5" />
              Neuer Kunde
            </Button>
          </div>
        </div>
      ) : null}

      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {laedt
          ? statKarten.map((s) => (
              <div
                key={s.label}
                className="h-32 animate-pulse rounded-2xl bg-zinc-900/80"
              />
            ))
          : statKarten.map((k) => (
              <div
                key={k.label}
                className="rounded-2xl border border-zinc-800/60 bg-zinc-900 p-5 transition-all hover:border-zinc-700/60"
              >
                <p className="mb-4 text-xs font-semibold tracking-wider text-zinc-500 uppercase">
                  {k.label}
                </p>
                <p className="mb-1 text-4xl font-bold text-zinc-100 tabular-nums">{k.wert}</p>
                <p className="text-xs text-zinc-600">{k.sub}</p>
              </div>
            ))}
      </div>

      <div className="mb-4 flex gap-2">
        <div className="relative max-w-xs flex-1">
          <Search
            size={13}
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-zinc-500"
          />
          <input
            value={suche}
            onChange={(e) => setSuche(e.target.value)}
            placeholder="Name suchen…"
            className="w-full rounded-lg border border-zinc-800 bg-zinc-900 py-2 pr-3 pl-8 text-sm text-zinc-200 transition-colors placeholder:text-zinc-600 focus:border-zinc-700 focus:outline-none"
          />
        </div>
      </div>

      {laedt ? (
        <p className="text-sm text-zinc-500">Lade Kunden…</p>
      ) : zeilen.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 py-20">
          <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900 p-5">
            <Building2 size={32} className="text-zinc-600" />
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-zinc-400">
              Noch keine Kunden angelegt
            </p>
            <p className="mt-1 text-xs text-zinc-600">
              Lege Auftraggeber an und weise sie Projekten zu
            </p>
          </div>
          <Button
            type="button"
            onClick={neuOeffnen}
            className="border border-zinc-700 bg-zinc-800 text-sm text-zinc-200 hover:bg-zinc-700"
          >
            <Plus size={14} className="mr-1.5" />
            Ersten Kunden anlegen
          </Button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-zinc-800/60">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-800/60 bg-zinc-900/40">
                {["Kunde", "Kontakt", "Projekte", "Erstellt", "Aktionen"].map(
                  (s) => (
                    <th
                      key={s}
                      className="px-4 py-3 text-left text-xs font-semibold tracking-wider text-zinc-500 uppercase"
                    >
                      {s}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/40">
              {gefiltert.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-zinc-500">
                    Keine Treffer.
                  </td>
                </tr>
              ) : (
                gefiltert.map((kunde) => (
                  <tr
                    key={kunde.id}
                    className="group transition-colors hover:bg-zinc-900/40"
                  >
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-zinc-700/50 bg-zinc-800 text-xs font-bold text-zinc-400">
                          {kunde.company_name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-zinc-200">
                            {kunde.company_name}
                          </p>
                          {kunde.email ? (
                            <p className="text-xs text-zinc-600">{kunde.email}</p>
                          ) : null}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="text-sm text-zinc-400">
                        {kunde.contact_name ?? "–"}
                      </p>
                      {kunde.phone ? (
                        <p className="text-xs text-zinc-600">{kunde.phone}</p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-zinc-300 tabular-nums">
                          {kunde.projekte.length}
                        </span>
                        <span className="text-xs text-zinc-600">Projekte</span>
                        {kunde.projekte.slice(0, 2).map((p) => (
                          <span
                            key={p.id}
                            className="rounded-md border border-zinc-700/50 bg-zinc-800 px-1.5 py-0.5 text-xs text-zinc-500"
                          >
                            {p.title}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-xs text-zinc-600">
                        {kunde.created_at
                          ? format(new Date(kunde.created_at), "dd.MM.yyyy", {
                              locale: de,
                            })
                          : "–"}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                        <button
                          type="button"
                          onClick={() => bearbeiten(kunde)}
                          className="rounded-md p-1.5 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => void loeschen(kunde.id)}
                          className="rounded-md p-1.5 text-zinc-500 transition-colors hover:bg-red-950 hover:text-red-400"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      <Dialog
        open={dialogOffen}
        onOpenChange={(o) => {
          setDialogOffen(o);
          if (!o) formLeeren();
        }}
      >
        <DialogContent className="max-w-md overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 p-0">
          <DialogHeader className="border-b border-zinc-800/60 px-6 pt-6 pb-4">
            <DialogTitle className="text-base font-semibold text-zinc-100">
              {bearbeite ? "Kunde bearbeiten" : "Neuer Kunde"}
            </DialogTitle>
            <p className="mt-0.5 text-sm text-zinc-500">Auftraggeber-Daten pflegen</p>
          </DialogHeader>

          <div className="max-h-[70vh] space-y-4 overflow-y-auto px-6 py-5">
            <FormField label="Firmenname *">
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="z. B. Müller GmbH"
                className={INPUT_CLASS}
              />
            </FormField>

            <div className="grid grid-cols-2 gap-3">
              <FormField label="Ansprechpartner">
                <input
                  value={form.ansprechpartner}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, ansprechpartner: e.target.value }))
                  }
                  placeholder="Max Mustermann"
                  className={INPUT_CLASS}
                />
              </FormField>
              <FormField label="Telefon">
                <input
                  value={form.telefon}
                  onChange={(e) => setForm((f) => ({ ...f, telefon: e.target.value }))}
                  placeholder="+49 511 …"
                  className={INPUT_CLASS}
                />
              </FormField>
            </div>

            <FormField label="E-Mail">
              <input
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                type="email"
                placeholder="info@firma.de"
                className={INPUT_CLASS}
              />
            </FormField>

            <FormField label="Adresse *">
              <input
                value={form.adresse}
                onChange={(e) => setForm((f) => ({ ...f, adresse: e.target.value }))}
                placeholder="Musterstraße 1, 30159 Hannover"
                className={INPUT_CLASS}
              />
            </FormField>

            <FormField label="Notiz">
              <textarea
                value={form.notiz}
                onChange={(e) => setForm((f) => ({ ...f, notiz: e.target.value }))}
                placeholder="Interne Notizen…"
                rows={2}
                className={`${INPUT_CLASS} resize-none`}
              />
            </FormField>
          </div>

          <DialogFooter className="flex flex-row items-center justify-between gap-2 border-t border-zinc-800/60 px-6 pt-3 pb-6">
            {bearbeite ? (
              <button
                type="button"
                onClick={() => void loeschen(bearbeite.id)}
                className="flex items-center gap-1.5 text-sm text-red-500 transition-colors hover:text-red-400"
              >
                <Trash2 size={13} />
                Löschen
              </button>
            ) : (
              <span />
            )}
            <div className="ml-auto flex gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setDialogOffen(false)}
                className="text-zinc-400 hover:text-zinc-200"
              >
                Abbrechen
              </Button>
              <Button
                type="button"
                onClick={() => void speichern()}
                disabled={speichert}
                className="bg-zinc-100 font-semibold text-zinc-900 hover:bg-white"
              >
                Speichern
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
});

KundenVerwaltung.displayName = "KundenVerwaltung";

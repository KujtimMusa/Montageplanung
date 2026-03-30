"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm, Controller, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  TooltipProvider,
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import {
  Building2,
  CalendarPlus,
  Clock,
  Eye,
  Mail,
  MessageCircle,
  Pencil,
  Phone,
  Plus,
  Trash2,
} from "lucide-react";
import { BuchungsregelnDialog } from "@/components/dienstleister/BuchungsregelnDialog";
import {
  SPEZIALISIERUNGEN,
  subcontractorRowToDienstleister,
  type Dienstleister,
  type Spezialisierung,
} from "@/types/dienstleister";

const spezZod = z.enum([
  "elektro",
  "sanitaer",
  "heizung",
  "maler",
  "schreiner",
  "schlosser",
  "dachdecker",
  "geruestbau",
  "abbruch",
  "sonstiges",
]);

const formSchema = z.object({
  firma: z.string().min(1, "Firmenname erforderlich"),
  ansprechpartner: z.string().optional(),
  status: z.enum(["aktiv", "inaktiv", "partner"]),
  spezialisierung: z.array(spezZod),
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
  email: z.union([z.literal(""), z.string().email("Ungültige E-Mail")]),
  website: z.string().optional(),
  adresse: z.string().optional(),
  vorlauf_tage: z.coerce.number().min(0).max(30),
  notizen: z.string().optional(),
});

type FormWerte = z.infer<typeof formSchema>;

export function DienstleisterVerwaltung() {
  const supabase = createClient();
  const [dienstleister, setDienstleister] = useState<Dienstleister[]>([]);
  const [laden, setLaden] = useState(false);
  const [sheetOffen, setSheetOffen] = useState(false);
  const [bearbeitenId, setBearbeitenId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [maxParallelBeiBearbeitung, setMaxParallelBeiBearbeitung] = useState(2);
  const [filter, setFilter] = useState({
    suche: "",
  });
  const [regelnOffen, setRegelnOffen] = useState(false);
  const [regelnFuerId, setRegelnFuerId] = useState<string | null>(null);
  const [regelnFuerName] = useState("");

  const form = useForm<FormWerte>({
    resolver: zodResolver(formSchema) as Resolver<FormWerte>,
    defaultValues: {
      firma: "",
      ansprechpartner: "",
      status: "aktiv",
      spezialisierung: [],
      phone: "",
      whatsapp: "",
      email: "",
      website: "",
      adresse: "",
      vorlauf_tage: 0,
      notizen: "",
    },
  });

  const phoneWatch = form.watch("phone");

  const ladenListe = useCallback(async () => {
    setLaden(true);
    try {
      const { data, error } = await supabase
        .from("subcontractors")
        .select(
          "id,company_name,contact_name,email,phone,whatsapp_number,specialization,lead_time_days,notes,created_at,website,address,status,active"
        )
        .order("company_name");
      if (error) throw error;
      const rows = (data ?? []) as Record<string, unknown>[];
      setDienstleister(rows.map(subcontractorRowToDienstleister));
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Laden fehlgeschlagen.";
      toast.error(msg);
    } finally {
      setLaden(false);
    }
  }, [supabase]);

  useEffect(() => {
    void ladenListe();
  }, [ladenListe]);

  const gefiltert = useMemo(() => {
    const q = filter.suche.trim().toLowerCase();
    return dienstleister.filter((d) => {
      if (!q) return true;
      if (d.firma.toLowerCase().includes(q)) return true;
      if (d.ansprechpartner?.toLowerCase().includes(q)) return true;
      if (d.spezialisierung.some((s) => String(s).toLowerCase().includes(q)))
        return true;
      return false;
    });
  }, [dienstleister, filter]);

  const statAktivePartner = useMemo(() => {
    return dienstleister.filter(
      (d) => d.status === "aktiv" || d.status === "partner"
    ).length;
  }, [dienstleister]);

  const statSpezCount = useMemo(() => {
    const s = new Set<Spezialisierung>();
    for (const d of dienstleister) {
      for (const x of d.spezialisierung) s.add(x);
    }
    return s.size;
  }, [dienstleister]);

  const statVorlauf = useMemo(() => {
    if (dienstleister.length === 0) return 0;
    const sum = dienstleister.reduce((a, d) => a + d.vorlauf_tage, 0);
    return Math.round(sum / dienstleister.length);
  }, [dienstleister]);

  function toggleSpezialisierung(v: Spezialisierung) {
    const cur = form.getValues("spezialisierung");
    if (cur.includes(v)) {
      form.setValue(
        "spezialisierung",
        cur.filter((x) => x !== v)
      );
    } else {
      form.setValue("spezialisierung", [...cur, v]);
    }
  }

  function oeffnenNeu() {
    setBearbeitenId(null);
    setMaxParallelBeiBearbeitung(2);
    form.reset({
      firma: "",
      ansprechpartner: "",
      status: "aktiv",
      spezialisierung: [],
      phone: "",
      whatsapp: "",
      email: "",
      website: "",
      adresse: "",
      vorlauf_tage: 0,
      notizen: "",
    });
    setSheetOffen(true);
  }

  function oeffnenBearbeiten(d: Dienstleister) {
    setBearbeitenId(d.id);
    void (async () => {
      const { data } = await supabase
        .from("subcontractors")
        .select("max_concurrent_projects")
        .eq("id", d.id)
        .maybeSingle();
      const m = (data as { max_concurrent_projects?: number } | null)
        ?.max_concurrent_projects;
      setMaxParallelBeiBearbeitung(
        typeof m === "number" && m >= 1 ? m : 2
      );
    })();
    form.reset({
      firma: d.firma,
      ansprechpartner: d.ansprechpartner ?? "",
      status: d.status,
      spezialisierung: d.spezialisierung,
      phone: d.phone ?? "",
      whatsapp: d.whatsapp ?? "",
      email: d.email ?? "",
      website: d.website ?? "",
      adresse: d.adresse ?? "",
      vorlauf_tage: d.vorlauf_tage,
      notizen: d.notizen ?? "",
    });
    setSheetOffen(true);
  }

  async function speichern(werte: FormWerte) {
    const spec = werte.spezialisierung;
    const aktivDb = werte.status !== "inaktiv";
    const payload: Record<string, unknown> = {
      company_name: werte.firma.trim(),
      contact_name: werte.ansprechpartner?.trim() || null,
      status: werte.status,
      active: aktivDb,
      phone: werte.phone?.trim() || null,
      whatsapp_number: werte.whatsapp?.trim() || null,
      email: werte.email?.trim() || null,
      website: werte.website?.trim() || null,
      address: werte.adresse?.trim() || null,
      specialization: spec.length ? spec : null,
      lead_time_days: werte.vorlauf_tage,
      notes: werte.notizen?.trim() || null,
    };

    if (bearbeitenId) {
      payload.max_concurrent_projects = maxParallelBeiBearbeitung;
    } else {
      payload.max_concurrent_projects = 2;
    }

    try {
      if (bearbeitenId) {
        const { error } = await supabase
          .from("subcontractors")
          .update(payload)
          .eq("id", bearbeitenId);
        if (error) throw error;
        toast.success("Gespeichert.");
      } else {
        const { error } = await supabase.from("subcontractors").insert(payload);
        if (error) throw error;
        toast.success("Dienstleister angelegt.");
      }
      setSheetOffen(false);
      setBearbeitenId(null);
      void ladenListe();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Speichern fehlgeschlagen.";
      toast.error(msg);
    }
  }

  async function loeschen(id: string) {
    if (!confirm("Dienstleister wirklich löschen?")) return;
    try {
      const { error } = await supabase.from("subcontractors").delete().eq("id", id);
      if (error) throw error;
      toast.success("Gelöscht.");
      if (detailId === id) setDetailId(null);
      void ladenListe();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Löschen fehlgeschlagen.";
      toast.error(msg);
    }
  }

  const detailD = detailId
    ? dienstleister.find((x) => x.id === detailId) ?? null
    : null;

  type AssignmentSubcontractor = {
    id: string;
    status: "angefragt" | "bestaetigt" | "abgelehnt";
    email_gesendet_at: string | null;
    bestaetigt_at: string | null;
    notiz: string | null;
    created_at: string;
    assignment: {
      id: string;
      date: string;
      start_time: string;
      end_time: string;
      projects: Array<{ title: string; adresse?: string | null }>;
      teams: Array<{ name: string }>;
    } | null;
  };

  const [assignmentSubsByPartner, setAssignmentSubsByPartner] = useState<
    Record<string, AssignmentSubcontractor[]>
  >({});
  const [letzterEinsatzByPartner, setLetzterEinsatzByPartner] = useState<
    Record<string, { datum: string; titel: string | null }>
  >({});

  const [, setLadeAnfragen] = useState(false);

  type EmailTemplateTyp =
    | "einsatz_anfrage"
    | "bestaetigung"
    | "absage"
    | "allgemein";

  const [emailDialogOffen, setEmailDialogOffen] = useState(false);
  const [emailTemplateTyp, setEmailTemplateTyp] =
    useState<EmailTemplateTyp>("allgemein");
  const [emailPartner, setEmailPartner] = useState<Dienstleister | null>(null);
  const [emailAssignment, setEmailAssignment] =
    useState<AssignmentSubcontractor["assignment"] | null>(null);
  const [emailBetreff, setEmailBetreff] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [emailSendet, setEmailSendet] = useState(false);

  const ladenPartnerMetadaten = useCallback(async () => {
    if (dienstleister.length === 0) return;
    const partnerIds = dienstleister.map((d) => d.id);
    setLadeAnfragen(true);
    try {
      type ProjectEmbed = { title?: string | null; adresse?: string | null };
      type TeamEmbed = { name?: string | null };
      type AssignmentRow = {
        id: string;
        dienstleister_id: string | null;
        date: string;
        start_time: string;
        end_time: string;
        projects?: ProjectEmbed | ProjectEmbed[] | null;
        teams?: TeamEmbed | TeamEmbed[] | null;
      };

      type PivotRow = {
        id: string;
        subcontractor_id: string;
        assignment_id: string;
        status: string;
        email_gesendet_at: string | null;
        bestaetigt_at: string | null;
        notiz: string | null;
        created_at: string;
      };

      const firstOrNull = <T,>(
        v: T | T[] | null | undefined
      ): T | null => {
        if (!v) return null;
        return Array.isArray(v) ? v[0] ?? null : v;
      };

      // 1) Letzter Einsatz pro Partner
      const { data: assignmentRows, error: aErr } = await supabase
        .from("assignments")
        .select(
          "id,dienstleister_id,date,start_time,end_time,projects(title,adresse),teams(name)"
        )
        .in("dienstleister_id", partnerIds)
        .order("date", { ascending: false });
      if (aErr) throw aErr;

      const tmpLast: Record<string, { datum: string; titel: string | null }> =
        {};
      for (const row of (assignmentRows ?? []) as AssignmentRow[]) {
        const dlId = row.dienstleister_id;
        if (!dlId) continue;
        if (tmpLast[dlId]) continue;
        const datum = row.date;
        const p0 = firstOrNull(row.projects);
        const titel = p0?.title ?? null;
        tmpLast[dlId] = { datum, titel };
      }
      setLetzterEinsatzByPartner(tmpLast);

      // 2) Pivot-Anfragen pro Partner (ohne Embed, dann 2. Query für assignments)
      const { data: apRows, error: pErr } = await supabase
        .from("assignment_subcontractors")
        .select(
          "id,subcontractor_id,assignment_id,status,email_gesendet_at,bestaetigt_at,notiz,created_at"
        )
        .in("subcontractor_id", partnerIds)
        .order("created_at", { ascending: false });
      if (pErr) throw pErr;

      const pivot = (apRows ?? []) as PivotRow[];
      const assignmentIds = Array.from(
        new Set(pivot.map((x) => x.assignment_id))
      ).filter(Boolean);

      if (assignmentIds.length === 0) {
        setAssignmentSubsByPartner({});
        return;
      }

      const { data: assignmentByIdRows, error: a2Err } = await supabase
        .from("assignments")
        .select("id,date,start_time,end_time,projects(title,adresse),teams(name)")
        .in("id", assignmentIds);
      if (a2Err) throw a2Err;

      const assignmentById: Record<string, AssignmentSubcontractor["assignment"]> =
        {};
      for (const row of (assignmentByIdRows ?? []) as AssignmentRow[]) {
        const p0 = firstOrNull(row.projects);
        const t0 = firstOrNull(row.teams);
        assignmentById[row.id] = {
          id: row.id,
          date: row.date,
          start_time: row.start_time,
          end_time: row.end_time,
          projects: p0?.title
            ? [
                {
                  title: p0.title,
                  adresse: p0.adresse ?? null,
                },
              ]
            : [],
          teams: t0?.name ? [{ name: t0.name }] : [],
        };
      }

      const byPartner: Record<string, AssignmentSubcontractor[]> = {};
      for (const r of pivot) {
        const assignment = assignmentById[r.assignment_id] ?? null;
        const status = r.status as AssignmentSubcontractor["status"];
        byPartner[r.subcontractor_id] ??= [];
        byPartner[r.subcontractor_id].push({
          id: r.id,
          status,
          email_gesendet_at: r.email_gesendet_at,
          bestaetigt_at: r.bestaetigt_at,
          notiz: r.notiz,
          created_at: r.created_at,
          assignment,
        });
      }
      setAssignmentSubsByPartner(byPartner);
    } catch (e) {
      // Die Tabelle selbst ist bereits geladen; Zusatzdaten (Anfragen/Einsätze)
      // dürfen nicht die gesamte Seite “rot” machen.
      console.warn(
        "[DienstleisterVerwaltung] Laden Partner-Metadaten fehlgeschlagen:",
        e
      );
      setLetzterEinsatzByPartner({});
      setAssignmentSubsByPartner({});
    } finally {
      setLadeAnfragen(false);
    }
  }, [dienstleister, supabase]);

  useEffect(() => {
    void ladenPartnerMetadaten();
  }, [ladenPartnerMetadaten]);

  const gesamteOffeneAnfragen = useMemo(() => {
    return Object.values(assignmentSubsByPartner)
      .flat()
      .filter((x) => x.status === "angefragt").length;
  }, [assignmentSubsByPartner]);

  function formatDate(dateTxt: string) {
    try {
      const dt = new Date(dateTxt + "T00:00:00");
      return new Intl.DateTimeFormat("de-DE", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }).format(dt);
    } catch {
      return dateTxt;
    }
  }

  function pickProjectTitle(a: AssignmentSubcontractor["assignment"]) {
    if (!a) return null;
    return a.projects[0]?.title ?? null;
  }

  function emailVorbereiten(p: Dienstleister, tpl: EmailTemplateTyp) {
    const requests = (assignmentSubsByPartner[p.id] ?? []).filter(
      (x) => x.status === "angefragt"
    );
    const chosen = requests[0]?.assignment ?? null;
    setEmailPartner(p);
    setEmailTemplateTyp(tpl);
    setEmailAssignment(chosen);

    const titel = pickProjectTitle(chosen);
    const datum = chosen?.date ? formatDate(chosen.date) : "–";
    const zeit = chosen?.start_time
      ? `${chosen.start_time}–${chosen.end_time}`
      : "–";
    const adresse = chosen?.projects[0]?.adresse ?? "";

    const templates: Record<EmailTemplateTyp, { betreff: string; body: string }> =
      {
        einsatz_anfrage: {
          betreff: `Einsatz-Anfrage: ${titel ?? "Einsatz"} am ${datum}`,
          body: `Sehr geehrte/r ${p.ansprechpartner ?? p.firma},\n\nwir möchten Sie für folgenden Einsatz anfragen:\n\n📋 Projekt: ${titel ?? "–"}\n📅 Datum: ${datum}\n⏰ Zeit: ${zeit}\n📍 Adresse: ${adresse || "–"}\n\nMit freundlichen Grüßen`,
        },
        bestaetigung: {
          betreff: `Bestätigung: Einsatz am ${datum}`,
          body: `Sehr geehrte/r ${p.ansprechpartner ?? p.firma},\n\nder folgende Einsatz ist bestätigt:\n\n📋 ${titel ?? "–"}\n📅 ${datum}\n⏰ ${zeit}\n\nVielen Dank für die Zusammenarbeit.`,
        },
        absage: {
          betreff: `Absage: Anfrage vom ${formatDate(new Date().toISOString().slice(0, 10))}`,
          body: `Sehr geehrte/r ${p.ansprechpartner ?? p.firma},\n\nleider müssen wir die folgende Anfrage absagen:\n\n📋 ${titel ?? "–"}\n📅 ${chosen?.date ?? "–"}\n\nWir hoffen auf zukünftige Zusammenarbeit.`,
        },
        allgemein: {
          betreff: `Anfrage für Kooperation`,
          body: `Sehr geehrte/r ${p.ansprechpartner ?? p.firma},\n\nwir würden gerne mit Ihnen in Kontakt treten.\n\nMit freundlichen Grüßen`,
        },
      };

    setEmailBetreff(templates[tpl].betreff);
    setEmailBody(templates[tpl].body);
    setEmailDialogOffen(true);
  }

  async function emailSenden() {
    if (!emailPartner) return;
    if (!emailPartner.email?.trim()) {
      toast.error("Keine E-Mail-Adresse hinterlegt.");
      return;
    }
    setEmailSendet(true);
    try {
      const tpl = emailTemplateTyp;
      const an = emailPartner.email.trim();
      const assignmentId = emailAssignment?.id ?? undefined;

      const payload = {
        an,
        betreff: emailBetreff,
        body: emailBody,
        partner_id: emailPartner.id,
        assignment_id: assignmentId,
        template_typ: tpl,
      };

      const res = await fetch("/api/email/senden", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        enabled?: boolean;
        reason?: string;
      };

      if (!res.ok || json.enabled === false) {
        // TODO: Wenn RESEND_API_KEY gesetzt ist, echten Versand aktivieren.
        const mailto = `mailto:${encodeURIComponent(an)}?subject=${encodeURIComponent(
          emailBetreff
        )}&body=${encodeURIComponent(emailBody)}`;
        window.open(mailto, "_blank");

        // Optimistisch Pivot aktualisieren (damit UI sofort korrekt ist)
        if (assignmentId) {
          const nextStatus =
            tpl === "bestaetigung"
              ? "bestaetigt"
              : tpl === "absage"
                ? "abgelehnt"
                : "angefragt";
          await supabase
            .from("assignment_subcontractors")
            .update({
              status: nextStatus,
              email_gesendet_at: new Date().toISOString(),
              bestaetigt_at: tpl === "bestaetigung" ? new Date().toISOString() : null,
            })
            .eq("assignment_id", assignmentId)
            .eq("subcontractor_id", emailPartner.id);
        }

        toast.success("E-Mail über mailto vorbereitet (TODO: Resend aktivieren).");
        setEmailDialogOffen(false);
        void ladenPartnerMetadaten();
        return;
      }

      toast.success("E-Mail gesendet/ausgelöst.");
      setEmailDialogOffen(false);
      void ladenPartnerMetadaten();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "E-Mail Senden fehlgeschlagen.";
      toast.error(msg);
    } finally {
      setEmailSendet(false);
    }
  }

  return (
    <TooltipProvider>
      <div className="flex gap-4 h-[calc(100vh-60px)] p-6">
        {/* HAUPTBEREICH */}
        <div className="flex-1 flex flex-col gap-4 min-w-0 overflow-y-auto">
          <div className="flex items-start justify-between mb-2">
            <div>
              <h1 className="text-2xl font-bold text-zinc-100">Dienstleister</h1>
            </div>
            <Button
              type="button"
              onClick={() => {
                setBearbeitenId(null);
                oeffnenNeu();
              }}
              className="bg-zinc-100 text-zinc-900 hover:bg-white font-semibold text-sm px-4 py-2 rounded-xl flex items-center gap-1.5 transition-colors"
            >
              <Plus size={15} /> Dienstleister hinzufügen
            </Button>
          </div>

          {/* STAT-KARTEN */}
          <div className="grid grid-cols-4 gap-3 mb-2">
            {[
              {
                label: "AKTIVE PARTNER",
                wert: statAktivePartner,
                sub: "Aktuell verfügbar",
                akzent: undefined as string | undefined,
              },
              {
                label: "SPEZIALISIERUNGEN",
                wert: statSpezCount,
                sub: "Verschiedene Fachgebiete",
                akzent: undefined as string | undefined,
              },
              {
                label: "OFFENE ANFRAGEN",
                wert: gesamteOffeneAnfragen,
                sub: "Warten auf Bestätigung",
                akzent: gesamteOffeneAnfragen > 0 ? "#f59e0b" : undefined,
              },
              {
                label: "Ø VORLAUF",
                wert: `${statVorlauf}d`,
                sub: "Durchschnittliche Reaktionszeit",
                akzent: undefined as string | undefined,
              },
            ].map((k) => (
              <div
                key={k.label}
                className="rounded-2xl bg-zinc-900 border border-zinc-800/60 p-5 hover:border-zinc-700/60 transition-all"
              >
                <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-4">
                  {k.label}
                </p>
                <p
                  className="text-4xl font-bold tabular-nums mb-1"
                  style={{ color: k.akzent ?? "#f4f4f5" }}
                >
                  {String(k.wert)}
                </p>
                <p className="text-xs text-zinc-600">{k.sub}</p>
              </div>
            ))}
          </div>

          {/* FILTER */}
          <div className="flex items-center gap-2 mb-4">
            <div className="relative flex-1 max-w-xs">
              <Input
                placeholder="Dienstleister"
                className="w-full pl-8 pr-3 py-2 text-sm bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-700 transition-colors"
                value={filter.suche}
                onChange={(e) =>
                  setFilter((f) => ({ ...f, suche: e.target.value }))
                }
              />
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none">
                <Eye size={13} />
              </div>
            </div>
          </div>

          {/* TABELLE */}
          {laden ? (
            <p className="text-sm text-zinc-500">Laden…</p>
          ) : gefiltert.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Building2 size={48} className="mb-4 text-zinc-700" />
              <p className="text-base font-medium text-zinc-400">Noch keine Treffer</p>
              <p className="mt-1 text-sm text-zinc-600">
                Füge externe Partner hinzu, um sie in der Planung einzusetzen.
              </p>
              <Button type="button" className="mt-4" onClick={() => oeffnenNeu()}>
                <Plus size={16} className="mr-2" /> Ersten Dienstleister hinzufügen
              </Button>
            </div>
          ) : (
            <div className="rounded-2xl border border-zinc-800/60 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-800/60 bg-zinc-900/40">
                    {[
                      "Firma",
                      "Spezialisierung",
                      "Kontakt",
                      "Letzter Einsatz",
                      "Status",
                      "Anfragen",
                      "Aktionen",
                    ].map((h) => (
                      <th
                        key={h}
                        className="text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider py-3 px-4"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/40">
                  {gefiltert.map((p) => {
                    const offeneAnfragenPartner = (
                      assignmentSubsByPartner[p.id] ?? []
                    ).filter((ap) => ap.status === "angefragt").length;
                    const letzte = letzterEinsatzByPartner[p.id];
                    return (
                      <tr
                        key={p.id}
                        className="hover:bg-zinc-900/40 transition-colors group cursor-pointer"
                        onClick={() => setDetailId(p.id)}
                      >
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-zinc-800 border border-zinc-700/50 flex items-center justify-center text-sm font-bold text-zinc-400 flex-shrink-0">
                              {p.firma?.slice(0, 2).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-zinc-200">
                                {p.firma}
                              </p>
                              {p.vorlauf_tage > 0 ? (
                                <p className="text-xs text-zinc-600">
                                  Ø {p.vorlauf_tage}d Vorlauf
                                </p>
                              ) : null}
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-3.5">
                          <div className="flex flex-wrap gap-1">
                            {p.spezialisierung?.slice(0, 2).map((s) => (
                              <span
                                key={s}
                                className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 border border-zinc-700/50 text-zinc-400 font-medium"
                              >
                                {SPEZIALISIERUNGEN.find((x) => x.value === s)?.label ??
                                  s}
                              </span>
                            ))}
                            {(p.spezialisierung?.length ?? 0) > 2 ? (
                              <span className="text-xs text-zinc-600">
                                +{p.spezialisierung.length - 2}
                              </span>
                            ) : null}
                          </div>
                        </td>

                        <td className="px-4 py-3.5">
                          <p className="text-sm text-zinc-400">
                            {p.ansprechpartner ?? "–"}
                          </p>
                          <p className="text-xs text-zinc-600 truncate max-w-36">
                            {p.email ?? ""}
                          </p>
                        </td>

                        <td className="px-4 py-3.5">
                          {letzte?.datum ? (
                            <>
                              <p className="text-sm text-zinc-400 tabular-nums">
                                {formatDate(letzte.datum)}
                              </p>
                              <p className="text-xs text-zinc-600 truncate max-w-28">
                                {letzte.titel ?? "–"}
                              </p>
                            </>
                          ) : (
                            <span className="text-zinc-700 text-sm">–</span>
                          )}
                        </td>

                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1.5">
                            <div
                              className={`w-1.5 h-1.5 rounded-full ${
                                p.status === "aktiv" || p.status === "partner"
                                  ? "bg-emerald-500"
                                  : "bg-zinc-600"
                              }`}
                            />
                            <span className="text-xs font-medium text-zinc-400">
                              {p.status === "aktiv" || p.status === "partner"
                                ? "Aktiv"
                                : "Inaktiv"}
                            </span>
                          </div>
                        </td>

                        <td className="px-4 py-3.5">
                          {offeneAnfragenPartner > 0 ? (
                            <div className="flex items-center gap-1.5">
                              <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                              <span className="text-xs font-bold text-amber-400">
                                {offeneAnfragenPartner} offen
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-zinc-700">–</span>
                          )}
                        </td>

                        <td className="px-4 py-3.5">
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                emailVorbereiten(p, "einsatz_anfrage");
                              }}
                              className="flex items-center gap-1 px-2 py-1.5 rounded-md bg-zinc-800 hover:bg-blue-950 text-zinc-500 hover:text-blue-400 border border-zinc-700 hover:border-blue-800 text-xs font-semibold transition-all"
                            >
                              <Mail size={11} />
                              E-Mail
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                oeffnenBearbeiten(p);
                              }}
                              className="p-1.5 rounded-md hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors"
                            >
                              <Pencil size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                void loeschen(p.id);
                              }}
                              className="p-1.5 rounded-md hover:bg-red-950 text-zinc-500 hover:text-red-400 transition-colors"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* RECHTES PANEL */}
        <div className="w-80 flex-shrink-0 flex flex-col gap-3">
          {!detailD ? (
            <div className="rounded-2xl bg-zinc-900 border border-zinc-800/60 flex items-center justify-center p-8 flex-1">
              <div className="text-center">
                <Building2 size={28} className="text-zinc-700 mx-auto mb-2" />
                <p className="text-sm text-zinc-600">Partner auswählen</p>
                <p className="text-xs text-zinc-700 mt-1">Klicke auf einen Dienstleister</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3 flex-1 overflow-y-auto">
              <div className="rounded-2xl bg-zinc-900 border border-zinc-800/60 p-4">
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-11 h-11 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-base font-bold text-zinc-400 flex-shrink-0">
                    {detailD.firma?.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-bold text-zinc-200">{detailD.firma}</p>
                    <p className="text-xs text-zinc-600">{detailD.ansprechpartner ?? "–"}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <div
                      className={`w-1.5 h-1.5 rounded-full ${
                        detailD.status === "aktiv" || detailD.status === "partner"
                          ? "bg-emerald-500"
                          : "bg-zinc-600"
                      }`}
                    />
                    <span className="text-xs text-zinc-500">
                      {detailD.status === "aktiv" || detailD.status === "partner" ? "Aktiv" : "Inaktiv"}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  {detailD.email ? (
                    <div className="flex items-center gap-2">
                      <Mail size={12} className="text-zinc-600 flex-shrink-0" />
                      <p className="text-xs text-zinc-500 truncate">{detailD.email}</p>
                    </div>
                  ) : null}
                  {detailD.phone ? (
                    <div className="flex items-center gap-2">
                      <Phone size={12} className="text-zinc-600 flex-shrink-0" />
                      <p className="text-xs text-zinc-500">{detailD.phone}</p>
                    </div>
                  ) : null}
                </div>

                <div className="flex flex-wrap gap-1 mt-3">
                  {detailD.spezialisierung?.map((s) => (
                    <span
                      key={s}
                      className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 border border-zinc-700/50 text-zinc-400 font-medium"
                    >
                      {SPEZIALISIERUNGEN.find((x) => x.value === s)?.label ?? s}
                    </span>
                  ))}
                </div>
              </div>

              {/* EINSATZ-ANFRAGEN */}
              <div className="rounded-2xl bg-zinc-900 border border-zinc-800/60 p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                    Einsatz-Anfragen
                  </p>
                </div>

                <div className="space-y-2">
                  {(assignmentSubsByPartner[detailD.id] ?? []).length ? (
                    (assignmentSubsByPartner[detailD.id] ?? []).map((ap) => {
                      const statusFarbe =
                        ap.status === "bestaetigt"
                          ? "#10b981"
                          : ap.status === "abgelehnt"
                            ? "#ef4444"
                            : "#f59e0b";
                      const proj = pickProjectTitle(ap.assignment);
                      const datum = ap.assignment?.date
                        ? formatDate(ap.assignment.date)
                        : "–";
                      const zeit = ap.assignment?.start_time
                        ? `${ap.assignment.start_time}–${ap.assignment.end_time}`
                        : "–";
                      return (
                        <div
                          key={ap.id}
                          className="flex items-start gap-2.5 p-2.5 rounded-xl bg-zinc-800/50 border border-zinc-800"
                        >
                          <div
                            className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0"
                            style={{ background: statusFarbe }}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-zinc-300 truncate">
                              {proj ?? "Projekt"}
                            </p>
                            <p className="text-[10px] text-zinc-600 tabular-nums">
                              {datum} · {zeit}
                            </p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p
                              className="text-[10px] font-semibold"
                              style={{ color: statusFarbe }}
                            >
                              {ap.status === "bestaetigt"
                                ? "Bestätigt"
                                : ap.status === "abgelehnt"
                                  ? "Abgelehnt"
                                  : "Ausstehend"}
                            </p>
                            {ap.email_gesendet_at ? (
                              <p className="text-[9px] text-zinc-700">
                                E-Mail: {new Date(ap.email_gesendet_at).toLocaleString("de-DE")}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-xs text-zinc-700 text-center py-3">
                      Noch keine Anfragen
                    </p>
                  )}
                </div>
              </div>

              {/* E-MAIL SCHNELL-SENDEN */}
              <div className="rounded-2xl bg-zinc-900 border border-zinc-800/60 p-4">
                <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">
                  E-Mail senden
                </p>
                <div className="space-y-2 mb-3">
                  {(
                    [
                      { label: "Einsatz-Anfrage", template: "einsatz_anfrage", icon: CalendarPlus },
                      { label: "Einsatz-Bestätigung", template: "bestaetigung", icon: Eye },
                      { label: "Einsatz-Absage", template: "absage", icon: Trash2 },
                      { label: "Allgemeine Anfrage", template: "allgemein", icon: MessageCircle },
                    ] as const
                  ).map((t) => (
                    <button
                      key={t.template}
                      type="button"
                      onClick={() => emailVorbereiten(detailD, t.template)}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-zinc-800/50 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800 transition-all text-left group"
                    >
                      <t.icon size={14} className="text-zinc-600 group-hover:text-zinc-400 transition-colors flex-shrink-0" />
                      <span className="text-sm font-medium text-zinc-400 group-hover:text-zinc-200 transition-colors">
                        {t.label}
                      </span>
                      <span className="ml-auto text-xs text-zinc-600 group-hover:text-zinc-400">
                        →
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* E-MAIL DIALOG */}
        {emailDialogOffen ? (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-xl shadow-2xl">
              <div className="flex items-center justify-between p-5 border-b border-zinc-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center">
                    <Mail size={14} className="text-zinc-400" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-zinc-200">
                      E-Mail an {emailPartner?.firma ?? "Partner"}
                    </p>
                    <p className="text-xs text-zinc-600">{emailPartner?.email ?? ""}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEmailDialogOffen(false)}
                  className="p-1.5 rounded-md hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  <Trash2 size={15} />
                </button>
              </div>

              <div className="p-5 space-y-3">
                <div>
                  <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1.5 block">
                    Betreff
                  </label>
                  <Input
                    value={emailBetreff}
                    onChange={(e) => setEmailBetreff(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm bg-zinc-800 border border-zinc-700 rounded-xl text-zinc-200 focus:outline-none focus:border-zinc-600 transition-colors"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1.5 block">
                    Nachricht
                  </label>
                  <Textarea
                    value={emailBody}
                    onChange={(e) => setEmailBody(e.target.value)}
                    rows={10}
                    className="w-full px-3 py-2.5 text-sm bg-zinc-800 border border-zinc-700 rounded-xl text-zinc-200 focus:outline-none focus:border-zinc-600 transition-colors resize-none font-mono leading-relaxed"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between px-5 pb-5 gap-3">
                <button
                  type="button"
                  onClick={() => setEmailDialogOffen(false)}
                  className="px-4 py-2 rounded-xl text-sm font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-400 transition-colors"
                >
                  Abbrechen
                </button>
                <button
                  type="button"
                  onClick={() => void emailSenden()}
                  disabled={emailSendet || !emailBetreff.trim()}
                  className={`flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold transition-all ${
                    emailBetreff && !emailSendet
                      ? "bg-zinc-100 text-zinc-900 hover:bg-white"
                      : "bg-zinc-800 text-zinc-600 cursor-not-allowed"
                  }`}
                >
                  {emailSendet ? (
                    <span className="flex items-center gap-2">
                      <Clock size={14} /> Senden...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Mail size={14} /> E-Mail senden
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>
        ) : null}

        <Sheet
          open={sheetOffen}
          onOpenChange={(o) => {
            setSheetOffen(o);
            if (!o) setBearbeitenId(null);
          }}
        >
          <SheetContent
            side="right"
            className="flex w-full flex-col border-zinc-800 bg-zinc-950 sm:max-w-[480px]"
          >
            <SheetHeader>
              <SheetTitle className="text-zinc-50">
                {bearbeitenId ? "Dienstleister bearbeiten" : "Dienstleister anlegen"}
              </SheetTitle>
            </SheetHeader>
            <form
              onSubmit={form.handleSubmit(speichern)}
              className="flex flex-1 flex-col gap-4 overflow-y-auto py-2"
            >
              <div className="space-y-2">
                <Label className="text-zinc-300">Firmenname *</Label>
                <Input
                  className="border-zinc-700 bg-zinc-950"
                  {...form.register("firma")}
                />
                {form.formState.errors.firma ? (
                  <p className="text-xs text-red-400">
                    {form.formState.errors.firma.message}
                  </p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label className="text-zinc-300">Ansprechpartner</Label>
                <Input
                  className="border-zinc-700 bg-zinc-950"
                  {...form.register("ansprechpartner")}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-zinc-300">Status *</Label>
                <Controller
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="border-zinc-700 bg-zinc-950">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="aktiv">Aktiv</SelectItem>
                        <SelectItem value="partner">Partner</SelectItem>
                        <SelectItem value="inaktiv">Inaktiv</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-zinc-300">Spezialisierung</Label>
                <div className="flex flex-wrap gap-2">
                  {SPEZIALISIERUNGEN.map((s) => {
                    const sel = form.watch("spezialisierung").includes(s.value);
                    return (
                      <button
                        key={s.value}
                        type="button"
                        onClick={() => toggleSpezialisierung(s.value)}
                        className={`rounded-lg border px-2.5 py-1 text-xs transition-all ${
                          sel
                            ? "border-blue-500/50 bg-blue-500/20 text-blue-300"
                            : "border-zinc-700 bg-zinc-900 text-zinc-500 hover:border-zinc-600"
                        }`}
                      >
                        {s.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center gap-2 py-1">
                <Separator className="flex-1 bg-zinc-800" />
                <span className="text-xs text-zinc-500">Kontaktdaten</span>
                <Separator className="flex-1 bg-zinc-800" />
              </div>

              <div className="space-y-2">
                <Label className="text-zinc-300">Telefon</Label>
                <Input
                  placeholder="+49 151…"
                  className="border-zinc-700 bg-zinc-950"
                  {...form.register("phone")}
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label className="text-zinc-300">WhatsApp</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() =>
                      form.setValue("whatsapp", phoneWatch ?? "")
                    }
                  >
                    Übernehmen
                  </Button>
                </div>
                <Input
                  placeholder="+49 151…"
                  className="border-zinc-700 bg-zinc-950"
                  {...form.register("whatsapp")}
                />
                <p className="text-[10px] text-zinc-600">
                  Gleiche Nummer wie Telefon? Auf „Übernehmen“ klicken.
                </p>
              </div>
              <div className="space-y-2">
                <Label className="text-zinc-300">E-Mail</Label>
                <Input
                  type="email"
                  className="border-zinc-700 bg-zinc-950"
                  {...form.register("email")}
                />
                {form.formState.errors.email ? (
                  <p className="text-xs text-red-400">
                    {form.formState.errors.email.message}
                  </p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label className="text-zinc-300">Website</Label>
                <Input
                  placeholder="https://…"
                  className="border-zinc-700 bg-zinc-950"
                  {...form.register("website")}
                />
              </div>

              <div className="flex items-center gap-2 py-1">
                <Separator className="flex-1 bg-zinc-800" />
                <span className="text-xs text-zinc-500">Weiteres</span>
                <Separator className="flex-1 bg-zinc-800" />
              </div>

              <div className="space-y-2">
                <Label className="text-zinc-300">Firmenadresse (optional)</Label>
                <Input
                  className="border-zinc-700 bg-zinc-950"
                  {...form.register("adresse")}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-zinc-300">
                  Vorlaufzeit in Tagen (für Terminplanung)
                </Label>
                <Input
                  type="number"
                  min={0}
                  max={30}
                  className="border-zinc-700 bg-zinc-950"
                  {...form.register("vorlauf_tage", { valueAsNumber: true })}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-zinc-300">Notizen</Label>
                <Textarea
                  rows={3}
                  className="border-zinc-700 bg-zinc-950"
                  {...form.register("notizen")}
                />
              </div>

              <SheetFooter className="mt-auto flex-col gap-2 border-t border-zinc-800 pt-4 sm:flex-row">
                {bearbeitenId ? (
                  <Button
                    type="button"
                    variant="destructive"
                    className="w-full sm:mr-auto sm:w-auto"
                    onClick={() => void loeschen(bearbeitenId)}
                  >
                    Löschen
                  </Button>
                ) : null}
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setSheetOffen(false)}
                >
                  Abbrechen
                </Button>
                <Button type="submit">Speichern</Button>
              </SheetFooter>
            </form>
          </SheetContent>
        </Sheet>

        <BuchungsregelnDialog
          offen={regelnOffen}
          onOffenChange={(o) => {
            setRegelnOffen(o);
            if (!o) setRegelnFuerId(null);
          }}
          dienstleisterId={regelnFuerId}
          firmenname={regelnFuerName}
        />
      </div>
    </TooltipProvider>
  );
}

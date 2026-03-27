"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm, Controller, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createClient } from "@/lib/supabase/client";
import { outlookKalenderLink } from "@/lib/utils/outlook";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import {
  Building2,
  CalendarPlus,
  Clock,
  Eye,
  ExternalLink,
  GripVertical,
  ListOrdered,
  Mail,
  MessageCircle,
  Pencil,
  Phone,
  Plus,
  Trash2,
  User,
  Wrench,
} from "lucide-react";
import { BuchungsregelnDialog } from "@/components/dienstleister/BuchungsregelnDialog";
import { DienstleisterDetail } from "@/components/dienstleister/DienstleisterDetail";
import {
  SPEZIALISIERUNGEN,
  STATUS_CONFIG,
  subcontractorRowToDienstleister,
  type Dienstleister,
  type DienstleisterStatus,
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
    status: "alle" as "alle" | DienstleisterStatus,
    spezialisierung: "alle" as "alle" | Spezialisierung,
  });
  const [regelnOffen, setRegelnOffen] = useState(false);
  const [regelnFuerId, setRegelnFuerId] = useState<string | null>(null);
  const [regelnFuerName, setRegelnFuerName] = useState("");

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
      if (filter.status !== "alle" && d.status !== filter.status) return false;
      if (
        filter.spezialisierung !== "alle" &&
        !d.spezialisierung.includes(filter.spezialisierung)
      ) {
        return false;
      }
      if (!q) return true;
      if (d.firma.toLowerCase().includes(q)) return true;
      if (d.ansprechpartner?.toLowerCase().includes(q)) return true;
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

  const filterAktiv =
    filter.suche.trim() !== "" ||
    filter.status !== "alle" ||
    filter.spezialisierung !== "alle";

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

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-zinc-50">Dienstleister</h1>
            <p className="mt-1 text-sm text-zinc-400">
              Externe Partner verwalten, einplanen und direkt kontaktieren.
            </p>
          </div>
          <Button
            type="button"
            onClick={() => {
              setBearbeitenId(null);
              oeffnenNeu();
            }}
          >
            <Plus size={16} className="mr-2" /> Dienstleister hinzufügen
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between">
              <Building2 className="text-emerald-400" size={22} />
              <span className="text-2xl font-bold text-zinc-100">
                {statAktivePartner}
              </span>
            </div>
            <p className="mt-2 text-xs text-zinc-500">Aktive Partner</p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between">
              <Wrench className="text-blue-400" size={22} />
              <span className="text-2xl font-bold text-zinc-100">
                {statSpezCount}
              </span>
            </div>
            <p className="mt-2 text-xs text-zinc-500">Spezialisierungen</p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between">
              <Clock className="text-orange-400" size={22} />
              <span className="text-2xl font-bold text-zinc-100">
                {statVorlauf}
              </span>
            </div>
            <p className="mt-2 text-xs text-zinc-500">Ø Vorlauf (Tage)</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Input
            placeholder="Firma oder Ansprechpartner…"
            className="w-56 border-zinc-800 bg-zinc-950"
            value={filter.suche}
            onChange={(e) => setFilter((f) => ({ ...f, suche: e.target.value }))}
          />
          <Select
            value={filter.status}
            onValueChange={(v) =>
              setFilter((f) => ({
                ...f,
                status: v as typeof f.status,
              }))
            }
          >
            <SelectTrigger className="w-[160px] border-zinc-800 bg-zinc-950">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="alle">Alle Status</SelectItem>
              <SelectItem value="aktiv">Aktiv</SelectItem>
              <SelectItem value="partner">Partner</SelectItem>
              <SelectItem value="inaktiv">Inaktiv</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={filter.spezialisierung}
            onValueChange={(v) =>
              setFilter((f) => ({
                ...f,
                spezialisierung: v as typeof f.spezialisierung,
              }))
            }
          >
            <SelectTrigger className="w-[200px] border-zinc-800 bg-zinc-950">
              <SelectValue placeholder="Spezialisierung" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="alle">Alle Spezialisierungen</SelectItem>
              {SPEZIALISIERUNGEN.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {filterAktiv ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() =>
                setFilter({
                  suche: "",
                  status: "alle",
                  spezialisierung: "alle",
                })
              }
            >
              Filter zurücksetzen
            </Button>
          ) : null}
        </div>

        {laden ? (
          <p className="text-sm text-zinc-500">Laden…</p>
        ) : gefiltert.length === 0 ? (
          dienstleister.length > 0 ? (
            <p className="py-12 text-center text-sm text-zinc-500">
              Keine Treffer für die aktuellen Filter.
            </p>
          ) : (
            <div className="flex flex-col items-center justify-center py-20">
              <Building2 size={48} className="mb-4 text-zinc-700" />
              <p className="text-base font-medium text-zinc-400">
                Noch keine Dienstleister
              </p>
              <p className="mt-1 text-sm text-zinc-600">
                Füge externe Partner hinzu um sie in der Planung einzusetzen
              </p>
              <Button type="button" className="mt-4" onClick={() => oeffnenNeu()}>
                <Plus size={16} className="mr-2" /> Ersten Dienstleister hinzufügen
              </Button>
            </div>
          )
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {gefiltert.map((d) => (
              <Card
                key={d.id}
                className="cursor-pointer overflow-hidden rounded-xl border-zinc-800 bg-zinc-900/50 transition-all hover:border-zinc-700"
              >
                <CardHeader
                  className="cursor-pointer p-4 pb-3"
                  onClick={() => setDetailId(d.id)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-semibold leading-tight text-zinc-100">
                      {d.firma}
                    </h3>
                    <Badge
                      className={`shrink-0 text-xs ${STATUS_CONFIG[d.status].farbe}`}
                    >
                      {STATUS_CONFIG[d.status].label}
                    </Badge>
                  </div>
                  {d.ansprechpartner ? (
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-zinc-500">
                      <User size={10} />
                      {d.ansprechpartner}
                    </p>
                  ) : null}
                  <div className="mt-2 flex flex-wrap gap-1">
                    {d.spezialisierung.slice(0, 3).map((s) => (
                      <Badge
                        key={s}
                        variant="outline"
                        className="border-zinc-700 px-1.5 py-0 text-[10px] text-zinc-400"
                      >
                        {SPEZIALISIERUNGEN.find((x) => x.value === s)?.label}
                      </Badge>
                    ))}
                    {d.spezialisierung.length > 3 ? (
                      <Badge
                        variant="outline"
                        className="border-zinc-700 px-1.5 py-0 text-[10px]"
                      >
                        +{d.spezialisierung.length - 3}
                      </Badge>
                    ) : null}
                  </div>
                </CardHeader>
                <Separator className="bg-zinc-800" />
                <CardContent className="p-0">
                  <div className="flex flex-wrap items-center gap-1 px-3 py-2">
                    {d.phone ? (
                      <Tooltip>
                        <TooltipTrigger className="inline-flex">
                          <a href={`tel:${d.phone}`}>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-zinc-500 hover:bg-emerald-500/10 hover:text-emerald-400"
                            >
                              <Phone size={13} />
                            </Button>
                          </a>
                        </TooltipTrigger>
                        <TooltipContent>{d.phone}</TooltipContent>
                      </Tooltip>
                    ) : null}
                    {d.whatsapp ? (
                      <Tooltip>
                        <TooltipTrigger className="inline-flex">
                          <a
                            href={`https://wa.me/${d.whatsapp.replace(/\D/g, "")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-zinc-500 hover:bg-green-500/10 hover:text-green-400"
                            >
                              <MessageCircle size={13} />
                            </Button>
                          </a>
                        </TooltipTrigger>
                        <TooltipContent>WhatsApp: {d.whatsapp}</TooltipContent>
                      </Tooltip>
                    ) : null}
                    {d.email ? (
                      <Tooltip>
                        <TooltipTrigger className="inline-flex">
                          <a href={`mailto:${d.email}`}>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-zinc-500 hover:bg-blue-500/10 hover:text-blue-400"
                            >
                              <Mail size={13} />
                            </Button>
                          </a>
                        </TooltipTrigger>
                        <TooltipContent>{d.email}</TooltipContent>
                      </Tooltip>
                    ) : null}
                    {d.email ? (
                      <Tooltip>
                        <TooltipTrigger className="inline-flex">
                          <a
                            href={outlookKalenderLink(d)}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-zinc-500 hover:bg-indigo-500/10 hover:text-indigo-400"
                            >
                              <CalendarPlus size={13} />
                            </Button>
                          </a>
                        </TooltipTrigger>
                        <TooltipContent>Outlook-Termin erstellen</TooltipContent>
                      </Tooltip>
                    ) : null}
                    {d.website?.trim() ? (
                      <Tooltip>
                        <TooltipTrigger className="inline-flex">
                          <a
                            href={
                              /^https?:\/\//i.test(d.website!.trim())
                                ? d.website!.trim()
                                : `https://${d.website!.trim()}`
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-zinc-500 hover:bg-zinc-700 hover:text-zinc-300"
                            >
                              <ExternalLink size={13} />
                            </Button>
                          </a>
                        </TooltipTrigger>
                        <TooltipContent>Website öffnen</TooltipContent>
                      </Tooltip>
                    ) : null}
                    {d.vorlauf_tage > 0 ? (
                      <div className="ml-auto flex items-center gap-1 text-[10px] text-zinc-600">
                        <Clock size={9} />
                        {d.vorlauf_tage}T Vorlauf
                      </div>
                    ) : null}
                  </div>
                </CardContent>
                <CardFooter className="flex flex-col gap-2 px-3 pb-3 pt-0">
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 flex-1 border-zinc-700 text-xs hover:border-zinc-600"
                      onClick={() => setDetailId(d.id)}
                    >
                      <Eye size={11} className="mr-1" /> Details
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-zinc-500"
                      title="Buchungsregeln"
                      onClick={() => {
                        setRegelnFuerId(d.id);
                        setRegelnFuerName(d.firma);
                        setRegelnOffen(true);
                      }}
                    >
                      <ListOrdered size={12} />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-zinc-500"
                      onClick={() => oeffnenBearbeiten(d)}
                    >
                      <Pencil size={12} />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-zinc-600 hover:text-destructive"
                      onClick={() => void loeschen(d.id)}
                    >
                      <Trash2 size={12} />
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}

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

        <DienstleisterDetail
          offen={detailId !== null}
          onOffenChange={(o) => {
            if (!o) setDetailId(null);
          }}
          d={detailD}
          onBearbeiten={(d) => {
            setDetailId(null);
            oeffnenBearbeiten(d);
          }}
        />

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

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createClient } from "@/lib/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Pencil, Plus, Trash2, Users } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { nachrichtAusUnbekannt } from "@/lib/fehler";
import { StammdatenSection } from "@/components/stammdaten/StammdatenSection";
import { StammdatenFilterBar } from "@/components/stammdaten/StammdatenFilterBar";
import { StammdatenSheetFooter } from "@/components/stammdaten/StammdatenSheetFooter";

type Zeile = {
  id: string;
  name: string;
  email: string | null;
  role: string;
  active: boolean;
  department_id: string | null;
  auth_user_id: string | null;
  phone: string | null;
  whatsapp: string | null;
  team_id: string | null;
  qualifikationen: string[] | null;
  abteilungsName: string | null;
  teamName: string | null;
};

const monteurSchema = z.object({
  name: z.string().min(2, "Name erforderlich"),
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
  department_id: z.string().optional(),
  team_id: z.string().optional(),
  qualifikationen: z.array(z.string()).optional(),
});

type MonteurForm = z.infer<typeof monteurSchema>;

const koordinatorRollen = [
  { wert: "admin", label: "Admin" },
  { wert: "abteilungsleiter", label: "Abteilungsleiter" },
  { wert: "teamleiter", label: "Teamleiter" },
  { wert: "monteur", label: "Mitarbeiter (Ausführung)" },
] as const;

function apiFehler(json: { error?: string; fehler?: string }): string {
  return json.error ?? json.fehler ?? "Unbekannter Fehler.";
}

/** Entspricht darfMitarbeiterVerwalten (nur für Client, ohne server-Import). */
function darfAlleMitarbeiterVerwalten(rolle: string | undefined): boolean {
  return rolle === "admin" || rolle === "abteilungsleiter";
}

function rollenLabel(rolle: string): string {
  const m: Record<string, string> = {
    admin: "Admin",
    abteilungsleiter: "Abteilungsleiter",
    teamleiter: "Teamleiter",
    monteur: "Mitarbeiter (Ausführung)",
  };
  return m[rolle] ?? rolle;
}

export function MitarbeiterVerwaltung() {
  const supabase = useMemo(() => createClient(), []);
  const [zeilen, setZeilen] = useState<Zeile[]>([]);
  const [abteilungen, setAbteilungen] = useState<{ id: string; name: string }[]>(
    []
  );
  const [teams, setTeams] = useState<
    { id: string; name: string; department_id: string | null }[]
  >([]);
  const [laedt, setLaedt] = useState(true);

  const [suche, setSuche] = useState("");
  const [typFilter, setTypFilter] = useState<"alle" | "monteur" | "koordinator">(
    "alle"
  );
  const [abteilungFilter, setAbteilungFilter] = useState<string>("alle");
  const [teamFilter, setTeamFilter] = useState<string>("alle");

  const [monteurSheetOffen, setMonteurSheetOffen] = useState(false);
  const [bearbeitenId, setBearbeitenId] = useState<string | null>(null);

  const [koordinatorOffen, setKoordinatorOffen] = useState(false);
  const [koordinatorEmail, setKoordinatorEmail] = useState("");
  const [koordinatorLaedt, setKoordinatorLaedt] = useState(false);

  const [loeschenId, setLoeschenId] = useState<string | null>(null);
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const [koorBearbeiten, setKoorBearbeiten] = useState<Zeile | null>(null);
  const [koorAktiv, setKoorAktiv] = useState(true);
  const [koorSpeichert, setKoorSpeichert] = useState(false);

  const monteurF = useForm<MonteurForm>({
    resolver: zodResolver(monteurSchema),
    defaultValues: {
      name: "",
      phone: "",
      whatsapp: "",
      department_id: "",
      team_id: "",
      qualifikationen: [],
    },
  });

  const [tagInput, setTagInput] = useState("");

  const laden = useCallback(async () => {
    setLaedt(true);
    try {
      const syncRes = await fetch("/api/profil/self-sync", { method: "POST" });
      if (syncRes.ok) {
        const sj = (await syncRes.json()) as { erstellt?: boolean };
        if (sj.erstellt) {
          toast.success("Dein Mitarbeiterprofil wurde angelegt.");
        }
      }

      const [{ data: mitarbeiter, error: e1 }, { data: ab }, { data: tm }] =
        await Promise.all([
          supabase
            .from("employees")
            .select(
              "id,name,email,role,active,department_id,auth_user_id,phone,whatsapp,team_id,qualifikationen"
            )
            .order("name"),
          supabase.from("departments").select("id,name").order("name"),
          supabase.from("teams").select("id,name,department_id").order("name"),
        ]);
      if (e1) throw e1;

      const abMap = Object.fromEntries((ab ?? []).map((a) => [a.id, a.name]));
      const teamList = (tm ?? []) as {
        id: string;
        name: string;
        department_id: string | null;
      }[];
      const teamNameNachId = Object.fromEntries(
        teamList.map((t) => [t.id, t.name])
      );

      setAbteilungen((ab ?? []) as { id: string; name: string }[]);
      setTeams(teamList);

      setZeilen(
        (mitarbeiter ?? []).map((m) => {
          const qual = Array.isArray(m.qualifikationen)
            ? (m.qualifikationen as string[])
            : [];
          return {
            id: m.id as string,
            name: m.name as string,
            email: (m.email as string | null) ?? null,
            role: m.role as string,
            active: m.active as boolean,
            department_id: (m.department_id as string | null) ?? null,
            auth_user_id: (m.auth_user_id as string | null) ?? null,
            phone: (m.phone as string | null) ?? null,
            whatsapp: (m.whatsapp as string | null) ?? null,
            team_id: (m.team_id as string | null) ?? null,
            qualifikationen: qual,
            abteilungsName: m.department_id
              ? abMap[m.department_id as string] ?? null
              : null,
            teamName: m.team_id
              ? teamNameNachId[m.team_id as string] ?? null
              : null,
          };
        })
      );
    } catch (e) {
      toast.error(
        nachrichtAusUnbekannt(e, "Mitarbeiter konnten nicht geladen werden.")
      );
    } finally {
      setLaedt(false);
    }
  }, [supabase]);

  useEffect(() => {
    void laden();
  }, [laden]);

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => {
      setAuthUserId(data.user?.id ?? null);
    });
  }, [supabase]);

  const meineRolle = useMemo(() => {
    if (!authUserId) return null;
    return zeilen.find((z) => z.auth_user_id === authUserId)?.role ?? null;
  }, [zeilen, authUserId]);

  const abteilungFuerTeam = useCallback(
    (teamId: string | null) => {
      if (!teamId) return null;
      return teams.find((t) => t.id === teamId)?.department_id ?? null;
    },
    [teams]
  );

  const abteilungMonteur = monteurF.watch("department_id");
  const teamsGefiltert = useMemo(() => {
    if (!abteilungMonteur) return teams;
    return teams.filter((t) => t.department_id === abteilungMonteur);
  }, [teams, abteilungMonteur]);

  const gefilterteZeilen = useMemo(() => {
    const q = suche.trim().toLowerCase();
    const filtered = zeilen.filter((z) => {
      if (q && !z.name.toLowerCase().includes(q)) return false;
      if (typFilter === "monteur" && z.auth_user_id !== null) return false;
      if (typFilter === "koordinator" && z.auth_user_id === null) return false;
      if (abteilungFilter !== "alle" && z.department_id !== abteilungFilter)
        return false;
      if (teamFilter !== "alle" && z.team_id !== teamFilter) return false;
      return true;
    });
    if (!authUserId) return filtered;
    return [...filtered].sort((a, b) => {
      const aSel = a.auth_user_id === authUserId ? 0 : 1;
      const bSel = b.auth_user_id === authUserId ? 0 : 1;
      if (aSel !== bSel) return aSel - bSel;
      return a.name.localeCompare(b.name, "de");
    });
  }, [
    zeilen,
    suche,
    typFilter,
    abteilungFilter,
    teamFilter,
    authUserId,
  ]);

  async function rolleAendern(id: string, neueRolle: string) {
    const res = await fetch(`/api/admin/mitarbeiter/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: neueRolle }),
    });
    const json = (await res.json()) as { fehler?: string; error?: string };
    if (!res.ok) {
      toast.error(apiFehler(json));
      return;
    }
    toast.success("Rolle aktualisiert.");
    void laden();
  }

  function monteurSheetOeffnen(zeile?: Zeile) {
    if (zeile) {
      setBearbeitenId(zeile.id);
      monteurF.reset({
        name: zeile.name,
        phone: zeile.phone ?? "",
        whatsapp: zeile.whatsapp ?? "",
        department_id: zeile.department_id ?? "",
        team_id: zeile.team_id ?? "",
        qualifikationen: zeile.qualifikationen ?? [],
      });
    } else {
      setBearbeitenId(null);
      monteurF.reset({
        name: "",
        phone: "",
        whatsapp: "",
        department_id: "",
        team_id: "",
        qualifikationen: [],
      });
    }
    setTagInput("");
    setMonteurSheetOffen(true);
  }

  async function monteurSpeichern(w: MonteurForm) {
    const department_id = w.department_id || null;
    const team_id = w.team_id || null;
    if (
      team_id &&
      abteilungFuerTeam(team_id) &&
      department_id &&
      abteilungFuerTeam(team_id) !== department_id
    ) {
      toast.error("Team passt nicht zur gewählten Abteilung.");
      return;
    }
    const payload = {
      name: w.name.trim(),
      phone: w.phone?.trim() || null,
      whatsapp: w.whatsapp?.trim() || null,
      department_id,
      team_id,
      qualifikationen: w.qualifikationen?.length ? w.qualifikationen : [],
      role: "monteur" as const,
      auth_user_id: null as null,
      active: true,
    };

    try {
      if (bearbeitenId) {
        const { error } = await supabase
          .from("employees")
          .update(payload)
          .eq("id", bearbeitenId);
        if (error) throw error;
        await supabase.from("team_members").delete().eq("employee_id", bearbeitenId);
        if (team_id) {
          const { error: e2 } = await supabase.from("team_members").insert({
            team_id,
            employee_id: bearbeitenId,
            team_role: "mitglied",
          });
          if (e2) throw e2;
        }
        toast.success("Mitarbeiter gespeichert.");
      } else {
        const { data: neu, error } = await supabase
          .from("employees")
          .insert(payload)
          .select("id")
          .single();
        if (error) throw error;
        if (neu?.id && team_id) {
          const { error: e2 } = await supabase.from("team_members").insert({
            team_id,
            employee_id: neu.id as string,
            team_role: "mitglied",
          });
          if (e2) throw e2;
        }
        toast.success("Mitarbeiter angelegt.");
      }
      setMonteurSheetOffen(false);
      void laden();
    } catch (e) {
      toast.error(
        nachrichtAusUnbekannt(e, "Speichern fehlgeschlagen.")
      );
    }
  }

  async function mitarbeiterLoeschen() {
    if (!loeschenId) return;
    const { error } = await supabase.from("employees").delete().eq("id", loeschenId);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Eintrag gelöscht.");
    setLoeschenId(null);
    void laden();
  }

  async function koorAktivSpeichern() {
    if (!koorBearbeiten) return;
    setKoorSpeichert(true);
    try {
      const res = await fetch(`/api/admin/mitarbeiter/${koorBearbeiten.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: koorAktiv }),
      });
      const json = (await res.json()) as { fehler?: string; error?: string };
      if (!res.ok) {
        toast.error(apiFehler(json));
        return;
      }
      toast.success("Gespeichert.");
      setKoorBearbeiten(null);
      void laden();
    } finally {
      setKoorSpeichert(false);
    }
  }

  async function koordinatorEinladen() {
    const email = koordinatorEmail.trim().toLowerCase();
    if (!email) {
      toast.error("E-Mail eingeben.");
      return;
    }
    setKoordinatorLaedt(true);
    try {
      const res = await fetch("/api/admin/mitarbeiter/einladen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        fehler?: string;
        error?: string;
      };
      if (!res.ok) {
        toast.error(apiFehler(json));
        return;
      }
      toast.success(`Einladung gesendet an ${email}`);
      setKoordinatorEmail("");
      setKoordinatorOffen(false);
    } finally {
      setKoordinatorLaedt(false);
    }
  }

  function qualifikationHinzufuegen() {
    const t = tagInput.trim();
    if (!t) return;
    const cur = monteurF.getValues("qualifikationen") ?? [];
    if (cur.includes(t)) {
      setTagInput("");
      return;
    }
    monteurF.setValue("qualifikationen", [...cur, t]);
    setTagInput("");
  }

  function qualifikationEntfernen(q: string) {
    const cur = monteurF.getValues("qualifikationen") ?? [];
    monteurF.setValue(
      "qualifikationen",
      cur.filter((x) => x !== q)
    );
  }

  const qualifikationen = monteurF.watch("qualifikationen") ?? [];

  if (laedt) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
        Lade Mitarbeiter…
      </div>
    );
  }

  return (
    <StammdatenSection
      title="Mitarbeiter"
      description="Aktionen → Filter → Tabelle. Rolle in der Spalte „Rolle“ (nur bei Eintrag mit App-Konto)."
      actions={
        <>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1"
            onClick={() => monteurSheetOeffnen()}
          >
            <Plus className="size-4" />
            Mitarbeiter hinzufügen
          </Button>
          <Button
            type="button"
            size="sm"
            className="gap-1"
            onClick={() => setKoordinatorOffen(true)}
          >
            Koordinator einladen
          </Button>
        </>
      }
    >
      <StammdatenFilterBar>
        <Input
          placeholder="Suche nach Name…"
          value={suche}
          onChange={(e) => setSuche(e.target.value)}
          className="h-10 w-full min-w-0 border-zinc-700/90 bg-zinc-950/90 sm:col-span-2 lg:col-span-1"
        />
        <Select
          value={typFilter}
          onValueChange={(v) =>
            setTypFilter((v ?? "alle") as "alle" | "monteur" | "koordinator")
          }
        >
          <SelectTrigger className="h-10 w-full min-w-0 border-zinc-700/90 bg-zinc-950/90">
            <SelectValue placeholder="Typ" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="alle">Alle Typen</SelectItem>
            <SelectItem value="monteur">Nur ohne App-Konto</SelectItem>
            <SelectItem value="koordinator">Koordinatoren</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={abteilungFilter}
          onValueChange={(v) => setAbteilungFilter(v ?? "alle")}
        >
          <SelectTrigger className="h-10 w-full min-w-0 border-zinc-700/90 bg-zinc-950/90">
            <SelectValue placeholder="Abteilung" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="alle">Alle Abteilungen</SelectItem>
            {abteilungen.map((a) => (
              <SelectItem key={a.id} value={a.id}>
                {a.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={teamFilter}
          onValueChange={(v) => setTeamFilter(v ?? "alle")}
        >
          <SelectTrigger className="h-10 w-full min-w-0 border-zinc-700/90 bg-zinc-950/90">
            <SelectValue placeholder="Team" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="alle">Alle Teams</SelectItem>
            {teams.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </StammdatenFilterBar>

      {zeilen.length === 0 ? (
        <Card className="border-dashed border-zinc-700 bg-zinc-900/40">
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Users className="size-12 text-zinc-600" />
            <p className="font-medium text-zinc-200">
              Noch keine Mitarbeiter vorhanden
            </p>
            <p className="max-w-sm text-sm text-zinc-500">
              Lege Mitarbeiter an oder lade Koordinatoren per E-Mail ein.
            </p>
            <Button type="button" onClick={() => monteurSheetOeffnen()}>
              <Plus className="mr-1 size-4" />
              Mitarbeiter hinzufügen
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-md border border-zinc-800">
          <Table>
            <TableHeader>
              <TableRow className="border-zinc-800 hover:bg-transparent">
                <TableHead>Name</TableHead>
                <TableHead>Typ</TableHead>
                <TableHead>Abteilung</TableHead>
                <TableHead>Team</TableHead>
                <TableHead>Telefon</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Rolle</TableHead>
                <TableHead className="text-right">Aktionen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {gefilterteZeilen.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="text-center text-muted-foreground"
                  >
                    Keine Treffer für die Filter.
                  </TableCell>
                </TableRow>
              ) : (
                gefilterteZeilen.map((z) => {
                  const istKoordinator = z.auth_user_id !== null;
                  return (
                    <TableRow key={z.id} className="border-zinc-800">
                      <TableCell className="font-medium">
                        <span className="inline-flex flex-wrap items-center gap-2">
                          {z.name}
                          {authUserId && z.auth_user_id === authUserId ? (
                            <Badge
                              variant="outline"
                              className="border-emerald-600/50 text-emerald-400"
                            >
                              Du
                            </Badge>
                          ) : null}
                        </span>
                      </TableCell>
                      <TableCell>
                        {istKoordinator ? (
                          <Badge>Koordinator</Badge>
                        ) : (
                          <Badge variant="secondary">Mitarbeiter</Badge>
                        )}
                      </TableCell>
                      <TableCell>{z.abteilungsName ?? "—"}</TableCell>
                      <TableCell>{z.teamName ?? "—"}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {z.phone ?? "—"}
                      </TableCell>
                      <TableCell>
                        {z.active ? (
                          <Badge className="bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/25">
                            Aktiv
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Inaktiv</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {istKoordinator ? (
                          (() => {
                            const darfAlle =
                              meineRolle !== null &&
                              darfAlleMitarbeiterVerwalten(meineRolle);
                            const eigeneZeile =
                              authUserId !== null &&
                              z.auth_user_id === authUserId;
                            const kannDropdown =
                              darfAlle ||
                              (eigeneZeile &&
                                (z.role === "monteur" || z.role === "teamleiter"));
                            const optionen = darfAlle
                              ? koordinatorRollen
                              : koordinatorRollen.filter((r) =>
                                  ["monteur", "teamleiter"].includes(r.wert)
                                );
                            return kannDropdown ? (
                              <Select
                                value={z.role}
                                onValueChange={(v) => {
                                  if (v) void rolleAendern(z.id, v);
                                }}
                              >
                                <SelectTrigger className="h-8 min-w-[12rem] max-w-[220px] border-zinc-600">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {optionen.map((r) => (
                                    <SelectItem key={r.wert} value={r.wert}>
                                      {r.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <span className="text-muted-foreground">
                                {rollenLabel(z.role)}
                              </span>
                            );
                          })()
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          onClick={() => {
                            if (istKoordinator) {
                              setKoorBearbeiten(z);
                              setKoorAktiv(z.active);
                            } else {
                              monteurSheetOeffnen(z);
                            }
                          }}
                          title="Bearbeiten"
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-8 text-destructive"
                          onClick={() => setLoeschenId(z.id)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <Sheet open={monteurSheetOffen} onOpenChange={setMonteurSheetOffen}>
        <SheetContent
          side="right"
          className="flex w-full max-h-[90dvh] flex-col gap-0 overflow-y-auto border-zinc-800 bg-zinc-950 p-0 shadow-2xl sm:max-w-md"
        >
          <form
            onSubmit={monteurF.handleSubmit(async (d) => {
              await monteurSpeichern(d);
            })}
            className="flex flex-col"
          >
            <SheetHeader className="sticky top-0 z-10 border-b border-zinc-800/80 bg-zinc-950/95 px-4 pb-3 pt-4 pr-12 backdrop-blur-sm">
              <SheetTitle className="text-lg">
                {bearbeitenId ? "Mitarbeiter bearbeiten" : "Mitarbeiter hinzufügen"}
              </SheetTitle>
            </SheetHeader>
            <div className="space-y-5 px-4 py-5">
              <div className="space-y-2">
                <Label htmlFor="m-name">Name *</Label>
                <Input
                  id="m-name"
                  {...monteurF.register("name")}
                  className="h-10 w-full border-zinc-700/90 bg-zinc-900/80"
                />
                {monteurF.formState.errors.name && (
                  <p className="text-xs text-destructive">
                    {monteurF.formState.errors.name.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="m-phone">Telefon</Label>
                <Input
                  id="m-phone"
                  placeholder="+49 151…"
                  {...monteurF.register("phone")}
                  className="h-10 w-full border-zinc-700/90 bg-zinc-900/80"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="m-wa">WhatsApp</Label>
                <Input
                  id="m-wa"
                  placeholder="+49 151…"
                  {...monteurF.register("whatsapp")}
                  className="h-10 w-full border-zinc-700/90 bg-zinc-900/80"
                />
                <p className="text-xs text-muted-foreground">
                  Für Einsatz-Benachrichtigungen
                </p>
              </div>
              <div className="space-y-2">
                <Label>Abteilung</Label>
                <Select
                  value={monteurF.watch("department_id") || "__none__"}
                  onValueChange={(v) => {
                    const val = v === "__none__" || v == null ? "" : v;
                    monteurF.setValue("department_id", val);
                    monteurF.setValue("team_id", "");
                  }}
                >
                  <SelectTrigger className="h-10 w-full min-w-0 border-zinc-700/90 bg-zinc-900/80">
                    <SelectValue placeholder="Abteilung wählen" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Keine Abteilung</SelectItem>
                    {abteilungen.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Team</Label>
                <Select
                  value={monteurF.watch("team_id") || "__none__"}
                  onValueChange={(v) =>
                    monteurF.setValue(
                      "team_id",
                      v === "__none__" || v == null ? "" : v
                    )
                  }
                >
                  <SelectTrigger className="h-10 w-full min-w-0 border-zinc-700/90 bg-zinc-900/80">
                    <SelectValue placeholder="Team wählen" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Kein Team</SelectItem>
                    {teamsGefiltert.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Qualifikationen</Label>
                <div className="flex gap-2">
                  <Input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        qualifikationHinzufuegen();
                      }
                    }}
                    placeholder="Eingabe + Enter"
                    className="h-10 w-full border-zinc-700/90 bg-zinc-900/80"
                  />
                </div>
                <div className="flex flex-wrap gap-1">
                  {qualifikationen.map((q) => (
                    <Badge
                      key={q}
                      variant="secondary"
                      className="cursor-pointer gap-1 pr-1"
                      onClick={() => qualifikationEntfernen(q)}
                    >
                      {q}
                      <span className="text-xs">×</span>
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
            <StammdatenSheetFooter
              onCancel={() => setMonteurSheetOffen(false)}
              isSubmitting={monteurF.formState.isSubmitting}
            />
          </form>
        </SheetContent>
      </Sheet>

      <Dialog
        open={!!koorBearbeiten}
        onOpenChange={(o) => !o && setKoorBearbeiten(null)}
      >
        <DialogContent className="border-zinc-800 bg-zinc-950">
          <DialogHeader>
            <DialogTitle>Koordinator</DialogTitle>
            <DialogDescription>
              Status für {koorBearbeiten?.name ?? ""}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>E-Mail</Label>
              <p className="text-sm text-muted-foreground">
                {koorBearbeiten?.email ?? "—"}
              </p>
            </div>
            <div className="flex items-center justify-between gap-4">
              <Label htmlFor="koor-aktiv">Aktiv</Label>
              <Switch
                id="koor-aktiv"
                checked={koorAktiv}
                onCheckedChange={setKoorAktiv}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setKoorBearbeiten(null)}
            >
              Abbrechen
            </Button>
            <Button
              type="button"
              onClick={() => void koorAktivSpeichern()}
              disabled={koorSpeichert}
            >
              {koorSpeichert ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                "Speichern"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={koordinatorOffen} onOpenChange={setKoordinatorOffen}>
        <DialogContent className="border-zinc-800 bg-zinc-950">
          <DialogHeader>
            <DialogTitle>Koordinator einladen</DialogTitle>
            <DialogDescription>
              Der Eingeladene erhält eine E-Mail und kann sich dann einloggen.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="k-email">E-Mail *</Label>
            <Input
              id="k-email"
              type="email"
              value={koordinatorEmail}
              onChange={(e) => setKoordinatorEmail(e.target.value)}
              className="border-zinc-700 bg-zinc-900"
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              onClick={() => void koordinatorEinladen()}
              disabled={koordinatorLaedt}
            >
              {koordinatorLaedt ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                "Einladung senden"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!loeschenId} onOpenChange={(o) => !o && setLoeschenId(null)}>
        <DialogContent className="border-zinc-800 bg-zinc-950">
          <DialogHeader>
            <DialogTitle>Eintrag löschen?</DialogTitle>
            <DialogDescription>
              Diese Aktion kann nicht rückgängig gemacht werden.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setLoeschenId(null)}
            >
              Abbrechen
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void mitarbeiterLoeschen()}
            >
              Löschen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </StammdatenSection>
  );
}

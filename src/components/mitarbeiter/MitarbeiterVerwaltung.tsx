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
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Pencil, Plus, Trash2, Users } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { nachrichtAusUnbekannt } from "@/lib/fehler";
import { cn } from "@/lib/utils";
import { StammdatenSection } from "@/components/stammdaten/StammdatenSection";
import { StammdatenSheetFooter } from "@/components/stammdaten/StammdatenSheetFooter";
import {
  STAMMDATEN_FILTER_INPUT,
  STAMMDATEN_FORM_INPUT,
  STAMMDATEN_FORM_SELECT_TRIGGER,
} from "@/components/stammdaten/stammdatenKlassen";
import { StammdatenFormField } from "@/components/stammdaten/StammdatenFormField";
import {
  MITARBEITER_ROLLEN_OPTIONS,
  rolleLabel,
} from "@/lib/rollen";

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
  abteilungsName: string | null;
  teamName: string | null;
};

const monteurSchema = z.object({
  name: z.string().min(2, "Name erforderlich"),
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
  department_id: z.string().optional(),
  team_id: z.string().optional(),
});

type MonteurForm = z.infer<typeof monteurSchema>;

function apiFehler(json: { error?: string; fehler?: string }): string {
  return json.error ?? json.fehler ?? "Unbekannter Fehler.";
}

/** Entspricht darfMitarbeiterVerwalten (nur für Client, ohne server-Import). */
function darfAlleMitarbeiterVerwalten(rolle: string | undefined): boolean {
  return rolle === "admin" || rolle === "abteilungsleiter";
}

function initialenAusName(name: string): string {
  const p = name.trim().split(/\s+/).filter(Boolean);
  if (p.length >= 2) return (p[0]![0]! + p[1]![0]!).toUpperCase();
  return name.slice(0, 2).toUpperCase() || "?";
}

function eingebetteterName(raw: unknown): string | null {
  if (raw == null) return null;
  const one = Array.isArray(raw) ? raw[0] : raw;
  if (one && typeof one === "object" && "name" in one) {
    const n = (one as { name?: string }).name;
    return n != null && String(n).trim() !== "" ? String(n) : null;
  }
  return null;
}

function zeileAusSupabase(
  m: Record<string, unknown>,
  abMap: Record<string, string>,
  teamNameNachId: Record<string, string>
): Zeile {
  const depId = (m.department_id as string | null) ?? null;
  const tmId = (m.team_id as string | null) ?? null;
  const nameAusDep = eingebetteterName(m.departments);
  const nameAusTeam = eingebetteterName(m.teams);
  return {
    id: m.id as string,
    name: m.name as string,
    email: (m.email as string | null) ?? null,
    role: m.role as string,
    active: m.active as boolean,
    department_id: depId,
    auth_user_id: (m.auth_user_id as string | null) ?? null,
    phone: (m.phone as string | null) ?? null,
    whatsapp: (m.whatsapp as string | null) ?? null,
    team_id: tmId,
    abteilungsName: nameAusDep ?? (depId ? abMap[depId] ?? null : null),
    teamName: nameAusTeam ?? (tmId ? teamNameNachId[tmId] ?? null : null),
  };
}

type MitarbeiterVerwaltungProps = {
  onDatenGeaendert?: () => void;
};

export function MitarbeiterVerwaltung({
  onDatenGeaendert,
}: MitarbeiterVerwaltungProps = {}) {
  const supabase = useMemo(() => createClient(), []);
  const [zeilen, setZeilen] = useState<Zeile[]>([]);
  const [abteilungen, setAbteilungen] = useState<{ id: string; name: string }[]>(
    []
  );
  const [teams, setTeams] = useState<
    { id: string; name: string; department_id: string | null; farbe: string }[]
  >([]);
  const [laedt, setLaedt] = useState(true);

  const [suche, setSuche] = useState("");

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
  const [koorDepartmentId, setKoorDepartmentId] = useState("");
  const [koorTeamIds, setKoorTeamIds] = useState<string[]>([]);

  const monteurF = useForm<MonteurForm>({
    resolver: zodResolver(monteurSchema),
    defaultValues: {
      name: "",
      phone: "",
      whatsapp: "",
      department_id: "",
      team_id: "",
    },
  });

  const laden = useCallback(async () => {
    setLaedt(true);
    try {
      const syncRes = await fetch("/api/profil/self-sync", { method: "POST" });
      if (syncRes.ok) {
        const sj = (await syncRes.json()) as { erstellt?: boolean };
        if (sj.erstellt) {
          toast.success("Dein Mitarbeiterprofil wurde angelegt.");
        }
      } else if (syncRes.status === 503) {
        const sj = (await syncRes.json().catch(() => ({}))) as {
          nachricht?: string;
        };
        toast.error(
          sj.nachricht ??
            "Mitarbeiterprofil konnte nicht automatisch angelegt werden (Konfiguration)."
        );
      }

      const [{ data: mitarbeiter, error: e1 }, { data: ab }, { data: tm }] =
        await Promise.all([
          supabase
            .from("employees")
            .select(
              "id,name,email,role,active,department_id,auth_user_id,phone,whatsapp,team_id, departments!department_id(name), teams!team_id(name,farbe)"
            )
            .order("name"),
          supabase.from("departments").select("id,name").order("name"),
          supabase
            .from("teams")
            .select("id,name,department_id,farbe")
            .order("name"),
        ]);
      if (e1) throw e1;

      const abMap = Object.fromEntries((ab ?? []).map((a) => [a.id, a.name]));
      const teamList = (tm ?? []) as {
        id: string;
        name: string;
        department_id: string | null;
        farbe: string;
      }[];
      const teamNameNachId = Object.fromEntries(
        teamList.map((t) => [t.id, t.name])
      );
      const teamListNormalisiert = teamList.map((t) => ({
        ...t,
        farbe: t.farbe || "#3b82f6",
      }));

      setAbteilungen((ab ?? []) as { id: string; name: string }[]);
      setTeams(teamListNormalisiert);

      const empIds = (mitarbeiter ?? []).map((m) => m.id as string).filter(Boolean);
      const teamLabelByEmp = new Map<string, string>();
      if (empIds.length > 0) {
        const { data: tmem } = await supabase
          .from("team_members")
          .select("employee_id, teams(name)")
          .in("employee_id", empIds);
        const byE: Record<string, string[]> = {};
        for (const row of tmem ?? []) {
          const eid = row.employee_id as string;
          const rawT = row.teams as { name?: string } | { name?: string }[] | null;
          const one = Array.isArray(rawT) ? rawT[0] : rawT;
          const n = (one as { name?: string })?.name;
          if (!n) continue;
          if (!byE[eid]) byE[eid] = [];
          byE[eid].push(n);
        }
        for (const [eid, names] of Object.entries(byE)) {
          const u = Array.from(new Set(names));
          teamLabelByEmp.set(
            eid,
            u.length > 2
              ? `${u[0]}, ${u[1]} (+${u.length - 2})`
              : u.join(", ")
          );
        }
      }

      let zeilenNeu = (mitarbeiter ?? []).map((m) => {
        const z = zeileAusSupabase(
          m as Record<string, unknown>,
          abMap,
          teamNameNachId
        );
        const ausMitglied = teamLabelByEmp.get(z.id);
        return ausMitglied ? { ...z, teamName: ausMitglied } : z;
      });

      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      const uid = authUser?.id ?? null;
      if (
        uid &&
        !zeilenNeu.some((z) => z.auth_user_id === uid)
      ) {
        const selfRes = await fetch("/api/profil/mitarbeiter-self");
        if (selfRes.ok) {
          const j = (await selfRes.json()) as {
            mitarbeiter: Record<string, unknown> | null;
          };
          if (j.mitarbeiter) {
            const erg = zeileAusSupabase(j.mitarbeiter, abMap, teamNameNachId);
            if (!zeilenNeu.some((z) => z.id === erg.id)) {
              zeilenNeu = [...zeilenNeu, erg];
            }
          }
        }
      }

      setZeilen(zeilenNeu);
    } catch (e) {
      toast.error(
        nachrichtAusUnbekannt(e, "Mitarbeiter konnten nicht geladen werden.")
      );
    } finally {
      setLaedt(false);
      onDatenGeaendert?.();
    }
  }, [supabase, onDatenGeaendert]);

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

  /** Alle Teams, gruppiert nach Abteilungsname (Koordinator darf mehrere Teams / Bereiche wählen). */
  const teamsMitAbteilungsLabel = useMemo(() => {
    const abName = (id: string | null) =>
      id ? (abteilungen.find((a) => a.id === id)?.name ?? "Ohne Abteilung") : "Ohne Abteilung";
    return [...teams].sort((a, b) => {
      const na = abName(a.department_id);
      const nb = abName(b.department_id);
      if (na !== nb) return na.localeCompare(nb, "de");
      return a.name.localeCompare(b.name, "de");
    });
  }, [teams, abteilungen]);

  const koorHauptAbteilungLabel = useMemo(() => {
    if (!koorDepartmentId) return null;
    return abteilungen.find((a) => a.id === koorDepartmentId)?.name ?? null;
  }, [abteilungen, koorDepartmentId]);

  const koorHauptAbteilungVerwaist =
    Boolean(koorDepartmentId) &&
    !abteilungen.some((a) => a.id === koorDepartmentId);

  const gefilterteZeilen = useMemo(() => {
    const q = suche.trim().toLowerCase();
    const filtered = zeilen.filter((z) => {
      if (!q) return true;
      const inName = z.name.toLowerCase().includes(q);
      const inMail = (z.email ?? "").toLowerCase().includes(q);
      return inName || inMail;
    });
    if (!authUserId) return filtered;
    return [...filtered].sort((a, b) => {
      const aSel = a.auth_user_id === authUserId ? 0 : 1;
      const bSel = b.auth_user_id === authUserId ? 0 : 1;
      if (aSel !== bSel) return aSel - bSel;
      return a.name.localeCompare(b.name, "de");
    });
  }, [zeilen, suche, authUserId]);

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
      });
    } else {
      setBearbeitenId(null);
      monteurF.reset({
        name: "",
        phone: "",
        whatsapp: "",
        department_id: "",
        team_id: "",
      });
    }
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
      qualifikationen: [] as string[],
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

  async function koorProfilSpeichern() {
    if (!koorBearbeiten) return;
    const department_id = koorDepartmentId || null;
    setKoorSpeichert(true);
    try {
      const res = await fetch(`/api/admin/mitarbeiter/${koorBearbeiten.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          active: koorAktiv,
          department_id,
          team_ids: koorTeamIds,
        }),
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
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            className="h-10 min-h-10 gap-1.5 px-4 text-sm font-medium"
            onClick={() => monteurSheetOeffnen()}
          >
            <Plus className="size-4 shrink-0" />
            Mitarbeiter hinzufügen
          </Button>
          <Button
            type="button"
            className="h-10 min-h-10 gap-1.5 px-4 text-sm font-medium"
            onClick={() => setKoordinatorOffen(true)}
          >
            Koordinator einladen
          </Button>
        </div>
      }
    >
      <div className="rounded-xl border border-zinc-800/70 bg-zinc-900/25 p-4">
        <Input
          placeholder="Mitarbeiter durchsuchen…"
          value={suche}
          onChange={(e) => setSuche(e.target.value)}
          className={cn(STAMMDATEN_FILTER_INPUT, "max-w-md")}
          aria-label="Mitarbeiter durchsuchen"
        />
      </div>

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
              <TableRow className="border-0 hover:bg-transparent">
                <TableHead className="text-left text-xs font-semibold uppercase tracking-wider text-zinc-500 pb-3 px-2">
                  Name
                </TableHead>
                <TableHead className="text-left text-xs font-semibold uppercase tracking-wider text-zinc-500 pb-3 px-2">
                  Typ
                </TableHead>
                <TableHead className="text-left text-xs font-semibold uppercase tracking-wider text-zinc-500 pb-3 px-2">
                  Abteilung
                </TableHead>
                <TableHead className="text-left text-xs font-semibold uppercase tracking-wider text-zinc-500 pb-3 px-2">
                  Team
                </TableHead>
                <TableHead className="text-left text-xs font-semibold uppercase tracking-wider text-zinc-500 pb-3 px-2">
                  Telefon
                </TableHead>
                <TableHead className="text-left text-xs font-semibold uppercase tracking-wider text-zinc-500 pb-3 px-2">
                  Status
                </TableHead>
                <TableHead className="text-left text-xs font-semibold uppercase tracking-wider text-zinc-500 pb-3 px-2">
                  Rolle
                </TableHead>
                <TableHead className="pb-3 px-2 text-right text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  Aktionen
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {gefilterteZeilen.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="text-center text-muted-foreground"
                  >
                    {suche.trim()
                      ? `Keine Treffer für „${suche.trim()}“.`
                      : "Keine Treffer."}
                  </TableCell>
                </TableRow>
              ) : (
                gefilterteZeilen.map((z) => {
                  const istKoordinator = z.auth_user_id !== null;
                  return (
                    <TableRow
                      key={z.id}
                      className="group border-b border-zinc-800/40 transition-colors hover:bg-zinc-900/50"
                    >
                      <TableCell className="font-medium">
                        <span className="inline-flex flex-wrap items-center gap-2">
                          <div
                            className="flex size-7 shrink-0 items-center justify-center rounded-full border border-zinc-700 bg-zinc-800 text-xs font-bold text-zinc-400"
                            aria-hidden
                          >
                            {initialenAusName(z.name)}
                          </div>
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
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-900/50 bg-emerald-950 px-2 py-0.5 text-xs font-semibold text-emerald-400">
                            <span className="size-1.5 animate-pulse rounded-full bg-emerald-400" />
                            Aktiv
                          </span>
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
                              ? MITARBEITER_ROLLEN_OPTIONS
                              : MITARBEITER_ROLLEN_OPTIONS.filter((r) =>
                                  ["monteur", "teamleiter"].includes(r.value)
                                );
                            return kannDropdown ? (
                              <Select
                                value={z.role}
                                onValueChange={(v) => {
                                  if (v) void rolleAendern(z.id, v);
                                }}
                              >
                                <SelectTrigger className="h-8 min-w-[12rem] max-w-[220px] border-zinc-800 bg-zinc-900 text-zinc-100 hover:bg-zinc-800/50 focus:ring-zinc-600/50">
                                  <SelectValue>
                                    {rolleLabel(z.role)}
                                  </SelectValue>
                                </SelectTrigger>
                                <SelectContent className="border-zinc-800 bg-zinc-900">
                                  {optionen.map((r) => (
                                    <SelectItem key={r.value} value={r.value}>
                                      {r.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <span className="text-muted-foreground">
                                {rolleLabel(z.role)}
                              </span>
                            );
                          })()
                        ) : (
                          <span className="text-muted-foreground">
                            {rolleLabel(z.role)}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right opacity-0 transition-opacity group-hover:opacity-100">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-8 rounded-md text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
                          onClick={() => {
                            if (istKoordinator) {
                              void (async () => {
                                setKoorBearbeiten(z);
                                setKoorAktiv(z.active);
                                setKoorDepartmentId(z.department_id ?? "");
                                const { data } = await supabase
                                  .from("team_members")
                                  .select("team_id")
                                  .eq("employee_id", z.id);
                                const ids = (data ?? []).map(
                                  (r) => r.team_id as string
                                );
                                const uniq = Array.from(new Set(ids));
                                if (uniq.length === 0 && z.team_id) {
                                  uniq.push(z.team_id);
                                }
                                const geord =
                                  z.team_id && uniq.includes(z.team_id)
                                    ? [
                                        z.team_id,
                                        ...uniq.filter((x) => x !== z.team_id),
                                      ]
                                    : uniq;
                                setKoorTeamIds(geord);
                              })();
                            } else {
                              monteurSheetOeffnen(z);
                            }
                          }}
                          title="Bearbeiten"
                        >
                          <Pencil className="size-[13px]" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-8 rounded-md text-zinc-500 hover:bg-red-950 hover:text-red-400"
                          onClick={() => setLoeschenId(z.id)}
                        >
                          <Trash2 className="size-[13px]" />
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
            <SheetHeader className="sticky top-0 z-10 border-b border-zinc-800/60 bg-zinc-950/95 px-6 pb-4 pt-6 pr-14 backdrop-blur-sm">
              <SheetTitle className="text-base font-semibold text-zinc-100">
                {bearbeitenId ? "Mitarbeiter bearbeiten" : "Neuen Mitarbeiter hinzufügen"}
              </SheetTitle>
              <p className="mt-0.5 text-sm text-zinc-500">
                Stammdaten für die Montageplanung und Benachrichtigungen.
              </p>
            </SheetHeader>
            <div className="space-y-4 px-6 py-5">
              <StammdatenFormField label="Name *">
                <Input
                  id="m-name"
                  {...monteurF.register("name")}
                  className={STAMMDATEN_FORM_INPUT}
                />
                {monteurF.formState.errors.name && (
                  <p className="text-xs text-destructive">
                    {monteurF.formState.errors.name.message}
                  </p>
                )}
              </StammdatenFormField>
              <StammdatenFormField label="Telefon">
                <Input
                  id="m-phone"
                  placeholder="+49 151…"
                  {...monteurF.register("phone")}
                  className={STAMMDATEN_FORM_INPUT}
                />
              </StammdatenFormField>
              <StammdatenFormField
                label="WhatsApp"
                hint="Für Einsatz-Benachrichtigungen"
              >
                <Input
                  id="m-wa"
                  placeholder="+49 151…"
                  {...monteurF.register("whatsapp")}
                  className={STAMMDATEN_FORM_INPUT}
                />
              </StammdatenFormField>
              <StammdatenFormField label="Abteilung">
                <Select
                  value={monteurF.watch("department_id") || "__none__"}
                  onValueChange={(v) => {
                    const val = v === "__none__" || v == null ? "" : v;
                    monteurF.setValue("department_id", val);
                    monteurF.setValue("team_id", "");
                  }}
                >
                  <SelectTrigger
                    className={cn(STAMMDATEN_FORM_SELECT_TRIGGER, "h-10 rounded-lg")}
                  >
                    <SelectValue placeholder="Abteilung wählen" />
                  </SelectTrigger>
                  <SelectContent className="border-zinc-800 bg-zinc-900">
                    <SelectItem value="__none__">Keine Abteilung</SelectItem>
                    {abteilungen.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </StammdatenFormField>
              <StammdatenFormField label="Team">
                <Select
                  value={monteurF.watch("team_id") || "__none__"}
                  onValueChange={(v) =>
                    monteurF.setValue(
                      "team_id",
                      v === "__none__" || v == null ? "" : v
                    )
                  }
                >
                  <SelectTrigger
                    className={cn(STAMMDATEN_FORM_SELECT_TRIGGER, "h-10 rounded-lg")}
                  >
                    <SelectValue placeholder="Team wählen" />
                  </SelectTrigger>
                  <SelectContent className="border-zinc-800 bg-zinc-900">
                    <SelectItem value="__none__">Kein Team</SelectItem>
                    {teamsGefiltert.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        <span className="flex items-center gap-2">
                          <span
                            className="size-2 shrink-0 rounded-full"
                            style={{
                              background: t.farbe ?? "#3b82f6",
                            }}
                          />
                          {t.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </StammdatenFormField>
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
        <DialogContent className="max-w-md overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 p-0">
          <DialogHeader className="border-b border-zinc-800/60 px-6 pb-4 pt-6 text-left">
            <DialogTitle className="text-base font-semibold text-zinc-100">
              Koordinator
            </DialogTitle>
            <DialogDescription className="text-sm text-zinc-500">
              Status für {koorBearbeiten?.name ?? ""}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 px-6 py-5">
            <StammdatenFormField label="E-Mail">
              <p className="text-sm text-zinc-400">
                {koorBearbeiten?.email ?? "—"}
              </p>
            </StammdatenFormField>
            <StammdatenFormField
              label="Haupt-Abteilung (optional)"
              hint="Pflicht nur, wenn alle Teams dieser einen Abteilung zugeordnet sein sollen. Ohne Auswahl: mehrere Teams aus verschiedenen Abteilungen möglich (Haupt-Abteilung bleibt leer)."
            >
              <Select
                value={koorDepartmentId || "__none__"}
                onValueChange={(v) => {
                  const val = v === "__none__" || v == null ? "" : v;
                  setKoorDepartmentId(val);
                }}
              >
                <SelectTrigger
                  className={cn(STAMMDATEN_FORM_SELECT_TRIGGER, "h-10 rounded-lg")}
                >
                  <SelectValue placeholder="Keine feste Haupt-Abteilung">
                    {koorDepartmentId ? (
                      koorHauptAbteilungVerwaist ? (
                        <span
                          className="text-amber-200/90"
                          title={koorDepartmentId}
                        >
                          Abteilung nicht verfügbar
                        </span>
                      ) : (
                        koorHauptAbteilungLabel ?? "…"
                      )
                    ) : null}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="border-zinc-800 bg-zinc-900">
                  <SelectItem value="__none__">Keine Abteilung</SelectItem>
                  {koorHauptAbteilungVerwaist && koorDepartmentId ? (
                    <SelectItem value={koorDepartmentId}>
                      <span className="text-amber-200/90">
                        Verwaiste ID – bitte neu wählen
                      </span>
                    </SelectItem>
                  ) : null}
                  {abteilungen.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </StammdatenFormField>
            <StammdatenFormField
              label="Teams"
              hint="Mehrfach wählbar – auch über mehrere Abteilungen hinweg (je Team eine Zuordnung). Reihenfolge: erstes Häkchen = Primärteam (Anzeige in Listen)."
            >
              <div className="max-h-52 space-y-0.5 overflow-y-auto rounded-lg border border-zinc-800 bg-zinc-900/60 p-2">
                {teamsMitAbteilungsLabel.length === 0 ? (
                  <p className="px-1 text-xs text-zinc-500">
                    Noch keine Teams angelegt.
                  </p>
                ) : (
                  teamsMitAbteilungsLabel.map((t) => {
                    const ab = t.department_id
                      ? abteilungen.find((a) => a.id === t.department_id)?.name
                      : null;
                    return (
                      <label
                        key={t.id}
                        className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 text-sm text-zinc-200 hover:bg-zinc-800/80"
                      >
                        <Checkbox
                          checked={koorTeamIds.includes(t.id)}
                          onCheckedChange={(c) => {
                            setKoorTeamIds((prev) =>
                              c === true
                                ? [...prev, t.id]
                                : prev.filter((x) => x !== t.id)
                            );
                          }}
                        />
                        <span
                          className="size-2.5 shrink-0 rounded-full"
                          style={{ background: t.farbe ?? "#3b82f6" }}
                          aria-hidden
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block font-medium">{t.name}</span>
                          {ab ? (
                            <span className="text-[11px] text-zinc-500">
                              {ab}
                            </span>
                          ) : (
                            <span className="text-[11px] text-zinc-600">
                              Ohne Abteilung
                            </span>
                          )}
                        </span>
                      </label>
                    );
                  })
                )}
              </div>
            </StammdatenFormField>
            <div className="flex items-center justify-between gap-4">
              <span className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                Aktiv
              </span>
              <Switch
                id="koor-aktiv"
                checked={koorAktiv}
                onCheckedChange={setKoorAktiv}
              />
            </div>
          </div>
          <DialogFooter className="border-t border-zinc-800/60 px-6 pb-6 pt-3">
            <Button
              type="button"
              variant="ghost"
              className="text-zinc-400"
              onClick={() => setKoorBearbeiten(null)}
            >
              Abbrechen
            </Button>
            <Button
              type="button"
              className="bg-zinc-100 font-semibold text-zinc-900 hover:bg-white"
              onClick={() => void koorProfilSpeichern()}
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
        <DialogContent className="max-w-md overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 p-0">
          <DialogHeader className="border-b border-zinc-800/60 px-6 pb-4 pt-6 text-left">
            <DialogTitle className="text-base font-semibold text-zinc-100">
              Koordinator einladen
            </DialogTitle>
            <DialogDescription className="text-sm text-zinc-500">
              Der Eingeladene erhält eine E-Mail und kann sich dann einloggen.
            </DialogDescription>
          </DialogHeader>
          <div className="px-6 py-5">
            <StammdatenFormField label="E-Mail *">
              <Input
                id="k-email"
                type="email"
                value={koordinatorEmail}
                onChange={(e) => setKoordinatorEmail(e.target.value)}
                className={STAMMDATEN_FORM_INPUT}
              />
            </StammdatenFormField>
          </div>
          <DialogFooter className="border-t border-zinc-800/60 px-6 pb-6 pt-3">
            <Button
              type="button"
              variant="ghost"
              className="text-zinc-400"
              onClick={() => setKoordinatorOffen(false)}
            >
              Abbrechen
            </Button>
            <Button
              type="button"
              className="bg-zinc-100 font-semibold text-zinc-900 hover:bg-white"
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
        <DialogContent className="max-w-md overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 p-0">
          <DialogHeader className="border-b border-zinc-800/60 px-6 pb-4 pt-6 text-left">
            <DialogTitle className="text-base font-semibold text-zinc-100">
              Eintrag löschen?
            </DialogTitle>
            <DialogDescription className="text-sm text-zinc-500">
              Diese Aktion kann nicht rückgängig gemacht werden.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="px-6 pb-6 pt-3">
            <Button
              type="button"
              variant="ghost"
              className="text-zinc-400"
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

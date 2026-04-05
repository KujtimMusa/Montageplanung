"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createClient } from "@/lib/supabase/client";
import { fetchMyOrganizationId } from "@/lib/supabase/org-client";
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
import { MitarbeiterPwaZugang } from "@/components/mitarbeiter/MitarbeiterPwaZugang";
import { KoordinatorPwaZugang } from "@/components/mitarbeiter/KoordinatorPwaZugang";

type MitarbeiterAbteilungEmbed = {
  department_id: string;
  ist_primaer: boolean;
  departments: { name: string; color: string } | null;
};

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
  pwa_token: string | null;
  abteilungsName: string | null;
  teamName: string | null;
  employee_departments?: MitarbeiterAbteilungEmbed[];
};

const monteurSchema = z.object({
  name: z.string().min(2, "Name erforderlich"),
  phone: z.string().optional(),
  email: z.string().email("Ungültige E-Mail").optional().or(z.literal("")),
  whatsapp: z.string().optional(),
  abteilung_ids: z.array(z.string()),
  team_id: z.string().optional(),
});

type MonteurForm = z.infer<typeof monteurSchema>;

function apiFehler(json: { error?: string; fehler?: string }): string {
  return json.error ?? json.fehler ?? "Unbekannter Fehler.";
}

function mitarbeiterDbHinweisNachricht(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes("employee_departments") || m.includes("schema cache")) {
    return `${msg} — In Supabase: SQL-Editor öffnen und die Migration „supabase/migrations/20260327200000_employee_departments.sql“ ausführen (oder lokal „npx supabase db push“ nach Link mit dem Projekt).`;
  }
  return msg;
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

function parseEmployeeDepartments(
  m: Record<string, unknown>
): MitarbeiterAbteilungEmbed[] {
  const raw = m.employee_departments;
  if (raw == null) return [];
  const arr = Array.isArray(raw) ? raw : [raw];
  const out: MitarbeiterAbteilungEmbed[] = [];
  for (const row of arr) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const did = r.department_id as string | undefined;
    if (!did) continue;
    const depRaw = r.departments;
    const depOne = Array.isArray(depRaw) ? depRaw[0] : depRaw;
    const dep =
      depOne && typeof depOne === "object"
        ? (depOne as { name?: string; color?: string })
        : null;
    out.push({
      department_id: did,
      ist_primaer: Boolean(r.ist_primaer),
      departments: dep
        ? {
            name: String(dep.name ?? ""),
            color: String(dep.color ?? "#3b82f6"),
          }
        : null,
    });
  }
  return out;
}

function abteilungenAusZeile(z: Zeile): {
  ids: string[];
  primaer: string | null;
} {
  const eds = z.employee_departments;
  if (eds?.length) {
    const sorted = [...eds].sort((a, b) =>
      a.ist_primaer === b.ist_primaer ? 0 : a.ist_primaer ? -1 : 1
    );
    return {
      ids: sorted.map((e) => e.department_id),
      primaer:
        sorted.find((e) => e.ist_primaer)?.department_id ??
        sorted[0]?.department_id ??
        null,
    };
  }
  if (z.department_id) {
    return { ids: [z.department_id], primaer: z.department_id };
  }
  return { ids: [], primaer: null };
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
  const empDepts = parseEmployeeDepartments(m);
  const namenAusPivot = empDepts
    .map((e) => e.departments?.name)
    .filter((n): n is string => Boolean(n && String(n).trim()));
  const abteilungsNameJoined =
    namenAusPivot.length > 0 ? namenAusPivot.join(", ") : null;
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
    abteilungsName:
      abteilungsNameJoined ??
      nameAusDep ??
      (depId ? abMap[depId] ?? null : null),
    teamName: nameAusTeam ?? (tmId ? teamNameNachId[tmId] ?? null : null),
    pwa_token: (m.pwa_token as string | null) ?? null,
    employee_departments: empDepts.length ? empDepts : undefined,
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
  const [abteilungen, setAbteilungen] = useState<
    { id: string; name: string; color: string }[]
  >([]);
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
  const [koorAbteilungIds, setKoorAbteilungIds] = useState<string[]>([]);
  const [koorPrimaerAbteilungId, setKoorPrimaerAbteilungId] = useState<
    string | null
  >(null);
  const [koorTeamIds, setKoorTeamIds] = useState<string[]>([]);

  const monteurF = useForm<MonteurForm>({
    resolver: zodResolver(monteurSchema),
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      whatsapp: "",
      abteilung_ids: [],
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
              "id,name,email,role,active,department_id,auth_user_id,phone,whatsapp,team_id,pwa_token, departments!department_id(name), teams!team_id(name,farbe)"
            )
            .order("name"),
          supabase.from("departments").select("id,name,color").order("name"),
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

      setAbteilungen(
        (ab ?? []).map((a) => ({
          id: a.id as string,
          name: a.name as string,
          color: String((a as { color?: string }).color ?? "#3b82f6"),
        }))
      );
      setTeams(teamListNormalisiert);

      let rawList: Record<string, unknown>[] = (mitarbeiter ?? []).map((m) => ({
        ...(m as Record<string, unknown>),
      }));

      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      const uid = authUser?.id ?? null;
      if (
        uid &&
        !rawList.some(
          (r) => (r.auth_user_id as string | null | undefined) === uid
        )
      ) {
        const selfRes = await fetch("/api/profil/mitarbeiter-self");
        if (selfRes.ok) {
          const j = (await selfRes.json()) as {
            mitarbeiter: Record<string, unknown> | null;
          };
          if (
            j.mitarbeiter &&
            !rawList.some((r) => r.id === j.mitarbeiter!.id)
          ) {
            rawList = [...rawList, { ...j.mitarbeiter }];
          }
        }
      }

      const empIds = rawList
        .map((m) => m.id as string)
        .filter((id): id is string => Boolean(id));

      const edByEmp = new Map<string, Record<string, unknown>[]>();
      if (empIds.length > 0) {
        const { data: edRows, error: edErr } = await supabase
          .from("employee_departments")
          .select("employee_id, department_id, ist_primaer, departments(name, color)")
          .in("employee_id", empIds);
        if (!edErr && edRows) {
          for (const row of edRows) {
            const eid = row.employee_id as string;
            if (!eid) continue;
            if (!edByEmp.has(eid)) edByEmp.set(eid, []);
            edByEmp.get(eid)!.push({
              department_id: row.department_id,
              ist_primaer: row.ist_primaer,
              departments: row.departments,
            });
          }
        }
      }

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

      const zeilenNeu = rawList.map((m) => {
        const id = m.id as string;
        const merged: Record<string, unknown> = {
          ...m,
          employee_departments: edByEmp.get(id) ?? [],
        };
        const z = zeileAusSupabase(merged, abMap, teamNameNachId);
        const ausMitglied = teamLabelByEmp.get(z.id);
        return ausMitglied ? { ...z, teamName: ausMitglied } : z;
      });

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

  const abteilungIdsMonteur = monteurF.watch("abteilung_ids");
  const teamsGefiltert = useMemo(() => {
    if (!abteilungIdsMonteur?.length) return teams;
    return teams.filter(
      (t) =>
        t.department_id != null &&
        abteilungIdsMonteur.includes(t.department_id)
    );
  }, [teams, abteilungIdsMonteur]);

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
      const { ids } = abteilungenAusZeile(zeile);
      monteurF.reset({
        name: zeile.name,
        phone: zeile.phone ?? "",
        email: zeile.email ?? "",
        whatsapp: zeile.whatsapp ?? "",
        abteilung_ids: ids,
        team_id: zeile.team_id ?? "",
      });
    } else {
      setBearbeitenId(null);
      monteurF.reset({
        name: "",
        phone: "",
        email: "",
        whatsapp: "",
        abteilung_ids: [],
        team_id: "",
      });
    }
    setMonteurSheetOffen(true);
  }

  async function monteurSpeichern(w: MonteurForm) {
    const abtIds = Array.from(new Set(w.abteilung_ids ?? [])).filter(Boolean);
    const department_id = abtIds[0] ? abtIds[0]! : null;
    const team_id = w.team_id || null;
    if (team_id) {
      const tdep = abteilungFuerTeam(team_id);
      if (
        abtIds.length > 0 &&
        tdep &&
        !abtIds.includes(tdep)
      ) {
        toast.error("Team passt nicht zu den gewählten Abteilungen.");
        return;
      }
    }
    const payload = {
      name: w.name.trim(),
      phone: w.phone?.trim() || null,
      email: w.email?.trim() || null,
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
        const { error: edDel } = await supabase
          .from("employee_departments")
          .delete()
          .eq("employee_id", bearbeitenId);
        if (edDel) throw edDel;
        if (abtIds.length > 0) {
          const { error: edIns } = await supabase
            .from("employee_departments")
            .insert(
              abtIds.map((d, i) => ({
                employee_id: bearbeitenId,
                department_id: d,
                ist_primaer: i === 0,
              }))
            );
          if (edIns) throw edIns;
        }
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
        const orgId = await fetchMyOrganizationId(supabase);
        if (!orgId) {
          toast.error(
            "Organisation nicht ermittelt. Bitte Seite neu laden oder Admin kontaktieren."
          );
          return;
        }
        const { data: neu, error } = await supabase
          .from("employees")
          .insert({ ...payload, organization_id: orgId })
          .select("id")
          .single();
        if (error) throw error;
        const nid = neu?.id as string | undefined;
        if (nid && abtIds.length > 0) {
          const { error: edIns } = await supabase
            .from("employee_departments")
            .insert(
              abtIds.map((d, i) => ({
                employee_id: nid,
                department_id: d,
                ist_primaer: i === 0,
              }))
            );
          if (edIns) throw edIns;
        }
        if (nid && team_id) {
          const { error: e2 } = await supabase.from("team_members").insert({
            team_id,
            employee_id: nid,
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
        mitarbeiterDbHinweisNachricht(
          nachrichtAusUnbekannt(e, "Speichern fehlgeschlagen.")
        )
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
    const ids = Array.from(new Set(koorAbteilungIds)).filter(Boolean);
    const primaer =
      koorPrimaerAbteilungId && ids.includes(koorPrimaerAbteilungId)
        ? koorPrimaerAbteilungId
        : ids[0] ?? null;
    const department_ids =
      primaer && ids.length > 0
        ? [primaer, ...ids.filter((x) => x !== primaer)]
        : ids;
    setKoorSpeichert(true);
    try {
      const res = await fetch(`/api/admin/mitarbeiter/${koorBearbeiten.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          active: koorAktiv,
          department_ids,
          primaer_abteilung_id: primaer,
          team_ids: koorTeamIds,
        }),
      });
      const json = (await res.json()) as { fehler?: string; error?: string };
      if (!res.ok) {
        toast.error(mitarbeiterDbHinweisNachricht(apiFehler(json)));
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
                      <TableCell className="max-w-[14rem]">
                        <div className="flex flex-wrap gap-1">
                          {z.employee_departments &&
                          z.employee_departments.length > 0 ? (
                            [...z.employee_departments]
                              .sort((a, b) =>
                                a.ist_primaer === b.ist_primaer
                                  ? 0
                                  : a.ist_primaer
                                    ? -1
                                    : 1
                              )
                              .map((ed) => {
                              const col =
                                ed.departments?.color ?? "#3b82f6";
                              const mehrAlsEins =
                                (z.employee_departments?.length ?? 0) > 1;
                              return (
                                <span
                                  key={ed.department_id}
                                  className="rounded-md px-1.5 py-0.5 text-xs font-medium"
                                  style={{
                                    background: `${col}20`,
                                    color: col,
                                  }}
                                >
                                  {ed.departments?.name ?? "–"}
                                  {ed.ist_primaer && mehrAlsEins ? " ★" : ""}
                                </span>
                              );
                            })
                          ) : z.abteilungsName ? (
                            <span className="text-sm text-zinc-300">
                              {z.abteilungsName}
                            </span>
                          ) : (
                            <span className="text-zinc-700">—</span>
                          )}
                        </div>
                      </TableCell>
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
                                const { ids, primaer } = abteilungenAusZeile(z);
                                const geord =
                                  primaer && ids.length
                                    ? [
                                        primaer,
                                        ...ids.filter((x) => x !== primaer),
                                      ]
                                    : ids;
                                setKoorAbteilungIds(geord);
                                setKoorPrimaerAbteilungId(primaer);
                                const { data } = await supabase
                                  .from("team_members")
                                  .select("team_id")
                                  .eq("employee_id", z.id);
                                const teamIdListe = (data ?? []).map(
                                  (r) => r.team_id as string
                                );
                                const uniq = Array.from(new Set(teamIdListe));
                                if (uniq.length === 0 && z.team_id) {
                                  uniq.push(z.team_id);
                                }
                                const teamsGeord =
                                  z.team_id && uniq.includes(z.team_id)
                                    ? [
                                        z.team_id,
                                        ...uniq.filter((x) => x !== z.team_id),
                                      ]
                                    : uniq;
                                setKoorTeamIds(teamsGeord);
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
              <StammdatenFormField
                label="E-Mail-Adresse"
                hint="Für automatische Einsatz-Benachrichtigungen"
              >
                <Input
                  id="m-email"
                  type="email"
                  placeholder="max@firma.de"
                  {...monteurF.register("email")}
                  className={STAMMDATEN_FORM_INPUT}
                />
              </StammdatenFormField>
              <StammdatenFormField
                label="Abteilungen"
                hint="Mehrfachauswahl möglich. Erste gewählte Abteilung = Primärabteilung (Reihenfolge der Häkchen)."
              >
                <div className="space-y-2">
                  <div className="divide-y divide-zinc-800/60 overflow-hidden rounded-xl border border-zinc-800">
                    {abteilungen.map((abt) => {
                      const ids = monteurF.watch("abteilung_ids") ?? [];
                      const isChecked = ids.includes(abt.id);
                      const isPrimaer = isChecked && ids[0] === abt.id;
                      return (
                        <div
                          key={abt.id}
                          className="flex items-center gap-3 p-3 transition-colors hover:bg-zinc-800/30"
                        >
                          <Checkbox
                            checked={isChecked}
                            onCheckedChange={(c) => {
                              const prev = monteurF.getValues("abteilung_ids");
                              const neu =
                                c === true
                                  ? prev.includes(abt.id)
                                    ? prev
                                    : [...prev, abt.id]
                                  : prev.filter((x) => x !== abt.id);
                              monteurF.setValue("abteilung_ids", neu);
                              const tid = monteurF.getValues("team_id") ?? "";
                              if (tid) {
                                const tdep = abteilungFuerTeam(tid);
                                if (
                                  neu.length === 0 ||
                                  (tdep != null && !neu.includes(tdep))
                                ) {
                                  monteurF.setValue("team_id", "");
                                }
                              }
                            }}
                            className="border-zinc-600 data-[state=checked]:bg-zinc-700"
                          />
                          <span
                            className="size-2.5 shrink-0 rounded-full"
                            style={{
                              background: abt.color ?? "#3b82f6",
                            }}
                            aria-hidden
                          />
                          <button
                            type="button"
                            className="min-w-0 flex-1 cursor-pointer text-left"
                            onClick={() => {
                              if (!isChecked) return;
                              const prev = monteurF.getValues("abteilung_ids");
                              monteurF.setValue("abteilung_ids", [
                                abt.id,
                                ...prev.filter((x) => x !== abt.id),
                              ]);
                            }}
                          >
                            <p className="text-sm font-semibold text-zinc-300">
                              {abt.name}
                            </p>
                            {isChecked && isPrimaer && ids.length > 1 ? (
                              <p className="text-[10px] text-zinc-600">
                                Primärabteilung · antippen zum Wechseln
                              </p>
                            ) : isChecked && ids.length > 1 ? (
                              <p className="text-[10px] text-zinc-600">
                                Antippen für Primärabteilung
                              </p>
                            ) : null}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                  {(monteurF.watch("abteilung_ids")?.length ?? 0) === 0 ? (
                    <p className="text-xs italic text-zinc-700">
                      Keine Abteilung ausgewählt
                    </p>
                  ) : null}
                </div>
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
            {bearbeitenId &&
            zeilen.find((z) => z.id === bearbeitenId)?.pwa_token ? (
              <div className="border-t border-zinc-800 px-6 pb-2 pt-4">
                <MitarbeiterPwaZugang
                  mitarbeiterId={bearbeitenId}
                  pwaToken={zeilen.find((z) => z.id === bearbeitenId)!.pwa_token!}
                  appUrl={process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}
                />
              </div>
            ) : null}
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
              label="Abteilungen"
              hint="Mehrfachauswahl möglich. Primärabteilung steuert die Stammdaten-Zuordnung; Teams können mehreren gewählten Abteilungen zugeordnet sein."
            >
              <div className="space-y-2">
                <div className="divide-y divide-zinc-800/60 overflow-hidden rounded-xl border border-zinc-800">
                  {abteilungen.map((abt) => {
                    const isChecked = koorAbteilungIds.includes(abt.id);
                    const isPrimaer =
                      isChecked && koorPrimaerAbteilungId === abt.id;
                    return (
                      <div
                        key={abt.id}
                        className="flex items-center gap-3 p-3 transition-colors hover:bg-zinc-800/30"
                      >
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={(c) => {
                            if (c === true) {
                              setKoorAbteilungIds((prev) => {
                                if (prev.includes(abt.id)) return prev;
                                return [...prev, abt.id];
                              });
                              setKoorPrimaerAbteilungId((p) =>
                                p == null ? abt.id : p
                              );
                              return;
                            }
                            const neu = koorAbteilungIds.filter(
                              (x) => x !== abt.id
                            );
                            setKoorAbteilungIds(neu);
                            setKoorPrimaerAbteilungId((p) => {
                              if (p === abt.id) return neu[0] ?? null;
                              if (p != null && neu.includes(p)) return p;
                              return neu[0] ?? null;
                            });
                          }}
                          className="border-zinc-600 data-[state=checked]:bg-zinc-700"
                        />
                        <span
                          className="size-2.5 shrink-0 rounded-full"
                          style={{ background: abt.color ?? "#3b82f6" }}
                          aria-hidden
                        />
                        <button
                          type="button"
                          className="min-w-0 flex-1 cursor-pointer text-left"
                          onClick={() => {
                            if (koorAbteilungIds.includes(abt.id)) {
                              setKoorPrimaerAbteilungId(abt.id);
                            }
                          }}
                        >
                          <p className="text-sm font-semibold text-zinc-300">
                            {abt.name}
                          </p>
                          {isPrimaer && koorAbteilungIds.length > 1 ? (
                            <p className="text-[10px] text-zinc-600">
                              Primärabteilung · antippen zum Wechseln
                            </p>
                          ) : isChecked && koorAbteilungIds.length > 1 ? (
                            <p className="text-[10px] text-zinc-600">
                              Antippen für Primärabteilung
                            </p>
                          ) : isPrimaer ? (
                            <p className="text-[10px] text-zinc-600">
                              Primärabteilung
                            </p>
                          ) : null}
                        </button>
                      </div>
                    );
                  })}
                </div>
                {koorAbteilungIds.length === 0 ? (
                  <p className="text-xs italic text-zinc-700">
                    Keine Abteilung ausgewählt
                  </p>
                ) : null}
              </div>
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
            {koorBearbeiten?.pwa_token ? (
              <div className="border-t border-zinc-800/60 px-0 pt-4">
                <KoordinatorPwaZugang
                  mitarbeiterId={koorBearbeiten.id}
                  pwaToken={koorBearbeiten.pwa_token}
                  appUrl={process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}
                  onTokenReset={() => void laden()}
                />
              </div>
            ) : null}
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

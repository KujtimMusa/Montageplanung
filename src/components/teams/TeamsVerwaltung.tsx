"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
} from "@/components/ui/avatar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "sonner";
import { nachrichtAusUnbekannt } from "@/lib/fehler";
import {
  ChevronsUpDown,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  Users,
  UserPlus,
} from "lucide-react";
import { cn } from "@/lib/utils";

type TeamRow = {
  id: string;
  name: string;
  department_id: string | null;
  leader_id: string | null;
  farbe: string;
  description: string | null;
  abteilungName: string | null;
};

type Mitglied = {
  team_id: string;
  employee_id: string;
  team_role: string;
  name: string;
  department_id: string | null;
};

const teamSchema = z.object({
  name: z.string().min(2, "Mindestens 2 Zeichen"),
  department_id: z.string().min(1, "Abteilung erforderlich"),
  farbe: z.string(),
  leader_id: z.string().optional(),
  beschreibung: z.string().optional(),
});

type TeamForm = z.infer<typeof teamSchema>;

function hexZuRgb(hex: string, alpha = 0.35): string {
  const h = hex.replace("#", "");
  if (h.length !== 6) return `rgba(59,130,246,${alpha})`;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  if (Number.isNaN(r + g + b)) return `rgba(59,130,246,${alpha})`;
  return `rgba(${r},${g},${b},${alpha})`;
}

function initialen(name: string): string {
  const p = name.trim().split(/\s+/).filter(Boolean);
  if (p.length >= 2) return (p[0]![0]! + p[1]![0]!).toUpperCase();
  return name.slice(0, 2).toUpperCase() || "?";
}

export function TeamsVerwaltung() {
  const supabase = useMemo(() => createClient(), []);
  const [teams, setTeams] = useState<TeamRow[]>([]);
  const [mitglieder, setMitglieder] = useState<Mitglied[]>([]);
  const [abteilungen, setAbteilungen] = useState<{ id: string; name: string }[]>(
    []
  );
  const [koordinatoren, setKoordinatoren] = useState<
    { id: string; name: string }[]
  >([]);
  const [alleMitarbeiter, setAlleMitarbeiter] = useState<
    { id: string; name: string; department_id: string | null }[]
  >([]);
  const [laedt, setLaedt] = useState(true);

  const [teamSheetOffen, setTeamSheetOffen] = useState(false);
  const [bearbeitenTeamId, setBearbeitenTeamId] = useState<string | null>(null);

  const [drawerTeam, setDrawerTeam] = useState<TeamRow | null>(null);
  const [comboboxOffen, setComboboxOffen] = useState(false);
  const [neuesMitgliedId, setNeuesMitgliedId] = useState<string>("");
  const [sucheMitglied, setSucheMitglied] = useState("");

  const [loeschenTeam, setLoeschenTeam] = useState<TeamRow | null>(null);

  const teamF = useForm<TeamForm>({
    resolver: zodResolver(teamSchema),
    defaultValues: {
      name: "",
      department_id: "",
      farbe: "#3b82f6",
      leader_id: "",
      beschreibung: "",
    },
  });

  const laden = useCallback(async () => {
    setLaedt(true);
    try {
      const [
        { data: t, error: e1 },
        { data: tm, error: e2 },
        { data: ab, error: e3 },
        { data: em, error: e4 },
      ] = await Promise.all([
        supabase
          .from("teams")
          .select("id,name,department_id,leader_id,farbe,description, departments(name)")
          .order("name"),
        supabase.from("team_members").select(
          `team_id, employee_id, team_role,
           employees ( id, name, department_id )`
        ),
        supabase.from("departments").select("id,name").order("name"),
        supabase
          .from("employees")
          .select("id,name,department_id,auth_user_id")
          .eq("active", true)
          .order("name"),
      ]);
      if (e1) throw e1;
      if (e2) throw e2;
      if (e3) throw e3;
      if (e4) throw e4;

      const abMap = Object.fromEntries((ab ?? []).map((a) => [a.id, a.name]));

      const teamsMapped: TeamRow[] = (t ?? []).map((row: Record<string, unknown>) => {
        return {
          id: String(row.id),
          name: String(row.name),
          department_id: (row.department_id as string | null) ?? null,
          leader_id: (row.leader_id as string | null) ?? null,
          farbe: (row.farbe as string) ?? "#3b82f6",
          description: (row.description as string | null) ?? null,
          abteilungName: row.department_id
            ? abMap[row.department_id as string] ?? null
            : null,
        };
      });
      setTeams(teamsMapped);

      const mit: Mitglied[] = [];
      for (const row of tm ?? []) {
        const r = row as Record<string, unknown>;
        const empRaw = r.employees;
        const empOne = Array.isArray(empRaw) ? empRaw[0] : empRaw;
        if (!empOne || typeof empOne !== "object") continue;
        const e = empOne as {
          id: string;
          name: string;
          department_id: string | null;
        };
        mit.push({
          team_id: String(r.team_id),
          employee_id: String(r.employee_id),
          team_role: String(r.team_role ?? "mitglied"),
          name: e.name,
          department_id: e.department_id ?? null,
        });
      }
      setMitglieder(mit);

      setAbteilungen((ab ?? []) as { id: string; name: string }[]);

      const emList = (em ?? []) as {
        id: string;
        name: string;
        department_id: string | null;
        auth_user_id: string | null;
      }[];
      setAlleMitarbeiter(
        emList.map((e) => ({
          id: e.id,
          name: e.name,
          department_id: e.department_id,
        }))
      );
      setKoordinatoren(
        emList
          .filter((e) => e.auth_user_id !== null)
          .map((e) => ({ id: e.id, name: e.name }))
      );
    } catch (e) {
      toast.error(
        nachrichtAusUnbekannt(e, "Teams konnten nicht geladen werden.")
      );
    } finally {
      setLaedt(false);
    }
  }, [supabase]);

  useEffect(() => {
    void laden();
  }, [laden]);

  const mitgliederNachTeam = useMemo(() => {
    const m: Record<string, Mitglied[]> = {};
    for (const x of mitglieder) {
      if (!m[x.team_id]) m[x.team_id] = [];
      m[x.team_id]!.push(x);
    }
    return m;
  }, [mitglieder]);

  function teamSheetOeffnen(team?: TeamRow) {
    if (team) {
      setBearbeitenTeamId(team.id);
      teamF.reset({
        name: team.name,
        department_id: team.department_id ?? "",
        farbe: team.farbe,
        leader_id: team.leader_id ?? "",
        beschreibung: team.description ?? "",
      });
    } else {
      setBearbeitenTeamId(null);
      teamF.reset({
        name: "",
        department_id: "",
        farbe: "#3b82f6",
        leader_id: "",
        beschreibung: "",
      });
    }
    setTeamSheetOffen(true);
  }

  async function teamSpeichern(w: TeamForm) {
    const leader_id = w.leader_id || null;
    const payload = {
      name: w.name.trim(),
      department_id: w.department_id,
      farbe: w.farbe,
      leader_id,
      description: w.beschreibung?.trim() || null,
    };

    try {
      if (bearbeitenTeamId) {
        const { error } = await supabase
          .from("teams")
          .update(payload)
          .eq("id", bearbeitenTeamId);
        if (error) throw error;
        await supabase
          .from("team_members")
          .update({ team_role: "mitglied" })
          .eq("team_id", bearbeitenTeamId)
          .eq("team_role", "teamleiter");
        if (leader_id) {
          await supabase.from("team_members").upsert(
            {
              team_id: bearbeitenTeamId,
              employee_id: leader_id,
              team_role: "teamleiter",
            },
            { onConflict: "team_id,employee_id" }
          );
        }
        toast.success("Team gespeichert.");
      } else {
        const { data: neu, error } = await supabase
          .from("teams")
          .insert(payload)
          .select("id")
          .single();
        if (error) throw error;
        const tid = neu?.id as string;
        if (leader_id && tid) {
          await supabase.from("team_members").upsert(
            {
              team_id: tid,
              employee_id: leader_id,
              team_role: "teamleiter",
            },
            { onConflict: "team_id,employee_id" }
          );
        }
        toast.success("Team angelegt.");
      }
      setTeamSheetOffen(false);
      void laden();
    } catch (e) {
      toast.error(
        nachrichtAusUnbekannt(e, "Speichern fehlgeschlagen.")
      );
    }
  }

  async function teamLoeschen() {
    if (!loeschenTeam) return;
    const { error } = await supabase.from("teams").delete().eq("id", loeschenTeam.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Team gelöscht.");
    setLoeschenTeam(null);
    setDrawerTeam(null);
    void laden();
  }

  const nichtImDrawerTeam = useMemo(() => {
    if (!drawerTeam) return [];
    const im = new Set(
      (mitgliederNachTeam[drawerTeam.id] ?? []).map((m) => m.employee_id)
    );
    return alleMitarbeiter.filter((e) => !im.has(e.id));
  }, [drawerTeam, mitgliederNachTeam, alleMitarbeiter]);

  const gefilterteNichtMitglieder = useMemo(() => {
    const q = sucheMitglied.trim().toLowerCase();
    return nichtImDrawerTeam.filter(
      (e) => !q || e.name.toLowerCase().includes(q)
    );
  }, [nichtImDrawerTeam, sucheMitglied]);

  async function mitgliedHinzufuegen() {
    if (!drawerTeam || !neuesMitgliedId) return;
    const { error } = await supabase.from("team_members").insert({
      team_id: drawerTeam.id,
      employee_id: neuesMitgliedId,
      team_role: "mitglied",
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Hinzugefügt.");
    setNeuesMitgliedId("");
    setComboboxOffen(false);
    void laden();
  }

  async function mitgliedEntfernen(employeeId: string) {
    if (!drawerTeam) return;
    const { error } = await supabase
      .from("team_members")
      .delete()
      .eq("team_id", drawerTeam.id)
      .eq("employee_id", employeeId);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Entfernt.");
    void laden();
  }

  if (laedt && teams.length === 0) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
        Lade Teams…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold tracking-tight text-zinc-50">
          Teams
        </h2>
        <Button
          type="button"
          size="sm"
          className="gap-1"
          onClick={() => teamSheetOeffnen()}
        >
          <Plus className="size-4" />
          Neues Team
        </Button>
      </div>

      {teams.length === 0 ? (
        <Card className="border-dashed border-zinc-700 bg-zinc-900/40">
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Users className="size-12 text-zinc-600" />
            <p className="font-medium text-zinc-200">
              Noch keine Teams angelegt. Erstelle dein erstes Team.
            </p>
            <Button type="button" onClick={() => teamSheetOeffnen()}>
              <Plus className="mr-1 size-4" />
              Erstes Team erstellen
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {teams.map((team) => {
            const mm = mitgliederNachTeam[team.id] ?? [];
            const leaderName = team.leader_id
              ? mm.find((m) => m.employee_id === team.leader_id)?.name ??
                alleMitarbeiter.find((a) => a.id === team.leader_id)?.name ??
                null
              : null;
            const avatare = mm.slice(0, 4);
            const mehr = mm.length > 4 ? mm.length - 4 : 0;

            return (
              <Card
                key={team.id}
                className="overflow-hidden border-zinc-800 bg-zinc-900/60"
                style={{
                  borderLeftColor: team.farbe,
                  borderLeftWidth: 4,
                }}
              >
                <CardContent className="space-y-3 p-4">
                  <div>
                    <p className="text-base font-semibold text-zinc-50">
                      {team.name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {team.abteilungName ?? "—"}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <AvatarGroup className="pl-0.5">
                      {avatare.map((m) => (
                        <Avatar
                          key={m.employee_id}
                          size="sm"
                          className="ring-2 ring-zinc-900"
                          style={{
                            backgroundColor: hexZuRgb(team.farbe, 0.45),
                          }}
                        >
                          <AvatarFallback className="bg-transparent text-xs font-medium text-zinc-100">
                            {initialen(m.name)}
                          </AvatarFallback>
                        </Avatar>
                      ))}
                      {mehr > 0 && (
                        <AvatarGroupCount className="text-xs">
                          +{mehr}
                        </AvatarGroupCount>
                      )}
                    </AvatarGroup>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    Leitung: {leaderName ?? "—"}
                  </p>

                  <div className="flex flex-wrap items-center gap-1 border-t border-zinc-800 pt-3">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8"
                      onClick={() => setDrawerTeam(team)}
                    >
                      <UserPlus className="mr-1 size-3.5" />
                      Mitglieder verwalten
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      onClick={() => teamSheetOeffnen(team)}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-8 text-destructive"
                      onClick={() => setLoeschenTeam(team)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Sheet open={teamSheetOffen} onOpenChange={setTeamSheetOffen}>
        <SheetContent
          side="right"
          className="w-full border-zinc-800 bg-zinc-950 sm:max-w-md"
        >
          <form
            onSubmit={teamF.handleSubmit((d) => void teamSpeichern(d))}
            className="flex h-full flex-col"
          >
            <SheetHeader>
              <SheetTitle>
                {bearbeitenTeamId ? "Team bearbeiten" : "Neues Team"}
              </SheetTitle>
            </SheetHeader>
            <div className="flex-1 space-y-4 overflow-y-auto py-4">
              <div className="space-y-2">
                <Label htmlFor="t-name">Name *</Label>
                <Input
                  id="t-name"
                  {...teamF.register("name")}
                  className="border-zinc-700 bg-zinc-900"
                />
                {teamF.formState.errors.name && (
                  <p className="text-xs text-destructive">
                    {teamF.formState.errors.name.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Abteilung *</Label>
                <Select
                  value={teamF.watch("department_id") || "__none__"}
                  onValueChange={(v) =>
                    teamF.setValue(
                      "department_id",
                      v === "__none__" || v == null ? "" : v
                    )
                  }
                >
                  <SelectTrigger className="border-zinc-700 bg-zinc-900">
                    <SelectValue placeholder="Wählen" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">—</SelectItem>
                    {abteilungen.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {teamF.formState.errors.department_id && (
                  <p className="text-xs text-destructive">
                    {teamF.formState.errors.department_id.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Teamfarbe</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="color"
                    className="h-10 w-14 cursor-pointer p-1"
                    value={teamF.watch("farbe")}
                    onChange={(e) => teamF.setValue("farbe", e.target.value)}
                  />
                  <Input
                    className="border-zinc-700 bg-zinc-900 font-mono text-sm"
                    value={teamF.watch("farbe")}
                    onChange={(e) => teamF.setValue("farbe", e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Teamleiter</Label>
                <Select
                  value={teamF.watch("leader_id") || "__none__"}
                  onValueChange={(v) =>
                    teamF.setValue(
                      "leader_id",
                      v === "__none__" || v == null ? "" : v
                    )
                  }
                >
                  <SelectTrigger className="border-zinc-700 bg-zinc-900">
                    <SelectValue placeholder="Optional" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">—</SelectItem>
                    {koordinatoren.map((k) => (
                      <SelectItem key={k.id} value={k.id}>
                        {k.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="t-desc">Beschreibung</Label>
                <Textarea
                  id="t-desc"
                  {...teamF.register("beschreibung")}
                  className="min-h-[80px] border-zinc-700 bg-zinc-900"
                />
              </div>
            </div>
            <SheetFooter className="border-t border-zinc-800 pt-4">
              <Button type="submit">Speichern</Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      <Sheet
        open={!!drawerTeam}
        onOpenChange={(o) => !o && setDrawerTeam(null)}
      >
        <SheetContent
          side="right"
          className="flex w-full flex-col border-zinc-800 bg-zinc-950 sm:max-w-[400px]"
        >
          <SheetHeader>
            <SheetTitle>
              {drawerTeam ? `${drawerTeam.name} – Mitglieder` : "Mitglieder"}
            </SheetTitle>
          </SheetHeader>
          <div className="flex flex-1 flex-col gap-4 overflow-hidden py-2">
            <div className="max-h-[45vh] space-y-2 overflow-y-auto">
              {drawerTeam &&
                (mitgliederNachTeam[drawerTeam.id] ?? []).length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    Noch keine Mitglieder.
                  </p>
                )}
              {drawerTeam &&
                (mitgliederNachTeam[drawerTeam.id] ?? []).map((m) => {
                  const abName = m.department_id
                    ? abteilungen.find((a) => a.id === m.department_id)?.name ??
                      "—"
                    : "—";
                  return (
                    <div
                      key={m.employee_id}
                      className="flex items-center justify-between gap-2 rounded-md border border-zinc-800 bg-zinc-900/50 px-2 py-2"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <Avatar
                          size="sm"
                          style={{
                            backgroundColor: drawerTeam
                              ? hexZuRgb(drawerTeam.farbe, 0.45)
                              : undefined,
                          }}
                        >
                          <AvatarFallback className="bg-transparent text-xs">
                            {initialen(m.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{m.name}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {abName}
                          </p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-8 shrink-0"
                        onClick={() => void mitgliedEntfernen(m.employee_id)}
                      >
                        <span className="text-lg leading-none">×</span>
                      </Button>
                    </div>
                  );
                })}
            </div>

            <div className="border-t border-zinc-800 pt-4">
              <p className="mb-2 text-sm font-medium">Mitglied hinzufügen</p>
              <Popover open={comboboxOffen} onOpenChange={setComboboxOffen}>
                <PopoverTrigger
                  nativeButton
                  className={cn(
                    "inline-flex h-9 w-full items-center justify-between rounded-md border border-zinc-700 bg-zinc-950 px-3 text-sm font-normal text-zinc-100 shadow-sm outline-none hover:bg-zinc-900 focus-visible:ring-2 focus-visible:ring-zinc-600"
                  )}
                >
                  <span className="truncate">
                    {neuesMitgliedId
                      ? alleMitarbeiter.find((e) => e.id === neuesMitgliedId)
                          ?.name ?? "Auswählen"
                      : "Mitarbeiter suchen…"}
                  </span>
                  <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
                </PopoverTrigger>
                <PopoverContent className="w-[min(100vw-2rem,360px)] p-0">
                  <div className="border-b border-zinc-800 p-2">
                    <Input
                      placeholder="Suchen…"
                      value={sucheMitglied}
                      onChange={(e) => setSucheMitglied(e.target.value)}
                      className="h-9 border-zinc-700 bg-zinc-900"
                    />
                  </div>
                  <div className="max-h-48 overflow-y-auto p-1">
                    {gefilterteNichtMitglieder.length === 0 ? (
                      <p className="p-2 text-xs text-muted-foreground">
                        Keine Treffer.
                      </p>
                    ) : (
                      gefilterteNichtMitglieder.map((e) => (
                        <button
                          key={e.id}
                          type="button"
                          className="w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-zinc-800"
                          onClick={() => {
                            setNeuesMitgliedId(e.id);
                            setComboboxOffen(false);
                          }}
                        >
                          {e.name}
                        </button>
                      ))
                    )}
                  </div>
                </PopoverContent>
              </Popover>
              <Button
                type="button"
                className="mt-2 w-full"
                disabled={!neuesMitgliedId}
                onClick={() => void mitgliedHinzufuegen()}
              >
                Hinzufügen
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={!!loeschenTeam} onOpenChange={(o) => !o && setLoeschenTeam(null)}>
        <DialogContent className="border-zinc-800 bg-zinc-950">
          <DialogHeader>
            <DialogTitle>Team löschen?</DialogTitle>
            <DialogDescription>
              Das Team „{loeschenTeam?.name}“ wird dauerhaft entfernt.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setLoeschenTeam(null)}
            >
              Abbrechen
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void teamLoeschen()}
            >
              Löschen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

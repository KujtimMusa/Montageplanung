"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Mail, Plus, UserPlus } from "lucide-react";
import { format } from "date-fns";

type TeamZeile = {
  id: string;
  name: string;
  department_id: string | null;
  leader_id: string | null;
  departments: { name: string } | null;
  leaderName: string | null;
};

type MitgliedRow = {
  team_id: string;
  employee_id: string;
  team_role: string;
  employees: {
    id: string;
    name: string;
    role: string;
    department_id: string | null;
  } | null;
};

type EmployeeRow = {
  id: string;
  name: string;
  role: string;
  department_id: string | null;
  email: string | null;
};

const rollenGlobal = [
  { wert: "monteur", label: "Mitarbeiter" },
  { wert: "abteilungsleiter", label: "Abteilungsleiter" },
  { wert: "admin", label: "Admin" },
];

function mitarbeiterStatus(
  empId: string,
  heute: string,
  heuteEinsatz: Set<string>,
  abwesend: Set<string>
): "verfügbar" | "im Einsatz" | "abwesend" {
  if (abwesend.has(empId)) return "abwesend";
  if (heuteEinsatz.has(empId)) return "im Einsatz";
  return "verfügbar";
}

export function TeamsVerwaltung() {
  const supabase = useMemo(() => createClient(), []);
  const [teams, setTeams] = useState<TeamZeile[]>([]);
  const [mitgliedschaften, setMitgliedschaften] = useState<MitgliedRow[]>([]);
  const [mitarbeiter, setMitarbeiter] = useState<EmployeeRow[]>([]);
  const [abteilungen, setAbteilungen] = useState<
    { id: string; name: string }[]
  >([]);
  const [gewaehlt, setGewaehlt] = useState<string | null>(null);
  const [laedt, setLaedt] = useState(true);
  const [einsatzHeuteIds, setEinsatzHeuteIds] = useState<Set<string>>(
    () => new Set()
  );
  const [abwesendIds, setAbwesendIds] = useState<Set<string>>(
    () => new Set()
  );

  const [neuOffen, setNeuOffen] = useState(false);
  const [neuName, setNeuName] = useState("");
  const [neuAbteilung, setNeuAbteilung] = useState("");
  const [neuLeiter, setNeuLeiter] = useState("");

  const [einladEmail, setEinladEmail] = useState("");
  const [einladLaedt, setEinladLaedt] = useState(false);

  const heute = format(new Date(), "yyyy-MM-dd");

  const laden = useCallback(async () => {
    setLaedt(true);
    try {
      const [
        { data: t, error: e1 },
        { data: tm, error: e2 },
        { data: ma, error: e3 },
        { data: ab, error: e4 },
        { data: zu },
        { data: abw },
      ] = await Promise.all([
        supabase
          .from("teams")
          .select("id,name,department_id,leader_id, departments(name)")
          .order("name"),
        supabase.from("team_members").select(
          `team_id, employee_id, team_role,
           employees ( id, name, role, department_id )`
        ),
        supabase
          .from("employees")
          .select("id,name,role,department_id,email")
          .eq("active", true)
          .order("name"),
        supabase.from("departments").select("id,name").order("name"),
        supabase
          .from("assignments")
          .select("employee_id")
          .eq("date", heute),
        supabase
          .from("absences")
          .select("employee_id,start_date,end_date")
          .lte("start_date", heute)
          .gte("end_date", heute),
      ]);

      if (e1) throw e1;
      if (e2) throw e2;
      if (e3) throw e3;
      if (e4) throw e4;

      const maList = (ma as EmployeeRow[]) ?? [];
      const nameNachId = Object.fromEntries(maList.map((m) => [m.id, m.name]));

      const teamsMapped: TeamZeile[] = (t ?? []).map((row: Record<string, unknown>) => {
        const depRaw = row.departments;
        const depOne = Array.isArray(depRaw) ? depRaw[0] : depRaw;
        const dep =
          depOne && typeof depOne === "object" && "name" in depOne
            ? { name: String((depOne as { name: string }).name) }
            : null;
        const lid = (row.leader_id as string | null) ?? null;
        return {
          id: String(row.id),
          name: String(row.name),
          department_id: (row.department_id as string | null) ?? null,
          leader_id: lid,
          departments: dep,
          leaderName: lid ? nameNachId[lid] ?? null : null,
        };
      });
      setTeams(teamsMapped);
      const mitgliedMapped: MitgliedRow[] = (tm ?? []).map(
        (row: Record<string, unknown>) => {
          const empRaw = row.employees;
          const empOne = Array.isArray(empRaw) ? empRaw[0] : empRaw;
          const emp =
            empOne && typeof empOne === "object"
              ? {
                  id: String((empOne as { id: string }).id),
                  name: String((empOne as { name: string }).name),
                  role: String((empOne as { role: string }).role),
                  department_id:
                    ((empOne as { department_id: string | null }).department_id as
                      | string
                      | null) ?? null,
                }
              : null;
          return {
            team_id: String(row.team_id),
            employee_id: String(row.employee_id),
            team_role: String(row.team_role ?? "mitglied"),
            employees: emp,
          };
        }
      );
      setMitgliedschaften(mitgliedMapped);
      setMitarbeiter(maList);
      setAbteilungen((ab as { id: string; name: string }[]) ?? []);

      setEinsatzHeuteIds(
        new Set((zu ?? []).map((z) => z.employee_id as string))
      );
      setAbwesendIds(
        new Set((abw ?? []).map((a) => a.employee_id as string))
      );
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Daten konnten nicht geladen werden."
      );
    } finally {
      setLaedt(false);
    }
  }, [supabase, heute]);

  useEffect(() => {
    void laden();
  }, [laden]);

  const heuteEinsatz = einsatzHeuteIds;
  const abwesendHeute = abwesendIds;

  const teamMitglieder = useMemo(() => {
    if (!gewaehlt) return [];
    return mitgliedschaften.filter((m) => m.team_id === gewaehlt);
  }, [mitgliedschaften, gewaehlt]);

  const nichtImTeam = useMemo(() => {
    if (!gewaehlt) return mitarbeiter;
    const im = new Set(teamMitglieder.map((m) => m.employee_id));
    return mitarbeiter.filter((m) => !im.has(m.id));
  }, [gewaehlt, teamMitglieder, mitarbeiter]);

  const mitgliederProTeam = useMemo(() => {
    const map: Record<string, number> = {};
    for (const m of mitgliedschaften) {
      map[m.team_id] = (map[m.team_id] ?? 0) + 1;
    }
    return map;
  }, [mitgliedschaften]);

  async function teamErstellen() {
    if (!neuName.trim()) {
      toast.error("Teamname fehlt.");
      return;
    }
    const { data, error } = await supabase
      .from("teams")
      .insert({
        name: neuName.trim(),
        department_id: neuAbteilung || null,
        leader_id: neuLeiter || null,
      })
      .select("id")
      .single();
    if (error) {
      toast.error(error.message);
      return;
    }
    if (neuLeiter && data?.id) {
      await supabase.from("team_members").upsert(
        {
          team_id: data.id,
          employee_id: neuLeiter,
          team_role: "teamleiter",
        },
        { onConflict: "team_id,employee_id" }
      );
    }
    toast.success("Team angelegt.");
    setNeuOffen(false);
    setNeuName("");
    setNeuAbteilung("");
    setNeuLeiter("");
    void laden();
    if (data?.id) setGewaehlt(data.id);
  }

  async function mitgliedHinzufuegen(employeeId: string) {
    if (!gewaehlt) return;
    const { error } = await supabase.from("team_members").insert({
      team_id: gewaehlt,
      employee_id: employeeId,
      team_role: "mitglied",
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Zum Team hinzugefügt.");
    void laden();
  }

  async function mitgliedEntfernen(employeeId: string) {
    if (!gewaehlt) return;
    const { error } = await supabase
      .from("team_members")
      .delete()
      .eq("team_id", gewaehlt)
      .eq("employee_id", employeeId);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Aus Team entfernt.");
    void laden();
  }

  async function teamRolleSetzen(employeeId: string, rolle: string) {
    if (!gewaehlt) return;
    if (rolle === "teamleiter") {
      await supabase
        .from("team_members")
        .update({ team_role: "mitglied" })
        .eq("team_id", gewaehlt);
    }
    const { error } = await supabase
      .from("team_members")
      .update({ team_role: rolle })
      .eq("team_id", gewaehlt)
      .eq("employee_id", employeeId);
    if (error) {
      toast.error(error.message);
      return;
    }
    await supabase
      .from("teams")
      .update({ leader_id: rolle === "teamleiter" ? employeeId : null })
      .eq("id", gewaehlt);
    void laden();
  }

  async function globaleRolleAendern(employeeId: string, neue: string) {
    const res = await fetch(`/api/admin/mitarbeiter/${employeeId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: neue }),
    });
    const json = (await res.json()) as { fehler?: string };
    if (!res.ok) {
      toast.error(json.fehler ?? "Rolle konnte nicht geändert werden.");
      return;
    }
    toast.success("Rolle aktualisiert.");
    void laden();
  }

  async function einladen() {
    const mail = einladEmail.trim();
    if (!mail) {
      toast.error("E-Mail eingeben.");
      return;
    }
    setEinladLaedt(true);
    try {
      const res = await fetch("/api/admin/mitarbeiter/einladen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: mail }),
      });
      const json = (await res.json()) as { fehler?: string; ok?: boolean };
      if (!res.ok) {
        throw new Error(json.fehler ?? "Einladung fehlgeschlagen.");
      }
      toast.success("Einladung gesendet (falls der Dienst konfiguriert ist).");
      setEinladEmail("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Einladung fehlgeschlagen.");
    } finally {
      setEinladLaedt(false);
    }
  }

  const gewaehltesTeam = teams.find((t) => t.id === gewaehlt);

  const abteilungName = useCallback(
    (depId: string | null) => {
      if (!depId) return "—";
      return abteilungen.find((a) => a.id === depId)?.name ?? "—";
    },
    [abteilungen]
  );

  if (laedt && teams.length === 0) {
    return (
      <div className="flex items-center gap-2 text-zinc-400">
        <Loader2 className="size-4 animate-spin" />
        Teams werden geladen…
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,320px)_1fr]">
      <Card className="border-zinc-800 bg-zinc-900">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-lg text-zinc-50">Teams</CardTitle>
          <Dialog open={neuOffen} onOpenChange={setNeuOffen}>
            <Button
              size="sm"
              variant="secondary"
              className="gap-1"
              type="button"
              onClick={() => setNeuOffen(true)}
            >
              <Plus className="size-4" />
              Neu
            </Button>
            <DialogContent className="border-zinc-700 bg-zinc-900 text-zinc-100">
              <DialogHeader>
                <DialogTitle>Team erstellen</DialogTitle>
              </DialogHeader>
              <div className="grid gap-3 py-2">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input
                    value={neuName}
                    onChange={(e) => setNeuName(e.target.value)}
                    className="border-zinc-700 bg-zinc-950"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Abteilung</Label>
                  <Select
                    value={neuAbteilung || "__none__"}
                    onValueChange={(v) =>
                      setNeuAbteilung(v === "__none__" || !v ? "" : v)
                    }
                  >
                    <SelectTrigger className="border-zinc-700 bg-zinc-950">
                      <SelectValue placeholder="Optional" />
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
                </div>
                <div className="space-y-2">
                  <Label>Teamleiter</Label>
                  <Select
                    value={neuLeiter || "__none__"}
                    onValueChange={(v) =>
                      setNeuLeiter(v === "__none__" || !v ? "" : v)
                    }
                  >
                    <SelectTrigger className="border-zinc-700 bg-zinc-950">
                      <SelectValue placeholder="Optional" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">—</SelectItem>
                      {mitarbeiter.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" onClick={() => void teamErstellen()}>
                  Anlegen
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent className="space-y-1">
          {teams.length === 0 ? (
            <p className="text-sm text-zinc-500">Noch keine Teams.</p>
          ) : (
            teams.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setGewaehlt(t.id)}
                className={`flex w-full flex-col items-start rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                  gewaehlt === t.id
                    ? "border-blue-500/60 bg-blue-950/40"
                    : "border-zinc-800 bg-zinc-950/50 hover:border-zinc-600"
                }`}
              >
                <span className="font-medium text-zinc-100">{t.name}</span>
                <span className="text-xs text-zinc-500">
                  {t.leaderName
                    ? `Leitung: ${t.leaderName}`
                    : "Kein Teamleiter"}
                  {" · "}
                  {mitgliederProTeam[t.id] ?? 0} Mitglieder
                </span>
                {t.departments?.name && (
                  <Badge variant="secondary" className="mt-1 text-[10px]">
                    {t.departments.name}
                  </Badge>
                )}
              </button>
            ))
          )}
        </CardContent>
      </Card>

      <div className="space-y-4">
        {gewaehltesTeam ? (
          <Card className="border-zinc-800 bg-zinc-900">
            <CardHeader>
              <CardTitle className="text-xl text-zinc-50">
                {gewaehltesTeam.name}
              </CardTitle>
              <p className="text-sm text-zinc-500">
                Mitglieder per Klick zuordnen oder entfernen. Zum Verschieben:
                Karte ziehen (Drag &amp; Drop).
              </p>
            </CardHeader>
            <CardContent className="grid gap-6 lg:grid-cols-2">
              <div>
                <h3 className="mb-2 text-sm font-medium text-zinc-300">
                  Im Team
                </h3>
                <div
                  className="min-h-[200px] space-y-2 rounded-lg border border-dashed border-zinc-700 bg-zinc-950/40 p-2"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const id = e.dataTransfer.getData("emp");
                    if (id) void mitgliedHinzufuegen(id);
                  }}
                >
                  {teamMitglieder.length === 0 ? (
                    <p className="p-4 text-sm text-zinc-600">
                      Noch keine Mitglieder — aus der rechten Liste hinzufügen.
                    </p>
                  ) : (
                    teamMitglieder.map((m) => {
                      const emp = m.employees;
                      if (!emp) return null;
                      const st = mitarbeiterStatus(
                        emp.id,
                        heute,
                        heuteEinsatz,
                        abwesendHeute
                      );
                      return (
                        <div
                          key={m.employee_id}
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.setData("emp", m.employee_id);
                          }}
                          onDragEnd={() => {}}
                          className="rounded-md border border-zinc-700 bg-zinc-900/80 p-2 text-sm"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="font-medium text-zinc-100">
                              {emp.name}
                            </span>
                            <Badge
                              variant="outline"
                              className="text-[10px] text-zinc-400"
                            >
                              {st}
                            </Badge>
                          </div>
                          <p className="text-xs text-zinc-500">
                            {abteilungName(emp.department_id)} · Rolle:{" "}
                            {emp.role}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            <Select
                              value={m.team_role}
                              onValueChange={(v) =>
                                void teamRolleSetzen(
                                  m.employee_id,
                                  v ?? "mitglied"
                                )
                              }
                            >
                              <SelectTrigger className="h-8 w-[140px] border-zinc-600 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="teamleiter">
                                  Teamleiter
                                </SelectItem>
                                <SelectItem value="mitglied">
                                  Mitarbeiter
                                </SelectItem>
                              </SelectContent>
                            </Select>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="h-8 text-xs text-zinc-400"
                              onClick={() =>
                                void mitgliedEntfernen(m.employee_id)
                              }
                            >
                              Aus Team
                            </Button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
              <div>
                <h3 className="mb-2 text-sm font-medium text-zinc-300">
                  Verfügbar / nicht im Team
                </h3>
                <div
                  className="max-h-[360px] space-y-2 overflow-y-auto rounded-lg border border-zinc-800 bg-zinc-950/30 p-2"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const id = e.dataTransfer.getData("emp");
                    if (id && gewaehlt) void mitgliedEntfernen(id);
                  }}
                >
                  {nichtImTeam.map((emp) => {
                    const st = mitarbeiterStatus(
                      emp.id,
                      heute,
                      heuteEinsatz,
                      abwesendHeute
                    );
                    return (
                      <div
                        key={emp.id}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData("emp", emp.id);
                        }}
                        className="flex flex-col gap-1 rounded-md border border-zinc-800 bg-zinc-900/50 p-2 text-sm"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium text-zinc-200">
                            {emp.name}
                          </span>
                          <Badge variant="secondary" className="text-[10px]">
                            {st}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Select
                            value={emp.role}
                            onValueChange={(v) =>
                              void globaleRolleAendern(emp.id, v ?? "monteur")
                            }
                          >
                            <SelectTrigger className="h-8 w-[160px] border-zinc-600 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {rollenGlobal.map((r) => (
                                <SelectItem key={r.wert} value={r.wert}>
                                  {r.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            className="h-8 text-xs"
                            onClick={() => void mitgliedHinzufuegen(emp.id)}
                          >
                            <UserPlus className="mr-1 size-3" />
                            Ins Team
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-zinc-800 border-dashed bg-zinc-900/50">
            <CardContent className="py-12 text-center text-sm text-zinc-500">
              Wähle links ein Team oder lege ein neues an.
            </CardContent>
          </Card>
        )}

        <Card className="border-zinc-800 bg-zinc-900">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-zinc-100">
              <Mail className="size-4" />
              Mitarbeiter einladen
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-2">
              <Label htmlFor="einlad-email">E-Mail</Label>
              <Input
                id="einlad-email"
                type="email"
                value={einladEmail}
                onChange={(e) => setEinladEmail(e.target.value)}
                placeholder="name@firma.de"
                className="border-zinc-700 bg-zinc-950"
              />
            </div>
            <Button
              type="button"
              disabled={einladLaedt}
              onClick={() => void einladen()}
            >
              {einladLaedt ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                "Einladung senden"
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

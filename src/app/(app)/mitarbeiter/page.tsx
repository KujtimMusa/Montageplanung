import { createClient } from "@/lib/supabase/server";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default async function MitarbeiterSeite() {
  let zeilen: {
    id: string;
    name: string;
    email: string | null;
    department_id: string | null;
    role: string;
    active: boolean;
    abteilungsName: string | null;
  }[] = [];

  if (
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    const supabase = await createClient();
    const [{ data: mitarbeiter }, { data: abteilungen }] = await Promise.all([
      supabase
        .from("employees")
        .select("id,name,email,department_id,role,active")
        .order("name"),
      supabase.from("departments").select("id,name"),
    ]);

    const abteilungNachId = Object.fromEntries(
      (abteilungen ?? []).map((a) => [a.id, a.name])
    );

    zeilen =
      mitarbeiter?.map((m) => ({
        ...m,
        abteilungsName: m.department_id
          ? abteilungNachId[m.department_id] ?? null
          : null,
      })) ?? [];
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Mitarbeiter</h1>
        <p className="text-muted-foreground">
          Übersicht — Anlegen und Bearbeiten kommen als nächstes Formular.
        </p>
      </div>
      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>E-Mail</TableHead>
              <TableHead>Abteilung</TableHead>
              <TableHead>Rolle</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {zeilen.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-muted-foreground">
                  Noch keine Mitarbeiter — bitte in Supabase anlegen oder CSV-Import
                  (später).
                </TableCell>
              </TableRow>
            ) : (
              zeilen.map((z) => (
                <TableRow key={z.id}>
                  <TableCell className="font-medium">{z.name}</TableCell>
                  <TableCell>{z.email ?? "—"}</TableCell>
                  <TableCell>{z.abteilungsName ?? "—"}</TableCell>
                  <TableCell>{z.role}</TableCell>
                  <TableCell>
                    <Badge variant={z.active ? "default" : "secondary"}>
                      {z.active ? "aktiv" : "inaktiv"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

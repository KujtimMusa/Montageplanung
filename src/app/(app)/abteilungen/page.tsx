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

export default async function AbteilungenSeite() {
  let zeilen: { id: string; name: string; color: string; icon: string | null }[] =
    [];

  if (
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("departments")
      .select("id,name,color,icon")
      .order("name");
    zeilen = data ?? [];
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Abteilungen</h1>
        <p className="text-muted-foreground">
          Farben und Namen für Kalender und Sidebar — Anlegen/Bearbeiten folgt.
        </p>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Farbe</TableHead>
              <TableHead>Icon</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {zeilen.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-muted-foreground">
                  Keine Daten — Migration ausführen und optional{" "}
                  <code className="rounded bg-muted px-1 text-sm">seed.sql</code>{" "}
                  einspielen.
                </TableCell>
              </TableRow>
            ) : (
              zeilen.map((z) => (
                <TableRow key={z.id}>
                  <TableCell className="font-medium">
                    <span
                      className="mr-2 inline-block h-3 w-1 rounded-full align-middle"
                      style={{ backgroundColor: z.color }}
                      aria-hidden
                    />
                    {z.name}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{z.color}</Badge>
                  </TableCell>
                  <TableCell>{z.icon ?? "—"}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

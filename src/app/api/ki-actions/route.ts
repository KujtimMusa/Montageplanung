import { NextRequest, NextResponse } from "next/server";
import { triggerAutomatisierung } from "@/lib/automatisierungen";
import { requireAdmin } from "@/lib/auth-check";
import { z } from "zod";

const EinsatzErstellenSchema = z.object({
  employee_id: z.string().uuid(),
  project_id: z.string().uuid(),
  project_title: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  start_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),
  end_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),
});

const EinsatzLoeschenSchema = z.object({
  assignment_id: z.string().uuid(),
});

const EinsatzVerschiebenSchema = z.object({
  assignment_id: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  start_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),
  end_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),
});

const MitarbeiterZuweisenSchema = z.object({
  assignment_id: z.string().uuid(),
  employee_id: z.string().uuid(),
});

const AbwesenheitSchema = z.object({
  absence_id: z.string().uuid(),
});

const ProjektStatusSchema = z.object({
  project_id: z.string().uuid(),
  status: z.enum([
    "aktiv",
    "abgeschlossen",
    "pausiert",
    "geplant",
    "neu",
    "in_bearbeitung",
  ]),
});

const ActionSchema = z.discriminatedUnion("typ", [
  z.object({
    typ: z.literal("einsatz_erstellen"),
    payload: EinsatzErstellenSchema,
    label: z.string().optional(),
    risiko: z.string().optional(),
  }),
  z.object({
    typ: z.literal("einsatz_loeschen"),
    payload: EinsatzLoeschenSchema,
    label: z.string().optional(),
    risiko: z.string().optional(),
  }),
  z.object({
    typ: z.literal("einsatz_verschieben"),
    payload: EinsatzVerschiebenSchema,
    label: z.string().optional(),
    risiko: z.string().optional(),
  }),
  z.object({
    typ: z.literal("mitarbeiter_zuweisen"),
    payload: MitarbeiterZuweisenSchema,
    label: z.string().optional(),
    risiko: z.string().optional(),
  }),
  z.object({
    typ: z.literal("abwesenheit_bestaetigen"),
    payload: AbwesenheitSchema,
    label: z.string().optional(),
    risiko: z.string().optional(),
  }),
  z.object({
    typ: z.literal("abwesenheit_ablehnen"),
    payload: AbwesenheitSchema,
    label: z.string().optional(),
    risiko: z.string().optional(),
  }),
  z.object({
    typ: z.literal("projekt_status_setzen"),
    payload: ProjektStatusSchema,
    label: z.string().optional(),
    risiko: z.string().optional(),
  }),
]);

export async function POST(req: NextRequest) {
  const { supabase, error } = await requireAdmin();
  if (error || !supabase) return error;

  const body = (await req.json()) as { action?: unknown };
  const parsed = ActionSchema.safeParse(body.action);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Ungültige Action", details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const action = parsed.data;

  switch (action.typ) {
    case "einsatz_erstellen": {
      const { employee_id, project_id, project_title, date, start_time, end_time } =
        action.payload;
      const { error } = await supabase.from("assignments").insert({
        employee_id,
        project_id,
        project_title,
        date,
        start_time,
        end_time,
      });
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      await triggerAutomatisierung("neuer_einsatz", {
        employee_id,
        einsatz_titel: project_title,
        datum: date,
      });
      return NextResponse.json({ erfolg: true });
    }

    case "einsatz_loeschen": {
      const { assignment_id } = action.payload;
      const { error } = await supabase
        .from("assignments")
        .delete()
        .eq("id", assignment_id);
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ erfolg: true });
    }

    case "einsatz_verschieben": {
      const { assignment_id, date, start_time, end_time } = action.payload;
      const { error } = await supabase
        .from("assignments")
        .update({ date, start_time, end_time })
        .eq("id", assignment_id);
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ erfolg: true });
    }

    case "mitarbeiter_zuweisen": {
      const { assignment_id, employee_id } = action.payload;
      const { error } = await supabase
        .from("assignments")
        .update({ employee_id })
        .eq("id", assignment_id);
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ erfolg: true });
    }

    case "abwesenheit_bestaetigen": {
      const { absence_id } = action.payload;
      const { error } = await supabase
        .from("absences")
        .update({ status: "approved" })
        .eq("id", absence_id);
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ erfolg: true });
    }

    case "abwesenheit_ablehnen": {
      const { absence_id } = action.payload;
      const { error } = await supabase
        .from("absences")
        .update({ status: "rejected" })
        .eq("id", absence_id);
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ erfolg: true });
    }

    case "projekt_status_setzen": {
      const { project_id, status } = action.payload;
      const { error } = await supabase
        .from("projects")
        .update({ status })
        .eq("id", project_id);
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ erfolg: true });
    }

    default:
      return NextResponse.json(
        { error: "Unbekannter Action-Typ" },
        { status: 400 }
      );
  }
}

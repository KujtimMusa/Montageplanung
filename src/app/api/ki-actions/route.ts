import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { triggerAutomatisierung } from "@/lib/automatisierungen";
import type { KiAction } from "@/types/ki-actions";

export async function POST(req: NextRequest) {
  const { action }: { action: KiAction } = await req.json();
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  switch (action.typ) {
    case "einsatz_erstellen": {
      const { employee_id, project_id, project_title, date, start_time, end_time } =
        action.payload as {
          employee_id: string;
          project_id: string;
          project_title: string;
          date: string;
          start_time: string;
          end_time: string;
        };
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
      const { assignment_id } = action.payload as { assignment_id: string };
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
      const { assignment_id, date, start_time, end_time } = action.payload as {
        assignment_id: string;
        date: string;
        start_time: string;
        end_time: string;
      };
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
      const { assignment_id, employee_id } = action.payload as {
        assignment_id: string;
        employee_id: string;
      };
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
      const { absence_id } = action.payload as { absence_id: string };
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
      const { absence_id } = action.payload as { absence_id: string };
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
      const { project_id, status } = action.payload as {
        project_id: string;
        status: string;
      };
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

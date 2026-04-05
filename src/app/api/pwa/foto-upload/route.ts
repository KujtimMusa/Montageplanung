import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import {
  istGueltigeTokenZeichenfolge,
  resolveToken,
} from "@/lib/pwa/token-resolver";

const MAX_BYTES = 10 * 1024 * 1024;
const ERLAUBT = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);

export async function POST(request: Request) {
  const ct = request.headers.get("content-type") ?? "";
  if (!ct.includes("multipart/form-data")) {
    return NextResponse.json(
      { error: "multipart/form-data erwartet" },
      { status: 400 }
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Formular ungültig" }, { status: 400 });
  }

  const token = String(form.get("token") ?? "");
  if (!istGueltigeTokenZeichenfolge(token)) {
    return NextResponse.json({ error: "Ungültiger Token" }, { status: 400 });
  }

  const resolved = await resolveToken(token);
  if (!resolved || resolved.role === "customer") {
    return NextResponse.json({ error: "Ungültiger Token" }, { status: 403 });
  }

  const projectId = String(form.get("project_id") ?? "").trim();
  const assignmentIdRaw = form.get("assignment_id");
  const assignmentId =
    assignmentIdRaw != null && String(assignmentIdRaw).trim() !== ""
      ? String(assignmentIdRaw).trim()
      : null;
  const type = String(form.get("type") ?? "foto_sonstiges").trim();
  const title = form.get("title");
  const content = form.get("content");
  const file = form.get("file");

  if (!projectId) {
    return NextResponse.json({ error: "project_id fehlt" }, { status: 400 });
  }

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file fehlt" }, { status: 400 });
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Datei zu groß (max. 10 MB)" }, { status: 400 });
  }

  const mime = file.type || "application/octet-stream";
  if (!ERLAUBT.has(mime)) {
    return NextResponse.json(
      { error: "Dateityp nicht erlaubt" },
      { status: 400 }
    );
  }

  const supabase = createServiceRoleClient();

  const { data: proj, error: pErr } = await supabase
    .from("projects")
    .select("id, organization_id")
    .eq("id", projectId)
    .maybeSingle();

  if (pErr || !proj || (proj.organization_id as string) !== resolved.orgId) {
    return NextResponse.json({ error: "Projekt nicht gefunden" }, { status: 404 });
  }

  if (assignmentId) {
    const { data: asn } = await supabase
      .from("assignments")
      .select("id, employee_id, organization_id")
      .eq("id", assignmentId)
      .maybeSingle();
    if (
      !asn ||
      (asn.organization_id as string) !== resolved.orgId ||
      (asn.employee_id as string | null) !== resolved.employeeId
    ) {
      return NextResponse.json({ error: "Einsatz nicht gültig" }, { status: 403 });
    }
  }

  const ext =
    mime === "image/jpeg"
      ? "jpg"
      : mime === "image/png"
        ? "png"
        : mime === "image/webp"
          ? "webp"
          : "pdf";

  const nameOriginal = file.name || `upload.${ext}`;
  const pfad = `${resolved.orgId}/${projectId}/${randomUUID()}.${ext}`;

  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: upErr } = await supabase.storage
    .from("site-docs")
    .upload(pfad, buffer, { contentType: mime, upsert: false });

  if (upErr) {
    return NextResponse.json({ error: upErr.message }, { status: 400 });
  }

  const {
    data: signed,
    error: signErr,
  } = await supabase.storage.from("site-docs").createSignedUrl(pfad, 60 * 60 * 24 * 365);

  if (signErr || !signed?.signedUrl) {
    return NextResponse.json(
      { error: signErr?.message ?? "Signed URL fehlgeschlagen" },
      { status: 500 }
    );
  }

  const fileUrl = signed.signedUrl;
  const sizeKb = Math.round(file.size / 1024);

  const { data: doc, error: insErr } = await supabase
    .from("site_docs")
    .insert({
      organization_id: resolved.orgId,
      project_id: projectId,
      assignment_id: assignmentId,
      employee_id: resolved.employeeId,
      type,
      title: title != null ? String(title) : null,
      content: content != null ? String(content) : null,
      file_url: fileUrl,
      file_name: nameOriginal,
      file_size_kb: sizeKb,
    })
    .select("id, created_at")
    .single();

  if (insErr || !doc) {
    return NextResponse.json(
      { error: insErr?.message ?? "DB-Fehler" },
      { status: 400 }
    );
  }

  return NextResponse.json({
    doc_id: doc.id,
    file_url: fileUrl,
    created_at: doc.created_at,
  });
}

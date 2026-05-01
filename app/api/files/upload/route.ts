import { NextRequest, NextResponse } from "next/server";
import { requireTenant, TenancyError } from "@/lib/tenancy/context";
import { requirePermission, PermissionError } from "@/lib/rbac/policies";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

const MAX_SIZE = 25 * 1024 * 1024;

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireTenant();
    await requirePermission(ctx.tenantId, ctx.userId, "bestanden", "create");
    const fd = await req.formData();
    const file = fd.get("file") as File | null;
    const entityType = fd.get("entity_type")?.toString();
    const entityId = fd.get("entity_id")?.toString();
    if (!file || !entityType || !entityId) {
      return NextResponse.json(
        { error: "file + entity_type + entity_id verplicht" },
        { status: 400 },
      );
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: `Bestand te groot (max ${MAX_SIZE / 1024 / 1024} MB)` },
        { status: 413 },
      );
    }

    const supabase = createAdminSupabaseClient();
    const ext = file.name.split(".").pop() ?? "bin";
    const path = `${ctx.tenantId}/${entityType}/${entityId}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uErr } = await supabase.storage
      .from("bestanden")
      .upload(path, buffer, {
        contentType: file.type ?? "application/octet-stream",
        upsert: false,
      });
    if (uErr) throw uErr;

    const { data: row, error } = await supabase
      .from("files")
      .insert({
        tenant_id: ctx.tenantId,
        naam: file.name,
        pad: path,
        bucket: "bestanden",
        mime: file.type ?? null,
        grootte: file.size,
        geupload_door: ctx.userId,
      })
      .select()
      .single();
    if (error) throw error;

    await supabase.from("file_links").insert({
      file_id: row.id,
      entity_type: entityType,
      entity_id: entityId,
      tenant_id: ctx.tenantId,
    });

    return NextResponse.json(row, { status: 201 });
  } catch (err) {
    return errResponse(err);
  }
}

function errResponse(err: unknown) {
  if (err instanceof TenancyError)
    return NextResponse.json({ error: err.message }, { status: 403 });
  if (err instanceof PermissionError)
    return NextResponse.json({ error: err.message }, { status: 403 });
  console.error(err);
  return NextResponse.json(
    { error: err instanceof Error ? err.message : String(err) },
    { status: 500 },
  );
}

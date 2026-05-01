import { NextRequest, NextResponse } from "next/server";
import { requireTenant, TenancyError } from "@/lib/tenancy/context";
import { canOnRecord, requirePermission, PermissionError } from "@/lib/rbac/policies";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const ctx = await requireTenant();
    const supabase = createAdminSupabaseClient();
    const { data: file } = await supabase
      .from("files")
      .select("id, pad, bucket, geupload_door, tenant_id")
      .eq("id", params.id)
      .maybeSingle();
    if (!file || file.tenant_id !== ctx.tenantId) {
      return NextResponse.json({ error: "niet gevonden" }, { status: 404 });
    }
    const perm = await canOnRecord(
      ctx.tenantId,
      ctx.userId,
      "bestanden",
      "delete",
      file.geupload_door,
    );
    if (!perm.allowed) {
      return NextResponse.json({ error: perm.reden }, { status: 403 });
    }
    await supabase.storage.from(file.bucket).remove([file.pad]);
    await supabase.from("files").delete().eq("id", params.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof TenancyError)
      return NextResponse.json({ error: err.message }, { status: 403 });
    if (err instanceof PermissionError)
      return NextResponse.json({ error: err.message }, { status: 403 });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}

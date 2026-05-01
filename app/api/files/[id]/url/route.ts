import { NextRequest, NextResponse } from "next/server";
import { requireTenant, TenancyError } from "@/lib/tenancy/context";
import { requirePermission, PermissionError } from "@/lib/rbac/policies";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const ctx = await requireTenant();
    await requirePermission(ctx.tenantId, ctx.userId, "bestanden", "view");
    const supabase = createAdminSupabaseClient();
    const { data: file } = await supabase
      .from("files")
      .select("pad, bucket, tenant_id")
      .eq("id", params.id)
      .maybeSingle();
    if (!file || file.tenant_id !== ctx.tenantId) {
      return NextResponse.json({ error: "niet gevonden" }, { status: 404 });
    }
    const { data: signed } = await supabase.storage
      .from(file.bucket)
      .createSignedUrl(file.pad, 600);
    return NextResponse.json({ url: signed?.signedUrl });
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

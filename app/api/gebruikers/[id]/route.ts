import { NextRequest, NextResponse } from "next/server";
import { requireTenant, TenancyError } from "@/lib/tenancy/context";
import { requirePermission, PermissionError } from "@/lib/rbac/policies";
import { removeMember } from "@/lib/tenancy/tenants";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const ctx = await requireTenant();
    await requirePermission(ctx.tenantId, ctx.userId, "gebruikers", "delete");

    if (params.id === ctx.userId) {
      return NextResponse.json(
        { error: "Je kan jezelf niet verwijderen" },
        { status: 400 },
      );
    }

    const supabase = createAdminSupabaseClient();
    const existing = await supabase
      .from("tenant_members")
      .select("is_owner")
      .eq("tenant_id", ctx.tenantId)
      .eq("user_id", params.id)
      .maybeSingle();
    if (existing.data?.is_owner) {
      return NextResponse.json(
        { error: "Eigenaar kan niet verwijderd worden" },
        { status: 403 },
      );
    }

    await removeMember(ctx.tenantId, params.id);
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

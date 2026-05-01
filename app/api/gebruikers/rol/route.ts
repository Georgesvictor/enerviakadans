import { NextRequest, NextResponse } from "next/server";
import { requireTenant, TenancyError } from "@/lib/tenancy/context";
import { requirePermission, PermissionError } from "@/lib/rbac/policies";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

export async function PATCH(req: NextRequest) {
  try {
    const ctx = await requireTenant();
    await requirePermission(ctx.tenantId, ctx.userId, "gebruikers", "update");
    const body = await req.json();
    const { user_id, rol_code } = body;
    if (!user_id || !rol_code) {
      return NextResponse.json(
        { error: "user_id en rol_code verplicht" },
        { status: 400 },
      );
    }
    if (!["admin", "manager", "user", "guest"].includes(rol_code)) {
      return NextResponse.json(
        { error: "ongeldige rol" },
        { status: 400 },
      );
    }
    const supabase = createAdminSupabaseClient();

    // Owner-beveiliging: je kan geen owner wijzigen
    const existing = await supabase
      .from("tenant_members")
      .select("is_owner")
      .eq("tenant_id", ctx.tenantId)
      .eq("user_id", user_id)
      .maybeSingle();
    if (existing.data?.is_owner) {
      return NextResponse.json(
        { error: "Eigenaar kan niet van rol gewijzigd worden" },
        { status: 403 },
      );
    }

    const { error } = await supabase
      .from("tenant_members")
      .update({ rol_code })
      .eq("tenant_id", ctx.tenantId)
      .eq("user_id", user_id);
    if (error) throw error;
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

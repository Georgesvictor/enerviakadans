import { NextRequest, NextResponse } from "next/server";
import { requireTenant, TenancyError } from "@/lib/tenancy/context";
import { requirePermission, PermissionError } from "@/lib/rbac/policies";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const ctx = await requireTenant();
    await requirePermission(ctx.tenantId, ctx.userId, "offertes", "update");
    const supabase = createAdminSupabaseClient();
    const token = crypto.randomUUID();
    const expires = new Date();
    expires.setDate(expires.getDate() + 30);
    const { data, error } = await supabase
      .from("quotations")
      .update({
        klant_token: token,
        klant_token_expires_at: expires.toISOString(),
      })
      .eq("id", params.id)
      .eq("tenant_id", ctx.tenantId)
      .select("klant_token")
      .single();
    if (error) throw error;
    return NextResponse.json({ token: data.klant_token, expires });
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

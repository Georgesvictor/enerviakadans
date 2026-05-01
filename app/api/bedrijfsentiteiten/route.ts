import { NextRequest, NextResponse } from "next/server";
import { requireTenant, TenancyError } from "@/lib/tenancy/context";
import { requirePermission, PermissionError } from "@/lib/rbac/policies";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  try {
    const ctx = await requireTenant();
    await requirePermission(ctx.tenantId, ctx.userId, "instellingen", "view");
    const supabase = createAdminSupabaseClient();
    const includeInactief = req.nextUrl.searchParams.get("alle") === "1";
    let q = supabase
      .from("business_entities")
      .select("*")
      .eq("tenant_id", ctx.tenantId)
      .order("is_default", { ascending: false })
      .order("naam");
    if (!includeInactief) q = q.eq("is_actief", true);
    const { data, error } = await q;
    if (error) throw error;
    return NextResponse.json({ items: data });
  } catch (err) {
    return errResponse(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireTenant();
    await requirePermission(ctx.tenantId, ctx.userId, "instellingen", "admin");
    const body = await req.json();
    if (!body.naam) {
      return NextResponse.json({ error: "naam verplicht" }, { status: 400 });
    }
    const supabase = createAdminSupabaseClient();

    // Eerste entity is automatisch default
    const { count } = await supabase
      .from("business_entities")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", ctx.tenantId);

    const { data, error } = await supabase
      .from("business_entities")
      .insert({ ...body, tenant_id: ctx.tenantId, is_default: count === 0 })
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    return errResponse(err);
  }
}

function errResponse(err: unknown) {
  if (err instanceof TenancyError)
    return NextResponse.json({ error: err.message }, { status: 403 });
  if (err instanceof PermissionError)
    return NextResponse.json({ error: err.message }, { status: 403 });
  return NextResponse.json(
    { error: err instanceof Error ? err.message : String(err) },
    { status: 500 },
  );
}

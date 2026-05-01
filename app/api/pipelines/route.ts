import { NextRequest, NextResponse } from "next/server";
import { requireTenant, TenancyError } from "@/lib/tenancy/context";
import { requirePermission, PermissionError } from "@/lib/rbac/policies";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const ctx = await requireTenant();
    await requirePermission(ctx.tenantId, ctx.userId, "deals", "view");
    const supabase = createAdminSupabaseClient();
    const { data, error } = await supabase
      .from("pipelines")
      .select(
        "id, naam, is_default, gearchiveerd, volgorde, pipeline_stages(id, naam, volgorde, waarschijnlijkheid, kleur, is_won, is_lost, categorie, rotting_dagen)",
      )
      .eq("tenant_id", ctx.tenantId)
      .order("volgorde");
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
    const { data, error } = await supabase
      .from("pipelines")
      .insert({ tenant_id: ctx.tenantId, naam: body.naam, is_default: false })
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

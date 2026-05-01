import { NextRequest, NextResponse } from "next/server";
import { requireTenant, TenancyError } from "@/lib/tenancy/context";
import { requirePermission, PermissionError } from "@/lib/rbac/policies";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const ctx = await requireTenant();
    await requirePermission(ctx.tenantId, ctx.userId, "projecten", "view");
    const supabase = createAdminSupabaseClient();
    const { data, error } = await supabase
      .from("projects")
      .select(
        "id, naam, code, status, start_datum, deadline, budget_excl_btw, contacts(voornaam,achternaam), companies(naam)",
      )
      .eq("tenant_id", ctx.tenantId)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw error;
    return NextResponse.json({ items: data });
  } catch (err) {
    return errResponse(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireTenant();
    await requirePermission(ctx.tenantId, ctx.userId, "projecten", "create");
    const body = await req.json();
    if (!body.naam) {
      return NextResponse.json({ error: "naam verplicht" }, { status: 400 });
    }
    const supabase = createAdminSupabaseClient();
    const { data, error } = await supabase
      .from("projects")
      .insert({
        tenant_id: ctx.tenantId,
        naam: body.naam,
        code: body.code ?? null,
        beschrijving: body.beschrijving ?? null,
        contact_id: body.contact_id ?? null,
        company_id: body.company_id ?? null,
        deal_id: body.deal_id ?? null,
        eigenaar_id: body.eigenaar_id ?? ctx.userId,
        start_datum: body.start_datum ?? null,
        deadline: body.deadline ?? null,
        budget_excl_btw: body.budget_excl_btw ?? null,
        tarief_per_uur: body.tarief_per_uur ?? null,
        created_by: ctx.userId,
      })
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

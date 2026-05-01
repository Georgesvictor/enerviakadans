import { NextRequest, NextResponse } from "next/server";
import { requireTenant, TenancyError } from "@/lib/tenancy/context";
import { requirePermission, PermissionError } from "@/lib/rbac/policies";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  try {
    const ctx = await requireTenant();
    await requirePermission(ctx.tenantId, ctx.userId, "producten", "view");
    const supabase = createAdminSupabaseClient();
    const zoek = req.nextUrl.searchParams.get("q")?.trim();
    let q = supabase
      .from("products")
      .select("*")
      .eq("tenant_id", ctx.tenantId)
      .eq("gearchiveerd", false)
      .order("naam");
    if (zoek) q = q.or(`naam.ilike.%${zoek}%,code.ilike.%${zoek}%`);
    const { data, error } = await q.limit(500);
    if (error) throw error;
    return NextResponse.json({ items: data });
  } catch (err) {
    return errResponse(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireTenant();
    await requirePermission(ctx.tenantId, ctx.userId, "producten", "create");
    const body = await req.json();
    if (!body.naam) {
      return NextResponse.json({ error: "naam verplicht" }, { status: 400 });
    }
    const supabase = createAdminSupabaseClient();
    const { data, error } = await supabase
      .from("products")
      .insert({
        tenant_id: ctx.tenantId,
        code: body.code ?? null,
        naam: body.naam,
        beschrijving: body.beschrijving ?? null,
        type: body.type ?? "product",
        eenheid: body.eenheid ?? "stuk",
        prijs_excl_btw: body.prijs_excl_btw ?? 0,
        btw_tarief: body.btw_tarief ?? 0.21,
        aankoop_prijs: body.aankoop_prijs ?? null,
        categorie: body.categorie ?? null,
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

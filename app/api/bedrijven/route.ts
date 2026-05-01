import { NextRequest, NextResponse } from "next/server";
import { requireTenant, TenancyError } from "@/lib/tenancy/context";
import { requirePermission, PermissionError } from "@/lib/rbac/policies";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  let ctx;
  try {
    ctx = await requireTenant();
    await requirePermission(ctx.tenantId, ctx.userId, "companies", "view");
  } catch (err) {
    return errResponse(err);
  }
  const supabase = createAdminSupabaseClient();
  const zoek = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  let q = supabase
    .from("companies")
    .select(
      "id, naam, btw_nummer, website, sector, postcode, gemeente, is_klant, is_leverancier, tags_cache, created_at",
      { count: "exact" },
    )
    .eq("tenant_id", ctx.tenantId)
    .order("naam")
    .limit(200);
  if (zoek) q = q.or(`naam.ilike.%${zoek}%,btw_nummer.ilike.%${zoek}%`);
  const { data, error, count } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ items: data, totaal: count ?? 0 });
}

export async function POST(req: NextRequest) {
  let ctx;
  try {
    ctx = await requireTenant();
    await requirePermission(ctx.tenantId, ctx.userId, "companies", "create");
  } catch (err) {
    return errResponse(err);
  }
  const supabase = createAdminSupabaseClient();
  const body = await req.json();
  if (!body.naam) {
    return NextResponse.json({ error: "naam verplicht" }, { status: 400 });
  }
  const { data, error } = await supabase
    .from("companies")
    .insert({
      tenant_id: ctx.tenantId,
      naam: body.naam,
      btw_nummer: body.btw_nummer ?? null,
      kbo_nummer: body.kbo_nummer ?? null,
      iban: body.iban ?? null,
      website: body.website ?? null,
      sector: body.sector ?? null,
      email: body.email ?? null,
      telefoon: body.telefoon ?? null,
      adres_straat: body.adres_straat ?? null,
      adres_nummer: body.adres_nummer ?? null,
      postcode: body.postcode ?? null,
      gemeente: body.gemeente ?? null,
      land: body.land ?? "BE",
      beschrijving: body.beschrijving ?? null,
      eigenaar_id: body.eigenaar_id ?? ctx.userId,
      is_klant: body.is_klant ?? false,
      is_leverancier: body.is_leverancier ?? false,
      bron: body.bron ?? "handmatig",
      created_by: ctx.userId,
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

function errResponse(err: unknown) {
  if (err instanceof TenancyError) {
    return NextResponse.json(
      { error: err.message, code: err.code },
      { status: err.code === "UNAUTHENTICATED" ? 401 : 403 },
    );
  }
  if (err instanceof PermissionError) {
    return NextResponse.json({ error: err.message }, { status: 403 });
  }
  return NextResponse.json(
    { error: err instanceof Error ? err.message : String(err) },
    { status: 500 },
  );
}

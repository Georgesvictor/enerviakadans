/**
 * GET  /api/contacten — lijst met filter/zoek
 * POST /api/contacten — nieuw contact
 */

import { NextRequest, NextResponse } from "next/server";
import { requireTenant, TenancyError } from "@/lib/tenancy/context";
import { requirePermission, PermissionError } from "@/lib/rbac/policies";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  try {
    const ctx = await requireTenant();
    await requirePermission(ctx.tenantId, ctx.userId, "contacten", "view");
  } catch (err) {
    return errResponse(err);
  }
  const ctx = await requireTenant();
  const supabase = createAdminSupabaseClient();

  const zoek = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  const tag = req.nextUrl.searchParams.get("tag");
  const company = req.nextUrl.searchParams.get("company");
  const limit = Math.min(parseInt(req.nextUrl.searchParams.get("limit") ?? "100"), 500);
  const offset = parseInt(req.nextUrl.searchParams.get("offset") ?? "0");

  let q = supabase
    .from("contacts")
    .select(
      "id, voornaam, achternaam, email, telefoon, gsm, functie, company_id, tags_cache, is_klant, created_at, companies(naam)",
      { count: "exact" },
    )
    .eq("tenant_id", ctx.tenantId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (zoek) {
    q = q.or(
      `voornaam.ilike.%${zoek}%,achternaam.ilike.%${zoek}%,email.ilike.%${zoek}%,telefoon.ilike.%${zoek}%,gsm.ilike.%${zoek}%`,
    );
  }
  if (tag) q = q.contains("tags_cache", [tag]);
  if (company) q = q.eq("company_id", company);

  const { data, error, count } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ items: data, totaal: count ?? 0 });
}

export async function POST(req: NextRequest) {
  let ctx;
  try {
    ctx = await requireTenant();
    await requirePermission(ctx.tenantId, ctx.userId, "contacten", "create");
  } catch (err) {
    return errResponse(err);
  }
  const supabase = createAdminSupabaseClient();
  const body = await req.json();

  if (!body.voornaam || !body.achternaam) {
    return NextResponse.json(
      { error: "voornaam en achternaam verplicht" },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("contacts")
    .insert({
      tenant_id: ctx.tenantId,
      voornaam: body.voornaam,
      achternaam: body.achternaam,
      email: body.email ?? null,
      telefoon: body.telefoon ?? null,
      gsm: body.gsm ?? null,
      functie: body.functie ?? null,
      company_id: body.company_id ?? null,
      aanspreking: body.aanspreking ?? null,
      taal: body.taal ?? "nl",
      adres_straat: body.adres_straat ?? null,
      adres_nummer: body.adres_nummer ?? null,
      postcode: body.postcode ?? null,
      gemeente: body.gemeente ?? null,
      land: body.land ?? "BE",
      beschrijving: body.beschrijving ?? null,
      eigenaar_id: body.eigenaar_id ?? ctx.userId,
      bron: body.bron ?? "handmatig",
      is_klant: body.is_klant ?? false,
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
  console.error(err);
  return NextResponse.json(
    { error: err instanceof Error ? err.message : String(err) },
    { status: 500 },
  );
}

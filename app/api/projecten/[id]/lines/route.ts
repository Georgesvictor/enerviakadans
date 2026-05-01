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
    await requirePermission(ctx.tenantId, ctx.userId, "projecten", "view");
    const supabase = createAdminSupabaseClient();
    const { data, error } = await supabase
      .from("project_lines")
      .select("*, users:toegewezen_aan(email)")
      .eq("project_id", params.id)
      .eq("tenant_id", ctx.tenantId)
      .order("volgorde");
    if (error) throw error;
    return NextResponse.json({ items: data });
  } catch (err) {
    return errResponse(err);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const ctx = await requireTenant();
    await requirePermission(ctx.tenantId, ctx.userId, "projecten", "update");
    const body = await req.json();
    const supabase = createAdminSupabaseClient();
    const { data, error } = await supabase
      .from("project_lines")
      .insert({
        tenant_id: ctx.tenantId,
        project_id: params.id,
        product_id: body.product_id ?? null,
        omschrijving: body.omschrijving ?? "Nieuwe taak",
        beschrijving: body.beschrijving ?? null,
        aantal: Number(body.aantal ?? 1),
        eenheid: body.eenheid ?? "stuk",
        prijs_excl_btw: Number(body.prijs_excl_btw ?? 0),
        aankoop_prijs_excl_btw: Number(body.aankoop_prijs_excl_btw ?? 0),
        btw_tarief: Number(body.btw_tarief ?? 0.21),
        facturatie_methode: body.facturatie_methode ?? "stukprijs",
        is_kop: Boolean(body.is_kop),
        is_extra_werk: Boolean(body.is_extra_werk),
        extra_status: body.is_extra_werk ? "concept" : null,
        status: body.status ?? "to_do",
        toegewezen_aan: body.toegewezen_aan ?? null,
        volgorde: Number(body.volgorde ?? 9999),
      })
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    return errResponse(err);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const ctx = await requireTenant();
    await requirePermission(ctx.tenantId, ctx.userId, "projecten", "update");
    const body = await req.json();
    if (!body.line_id) {
      return NextResponse.json({ error: "line_id verplicht" }, { status: 400 });
    }
    const supabase = createAdminSupabaseClient();
    const allowed = [
      "omschrijving","beschrijving","aantal","eenheid","prijs_excl_btw",
      "aankoop_prijs_excl_btw","btw_tarief","facturatie_methode",
      "status","toegewezen_aan","begin_datum","eind_datum","volgorde","groep","groep_volgorde",
    ];
    const patch: Record<string, unknown> = {};
    for (const k of allowed) if (k in body) patch[k] = body[k];
    if (body.status === "klaar" && !body.voltooid_op) {
      patch.voltooid_op = new Date().toISOString();
    }
    const { data, error } = await supabase
      .from("project_lines")
      .update(patch)
      .eq("id", body.line_id)
      .eq("project_id", params.id)
      .eq("tenant_id", ctx.tenantId)
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json(data);
  } catch (err) {
    return errResponse(err);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const ctx = await requireTenant();
    await requirePermission(ctx.tenantId, ctx.userId, "projecten", "delete");
    const lineId = req.nextUrl.searchParams.get("line_id");
    if (!lineId)
      return NextResponse.json({ error: "line_id verplicht" }, { status: 400 });
    const supabase = createAdminSupabaseClient();
    const { error } = await supabase
      .from("project_lines")
      .delete()
      .eq("id", lineId)
      .eq("tenant_id", ctx.tenantId);
    if (error) throw error;
    return NextResponse.json({ ok: true });
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

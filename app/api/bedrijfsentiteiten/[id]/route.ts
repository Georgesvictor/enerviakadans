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
    await requirePermission(ctx.tenantId, ctx.userId, "instellingen", "view");
    const supabase = createAdminSupabaseClient();
    const { data, error } = await supabase
      .from("business_entities")
      .select("*")
      .eq("id", params.id)
      .eq("tenant_id", ctx.tenantId)
      .maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: "niet gevonden" }, { status: 404 });
    return NextResponse.json(data);
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
    await requirePermission(ctx.tenantId, ctx.userId, "instellingen", "admin");
    const body = await req.json();
    const supabase = createAdminSupabaseClient();

    // Speciaal: als is_default=true, eerst alle andere op false zetten
    if (body.is_default === true) {
      await supabase
        .from("business_entities")
        .update({ is_default: false })
        .eq("tenant_id", ctx.tenantId);
    }

    const allowed = [
      "naam","is_default","is_actief","logo_url","korte_afkorting",
      "btw_nummer","kbo_nummer","rechtsvorm",
      "email","email_facturatie","website","telefoon","fax",
      "adres_straat","adres_nummer","adres_bus","postcode","gemeente","land",
      "bank_naam","iban","bic","iban_2","bic_2",
      "algemene_voorwaarden","betalingstermijn_dagen",
      "intrest_pct","schadebeding_pct","schadebeding_min",
      "schadebeding_begrenzen_op_btw","intrest_op_eerste_herinnering",
      "peppol_actief","peppol_identifier_type","peppol_identifier","alleen_via_peppol",
      "document_lay_out","munteenheid","datum_formaat",
      "boekhouding_systeem","boekhouding_klant_id","boekhouding_api_key","boekhouder_email",
      "beschrijving",
    ];
    const patch: Record<string, unknown> = {};
    for (const k of allowed) if (k in body) patch[k] = body[k];

    const { data, error } = await supabase
      .from("business_entities")
      .update(patch)
      .eq("id", params.id)
      .eq("tenant_id", ctx.tenantId)
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json(data);
  } catch (err) {
    return errResponse(err);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const ctx = await requireTenant();
    await requirePermission(ctx.tenantId, ctx.userId, "instellingen", "admin");
    const supabase = createAdminSupabaseClient();
    // Soft delete: is_actief=false
    const { error } = await supabase
      .from("business_entities")
      .update({ is_actief: false })
      .eq("id", params.id)
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

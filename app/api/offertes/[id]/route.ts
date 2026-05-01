import { NextRequest, NextResponse } from "next/server";
import { requireTenant, TenancyError } from "@/lib/tenancy/context";
import { canOnRecord, PermissionError, requirePermission } from "@/lib/rbac/policies";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { berekenTotalen } from "@/lib/documenten/totalen";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const ctx = await requireTenant();
    await requirePermission(ctx.tenantId, ctx.userId, "offertes", "view");
    const supabase = createAdminSupabaseClient();
    const { data, error } = await supabase
      .from("quotations")
      .select(
        "*, contacts(id,voornaam,achternaam,email), companies(id,naam), deals(id,titel), quotation_lines(*)",
      )
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
    const supabase = createAdminSupabaseClient();
    const existing = await supabase
      .from("quotations")
      .select("created_by, tenant_id, status")
      .eq("id", params.id)
      .maybeSingle();
    if (!existing.data || existing.data.tenant_id !== ctx.tenantId) {
      return NextResponse.json({ error: "niet gevonden" }, { status: 404 });
    }
    const perm = await canOnRecord(
      ctx.tenantId,
      ctx.userId,
      "offertes",
      "update",
      existing.data.created_by,
    );
    if (!perm.allowed) {
      return NextResponse.json({ error: perm.reden }, { status: 403 });
    }

    const body = await req.json();

    const patch: Record<string, unknown> = {};
    const headFields = [
      "onderwerp","referentie","deal_id","contact_id","company_id","geldig_tot",
      "taal","opmerkingen","voorwaarden","korting_pct","status",
      "geaccepteerd_op","afgewezen_op","afwijzing_reden",
    ];
    for (const k of headFields) if (k in body) patch[k] = body[k];

    // Als regels meegegeven worden — replace all
    if (Array.isArray(body.regels)) {
      const totalen = berekenTotalen(
        body.regels.map((r: any) => ({
          aantal: Number(r.aantal ?? 1),
          prijs_excl_btw: Number(r.prijs_excl_btw ?? 0),
          korting_pct: Number(r.korting_pct ?? 0),
          btw_tarief: Number(r.btw_tarief ?? 0.21),
          is_kop: Boolean(r.is_kop),
        })),
        Number(body.korting_pct ?? 0),
      );
      patch.subtotaal_excl_btw = totalen.subtotaal_excl_btw;
      patch.totaal_btw = totalen.totaal_btw;
      patch.totaal_incl_btw = totalen.totaal_incl_btw;

      await supabase
        .from("quotation_lines")
        .delete()
        .eq("quotation_id", params.id);
      if (body.regels.length > 0) {
        await supabase.from("quotation_lines").insert(
          body.regels.map((r: any, i: number) => ({
            tenant_id: ctx.tenantId,
            quotation_id: params.id,
            product_id: r.product_id ?? null,
            omschrijving: r.omschrijving,
            aantal: Number(r.aantal ?? 1),
            eenheid: r.eenheid ?? "stuk",
            prijs_excl_btw: Number(r.prijs_excl_btw ?? 0),
            korting_pct: Number(r.korting_pct ?? 0),
            btw_tarief: Number(r.btw_tarief ?? 0.21),
            subtotaal_excl_btw: totalen.regels[i]?.subtotaal_excl_btw ?? 0,
            subtotaal_incl_btw: totalen.regels[i]?.subtotaal_incl_btw ?? 0,
            volgorde: (i + 1) * 10,
            is_kop: Boolean(r.is_kop),
          })),
        );
      }
    }

    const { data, error } = await supabase
      .from("quotations")
      .update(patch)
      .eq("id", params.id)
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
    const supabase = createAdminSupabaseClient();
    const existing = await supabase
      .from("quotations")
      .select("created_by, tenant_id")
      .eq("id", params.id)
      .maybeSingle();
    if (!existing.data || existing.data.tenant_id !== ctx.tenantId)
      return NextResponse.json({ error: "niet gevonden" }, { status: 404 });
    const perm = await canOnRecord(
      ctx.tenantId,
      ctx.userId,
      "offertes",
      "delete",
      existing.data.created_by,
    );
    if (!perm.allowed) return NextResponse.json({ error: perm.reden }, { status: 403 });
    const { error } = await supabase
      .from("quotations")
      .delete()
      .eq("id", params.id);
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
  console.error(err);
  return NextResponse.json(
    { error: err instanceof Error ? err.message : String(err) },
    { status: 500 },
  );
}

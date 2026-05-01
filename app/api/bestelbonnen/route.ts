import { NextRequest, NextResponse } from "next/server";
import { requireTenant, TenancyError } from "@/lib/tenancy/context";
import { requirePermission, PermissionError } from "@/lib/rbac/policies";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { berekenTotalen } from "@/lib/documenten/totalen";

export async function GET(req: NextRequest) {
  try {
    const ctx = await requireTenant();
    await requirePermission(ctx.tenantId, ctx.userId, "facturen", "view");
    const supabase = createAdminSupabaseClient();
    const { data, error } = await supabase
      .from("purchase_orders")
      .select(
        "id, nummer, onderwerp, status, datum, verwachte_levering, totaal_incl_btw, deal_id, leverancier_id, companies:leverancier_id(naam)",
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
    await requirePermission(ctx.tenantId, ctx.userId, "facturen", "create");
    const body = await req.json();
    if (!body.onderwerp || !body.leverancier_id) {
      return NextResponse.json(
        { error: "onderwerp + leverancier_id verplicht" },
        { status: 400 },
      );
    }
    const supabase = createAdminSupabaseClient();
    const lijnen = (body.regels ?? []) as any[];
    const totalen = berekenTotalen(
      lijnen.map((r) => ({
        aantal: Number(r.aantal ?? 1),
        prijs_excl_btw: Number(r.prijs_excl_btw ?? 0),
        btw_tarief: Number(r.btw_tarief ?? 0.21),
      })),
    );

    const { data: nummer } = await supabase.rpc("volgend_nummer", {
      t_id: ctx.tenantId,
      doc_type: "purchase_order",
    });

    const { data: po, error } = await supabase
      .from("purchase_orders")
      .insert({
        tenant_id: ctx.tenantId,
        nummer,
        onderwerp: body.onderwerp,
        deal_id: body.deal_id ?? null,
        project_id: body.project_id ?? null,
        leverancier_id: body.leverancier_id,
        business_entity_id: body.business_entity_id ?? null,
        verwachte_levering: body.verwachte_levering ?? null,
        opmerkingen: body.opmerkingen ?? null,
        subtotaal_excl_btw: totalen.subtotaal_excl_btw,
        totaal_btw: totalen.totaal_btw,
        totaal_incl_btw: totalen.totaal_incl_btw,
        eigenaar_id: ctx.userId,
        created_by: ctx.userId,
      })
      .select()
      .single();
    if (error) throw error;

    if (lijnen.length > 0) {
      await supabase.from("purchase_order_lines").insert(
        lijnen.map((r, i) => ({
          tenant_id: ctx.tenantId,
          purchase_order_id: po.id,
          omschrijving: r.omschrijving,
          aantal: Number(r.aantal ?? 1),
          eenheid: r.eenheid ?? "stuk",
          prijs_excl_btw: Number(r.prijs_excl_btw ?? 0),
          btw_tarief: Number(r.btw_tarief ?? 0.21),
          subtotaal_excl_btw: totalen.regels[i]?.subtotaal_excl_btw ?? 0,
          volgorde: (i + 1) * 10,
        })),
      );
    }
    return NextResponse.json(po, { status: 201 });
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

import { NextRequest, NextResponse } from "next/server";
import { requireTenant, TenancyError } from "@/lib/tenancy/context";
import { requirePermission, PermissionError } from "@/lib/rbac/policies";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { billitClientVoorTenant } from "@/lib/integrations/billit/client";

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const ctx = await requireTenant();
    await requirePermission(ctx.tenantId, ctx.userId, "facturen", "update");
    const supabase = createAdminSupabaseClient();

    const { data: i } = await supabase
      .from("invoices")
      .select("*, companies(naam,btw_nummer,adres_straat,postcode,gemeente,land), invoice_lines(*)")
      .eq("id", params.id)
      .eq("tenant_id", ctx.tenantId)
      .maybeSingle();
    if (!i) return NextResponse.json({ error: "niet gevonden" }, { status: 404 });

    const billit = billitClientVoorTenant(ctx.tenantId);
    if (!billit) {
      // Geen Billit-credentials → markeer "klaar voor verzending" zodat admin kan configureren
      await supabase
        .from("invoices")
        .update({ peppol_status: "wacht_op_configuratie" })
        .eq("id", params.id);
      return NextResponse.json({
        status: "wacht_op_configuratie",
        info: "Billit-integratie niet geconfigureerd. Ga naar Instellingen → Integraties om Peppol te activeren.",
      });
    }

    // Markeer "in behandeling"
    await supabase
      .from("invoices")
      .update({ peppol_status: "in_behandeling" })
      .eq("id", params.id);

    try {
      const order = await billit.createOrder({
        orderType: "Invoice",
        orderNumber: i.nummer ?? params.id.slice(0, 8),
        orderDate: i.datum,
        expiryDate: i.vervaldatum ?? i.datum,
        customer: {
          name: i.companies?.naam ?? "Onbekend",
          vatNumber: i.companies?.btw_nummer ?? undefined,
          street: i.companies?.adres_straat ?? undefined,
          zipcode: i.companies?.postcode ?? undefined,
          city: i.companies?.gemeente ?? undefined,
          country: i.companies?.land ?? "BE",
        },
        totalExcl: Number(i.subtotaal_excl_btw),
        totalVat: Number(i.totaal_btw),
        totalIncl: Number(i.totaal_incl_btw),
        structuredCommunication: i.gestructureerde_mededeling ?? undefined,
        lines: (i.invoice_lines as any[]).map((r) => ({
          description: r.omschrijving,
          quantity: Number(r.aantal),
          unitPrice: Number(r.prijs_excl_btw),
          vatPercentage: Number(r.btw_tarief),
        })),
      });

      const sent = await billit.sendToPeppol(order.id);

      await supabase
        .from("invoices")
        .update({
          peppol_status: sent.status,
          status: "verzonden",
        })
        .eq("id", params.id);

      return NextResponse.json({ status: sent.status, billit_id: order.id });
    } catch (err) {
      await supabase
        .from("invoices")
        .update({ peppol_status: "fout" })
        .eq("id", params.id);
      throw err;
    }
  } catch (err) {
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
}

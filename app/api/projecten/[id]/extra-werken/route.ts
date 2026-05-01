/**
 * Genereer een mini-offerte voor extra werken op een project.
 * Selecteert alle project_lines met is_extra_werk=true en extra_status='concept'.
 * Maakt een nieuwe quotation aan en koppelt elke project_line aan een quotation_line.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireTenant, TenancyError } from "@/lib/tenancy/context";
import { requirePermission, PermissionError } from "@/lib/rbac/policies";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { berekenTotalen } from "@/lib/documenten/totalen";

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const ctx = await requireTenant();
    await requirePermission(ctx.tenantId, ctx.userId, "offertes", "create");
    const supabase = createAdminSupabaseClient();

    const { data: project } = await supabase
      .from("projects")
      .select(
        "id, naam, contact_id, company_id, deal_id, eigenaar_id",
      )
      .eq("id", params.id)
      .eq("tenant_id", ctx.tenantId)
      .maybeSingle();
    if (!project)
      return NextResponse.json({ error: "project niet gevonden" }, { status: 404 });

    const { data: extras } = await supabase
      .from("project_lines")
      .select("*")
      .eq("project_id", params.id)
      .eq("tenant_id", ctx.tenantId)
      .eq("is_extra_werk", true)
      .eq("extra_status", "concept");
    const extraLines = (extras as any[]) ?? [];

    if (extraLines.length === 0) {
      return NextResponse.json(
        { error: "Geen extra-werken in concept om te versturen" },
        { status: 400 },
      );
    }

    const totalen = berekenTotalen(
      extraLines.map((l) => ({
        aantal: Number(l.aantal),
        prijs_excl_btw: Number(l.prijs_excl_btw),
        korting_pct: Number(l.korting_pct ?? 0),
        btw_tarief: Number(l.btw_tarief),
      })),
    );

    const { data: nummer } = await supabase.rpc("volgend_nummer", {
      t_id: ctx.tenantId,
      doc_type: "quotation",
    });

    const { data: offerte, error } = await supabase
      .from("quotations")
      .insert({
        tenant_id: ctx.tenantId,
        nummer,
        onderwerp: `Extra werken — ${project.naam}`,
        deal_id: project.deal_id,
        contact_id: project.contact_id,
        company_id: project.company_id,
        is_extra_werk: true,
        parent_project_id: project.id,
        subtotaal_excl_btw: totalen.subtotaal_excl_btw,
        totaal_btw: totalen.totaal_btw,
        totaal_incl_btw: totalen.totaal_incl_btw,
        eigenaar_id: project.eigenaar_id ?? ctx.userId,
        created_by: ctx.userId,
      })
      .select()
      .single();
    if (error) throw error;

    // Maak quotation_lines + update project_lines met extra_status + extra_quotation_id
    for (let i = 0; i < extraLines.length; i++) {
      const l = extraLines[i];
      const { data: qLine } = await supabase
        .from("quotation_lines")
        .insert({
          tenant_id: ctx.tenantId,
          quotation_id: offerte.id,
          product_id: l.product_id,
          omschrijving: l.omschrijving,
          beschrijving: l.beschrijving,
          aantal: l.aantal,
          eenheid: l.eenheid,
          prijs_excl_btw: l.prijs_excl_btw,
          aankoop_prijs_excl_btw: l.aankoop_prijs_excl_btw,
          btw_tarief: l.btw_tarief,
          facturatie_methode: l.facturatie_methode,
          subtotaal_excl_btw: totalen.regels[i]?.subtotaal_excl_btw ?? 0,
          subtotaal_incl_btw: totalen.regels[i]?.subtotaal_incl_btw ?? 0,
          volgorde: (i + 1) * 10,
        })
        .select("id")
        .single();
      await supabase
        .from("project_lines")
        .update({
          extra_status: "verstuurd",
          extra_quotation_id: offerte.id,
          quotation_line_id: qLine?.id ?? null,
        })
        .eq("id", l.id);
    }

    // Klant-token voor goedkeuring
    const token = crypto.randomUUID();
    const expires = new Date();
    expires.setDate(expires.getDate() + 30);
    await supabase
      .from("quotations")
      .update({
        klant_token: token,
        klant_token_expires_at: expires.toISOString(),
        status: "verzonden",
      })
      .eq("id", offerte.id);

    return NextResponse.json(
      {
        ok: true,
        quotation_id: offerte.id,
        nummer: offerte.nummer,
        klant_link_token: token,
      },
      { status: 201 },
    );
  } catch (err) {
    if (err instanceof TenancyError)
      return NextResponse.json({ error: err.message }, { status: 403 });
    if (err instanceof PermissionError)
      return NextResponse.json({ error: err.message }, { status: 403 });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}

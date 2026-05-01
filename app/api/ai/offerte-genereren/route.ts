import { NextRequest, NextResponse } from "next/server";
import { requireTenant } from "@/lib/tenancy/context";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { genereerOfferteRegels } from "@/lib/claude/genereer-offerte";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireTenant();
    const body = await req.json();
    if (!body.beschrijving || body.beschrijving.length < 10) {
      return NextResponse.json(
        { error: "beschrijving (min 10 chars) verplicht" },
        { status: 400 },
      );
    }

    const supabase = createAdminSupabaseClient();
    // Haal beschikbare producten op uit catalogus voor inspiratie
    const { data: products } = await supabase
      .from("products")
      .select("id, code, naam, prijs_excl_btw, btw_tarief, eenheid")
      .eq("tenant_id", ctx.tenantId)
      .eq("gearchiveerd", false)
      .order("naam")
      .limit(100);

    const result = await genereerOfferteRegels({
      beschrijving: body.beschrijving,
      catalogus: products ?? [],
      context: {
        klantNaam: body.klantNaam,
        type: body.type,
        btw_voorkeur: body.btw_voorkeur ?? 0.21,
      },
    });

    // Audit log
    await supabase.from("audit_log").insert({
      user_id: ctx.userId,
      actie: "ai_offerte_generated",
      metadata: {
        regels_count: result.regels.length,
        beschrijving_lengte: body.beschrijving.length,
      },
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error("AI generation error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}

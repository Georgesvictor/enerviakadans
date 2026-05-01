/**
 * Publieke API voor klantreactie op offerte. Gebruikt token ipv auth.
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

export async function POST(
  req: NextRequest,
  { params }: { params: { token: string } },
) {
  const body = await req.json();
  const supabase = createAdminSupabaseClient();
  const { data: offerte } = await supabase
    .from("quotations")
    .select("id, status, klant_token_expires_at, tenant_id")
    .eq("klant_token", params.token)
    .maybeSingle();
  if (!offerte) {
    return NextResponse.json({ error: "niet gevonden" }, { status: 404 });
  }
  if (
    offerte.klant_token_expires_at &&
    new Date(offerte.klant_token_expires_at) < new Date()
  ) {
    return NextResponse.json({ error: "link vervallen" }, { status: 410 });
  }
  if (offerte.status === "geaccepteerd" || offerte.status === "afgewezen") {
    return NextResponse.json(
      { error: "Deze offerte is reeds beantwoord" },
      { status: 400 },
    );
  }

  const now = new Date().toISOString();
  const patch: Record<string, unknown> = {};
  if (body.actie === "accepteer") {
    patch.status = "geaccepteerd";
    patch.geaccepteerd_op = now;
  } else if (body.actie === "wijs_af") {
    patch.status = "afgewezen";
    patch.afgewezen_op = now;
    patch.afwijzing_reden = body.reden ?? null;
  } else {
    return NextResponse.json({ error: "ongeldige actie" }, { status: 400 });
  }

  const { error } = await supabase
    .from("quotations")
    .update(patch)
    .eq("id", offerte.id);
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  // Log audit
  await supabase.from("audit_log").insert({
    tenant_id: offerte.tenant_id,
    actie: `offerte_${body.actie}`,
    metadata: { offerte_id: offerte.id, reden: body.reden ?? null },
    ip_address: req.headers.get("x-forwarded-for") ?? null,
  } as any);

  return NextResponse.json({ ok: true, status: patch.status });
}

/**
 * Offerte als verzonden markeren + klant_token genereren.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireTenant } from "@/lib/tenancy/context";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { randomUUID } from "crypto";

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const ctx = await requireTenant();
  const supabase = createAdminSupabaseClient();

  const { data: existing } = await supabase
    .from("quotations")
    .select("id, klant_token")
    .eq("id", params.id)
    .eq("tenant_id", ctx.tenantId)
    .maybeSingle();
  if (!existing)
    return NextResponse.json({ error: "niet gevonden" }, { status: 404 });

  const klant_token = existing.klant_token ?? randomUUID();

  await supabase
    .from("quotations")
    .update({
      status: "verzonden",
      verzonden_op: new Date().toISOString(),
      klant_token,
    })
    .eq("id", params.id)
    .eq("tenant_id", ctx.tenantId);

  return NextResponse.json({
    ok: true,
    klantlink: `/offerte/${params.id}?token=${klant_token}`,
  });
}

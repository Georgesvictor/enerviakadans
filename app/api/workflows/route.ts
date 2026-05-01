/**
 * Workflows API.
 *
 * - POST  : nieuwe regel
 * - PATCH : bijwerken
 * - DELETE: verwijderen
 */

import { NextRequest, NextResponse } from "next/server";
import { requireTenant } from "@/lib/tenancy/context";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

const TRIGGERS = new Set([
  "deal_created",
  "deal_stage_change",
  "deal_won",
  "deal_lost",
  "quotation_accepted",
  "invoice_created",
  "invoice_paid",
  "task_completed",
]);

export async function POST(req: NextRequest) {
  const ctx = await requireTenant();
  const body = await req.json();
  if (!body.naam || !TRIGGERS.has(body.trigger)) {
    return NextResponse.json(
      { error: "naam + geldige trigger verplicht" },
      { status: 400 },
    );
  }
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("workflow_rules")
    .insert({
      tenant_id: ctx.tenantId,
      naam: body.naam,
      beschrijving: body.beschrijving ?? null,
      trigger: body.trigger,
      filter_jsonb: body.filter_jsonb ?? {},
      acties_jsonb: body.acties_jsonb ?? [],
      is_actief: body.is_actief ?? true,
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: data.id });
}

export async function PATCH(req: NextRequest) {
  const ctx = await requireTenant();
  const body = await req.json();
  if (!body.id) return NextResponse.json({ error: "id verplicht" }, { status: 400 });
  const supabase = createAdminSupabaseClient();
  const update: Record<string, unknown> = {};
  for (const k of [
    "naam",
    "beschrijving",
    "trigger",
    "filter_jsonb",
    "acties_jsonb",
    "is_actief",
  ]) {
    if (k in body) update[k] = body[k];
  }
  const { error } = await supabase
    .from("workflow_rules")
    .update(update)
    .eq("id", body.id)
    .eq("tenant_id", ctx.tenantId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const ctx = await requireTenant();
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id verplicht" }, { status: 400 });
  const supabase = createAdminSupabaseClient();
  const { error } = await supabase
    .from("workflow_rules")
    .delete()
    .eq("id", id)
    .eq("tenant_id", ctx.tenantId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

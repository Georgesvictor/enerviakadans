/**
 * Tag-assignment helper. Eén endpoint voor alle entity-types.
 *
 * Body: { tag_id, entity_type, entity_id, action: 'assign'|'unassign' }
 */

import { NextRequest, NextResponse } from "next/server";
import { requireTenant } from "@/lib/tenancy/context";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

const TABLES: Record<string, { table: string; key: string }> = {
  deal: { table: "deal_tags", key: "deal_id" },
  contact: { table: "contact_tags", key: "contact_id" },
  company: { table: "company_tags", key: "company_id" },
  task: { table: "task_tags", key: "task_id" },
};

export async function POST(req: NextRequest) {
  const ctx = await requireTenant();
  const body = await req.json();
  const t = TABLES[body.entity_type as string];
  if (!t || !body.tag_id || !body.entity_id) {
    return NextResponse.json(
      { error: "entity_type, tag_id, entity_id verplicht" },
      { status: 400 },
    );
  }
  const supabase = createAdminSupabaseClient();

  if (body.action === "unassign") {
    const { error } = await supabase
      .from(t.table)
      .delete()
      .eq(t.key, body.entity_id)
      .eq("tag_id", body.tag_id)
      .eq("tenant_id", ctx.tenantId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  // assign (idempotent via upsert)
  const { error } = await supabase
    .from(t.table)
    .upsert(
      {
        [t.key]: body.entity_id,
        tag_id: body.tag_id,
        tenant_id: ctx.tenantId,
      },
      { onConflict: `${t.key},tag_id` },
    );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // best-effort gebruik-counter; RPC bestaat mogelijk niet
  try {
    await supabase.rpc("increment_tag_usage", { p_tag_id: body.tag_id });
  } catch {
    // ignore
  }

  return NextResponse.json({ ok: true });
}

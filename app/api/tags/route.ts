/**
 * Tags CRUD + entity-tagging.
 *
 * GET  /api/tags                      — alle tags
 * POST /api/tags                      — nieuwe tag {naam, kleur}
 * POST /api/tags/assign               — tag toewijzen {tag_id, entity_type, entity_id}
 * POST /api/tags/unassign             — tag verwijderen {tag_id, entity_type, entity_id}
 */

import { NextRequest, NextResponse } from "next/server";
import { requireTenant } from "@/lib/tenancy/context";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const ctx = await requireTenant();
  const supabase = createAdminSupabaseClient();
  const { data } = await supabase
    .from("tags")
    .select("id, naam, kleur, scope, gebruik_count")
    .eq("tenant_id", ctx.tenantId)
    .order("naam");
  return NextResponse.json({ tags: data ?? [] });
}

export async function POST(req: NextRequest) {
  const ctx = await requireTenant();
  const body = await req.json();
  if (!body.naam) {
    return NextResponse.json({ error: "naam verplicht" }, { status: 400 });
  }
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("tags")
    .insert({
      tenant_id: ctx.tenantId,
      naam: body.naam,
      kleur: body.kleur ?? "#64748b",
      scope: body.scope ?? "all",
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ tag: data });
}

export async function DELETE(req: NextRequest) {
  const ctx = await requireTenant();
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id verplicht" }, { status: 400 });
  const supabase = createAdminSupabaseClient();
  const { error } = await supabase
    .from("tags")
    .delete()
    .eq("id", id)
    .eq("tenant_id", ctx.tenantId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

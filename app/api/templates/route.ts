/**
 * Templates API.
 *
 * - POST  : nieuwe template aanmaken
 * - PATCH : bestaande template bijwerken (id in body)
 * - DELETE: verwijderen (id in query)
 */

import { NextRequest, NextResponse } from "next/server";
import { requireTenant } from "@/lib/tenancy/context";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

const TYPES = new Set([
  "offerte",
  "factuur",
  "herinnering",
  "email",
  "pdf_layout",
]);

export async function POST(req: NextRequest) {
  const ctx = await requireTenant();
  const body = await req.json();
  if (!body.naam || !TYPES.has(body.type)) {
    return NextResponse.json(
      { error: "naam en geldig type verplicht" },
      { status: 400 },
    );
  }
  const supabase = createAdminSupabaseClient();

  // Bij is_default: zet alle andere op false binnen zelfde type
  if (body.is_default) {
    await supabase
      .from("document_templates")
      .update({ is_default: false })
      .eq("tenant_id", ctx.tenantId)
      .eq("type", body.type);
  }

  const { data, error } = await supabase
    .from("document_templates")
    .insert({
      tenant_id: ctx.tenantId,
      naam: body.naam,
      type: body.type,
      is_default: !!body.is_default,
      inhoud_html: body.inhoud_html ?? "",
      inhoud_tekst: body.inhoud_tekst ?? "",
      scope: body.scope ?? "tenant",
      pipeline_id: body.pipeline_id ?? null,
      created_by: ctx.userId,
    })
    .select()
    .single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ id: data.id });
}

export async function PATCH(req: NextRequest) {
  const ctx = await requireTenant();
  const body = await req.json();
  if (!body.id) {
    return NextResponse.json({ error: "id verplicht" }, { status: 400 });
  }
  const supabase = createAdminSupabaseClient();

  if (body.is_default && body.type) {
    await supabase
      .from("document_templates")
      .update({ is_default: false })
      .eq("tenant_id", ctx.tenantId)
      .eq("type", body.type)
      .neq("id", body.id);
  }

  const update: Record<string, unknown> = {};
  for (const k of [
    "naam",
    "type",
    "is_default",
    "inhoud_html",
    "inhoud_tekst",
    "scope",
    "pipeline_id",
  ]) {
    if (k in body) update[k] = body[k];
  }
  update.updated_at = new Date().toISOString();

  const { error } = await supabase
    .from("document_templates")
    .update(update)
    .eq("id", body.id)
    .eq("tenant_id", ctx.tenantId);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const ctx = await requireTenant();
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id verplicht" }, { status: 400 });
  const supabase = createAdminSupabaseClient();
  const { error } = await supabase
    .from("document_templates")
    .delete()
    .eq("id", id)
    .eq("tenant_id", ctx.tenantId);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

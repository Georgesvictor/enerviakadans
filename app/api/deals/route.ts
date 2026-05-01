import { NextRequest, NextResponse } from "next/server";
import { requireTenant, TenancyError } from "@/lib/tenancy/context";
import { requirePermission, PermissionError } from "@/lib/rbac/policies";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  let ctx;
  try {
    ctx = await requireTenant();
    await requirePermission(ctx.tenantId, ctx.userId, "deals", "view");
  } catch (err) {
    return errResponse(err);
  }
  const supabase = createAdminSupabaseClient();
  const pipelineId = req.nextUrl.searchParams.get("pipeline_id");
  const status = req.nextUrl.searchParams.get("status") ?? "open";

  let q = supabase
    .from("deals")
    .select(
      "id, titel, waarde_excl_btw, btw_tarief, status, stage_id, pipeline_id, contact_id, company_id, eigenaar_id, verwacht_afgesloten, laatste_activiteit, contacts(voornaam,achternaam), companies(naam)",
    )
    .eq("tenant_id", ctx.tenantId)
    .order("laatste_activiteit", { ascending: false });
  if (status !== "all") q = q.eq("status", status);
  if (pipelineId) q = q.eq("pipeline_id", pipelineId);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ items: data ?? [] });
}

export async function POST(req: NextRequest) {
  let ctx;
  try {
    ctx = await requireTenant();
    await requirePermission(ctx.tenantId, ctx.userId, "deals", "create");
  } catch (err) {
    return errResponse(err);
  }
  const supabase = createAdminSupabaseClient();
  const body = await req.json();

  if (!body.titel) {
    return NextResponse.json({ error: "titel verplicht" }, { status: 400 });
  }

  // Default pipeline + eerste stage
  let pipelineId = body.pipeline_id;
  let stageId = body.stage_id;
  if (!pipelineId || !stageId) {
    const p = await supabase
      .from("pipelines")
      .select("id")
      .eq("tenant_id", ctx.tenantId)
      .eq("is_default", true)
      .maybeSingle();
    pipelineId = p.data?.id ?? null;
    if (pipelineId && !stageId) {
      const s = await supabase
        .from("pipeline_stages")
        .select("id")
        .eq("pipeline_id", pipelineId)
        .order("volgorde")
        .limit(1)
        .maybeSingle();
      stageId = s.data?.id ?? null;
    }
  }
  if (!pipelineId || !stageId) {
    return NextResponse.json(
      { error: "Geen pipeline/stage beschikbaar" },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("deals")
    .insert({
      tenant_id: ctx.tenantId,
      titel: body.titel,
      beschrijving: body.beschrijving ?? null,
      pipeline_id: pipelineId,
      stage_id: stageId,
      contact_id: body.contact_id ?? null,
      company_id: body.company_id ?? null,
      waarde_excl_btw: body.waarde_excl_btw ?? 0,
      btw_tarief: body.btw_tarief ?? 0.21,
      verwacht_afgesloten: body.verwacht_afgesloten ?? null,
      eigenaar_id: body.eigenaar_id ?? ctx.userId,
      bron: body.bron ?? "handmatig",
      created_by: ctx.userId,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

function errResponse(err: unknown) {
  if (err instanceof TenancyError) {
    return NextResponse.json(
      { error: err.message, code: err.code },
      { status: err.code === "UNAUTHENTICATED" ? 401 : 403 },
    );
  }
  if (err instanceof PermissionError) {
    return NextResponse.json({ error: err.message }, { status: 403 });
  }
  return NextResponse.json(
    { error: err instanceof Error ? err.message : String(err) },
    { status: 500 },
  );
}

import { NextRequest, NextResponse } from "next/server";
import { requireTenant, TenancyError } from "@/lib/tenancy/context";
import { canOnRecord, PermissionError, requirePermission } from "@/lib/rbac/policies";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const ctx = await requireTenant();
    await requirePermission(ctx.tenantId, ctx.userId, "deals", "view");
    const supabase = createAdminSupabaseClient();
    const { data, error } = await supabase
      .from("deals")
      .select(
        "*, contacts(id,voornaam,achternaam,email), companies(id,naam), pipeline_stages(naam,kleur,is_won,is_lost), pipelines(naam)",
      )
      .eq("id", params.id)
      .eq("tenant_id", ctx.tenantId)
      .maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: "niet gevonden" }, { status: 404 });
    return NextResponse.json(data);
  } catch (err) {
    return errResponse(err);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const ctx = await requireTenant();
    const supabase = createAdminSupabaseClient();
    const existing = await supabase
      .from("deals")
      .select("created_by, tenant_id")
      .eq("id", params.id)
      .maybeSingle();
    if (!existing.data || existing.data.tenant_id !== ctx.tenantId) {
      return NextResponse.json({ error: "niet gevonden" }, { status: 404 });
    }
    const perm = await canOnRecord(
      ctx.tenantId,
      ctx.userId,
      "deals",
      "update",
      existing.data.created_by,
    );
    if (!perm.allowed) {
      return NextResponse.json({ error: perm.reden }, { status: 403 });
    }

    const body = await req.json();
    const allowed = [
      "titel","beschrijving","stage_id","pipeline_id","contact_id","company_id",
      "waarde_excl_btw","btw_tarief","verwacht_afgesloten","eigenaar_id",
      "status","lost_reden","afgesloten_op","custom_fields",
    ];
    const patch: Record<string, unknown> = {};
    for (const k of allowed) if (k in body) patch[k] = body[k];

    // Als naar won/lost stage → status updaten
    if (body.stage_id) {
      const stage = await supabase
        .from("pipeline_stages")
        .select("is_won, is_lost")
        .eq("id", body.stage_id)
        .maybeSingle();
      if (stage.data?.is_won) {
        patch.status = "won";
        patch.afgesloten_op = new Date().toISOString();
      } else if (stage.data?.is_lost) {
        patch.status = "lost";
        patch.afgesloten_op = new Date().toISOString();
      } else {
        patch.status = "open";
        patch.afgesloten_op = null;
      }
    }

    const { data, error } = await supabase
      .from("deals")
      .update(patch)
      .eq("id", params.id)
      .eq("tenant_id", ctx.tenantId)
      .select()
      .single();
    if (error) throw error;

    // Workflow triggers — fire-and-forget
    try {
      const { runWorkflows } = await import("@/lib/workflows/engine");
      const workflowPayload = {
        dealId: data.id,
        dealTitel: data.titel,
        dealValue: data.waarde_excl_btw,
        pipelineId: data.pipeline_id,
        stageId: data.stage_id,
        status: data.status,
        contactId: data.contact_id,
        companyId: data.company_id,
        eigenaar_id: data.eigenaar_id,
        triggeredBy: ctx.userId,
      };
      if (patch.status === "won") {
        await runWorkflows({
          tenantId: ctx.tenantId,
          trigger: "deal_won",
          payload: workflowPayload,
        });
      } else if (patch.status === "lost") {
        await runWorkflows({
          tenantId: ctx.tenantId,
          trigger: "deal_lost",
          payload: workflowPayload,
        });
      } else if (body.stage_id) {
        await runWorkflows({
          tenantId: ctx.tenantId,
          trigger: "deal_stage_change",
          payload: workflowPayload,
        });
      }
    } catch (wfErr) {
      console.error("workflow execution failed (non-fatal):", wfErr);
    }

    return NextResponse.json(data);
  } catch (err) {
    return errResponse(err);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const ctx = await requireTenant();
    const supabase = createAdminSupabaseClient();
    const existing = await supabase
      .from("deals")
      .select("created_by, tenant_id")
      .eq("id", params.id)
      .maybeSingle();
    if (!existing.data || existing.data.tenant_id !== ctx.tenantId) {
      return NextResponse.json({ error: "niet gevonden" }, { status: 404 });
    }
    const perm = await canOnRecord(
      ctx.tenantId,
      ctx.userId,
      "deals",
      "delete",
      existing.data.created_by,
    );
    if (!perm.allowed) {
      return NextResponse.json({ error: perm.reden }, { status: 403 });
    }
    const { error } = await supabase
      .from("deals")
      .delete()
      .eq("id", params.id)
      .eq("tenant_id", ctx.tenantId);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errResponse(err);
  }
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

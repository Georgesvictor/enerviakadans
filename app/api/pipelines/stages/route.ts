import { NextRequest, NextResponse } from "next/server";
import { requireTenant, TenancyError } from "@/lib/tenancy/context";
import { requirePermission, PermissionError } from "@/lib/rbac/policies";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

// POST /api/pipelines/stages → nieuwe stage
export async function POST(req: NextRequest) {
  try {
    const ctx = await requireTenant();
    await requirePermission(ctx.tenantId, ctx.userId, "instellingen", "admin");
    const body = await req.json();
    if (!body.naam || !body.pipeline_id) {
      return NextResponse.json(
        { error: "naam en pipeline_id verplicht" },
        { status: 400 },
      );
    }
    const supabase = createAdminSupabaseClient();
    const cat = body.categorie ?? "pre_sales";
    const kleurMap: Record<string, string> = {
      pre_sales: "#3B82F6",
      in_sales: "#10B981",
      refused: "#DC2626",
      won: "#1F4D3F",
    };
    const { data, error } = await supabase
      .from("pipeline_stages")
      .insert({
        tenant_id: ctx.tenantId,
        pipeline_id: body.pipeline_id,
        naam: body.naam,
        volgorde: Number(body.volgorde ?? 100),
        waarschijnlijkheid: Number(body.waarschijnlijkheid ?? 50),
        kleur: body.kleur ?? kleurMap[cat] ?? "#94A3B8",
        categorie: cat,
        is_won: cat === "won",
        is_lost: cat === "refused",
      })
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    return errResponse(err);
  }
}

// PATCH /api/pipelines/stages → meerdere stages bulk update (voor reorder/edit)
export async function PATCH(req: NextRequest) {
  try {
    const ctx = await requireTenant();
    await requirePermission(ctx.tenantId, ctx.userId, "instellingen", "admin");
    const body = await req.json();
    if (!Array.isArray(body.stages)) {
      return NextResponse.json({ error: "stages array verplicht" }, { status: 400 });
    }
    const supabase = createAdminSupabaseClient();
    for (const s of body.stages) {
      const patch: Record<string, unknown> = {};
      ["naam", "volgorde", "waarschijnlijkheid", "kleur", "categorie", "rotting_dagen"].forEach((k) => {
        if (k in s) patch[k] = s[k];
      });
      if (s.categorie) {
        patch.is_won = s.categorie === "won";
        patch.is_lost = s.categorie === "refused";
      }
      await supabase
        .from("pipeline_stages")
        .update(patch)
        .eq("id", s.id)
        .eq("tenant_id", ctx.tenantId);
    }
    return NextResponse.json({ ok: true, count: body.stages.length });
  } catch (err) {
    return errResponse(err);
  }
}

// DELETE /api/pipelines/stages?id=... — verwijder stage (alleen als geen deals erop)
export async function DELETE(req: NextRequest) {
  try {
    const ctx = await requireTenant();
    await requirePermission(ctx.tenantId, ctx.userId, "instellingen", "admin");
    const id = req.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id verplicht" }, { status: 400 });

    const supabase = createAdminSupabaseClient();
    const { count } = await supabase
      .from("deals")
      .select("id", { count: "exact", head: true })
      .eq("stage_id", id)
      .eq("tenant_id", ctx.tenantId);
    if (count && count > 0) {
      return NextResponse.json(
        { error: `Kan niet verwijderen: ${count} deals zitten in deze fase` },
        { status: 400 },
      );
    }
    const { error } = await supabase
      .from("pipeline_stages")
      .delete()
      .eq("id", id)
      .eq("tenant_id", ctx.tenantId);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errResponse(err);
  }
}

function errResponse(err: unknown) {
  if (err instanceof TenancyError)
    return NextResponse.json({ error: err.message }, { status: 403 });
  if (err instanceof PermissionError)
    return NextResponse.json({ error: err.message }, { status: 403 });
  return NextResponse.json(
    { error: err instanceof Error ? err.message : String(err) },
    { status: 500 },
  );
}

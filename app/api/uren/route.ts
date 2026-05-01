import { NextRequest, NextResponse } from "next/server";
import { requireTenant, TenancyError } from "@/lib/tenancy/context";
import { requirePermission, PermissionError } from "@/lib/rbac/policies";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  try {
    const ctx = await requireTenant();
    await requirePermission(ctx.tenantId, ctx.userId, "uren", "view");
    const supabase = createAdminSupabaseClient();
    const userId = req.nextUrl.searchParams.get("user_id") ?? ctx.userId;
    const van = req.nextUrl.searchParams.get("van");
    const tot = req.nextUrl.searchParams.get("tot");
    let q = supabase
      .from("time_entries")
      .select(
        "id, datum, minuten, omschrijving, is_factureerbaar, gefactureerd, project_id, task_id, tarief_per_uur, projects(naam), tasks(titel), users(email)",
      )
      .eq("tenant_id", ctx.tenantId)
      .eq("user_id", userId)
      .order("datum", { ascending: false })
      .limit(300);
    if (van) q = q.gte("datum", van);
    if (tot) q = q.lte("datum", tot);
    const { data, error } = await q;
    if (error) throw error;
    return NextResponse.json({ items: data });
  } catch (err) {
    return errResponse(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireTenant();
    await requirePermission(ctx.tenantId, ctx.userId, "uren", "create");
    const body = await req.json();
    if (!body.minuten || !body.datum) {
      return NextResponse.json(
        { error: "minuten en datum verplicht" },
        { status: 400 },
      );
    }
    const supabase = createAdminSupabaseClient();
    const { data, error } = await supabase
      .from("time_entries")
      .insert({
        tenant_id: ctx.tenantId,
        user_id: ctx.userId,
        datum: body.datum,
        minuten: Number(body.minuten),
        omschrijving: body.omschrijving ?? null,
        project_id: body.project_id ?? null,
        task_id: body.task_id ?? null,
        phase_id: body.phase_id ?? null,
        tarief_per_uur: body.tarief_per_uur ?? null,
        is_factureerbaar: body.is_factureerbaar ?? true,
      })
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
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

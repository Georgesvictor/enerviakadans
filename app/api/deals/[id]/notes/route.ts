import { NextRequest, NextResponse } from "next/server";
import { requireTenant, TenancyError } from "@/lib/tenancy/context";
import { requirePermission, PermissionError } from "@/lib/rbac/policies";
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
      .from("deal_notes")
      .select("id, inhoud, auteur_id, is_systeem, created_at, users(email)")
      .eq("deal_id", params.id)
      .eq("tenant_id", ctx.tenantId)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw error;
    return NextResponse.json({ items: data });
  } catch (err) {
    return errResponse(err);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const ctx = await requireTenant();
    await requirePermission(ctx.tenantId, ctx.userId, "deals", "update");
    const body = await req.json();
    if (!body.inhoud) {
      return NextResponse.json({ error: "inhoud verplicht" }, { status: 400 });
    }
    const supabase = createAdminSupabaseClient();
    const { data, error } = await supabase
      .from("deal_notes")
      .insert({
        tenant_id: ctx.tenantId,
        deal_id: params.id,
        auteur_id: ctx.userId,
        inhoud: body.inhoud,
        is_systeem: false,
      })
      .select("id, inhoud, auteur_id, is_systeem, created_at, users(email)")
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

import { NextRequest, NextResponse } from "next/server";
import { requireTenant, TenancyError } from "@/lib/tenancy/context";
import { requirePermission, PermissionError } from "@/lib/rbac/policies";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  try {
    const ctx = await requireTenant();
    await requirePermission(ctx.tenantId, ctx.userId, "taken", "view");
    const supabase = createAdminSupabaseClient();
    const status = req.nextUrl.searchParams.get("status");
    const project = req.nextUrl.searchParams.get("project_id");
    let q = supabase
      .from("tasks")
      .select(
        "id, titel, status, prioriteit, deadline, toegewezen_aan, project_id, projects(naam), contact_id, contacts(voornaam,achternaam)",
      )
      .eq("tenant_id", ctx.tenantId)
      .order("deadline", { ascending: true, nullsFirst: false })
      .limit(200);
    if (status) q = q.eq("status", status);
    if (project) q = q.eq("project_id", project);
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
    await requirePermission(ctx.tenantId, ctx.userId, "taken", "create");
    const body = await req.json();
    if (!body.titel) {
      return NextResponse.json({ error: "titel verplicht" }, { status: 400 });
    }
    const supabase = createAdminSupabaseClient();
    const { data, error } = await supabase
      .from("tasks")
      .insert({
        tenant_id: ctx.tenantId,
        titel: body.titel,
        beschrijving: body.beschrijving ?? null,
        project_id: body.project_id ?? null,
        contact_id: body.contact_id ?? null,
        company_id: body.company_id ?? null,
        deal_id: body.deal_id ?? null,
        toegewezen_aan: body.toegewezen_aan ?? ctx.userId,
        prioriteit: body.prioriteit ?? "normaal",
        deadline: body.deadline ?? null,
        created_by: ctx.userId,
      })
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    return errResponse(err);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const ctx = await requireTenant();
    const body = await req.json();
    if (!body.id || !body.status) {
      return NextResponse.json(
        { error: "id en status verplicht" },
        { status: 400 },
      );
    }
    const supabase = createAdminSupabaseClient();
    const patch: Record<string, unknown> = { status: body.status };
    if (body.status === "afgerond") patch.afgerond_op = new Date().toISOString();
    const { data, error } = await supabase
      .from("tasks")
      .update(patch)
      .eq("id", body.id)
      .eq("tenant_id", ctx.tenantId)
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json(data);
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

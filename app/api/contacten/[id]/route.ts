/**
 * GET/PATCH/DELETE /api/contacten/[id]
 */

import { NextRequest, NextResponse } from "next/server";
import { requireTenant, TenancyError } from "@/lib/tenancy/context";
import { canOnRecord, requirePermission, PermissionError } from "@/lib/rbac/policies";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const ctx = await requireTenant();
    await requirePermission(ctx.tenantId, ctx.userId, "contacten", "view");
    const supabase = createAdminSupabaseClient();
    const { data, error } = await supabase
      .from("contacts")
      .select("*, companies(id, naam)")
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
      .from("contacts")
      .select("created_by, tenant_id")
      .eq("id", params.id)
      .maybeSingle();
    if (!existing.data || existing.data.tenant_id !== ctx.tenantId) {
      return NextResponse.json({ error: "niet gevonden" }, { status: 404 });
    }
    const perm = await canOnRecord(
      ctx.tenantId,
      ctx.userId,
      "contacten",
      "update",
      existing.data.created_by,
    );
    if (!perm.allowed) {
      return NextResponse.json({ error: perm.reden }, { status: 403 });
    }

    const body = await req.json();
    const allowed = [
      "voornaam","achternaam","email","email_secundair","telefoon","gsm",
      "functie","company_id","aanspreking","taal","adres_straat","adres_nummer",
      "postcode","gemeente","land","linkedin_url","beschrijving","eigenaar_id",
      "is_klant","opted_in_marketing","custom_fields",
    ];
    const patch: Record<string, unknown> = {};
    for (const k of allowed) if (k in body) patch[k] = body[k];

    const { data, error } = await supabase
      .from("contacts")
      .update(patch)
      .eq("id", params.id)
      .eq("tenant_id", ctx.tenantId)
      .select()
      .single();
    if (error) throw error;
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
      .from("contacts")
      .select("created_by, tenant_id")
      .eq("id", params.id)
      .maybeSingle();
    if (!existing.data || existing.data.tenant_id !== ctx.tenantId) {
      return NextResponse.json({ error: "niet gevonden" }, { status: 404 });
    }
    const perm = await canOnRecord(
      ctx.tenantId,
      ctx.userId,
      "contacten",
      "delete",
      existing.data.created_by,
    );
    if (!perm.allowed) {
      return NextResponse.json({ error: perm.reden }, { status: 403 });
    }
    const { error } = await supabase
      .from("contacts")
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
  console.error(err);
  return NextResponse.json(
    { error: err instanceof Error ? err.message : String(err) },
    { status: 500 },
  );
}

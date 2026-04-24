import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const supabase = createAdminSupabaseClient();

  const { data, error } = await supabase
    .from("dossiers")
    .select(
      `*,
       klant:klanten(*),
       extractie:offerte_extracties(*),
       parameters:klant_parameters(*),
       premie:premie_simulaties(*),
       lening:lening_simulaties(*),
       besparing:besparing_simulaties(*),
       pdfs:gegenereerde_pdfs(*)`,
    )
    .eq("id", params.id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  if (data?.verkoper_id !== userId) {
    // check admin
    const { data: u } = await supabase.from("users").select("rol").eq("id", userId).single();
    if (u?.rol !== "admin") {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
  }

  return NextResponse.json(data);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const supabase = createAdminSupabaseClient();

  const body = await req.json();
  const { data, error } = await supabase
    .from("dossiers")
    .update(body)
    .eq("id", params.id)
    .eq("verkoper_id", userId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const supabase = createAdminSupabaseClient();

  const { error } = await supabase
    .from("dossiers")
    .delete()
    .eq("id", params.id)
    .eq("verkoper_id", userId);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await supabase.from("audit_log").insert({
    dossier_id: params.id,
    user_id: userId,
    actie: "dossier_deleted",
  });

  return NextResponse.json({ ok: true });
}

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

export async function PATCH(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const supabase = createAdminSupabaseClient();

  // Enkel admins
  const { data: u } = await supabase.from("users").select("rol").eq("id", userId).single();
  if (u?.rol !== "admin") {
    return NextResponse.json({ error: "admin vereist" }, { status: 403 });
  }

  const body = await req.json();
  const { data, error } = await supabase
    .from("settings")
    .update({ ...body, updated_by: userId })
    .eq("id", 1)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await supabase.from("audit_log").insert({
    user_id: userId,
    actie: "settings_updated",
    metadata: body,
  });

  return NextResponse.json(data);
}

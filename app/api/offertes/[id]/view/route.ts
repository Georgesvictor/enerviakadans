/**
 * Klant-portaal view-tracker.
 *
 * Wordt aangeroepen wanneer een klant de offerte-link opent.
 * Verhoogt view_count + zet last_viewed_at.
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const supabase = createAdminSupabaseClient();
  const url = new URL(req.url);
  const token = url.searchParams.get("token");

  // Verifieer dat de offerte een matching klant_token heeft (publieke route)
  const { data: q } = await supabase
    .from("quotations")
    .select("id, klant_token, view_count")
    .eq("id", params.id)
    .maybeSingle();
  if (!q) return NextResponse.json({ error: "niet gevonden" }, { status: 404 });
  if (token && q.klant_token !== token) {
    return NextResponse.json({ error: "ongeldig token" }, { status: 403 });
  }

  await supabase
    .from("quotations")
    .update({
      view_count: (q.view_count ?? 0) + 1,
      last_viewed_at: new Date().toISOString(),
    })
    .eq("id", params.id);

  // Als status nog "verzonden" was → automatisch naar "bekeken"
  await supabase
    .from("quotations")
    .update({ status: "bekeken" })
    .eq("id", params.id)
    .eq("status", "verzonden");

  return NextResponse.json({ ok: true });
}

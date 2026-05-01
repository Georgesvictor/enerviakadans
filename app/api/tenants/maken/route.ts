/**
 * POST /api/tenants/maken
 *
 * Publiek (binnen auth-muur) endpoint om een workspace aan te maken
 * zonder Clerk Organizations-feature. Handig voor closed beta.
 *
 * Flow:
 *  1. Check auth
 *  2. Maak unieke tenant_id (fallback_user_xxx) + tenant-rij
 *  3. Voeg user toe als owner in tenant_members
 *  4. Seed default pipeline (via trigger/seed in 0005 query)
 */

import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const naam = String(body.naam ?? "").trim();
  if (!naam) {
    return NextResponse.json({ error: "naam verplicht" }, { status: 400 });
  }

  const supabase = createAdminSupabaseClient();

  // Haal user email voor users-tabel
  let email: string | null = null;
  try {
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    email = user.primaryEmailAddress?.emailAddress ?? null;
  } catch {
    // Clerk niet beschikbaar, prima — we hebben user_id
  }

  await supabase
    .from("users")
    .upsert({ id: userId, email, rol: "verkoper" });

  // Unieke tenant_id voor fallback-pad (geen echte Clerk org)
  const tenantId = `fallback_${userId.slice(0, 12)}_${Date.now()}`;
  const slug =
    naam
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 40) || `ws-${Date.now()}`;

  const { error: tErr } = await supabase.from("tenants").insert({
    id: tenantId,
    slug: `${slug}-${Date.now().toString(36)}`,
    naam,
    plan: "beta",
    features: { simulator: false },
  });
  if (tErr) {
    return NextResponse.json({ error: tErr.message }, { status: 500 });
  }

  const { error: mErr } = await supabase.from("tenant_members").insert({
    tenant_id: tenantId,
    user_id: userId,
    rol_code: "owner",
    is_owner: true,
  });
  if (mErr) {
    return NextResponse.json({ error: mErr.message }, { status: 500 });
  }

  // Seed default pipeline + stages (kopie van 0005-seed logic)
  const { data: pipeline } = await supabase
    .from("pipelines")
    .insert({ tenant_id: tenantId, naam: "Verkoop", is_default: true })
    .select("id")
    .single();

  if (pipeline) {
    await supabase.from("pipeline_stages").insert([
      { tenant_id: tenantId, pipeline_id: pipeline.id, naam: "Nieuw", volgorde: 10, waarschijnlijkheid: 10, kleur: "#94A3B8" },
      { tenant_id: tenantId, pipeline_id: pipeline.id, naam: "Gekwalificeerd", volgorde: 20, waarschijnlijkheid: 25, kleur: "#64748B" },
      { tenant_id: tenantId, pipeline_id: pipeline.id, naam: "Offerte", volgorde: 30, waarschijnlijkheid: 50, kleur: "#F59E0B" },
      { tenant_id: tenantId, pipeline_id: pipeline.id, naam: "Onderhandeling", volgorde: 40, waarschijnlijkheid: 75, kleur: "#E87722" },
      { tenant_id: tenantId, pipeline_id: pipeline.id, naam: "Gewonnen", volgorde: 50, waarschijnlijkheid: 100, kleur: "#1F4D3F", is_won: true },
      { tenant_id: tenantId, pipeline_id: pipeline.id, naam: "Verloren", volgorde: 99, waarschijnlijkheid: 0, kleur: "#B91C1C", is_lost: true },
    ] as any);
  }

  return NextResponse.json({ ok: true, tenant_id: tenantId });
}

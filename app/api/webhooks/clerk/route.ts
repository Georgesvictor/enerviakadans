/**
 * Clerk webhook — Kadans multi-tenant.
 *
 * Verwerkt:
 *  - user.created / user.updated / user.deleted: sync naar users-tabel
 *  - organization.created / organization.updated / organization.deleted:
 *    sync naar tenants-tabel
 *  - organizationMembership.created / updated / deleted:
 *    sync naar tenant_members-tabel
 *
 * Config in Clerk Dashboard → Webhooks:
 *   URL: https://kadans.be/api/webhooks/clerk (of staging-domein)
 *   Events: user.*, organization.*, organizationMembership.*
 *   Signing secret → env CLERK_WEBHOOK_SECRET
 *
 * NB: In Kadans is er GEEN domein-restrictie — elke signup is toegelaten,
 * maar pas bruikbaar na het aanmaken van of toetreden tot een organisatie
 * (afgedwongen in onboarding-flow + middleware).
 */

import { headers } from "next/headers";
import { Webhook } from "svix";
import type { WebhookEvent } from "@clerk/nextjs/server";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { upsertTenant, addMember, removeMember } from "@/lib/tenancy/tenants";
import { NextResponse } from "next/server";

// Mapping Clerk-rol → interne rol-code
function mapClerkRole(role: string | undefined | null): string {
  if (!role) return "user";
  const r = role.toLowerCase();
  if (r.includes("owner") || r.includes("admin")) return "admin";
  if (r.includes("manager")) return "manager";
  if (r.includes("guest")) return "guest";
  return "user";
}

export async function POST(req: Request) {
  const secret = process.env.CLERK_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "webhook secret niet geconfigureerd" },
      { status: 500 },
    );
  }

  const h = headers();
  const svixId = h.get("svix-id");
  const svixTs = h.get("svix-timestamp");
  const svixSig = h.get("svix-signature");
  if (!svixId || !svixTs || !svixSig) {
    return new NextResponse("Ontbrekende headers", { status: 400 });
  }

  const body = await req.text();
  const wh = new Webhook(secret);

  let evt: WebhookEvent;
  try {
    evt = wh.verify(body, {
      "svix-id": svixId,
      "svix-timestamp": svixTs,
      "svix-signature": svixSig,
    }) as WebhookEvent;
  } catch {
    return new NextResponse("Ongeldige signature", { status: 400 });
  }

  const supabase = createAdminSupabaseClient();

  try {
    // ---------- USERS ----------
    if (evt.type === "user.created" || evt.type === "user.updated") {
      const email = evt.data.email_addresses?.[0]?.email_address;
      await supabase.from("users").upsert({
        id: evt.data.id,
        email: email ?? null,
        rol: "verkoper", // legacy-kolom, blijft voor backward compat
      });
    }

    if (evt.type === "user.deleted" && evt.data.id) {
      await supabase.from("users").delete().eq("id", evt.data.id);
    }

    // ---------- ORGANIZATIONS = TENANTS ----------
    if (
      evt.type === "organization.created" ||
      evt.type === "organization.updated"
    ) {
      await upsertTenant({
        id: evt.data.id,
        slug: evt.data.slug ?? undefined,
        naam: evt.data.name,
        logo_url: evt.data.image_url ?? null,
      });
    }

    if (evt.type === "organization.deleted" && evt.data.id) {
      // Cascade ruimt tenant_members + business-data op
      await supabase.from("tenants").delete().eq("id", evt.data.id);
    }

    // ---------- ORGANIZATION MEMBERSHIPS ----------
    if (
      evt.type === "organizationMembership.created" ||
      evt.type === "organizationMembership.updated"
    ) {
      const tenantId = evt.data.organization.id;
      const userId = evt.data.public_user_data.user_id;
      const rol = mapClerkRole(evt.data.role);
      const isOwner = rol === "admin" && evt.type === "organizationMembership.created";

      await addMember({
        tenantId,
        userId,
        rolCode: rol as any,
        isOwner,
      });
    }

    if (evt.type === "organizationMembership.deleted") {
      await removeMember(
        evt.data.organization.id,
        evt.data.public_user_data.user_id,
      );
    }

    return NextResponse.json({ ok: true, type: evt.type });
  } catch (err) {
    console.error("Clerk webhook verwerkingsfout:", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}

/**
 * Clerk webhook: maakt/updatet Supabase users-tabel bij nieuwe signups.
 *
 * Config in Clerk Dashboard → Webhooks:
 *   URL: https://simulatie.enervia.be/api/webhooks/clerk
 *   Events: user.created, user.updated, user.deleted
 *   Signing secret → env CLERK_WEBHOOK_SECRET
 *
 * Alleen @enervia.be adressen worden aangemaakt; overige krijgen 403.
 */

import { headers } from "next/headers";
import { Webhook } from "svix";
import type { WebhookEvent } from "@clerk/nextjs/server";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const ALLOWED_DOMAINS = ["enervia.be"];

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
  } catch (err) {
    return new NextResponse("Ongeldige signature", { status: 400 });
  }

  const supabase = createAdminSupabaseClient();

  if (evt.type === "user.created" || evt.type === "user.updated") {
    const email = evt.data.email_addresses?.[0]?.email_address;
    if (!email) return NextResponse.json({ ok: false, reason: "geen email" });

    const domain = email.split("@")[1];
    if (!ALLOWED_DOMAINS.includes(domain)) {
      return NextResponse.json({
        ok: false,
        reason: `Enkel ${ALLOWED_DOMAINS.join(", ")} domein toegelaten`,
      });
    }

    await supabase.from("users").upsert({
      id: evt.data.id,
      email,
      rol: "verkoper",
    });
  }

  if (evt.type === "user.deleted" && evt.data.id) {
    await supabase.from("users").delete().eq("id", evt.data.id);
  }

  return NextResponse.json({ ok: true });
}

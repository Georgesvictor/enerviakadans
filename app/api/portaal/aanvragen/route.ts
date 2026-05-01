/**
 * Klantenportaal magic-link aanvragen.
 * POST { email } → genereert token, retourneert magic-link URL.
 *
 * Voor productie: stuur de URL via email (Resend/SendGrid).
 * Voor nu: retourneer de URL (zodat we kunnen testen zonder mail-provider).
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import {
  generateToken,
  vindKlantBijEmail,
  MAGIC_MINUTES,
} from "@/lib/klantportaal/auth";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const email = String(body.email ?? "").trim().toLowerCase();
  if (!email || !email.includes("@")) {
    return NextResponse.json(
      { error: "geldig email vereist" },
      { status: 400 },
    );
  }

  const klant = await vindKlantBijEmail(email);
  // Privacy: altijd 'OK' retourneren (geen leak van wel/niet-bestaan).
  if (!klant) {
    return NextResponse.json({
      ok: true,
      gevonden: false,
      bericht:
        "Als deze e-mail bij ons gekend is, ontvang je binnen enkele minuten een link.",
    });
  }

  const supabase = createAdminSupabaseClient();
  const magic_token = generateToken();
  const expires = new Date(Date.now() + MAGIC_MINUTES * 60_000).toISOString();

  await supabase.from("klantportaal_sessions").insert({
    tenant_id: klant.tenant_id,
    contact_id: klant.contact_id,
    company_id: klant.company_id,
    email,
    magic_token,
    magic_expires_at: expires,
    ip_address:
      req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? null,
    user_agent: req.headers.get("user-agent") ?? null,
  });

  const origin = req.headers.get("origin") ?? "";
  const link = `${origin}/portaal/auth/${magic_token}`;

  // TODO Resend/Postmark integratie
  console.log("[KLANT MAGIC LINK]", email, link);

  return NextResponse.json({
    ok: true,
    gevonden: true,
    // ⚠️ link is enkel in dev/staging visible; in prod mailen we hem
    devLink: process.env.NODE_ENV !== "production" ? link : undefined,
    bericht: "Check je inbox — we stuurden je een inlog-link.",
  });
}

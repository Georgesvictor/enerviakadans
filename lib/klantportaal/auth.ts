/**
 * Klantenportaal-auth helpers.
 *
 * Magic-link flow:
 *   1. Klant geeft email op /portaal/login
 *   2. POST /api/portaal/aanvragen — genereert magic_token, mailt link
 *   3. Klant klikt link → GET /portaal/auth/[token] → ruilt in voor session_token
 *   4. session_token komt in HTTP-only cookie 'kadans_klant_session'
 *   5. /portaal/* pagina's gebruiken getKlantSession() om actieve user te vinden
 */

import { cookies } from "next/headers";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { randomBytes } from "crypto";

export const PORTAAL_COOKIE = "kadans_klant_session";
export const SESSION_DAYS = 30;
export const MAGIC_MINUTES = 30;

export function generateToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

export interface KlantSession {
  id: string;
  email: string;
  contact_id: string | null;
  company_id: string | null;
  tenant_id: string;
}

export async function getKlantSession(): Promise<KlantSession | null> {
  const c = await cookies();
  const token = c.get(PORTAAL_COOKIE)?.value;
  if (!token) return null;

  const supabase = createAdminSupabaseClient();
  const { data } = await supabase
    .from("klantportaal_sessions")
    .select("id, email, contact_id, company_id, tenant_id, session_expires_at")
    .eq("session_token", token)
    .maybeSingle();

  if (!data) return null;
  if (
    data.session_expires_at &&
    new Date(data.session_expires_at) < new Date()
  ) {
    return null;
  }

  // Laatst-actief bijwerken (best-effort, niet-blokkerend)
  supabase
    .from("klantportaal_sessions")
    .update({ laatst_actief_op: new Date().toISOString() })
    .eq("id", data.id)
    .then(() => {});

  return {
    id: data.id,
    email: data.email,
    contact_id: data.contact_id,
    company_id: data.company_id,
    tenant_id: data.tenant_id,
  };
}

export async function requireKlant(): Promise<KlantSession> {
  const session = await getKlantSession();
  if (!session) {
    throw new Error("KLANT_NOT_AUTHENTICATED");
  }
  return session;
}

/**
 * Vindt of er een contact is met deze email + retourneert linked tenant_id.
 * Werkt enkel als de email al ergens als klant geregistreerd is in CRM.
 */
export async function vindKlantBijEmail(email: string): Promise<{
  tenant_id: string;
  contact_id: string | null;
  company_id: string | null;
} | null> {
  const supabase = createAdminSupabaseClient();
  const lower = email.trim().toLowerCase();

  const { data: contact } = await supabase
    .from("contacts")
    .select("id, tenant_id, company_id")
    .ilike("email", lower)
    .limit(1)
    .maybeSingle();
  if (contact) {
    return {
      tenant_id: contact.tenant_id,
      contact_id: contact.id,
      company_id: contact.company_id,
    };
  }

  // Fallback: company-level email
  const { data: company } = await supabase
    .from("companies")
    .select("id, tenant_id")
    .ilike("email", lower)
    .limit(1)
    .maybeSingle();
  if (company) {
    return {
      tenant_id: company.tenant_id,
      contact_id: null,
      company_id: company.id,
    };
  }
  return null;
}

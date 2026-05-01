/**
 * Tenants CRUD helpers — wrapper rond Supabase admin client.
 *
 * Gebruik voor:
 *  - Ophalen van tenant-details (branding, features, locale)
 *  - Upsert wanneer Clerk een organisation.created/updated webhook stuurt
 *  - Beheer van features-flags (bv. renovatie-simulator aan/uit)
 */

import { createAdminSupabaseClient } from "@/lib/supabase/server";

export interface Tenant {
  id: string;
  slug: string;
  naam: string;
  logo_url: string | null;
  plan: "beta" | "starter" | "business";
  locale: string;
  branding: Record<string, unknown>;
  features: Record<string, boolean>;
  peppol_identifier: string | null;
  btw_nummer: string | null;
  adres: string | null;
  postcode: string | null;
  gemeente: string | null;
  land: string | null;
  email_contact: string | null;
  telefoon: string | null;
  retention_dossiers_dagen: number;
  created_at: string;
  updated_at: string;
}

export async function getTenant(tenantId: string): Promise<Tenant | null> {
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("tenants")
    .select("*")
    .eq("id", tenantId)
    .maybeSingle();
  if (error) throw error;
  return data as Tenant | null;
}

export async function hasFeature(
  tenantId: string,
  feature: string,
): Promise<boolean> {
  const t = await getTenant(tenantId);
  if (!t) return false;
  return Boolean(t.features?.[feature]);
}

export interface UpsertTenantInput {
  id: string;
  slug?: string;
  naam: string;
  logo_url?: string | null;
  locale?: string;
}

/**
 * Upsert tenant — gebruikt door Clerk webhook bij organization.created/updated.
 * Bij create wordt er een default pipeline + settings rij aangemaakt.
 */
export async function upsertTenant(input: UpsertTenantInput): Promise<Tenant> {
  const supabase = createAdminSupabaseClient();

  // Fallback slug indien niet meegegeven
  const slug =
    input.slug ??
    input.naam
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 40);

  const { data, error } = await supabase
    .from("tenants")
    .upsert(
      {
        id: input.id,
        slug,
        naam: input.naam,
        logo_url: input.logo_url ?? null,
        locale: input.locale ?? "nl-BE",
      },
      { onConflict: "id" },
    )
    .select()
    .single();

  if (error) throw error;
  return data as Tenant;
}

export async function addMember(args: {
  tenantId: string;
  userId: string;
  rolCode?: "owner" | "admin" | "manager" | "user" | "guest";
  isOwner?: boolean;
}): Promise<void> {
  const supabase = createAdminSupabaseClient();
  const { error } = await supabase.from("tenant_members").upsert(
    {
      tenant_id: args.tenantId,
      user_id: args.userId,
      rol_code: args.rolCode ?? "user",
      is_owner: args.isOwner ?? false,
    },
    { onConflict: "tenant_id,user_id" },
  );
  if (error) throw error;
}

export async function removeMember(
  tenantId: string,
  userId: string,
): Promise<void> {
  const supabase = createAdminSupabaseClient();
  const { error } = await supabase
    .from("tenant_members")
    .delete()
    .eq("tenant_id", tenantId)
    .eq("user_id", userId);
  if (error) throw error;
}

export async function listMembers(tenantId: string): Promise<
  Array<{
    user_id: string;
    rol_code: string;
    is_owner: boolean;
    toegevoegd_op: string;
    email: string | null;
  }>
> {
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("tenant_members")
    .select("user_id, rol_code, is_owner, toegevoegd_op, users(email)")
    .eq("tenant_id", tenantId);
  if (error) throw error;
  return (data as any[]).map((r) => ({
    user_id: r.user_id,
    rol_code: r.rol_code,
    is_owner: r.is_owner,
    toegevoegd_op: r.toegevoegd_op,
    email: r.users?.email ?? null,
  }));
}

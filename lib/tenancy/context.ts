/**
 * Tenant context helpers.
 *
 * Elke server-component / API-route moet tenant-scoped zijn. Deze module
 * biedt `requireTenant()` + `getTenantContext()` zodat we altijd een
 * geldige (tenant_id, user_id, rol) combinatie hebben.
 *
 * Strategie voor het bepalen van de actieve tenant (in volgorde):
 *   1. Clerk active orgId (als Organizations-feature is geactiveerd)
 *   2. Eerste membership van de user in tenant_members (SaaS-fallback)
 *   3. Auto-join bij default tenant indien user email-domein overeen komt
 *   4. Gooi NO_ACTIVE_ORG error → middleware redirect naar /onboarding
 */

import { auth, clerkClient } from "@clerk/nextjs/server";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

export type RolCode = "owner" | "admin" | "manager" | "user" | "guest";

export interface TenantContext {
  tenantId: string;
  userId: string;
  rolCode: RolCode;
  isOwner: boolean;
}

/**
 * Dev-bypass: als DEV_AUTH_BYPASS=1 in env, alle auth is uit.
 * Iedereen werkt als info@enervia.be admin. Geen cookie/Clerk vereist.
 */
function devBypassActive(): boolean {
  return process.env.DEV_AUTH_BYPASS === "1";
}

function devBypassContext(): TenantContext {
  return {
    tenantId: "org_enervia_default",
    userId: process.env.DEV_AUTH_USER_ID ?? "user_dev_enervia",
    rolCode: "admin",
    isOwner: true,
  };
}

/**
 * Haal tenant-context op voor huidige request.
 */
export async function requireTenant(): Promise<TenantContext> {
  if (devBypassActive()) {
    const ctx = devBypassContext();
    // Zorg dat user + membership bestaan in DB
    const supabase = createAdminSupabaseClient();
    await supabase
      .from("users")
      .upsert({
        id: ctx.userId,
        email: process.env.DEV_AUTH_USER_EMAIL ?? "info@enervia.be",
        rol: "admin",
      });
    await supabase.from("tenant_members").upsert(
      {
        tenant_id: ctx.tenantId,
        user_id: ctx.userId,
        rol_code: ctx.rolCode,
        is_owner: ctx.isOwner,
      },
      { onConflict: "tenant_id,user_id" },
    );
    return ctx;
  }

  const { userId, orgId } = await auth();
  if (!userId) {
    throw new TenancyError("UNAUTHENTICATED", "Niet ingelogd");
  }

  const supabase = createAdminSupabaseClient();

  // 1. Clerk orgId aanwezig → gebruik die
  if (orgId) {
    const { data } = await supabase
      .from("tenant_members")
      .select("tenant_id, user_id, rol_code, is_owner")
      .eq("tenant_id", orgId)
      .eq("user_id", userId)
      .maybeSingle();
    if (data) {
      return {
        tenantId: data.tenant_id,
        userId: data.user_id,
        rolCode: data.rol_code as RolCode,
        isOwner: !!data.is_owner,
      };
    }
    // Membership ontbreekt nog → insert (Clerk webhook heeft het mogelijk gemist)
    await supabase.from("tenant_members").upsert(
      {
        tenant_id: orgId,
        user_id: userId,
        rol_code: "user",
      },
      { onConflict: "tenant_id,user_id" },
    );
    return {
      tenantId: orgId,
      userId,
      rolCode: "user",
      isOwner: false,
    };
  }

  // 2. Geen Clerk orgId → zoek bestaande membership
  const { data: mem } = await supabase
    .from("tenant_members")
    .select("tenant_id, rol_code, is_owner")
    .eq("user_id", userId)
    .order("toegevoegd_op", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (mem) {
    return {
      tenantId: mem.tenant_id,
      userId,
      rolCode: mem.rol_code as RolCode,
      isOwner: !!mem.is_owner,
    };
  }

  // 3. Auto-join Enervia tenant voor @enervia.be users (beta fallback)
  try {
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const email = user.primaryEmailAddress?.emailAddress ?? "";
    if (email.endsWith("@enervia.be")) {
      await supabase.from("users").upsert({
        id: userId,
        email,
        rol: "verkoper",
      });
      await supabase.from("tenant_members").upsert(
        {
          tenant_id: "org_enervia_default",
          user_id: userId,
          rol_code: "admin",
        },
        { onConflict: "tenant_id,user_id" },
      );
      return {
        tenantId: "org_enervia_default",
        userId,
        rolCode: "admin",
        isOwner: false,
      };
    }
  } catch {
    // Clerk-call mislukt → val door naar onboarding
  }

  throw new TenancyError(
    "NO_ACTIVE_ORG",
    "Geen actieve workspace. Kies of maak er een via /onboarding.",
  );
}

export async function getTenantContext(): Promise<TenantContext | null> {
  try {
    return await requireTenant();
  } catch {
    return null;
  }
}

export class TenancyError extends Error {
  constructor(
    public code:
      | "UNAUTHENTICATED"
      | "NO_ACTIVE_ORG"
      | "NOT_A_MEMBER"
      | "DB_ERROR",
    message: string,
  ) {
    super(message);
    this.name = "TenancyError";
  }
}

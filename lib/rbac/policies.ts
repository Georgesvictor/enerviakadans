/**
 * Role-Based Access Control (RBAC) policy-engine.
 *
 * De policy-engine beantwoordt: "Mag user U actie A doen op module M,
 * eventueel op record R?"
 *
 * Rollen hebben vaste regels (geseed in migration 0003). Elke rol krijgt:
 *  - actions per module (view/create/update/delete/export/admin)
 *  - scope: "tenant" (alle records van die tenant) of "own" (enkel eigen
 *    records, gecheckt via owner_id / created_by).
 *
 * Voor de meeste API-routes volstaat `can(tenantId, userId, module, action)`.
 * Voor record-scoped checks: `canOnRecord(...)` die ook `ownerId` accepteert.
 */

import { createAdminSupabaseClient } from "@/lib/supabase/server";

export type Module =
  | "contacten"
  | "companies"
  | "deals"
  | "offertes"
  | "facturen"
  | "producten"
  | "projecten"
  | "uren"
  | "agenda"
  | "taken"
  | "bestanden"
  | "inbox"
  | "rapporten"
  | "renovatie"
  | "instellingen"
  | "workspace"
  | "gebruikers"
  | "integraties";

export type Action = "view" | "create" | "update" | "delete" | "admin";

interface CachedPerms {
  loadedAt: number;
  perms: Array<{
    rol_code: string;
    module: string;
    actie: string;
    scope: "tenant" | "own";
  }>;
}

// In-memory cache (60s TTL) om Supabase-rondtrips te beperken in hete paths.
let cache: CachedPerms | null = null;
const TTL_MS = 60_000;

async function loadAllPermissions(): Promise<CachedPerms["perms"]> {
  const now = Date.now();
  if (cache && now - cache.loadedAt < TTL_MS) return cache.perms;

  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("role_permissions")
    .select("rol_code, module, actie, scope");
  if (error) throw error;
  cache = { loadedAt: now, perms: data as CachedPerms["perms"] };
  return cache.perms;
}

async function getUserRole(
  tenantId: string,
  userId: string,
): Promise<string | null> {
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("tenant_members")
    .select("rol_code")
    .eq("tenant_id", tenantId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data?.rol_code ?? null;
}

export interface CanResult {
  allowed: boolean;
  reden?: string;
  scope?: "tenant" | "own";
}

/**
 * Basis check — mag rol X module M actie A doen binnen de tenant?
 */
export async function can(
  tenantId: string,
  userId: string,
  module: Module,
  action: Action,
): Promise<CanResult> {
  const role = await getUserRole(tenantId, userId);
  if (!role) {
    return { allowed: false, reden: "Geen lid van deze workspace" };
  }
  // Owner & admin mogen alles
  if (role === "owner" || role === "admin") {
    return { allowed: true, scope: "tenant" };
  }
  const perms = await loadAllPermissions();
  const match = perms.find(
    (p) => p.rol_code === role && p.module === module && p.actie === action,
  );
  if (!match) {
    return {
      allowed: false,
      reden: `Rol "${role}" mag actie "${action}" niet uitvoeren op module "${module}"`,
    };
  }
  return { allowed: true, scope: match.scope };
}

/**
 * Record-scoped check — nuttig voor update/delete wanneer de rol "own"
 * scope heeft. We passeren de `ownerId` (typisch `created_by` of `owner_id`)
 * van het record.
 */
export async function canOnRecord(
  tenantId: string,
  userId: string,
  module: Module,
  action: Action,
  ownerId: string | null | undefined,
): Promise<CanResult> {
  const result = await can(tenantId, userId, module, action);
  if (!result.allowed) return result;
  if (result.scope === "own" && ownerId && ownerId !== userId) {
    return {
      allowed: false,
      reden: "Je kan enkel eigen records wijzigen in deze rol",
      scope: "own",
    };
  }
  return result;
}

/**
 * Throws als niet toegelaten — gebruik in API-routes voor 403-response.
 */
export async function requirePermission(
  tenantId: string,
  userId: string,
  module: Module,
  action: Action,
): Promise<void> {
  const r = await can(tenantId, userId, module, action);
  if (!r.allowed) {
    throw new PermissionError(r.reden ?? "Geen toegang");
  }
}

export class PermissionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PermissionError";
  }
}

/**
 * Bulk-check — handig voor UI om menu-items te verbergen.
 * Retourneert { contacten: { view: true, create: false }, ... }
 */
export async function bulkCan(
  tenantId: string,
  userId: string,
  wants: Array<{ module: Module; action: Action }>,
): Promise<Record<string, Record<string, boolean>>> {
  const role = await getUserRole(tenantId, userId);
  const result: Record<string, Record<string, boolean>> = {};
  if (!role) {
    for (const { module, action } of wants) {
      result[module] ??= {};
      result[module][action] = false;
    }
    return result;
  }
  if (role === "owner" || role === "admin") {
    for (const { module, action } of wants) {
      result[module] ??= {};
      result[module][action] = true;
    }
    return result;
  }
  const perms = await loadAllPermissions();
  for (const { module, action } of wants) {
    result[module] ??= {};
    result[module][action] = perms.some(
      (p) => p.rol_code === role && p.module === module && p.actie === action,
    );
  }
  return result;
}

/**
 * Clear cache (voor tests of admin-actions die perms muteren).
 */
export function clearPermissionCache(): void {
  cache = null;
}

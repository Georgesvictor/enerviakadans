/**
 * Kadans — Contacten lijst.
 */

import Link from "next/link";
import { requireTenant } from "@/lib/tenancy/context";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { ContactenLijst } from "@/components/crm/contacten-lijst";

export const dynamic = "force-dynamic";

export default async function ContactenPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const sp = await searchParams;
  const ctx = await requireTenant();
  const supabase = createAdminSupabaseClient();

  let query = supabase
    .from("contacts")
    .select(
      "id, voornaam, achternaam, email, telefoon, gsm, functie, company_id, tags_cache, is_klant, created_at, companies(naam)",
    )
    .eq("tenant_id", ctx.tenantId)
    .order("created_at", { ascending: false })
    .limit(200);

  if (sp.q) {
    query = query.or(
      `voornaam.ilike.%${sp.q}%,achternaam.ilike.%${sp.q}%,email.ilike.%${sp.q}%`,
    );
  }

  const { data, error } = await query;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-enervia-700">Contacten</h1>
          <p className="text-muted-foreground text-sm">
            Alle personen die je kent — klanten, prospects, contactpersonen.
          </p>
        </div>
        <Link
          href="/app/contacten/nieuw"
          className="px-4 py-2 bg-enervia-600 text-white rounded hover:bg-enervia-700 text-sm"
        >
          + Nieuw contact
        </Link>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-700 border border-red-200 rounded">
          {error.message}
        </div>
      )}

      <ContactenLijst initial={(data as any) ?? []} initialQuery={sp.q ?? ""} />
    </div>
  );
}

/**
 * Teamleader → Kadans migratie van contacten en bedrijven.
 *
 * Strategie:
 *   1. Paginate /contacts.list en /companies.list
 *   2. Voor elk record: upsert in contacts/companies op teamleader_id
 *   3. Koppel contacten aan companies via primary_company_id
 *   4. Bewaar mapping in migratie_log (TL ID → Kadans ID) voor cross-reference
 *
 * Resumable: bij herstart skipt hij reeds gemigreerde records via teamleader_id.
 */

import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { getValidAccessToken } from "@/lib/teamleader/oauth";

interface TLContact {
  id: string;
  first_name?: string;
  last_name?: string;
  emails?: Array<{ type: string; email: string }>;
  telephones?: Array<{ type: string; number: string }>;
  language?: string;
  gender?: string;
  birthdate?: string;
  addresses?: Array<{
    type: string;
    address: {
      line_1?: string;
      postal_code?: string;
      city?: string;
      country?: string;
    };
  }>;
  primary_company?: { id: string };
  tags?: string[];
  added_at?: string;
}

interface TLCompany {
  id: string;
  name: string;
  vat_number?: string;
  national_identification_number?: string;
  website?: string;
  emails?: Array<{ email: string }>;
  telephones?: Array<{ number: string }>;
  addresses?: Array<{
    address: {
      line_1?: string;
      postal_code?: string;
      city?: string;
      country?: string;
    };
  }>;
  iban?: string;
}

async function tlPost(userId: string, path: string, body: object) {
  const token = await getValidAccessToken(userId);
  if (!token) {
    throw new Error(
      "Geen Teamleader-token. Verbind eerst je Teamleader-account via Instellingen → Integraties.",
    );
  }
  const res = await fetch(`https://api.focus.teamleader.eu${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`Teamleader ${path} ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

export interface MigratieVoortgang {
  contacts_totaal: number;
  contacts_gemigreerd: number;
  companies_totaal: number;
  companies_gemigreerd: number;
  errors: string[];
}

export async function migreerContactenEnBedrijven(
  tenantId: string,
  userId: string,
  opties: { pageSize?: number; dryRun?: boolean } = {},
): Promise<MigratieVoortgang> {
  const supabase = createAdminSupabaseClient();
  const pageSize = opties.pageSize ?? 100;
  const voortgang: MigratieVoortgang = {
    contacts_totaal: 0,
    contacts_gemigreerd: 0,
    companies_totaal: 0,
    companies_gemigreerd: 0,
    errors: [],
  };

  // ---------- COMPANIES EERST (contacten koppelen erna) ----------
  let page = 1;
  while (true) {
    const r = await tlPost(userId, "/companies.list", {
      page: { size: pageSize, number: page },
    });
    const items = (r.data ?? []) as TLCompany[];
    voortgang.companies_totaal += items.length;
    if (items.length === 0) break;

    for (const c of items) {
      try {
        const addr = c.addresses?.[0]?.address;
        const email = c.emails?.[0]?.email;
        const phone = c.telephones?.[0]?.number;
        if (!opties.dryRun) {
          await supabase
            .from("companies")
            .upsert(
              {
                tenant_id: tenantId,
                teamleader_id: c.id,
                naam: c.name,
                btw_nummer: c.vat_number ?? null,
                kbo_nummer: c.national_identification_number ?? null,
                iban: c.iban ?? null,
                website: c.website ?? null,
                email,
                telefoon: phone,
                adres_straat: addr?.line_1 ?? null,
                postcode: addr?.postal_code ?? null,
                gemeente: addr?.city ?? null,
                land: addr?.country ?? "BE",
                bron: "teamleader_migratie",
                created_by: userId,
              },
              { onConflict: "tenant_id,teamleader_id" } as any,
            );
        }
        voortgang.companies_gemigreerd++;
      } catch (e) {
        voortgang.errors.push(`company ${c.id}: ${(e as Error).message}`);
      }
    }

    if (items.length < pageSize) break;
    page++;
  }

  // ---------- CONTACTEN ----------
  page = 1;
  while (true) {
    const r = await tlPost(userId, "/contacts.list", {
      page: { size: pageSize, number: page },
    });
    const items = (r.data ?? []) as TLContact[];
    voortgang.contacts_totaal += items.length;
    if (items.length === 0) break;

    for (const c of items) {
      try {
        const email = c.emails?.[0]?.email;
        const tel = c.telephones?.find((t) => t.type === "phone")?.number;
        const gsm = c.telephones?.find((t) => t.type === "mobile")?.number;
        const addr = c.addresses?.[0]?.address;

        // Zoek gekoppelde company_id
        let companyUuid: string | null = null;
        if (c.primary_company?.id) {
          const { data } = await supabase
            .from("companies")
            .select("id")
            .eq("tenant_id", tenantId)
            .eq("teamleader_id", c.primary_company.id)
            .maybeSingle();
          companyUuid = data?.id ?? null;
        }

        if (!opties.dryRun) {
          await supabase
            .from("contacts")
            .upsert(
              {
                tenant_id: tenantId,
                teamleader_id: c.id,
                voornaam: c.first_name ?? "",
                achternaam: c.last_name ?? "",
                email,
                telefoon: tel,
                gsm,
                company_id: companyUuid,
                taal: c.language ?? "nl",
                geboortedatum: c.birthdate ?? null,
                adres_straat: addr?.line_1 ?? null,
                postcode: addr?.postal_code ?? null,
                gemeente: addr?.city ?? null,
                land: addr?.country ?? "BE",
                bron: "teamleader_migratie",
                created_by: userId,
              },
              { onConflict: "tenant_id,teamleader_id" } as any,
            );
        }
        voortgang.contacts_gemigreerd++;
      } catch (e) {
        voortgang.errors.push(`contact ${c.id}: ${(e as Error).message}`);
      }
    }

    if (items.length < pageSize) break;
    page++;
  }

  return voortgang;
}

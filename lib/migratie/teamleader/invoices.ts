/**
 * Teamleader → Kadans migratie van offertes (quotations) en facturen (invoices).
 */

import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { getValidAccessToken } from "@/lib/teamleader/oauth";

async function tlPost(userId: string, path: string, body: object) {
  const token = await getValidAccessToken(userId);
  if (!token) throw new Error("Geen Teamleader-token");
  const res = await fetch(`https://api.focus.teamleader.eu${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok)
    throw new Error(`Teamleader ${path} ${res.status}: ${await res.text()}`);
  return res.json();
}

async function zoekCustomer(
  supabase: any,
  tenantId: string,
  customer: { type: string; id: string } | undefined,
): Promise<{ contact_id: string | null; company_id: string | null }> {
  if (!customer) return { contact_id: null, company_id: null };
  const table = customer.type === "company" ? "companies" : "contacts";
  const { data } = await supabase
    .from(table)
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("teamleader_id", customer.id)
    .maybeSingle();
  return {
    contact_id: customer.type === "contact" ? data?.id ?? null : null,
    company_id: customer.type === "company" ? data?.id ?? null : null,
  };
}

export async function migreerQuotations(
  tenantId: string,
  userId: string,
  opties: { pageSize?: number; dryRun?: boolean } = {},
) {
  const supabase = createAdminSupabaseClient();
  const pageSize = opties.pageSize ?? 100;
  let page = 1;
  let totaal = 0;
  let gemigreerd = 0;
  const errors: string[] = [];

  while (true) {
    const r = await tlPost(userId, "/quotations.list", {
      page: { size: pageSize, number: page },
    });
    const items = (r.data ?? []) as any[];
    totaal += items.length;
    if (items.length === 0) break;

    for (const q of items) {
      try {
        const klant = await zoekCustomer(supabase, tenantId, q.invoicee);

        if (!opties.dryRun) {
          await supabase
            .from("quotations")
            .upsert(
              {
                tenant_id: tenantId,
                teamleader_id: q.id,
                nummer: q.quotation_number ?? null,
                onderwerp:
                  q.subject ?? q.reference ?? `Offerte ${q.quotation_number}`,
                status: mapQuotationStatus(q.status),
                datum: q.quotation_date ?? null,
                geldig_tot: q.expiration_date ?? null,
                taal: q.language ?? "nl",
                contact_id: klant.contact_id,
                company_id: klant.company_id,
                subtotaal_excl_btw: q.total?.untaxed?.amount ?? 0,
                totaal_btw:
                  (q.total?.tax?.amount ?? 0),
                totaal_incl_btw: q.total?.taxed?.amount ?? 0,
                eigenaar_id: userId,
                created_by: userId,
              },
              { onConflict: "tenant_id,teamleader_id" } as any,
            );
        }
        gemigreerd++;
      } catch (e) {
        errors.push(`quotation ${q.id}: ${(e as Error).message}`);
      }
    }

    if (items.length < pageSize) break;
    page++;
  }

  return { totaal, gemigreerd, errors };
}

export async function migreerInvoices(
  tenantId: string,
  userId: string,
  opties: { pageSize?: number; dryRun?: boolean } = {},
) {
  const supabase = createAdminSupabaseClient();
  const pageSize = opties.pageSize ?? 100;
  let page = 1;
  let totaal = 0;
  let gemigreerd = 0;
  const errors: string[] = [];

  while (true) {
    const r = await tlPost(userId, "/invoices.list", {
      page: { size: pageSize, number: page },
    });
    const items = (r.data ?? []) as any[];
    totaal += items.length;
    if (items.length === 0) break;

    for (const inv of items) {
      try {
        const klant = await zoekCustomer(supabase, tenantId, inv.invoicee);

        if (!opties.dryRun) {
          await supabase
            .from("invoices")
            .upsert(
              {
                tenant_id: tenantId,
                teamleader_id: inv.id,
                nummer: inv.invoice_number ?? null,
                onderwerp:
                  inv.subject ?? inv.reference ?? `Factuur ${inv.invoice_number}`,
                type: inv.type === "credit_note" ? "creditnota" : "factuur",
                status: mapInvoiceStatus(inv.status),
                datum: inv.invoice_date ?? null,
                vervaldatum: inv.due_on ?? null,
                taal: inv.language ?? "nl",
                contact_id: klant.contact_id,
                company_id: klant.company_id,
                subtotaal_excl_btw: inv.total?.untaxed?.amount ?? 0,
                totaal_btw: inv.total?.tax?.amount ?? 0,
                totaal_incl_btw: inv.total?.taxed?.amount ?? 0,
                reeds_betaald: inv.total?.payable?.amount
                  ? (inv.total.taxed?.amount ?? 0) -
                    (inv.total.payable?.amount ?? 0)
                  : 0,
                gestructureerde_mededeling:
                  inv.payment_reference?.structured ?? null,
                peppol_status: "niet_verzonden",
                eigenaar_id: userId,
                created_by: userId,
              },
              { onConflict: "tenant_id,teamleader_id" } as any,
            );
        }
        gemigreerd++;
      } catch (e) {
        errors.push(`invoice ${inv.id}: ${(e as Error).message}`);
      }
    }

    if (items.length < pageSize) break;
    page++;
  }

  return { totaal, gemigreerd, errors };
}

function mapQuotationStatus(s: string): string {
  const m: Record<string, string> = {
    draft: "draft",
    sent: "verzonden",
    accepted: "geaccepteerd",
    refused: "afgewezen",
    expired: "verlopen",
  };
  return m[s?.toLowerCase()] ?? "draft";
}

function mapInvoiceStatus(s: string): string {
  const m: Record<string, string> = {
    draft: "concept",
    booked: "verzonden",
    outstanding: "verzonden",
    matched: "betaald",
    paid: "betaald",
    overdue: "vervallen",
    cancelled: "geannuleerd",
  };
  return m[s?.toLowerCase()] ?? "concept";
}

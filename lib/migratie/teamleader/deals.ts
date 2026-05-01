/**
 * Teamleader deals migratie.
 *
 * Strategie:
 *  - /deals.list met pagination
 *  - Voor elke deal: zoek bestaande contact/company via teamleader_id
 *  - Upsert in deals op teamleader_id
 *  - Map deal-status (new/qualified/proposal/won/lost) naar Kadans stage
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

interface TLDeal {
  id: string;
  title: string;
  summary?: string;
  reference?: string;
  status: string;
  current_phase?: { id: string; name?: string };
  phase?: { id: string };
  estimated_value?: { amount: number; currency: string };
  estimated_closing_date?: string;
  lead?: { customer: { type: string; id: string } };
  responsible_user?: { id: string };
  created_at?: string;
}

export async function migreerDeals(
  tenantId: string,
  userId: string,
  opties: { pageSize?: number; dryRun?: boolean } = {},
) {
  const supabase = createAdminSupabaseClient();
  const pageSize = opties.pageSize ?? 100;

  // Default pipeline + stages
  const { data: pipeline } = await supabase
    .from("pipelines")
    .select("id, pipeline_stages(id, naam, is_won, is_lost, volgorde)")
    .eq("tenant_id", tenantId)
    .eq("is_default", true)
    .maybeSingle();
  if (!pipeline) throw new Error("Geen default pipeline gevonden");

  const stages = (pipeline.pipeline_stages as any[]).sort(
    (a, b) => a.volgorde - b.volgorde,
  );
  const firstStage = stages[0];
  const wonStage = stages.find((s: any) => s.is_won);
  const lostStage = stages.find((s: any) => s.is_lost);

  let page = 1;
  let totaal = 0;
  let gemigreerd = 0;
  const errors: string[] = [];

  while (true) {
    const r = await tlPost(userId, "/deals.list", {
      page: { size: pageSize, number: page },
    });
    const items = (r.data ?? []) as TLDeal[];
    totaal += items.length;
    if (items.length === 0) break;

    for (const d of items) {
      try {
        // Zoek contact of company
        let contactUuid: string | null = null;
        let companyUuid: string | null = null;
        if (d.lead?.customer) {
          const tlId = d.lead.customer.id;
          const table =
            d.lead.customer.type === "company" ? "companies" : "contacts";
          const { data } = await supabase
            .from(table)
            .select("id")
            .eq("tenant_id", tenantId)
            .eq("teamleader_id", tlId)
            .maybeSingle();
          if (data) {
            if (d.lead.customer.type === "company") companyUuid = data.id;
            else contactUuid = data.id;
          }
        }

        // Bepaal stage
        const statusLower = (d.status ?? "").toLowerCase();
        let stageId = firstStage.id;
        let dealStatus = "open";
        if (statusLower === "won" && wonStage) {
          stageId = wonStage.id;
          dealStatus = "won";
        } else if (statusLower === "lost" && lostStage) {
          stageId = lostStage.id;
          dealStatus = "lost";
        }

        if (!opties.dryRun) {
          await supabase
            .from("deals")
            .upsert(
              {
                tenant_id: tenantId,
                teamleader_id: d.id,
                pipeline_id: pipeline.id,
                stage_id: stageId,
                titel: d.title,
                beschrijving: d.summary ?? null,
                contact_id: contactUuid,
                company_id: companyUuid,
                waarde_excl_btw: d.estimated_value?.amount ?? 0,
                verwacht_afgesloten: d.estimated_closing_date ?? null,
                status: dealStatus,
                bron: "teamleader_migratie",
                created_by: userId,
              },
              { onConflict: "tenant_id,teamleader_id" } as any,
            );
        }
        gemigreerd++;
      } catch (e) {
        errors.push(`deal ${d.id}: ${(e as Error).message}`);
      }
    }

    if (items.length < pageSize) break;
    page++;
  }

  return { totaal, gemigreerd, errors };
}

/**
 * Workflow engine — voert regels uit op basis van triggers.
 *
 * Gebruik:
 *   await runWorkflows({
 *     tenantId,
 *     trigger: "deal_won",
 *     payload: { dealId, dealTitel, eigenaar_id, ... },
 *   });
 *
 * Engine haalt actieve rules met matching trigger op, evalueert filter,
 * voert acties uit. Logt elke run in workflow_runs.
 */

import { createAdminSupabaseClient } from "@/lib/supabase/server";

export type WorkflowTrigger =
  | "deal_created"
  | "deal_stage_change"
  | "deal_won"
  | "deal_lost"
  | "quotation_accepted"
  | "invoice_created"
  | "invoice_paid"
  | "task_completed";

export interface WorkflowPayload {
  // Generic context — de engine gebruikt wat aanwezig is
  dealId?: string;
  dealTitel?: string;
  dealValue?: number;
  pipelineId?: string;
  stageId?: string;
  oldStageId?: string;
  status?: string;
  contactId?: string | null;
  companyId?: string | null;
  eigenaar_id?: string | null;
  invoiceId?: string;
  quotationId?: string;
  taskId?: string;
  triggeredBy?: string | null; // user-id
}

export async function runWorkflows({
  tenantId,
  trigger,
  payload,
}: {
  tenantId: string;
  trigger: WorkflowTrigger;
  payload: WorkflowPayload;
}): Promise<{ executed: number; runs: string[] }> {
  const supabase = createAdminSupabaseClient();
  const start = Date.now();

  const { data: rules } = await supabase
    .from("workflow_rules")
    .select("id, naam, filter_jsonb, acties_jsonb")
    .eq("tenant_id", tenantId)
    .eq("trigger", trigger)
    .eq("is_actief", true);

  if (!rules || rules.length === 0) {
    return { executed: 0, runs: [] };
  }

  const runIds: string[] = [];
  let executed = 0;

  for (const rule of rules as any[]) {
    if (!matchesFilter(rule.filter_jsonb, payload)) continue;

    let resultaat = "success";
    let detail = "";
    let acties_uitgevoerd = 0;

    for (const actie of (rule.acties_jsonb ?? []) as any[]) {
      try {
        await executeActie(actie, tenantId, payload, supabase);
        acties_uitgevoerd++;
      } catch (err) {
        resultaat = acties_uitgevoerd > 0 ? "partial" : "error";
        detail += `${actie.type}: ${err instanceof Error ? err.message : String(err)}\n`;
      }
    }

    const { data: runRow } = await supabase
      .from("workflow_runs")
      .insert({
        tenant_id: tenantId,
        rule_id: rule.id,
        trigger,
        payload_jsonb: payload,
        resultaat,
        resultaat_detail: detail || null,
        acties_uitgevoerd,
        duurtijd_ms: Date.now() - start,
      })
      .select("id")
      .single();

    if (runRow) runIds.push(runRow.id);

    await supabase
      .from("workflow_rules")
      .update({
        uitgevoerd_count: (rule.uitgevoerd_count ?? 0) + 1,
        laatst_uitgevoerd_op: new Date().toISOString(),
      })
      .eq("id", rule.id);

    executed++;
  }

  return { executed, runs: runIds };
}

function matchesFilter(filter: any, payload: WorkflowPayload): boolean {
  if (!filter || Object.keys(filter).length === 0) return true;
  // Eenvoudige property-match
  for (const k of Object.keys(filter)) {
    const verwacht = filter[k];
    const actueel = (payload as any)[k];
    if (Array.isArray(verwacht)) {
      if (!verwacht.includes(actueel)) return false;
    } else if (verwacht !== actueel) {
      return false;
    }
  }
  return true;
}

async function executeActie(
  actie: any,
  tenantId: string,
  payload: WorkflowPayload,
  supabase: any,
) {
  switch (actie.type) {
    case "create_task": {
      const deadline = actie.dagen_offset
        ? new Date(Date.now() + actie.dagen_offset * 86400000)
            .toISOString()
            .slice(0, 10)
        : null;
      const toegewezen =
        actie.toegewezen_aan_eigenaar && payload.eigenaar_id
          ? payload.eigenaar_id
          : actie.toegewezen_aan ?? null;
      await supabase.from("tasks").insert({
        tenant_id: tenantId,
        titel: actie.titel ?? "Nieuwe taak (workflow)",
        beschrijving: actie.beschrijving ?? null,
        deal_id: payload.dealId ?? null,
        contact_id: payload.contactId ?? null,
        company_id: payload.companyId ?? null,
        toegewezen_aan: toegewezen,
        deadline,
        prioriteit: actie.prioriteit ?? "normaal",
        status: "open",
        created_by: payload.triggeredBy ?? null,
      });
      return;
    }
    case "create_project": {
      if (!payload.dealId) throw new Error("dealId vereist");
      const naam = (actie.naam_template ?? "#DEAL_TITLE").replace(
        "#DEAL_TITLE",
        payload.dealTitel ?? "Project",
      );
      const { data: proj } = await supabase
        .from("projects")
        .insert({
          tenant_id: tenantId,
          naam,
          deal_id: payload.dealId,
          contact_id: payload.contactId ?? null,
          company_id: payload.companyId ?? null,
          eigenaar_id: payload.eigenaar_id ?? null,
          status: "actief",
          created_by: payload.triggeredBy ?? null,
        })
        .select()
        .single();
      // Optioneel: kopieer offerte-lijnen naar project_lines
      if (actie.kopieer_offerte_lijnen && proj?.id) {
        const { data: q } = await supabase
          .from("quotations")
          .select("id, quotation_lines(*)")
          .eq("deal_id", payload.dealId)
          .eq("tenant_id", tenantId)
          .order("created_at", { ascending: false })
          .limit(1);
        const lines = q?.[0]?.quotation_lines ?? [];
        if (lines.length > 0) {
          await supabase.from("project_lines").insert(
            lines.map((l: any, i: number) => ({
              tenant_id: tenantId,
              project_id: proj.id,
              quotation_line_id: l.id,
              omschrijving: l.omschrijving,
              beschrijving: l.beschrijving ?? null,
              aantal: l.aantal,
              eenheid: l.eenheid ?? "stuk",
              prijs_excl_btw: l.prijs_excl_btw,
              btw_tarief: l.btw_tarief,
              status: "to_do",
              volgorde: l.volgorde ?? i,
              is_kop: !!l.is_kop,
              facturatie_methode: l.facturatie_methode ?? "stukprijs",
            })),
          );
        }
      }
      return;
    }
    case "add_note": {
      if (!payload.dealId) throw new Error("dealId vereist voor add_note");
      await supabase.from("deal_notes").insert({
        tenant_id: tenantId,
        deal_id: payload.dealId,
        inhoud: actie.tekst ?? "(workflow notitie)",
        is_systeem: actie.is_systeem ?? true,
        auteur_id: payload.triggeredBy ?? null,
      });
      return;
    }
    case "set_status": {
      if (!payload.dealId) throw new Error("dealId vereist");
      await supabase
        .from("deals")
        .update({ status: actie.status ?? "open" })
        .eq("id", payload.dealId)
        .eq("tenant_id", tenantId);
      return;
    }
    default:
      throw new Error(`Onbekend actie-type: ${actie.type}`);
  }
}

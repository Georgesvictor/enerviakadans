/**
 * Deal detail — Teamleader-style met:
 *  - Status-knoppen (Open / Verloren / Gewonnen)
 *  - Horizontale fase-timeline met datums per fase
 *  - Detail- en opmerkingen-panels
 *  - Sub-tabs: Offertes / Projecten / Facturen / Bestelbonnen / Orderbevestigingen / Leveringsbonnen / Bestanden
 */

import Link from "next/link";
import { notFound } from "next/navigation";
import { requireTenant } from "@/lib/tenancy/context";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { DealHeader } from "@/components/crm/deal-header";
import { DealTimeline } from "@/components/crm/deal-timeline";
import { DealSubtabs } from "@/components/crm/deal-subtabs";
import { DealNotes } from "@/components/crm/deal-notes";
import { DealActies } from "@/components/crm/deal-acties";
import { DealRollup } from "@/components/crm/deal-rollup";
import { getDealActivity } from "@/lib/deals/activity-feed";

export const dynamic = "force-dynamic";

export default async function DealDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const ctx = await requireTenant();
  const supabase = createAdminSupabaseClient();

  const [
    dealRes,
    stagesRes,
    historyRes,
    notesRes,
    quotationsRes,
    invoicesRes,
    purchaseOrdersRes,
    orderConfirmsRes,
    deliveryNotesRes,
    projectsRes,
    filesRes,
  ] = await Promise.all([
    supabase
      .from("deals")
      .select(
        "*, contacts(id,voornaam,achternaam,email,telefoon,gsm), companies(id,naam), pipelines(id,naam), pipeline_stages(naam,kleur,categorie,is_won,is_lost,waarschijnlijkheid)",
      )
      .eq("id", id)
      .eq("tenant_id", ctx.tenantId)
      .maybeSingle(),
    supabase
      .from("pipeline_stages")
      .select("*")
      .eq("tenant_id", ctx.tenantId),
    supabase
      .from("deal_stage_history")
      .select("naar_stage_id, gewijzigd_op")
      .eq("deal_id", id)
      .eq("tenant_id", ctx.tenantId)
      .order("gewijzigd_op", { ascending: true }),
    supabase
      .from("deal_notes")
      .select("id, inhoud, auteur_id, is_systeem, created_at, users(email)")
      .eq("deal_id", id)
      .eq("tenant_id", ctx.tenantId)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("quotations")
      .select("id, nummer, onderwerp, status, datum, totaal_incl_btw, marge_excl_btw")
      .eq("deal_id", id)
      .eq("tenant_id", ctx.tenantId),
    supabase
      .from("invoices")
      .select("id, nummer, onderwerp, status, datum, totaal_incl_btw, reeds_betaald, peppol_status")
      .eq("deal_id", id)
      .eq("tenant_id", ctx.tenantId),
    supabase
      .from("purchase_orders")
      .select("id, nummer, onderwerp, status, datum, totaal_incl_btw, leverancier_id, companies:leverancier_id(naam)")
      .eq("deal_id", id)
      .eq("tenant_id", ctx.tenantId),
    supabase
      .from("order_confirmations")
      .select("id, nummer, onderwerp, status, datum, totaal_incl_btw")
      .eq("deal_id", id)
      .eq("tenant_id", ctx.tenantId),
    supabase
      .from("delivery_notes")
      .select("id, nummer, onderwerp, status, datum, geleverd_op")
      .eq("deal_id", id)
      .eq("tenant_id", ctx.tenantId),
    supabase
      .from("projects")
      .select("id, naam, code, status")
      .eq("deal_id", id)
      .eq("tenant_id", ctx.tenantId),
    supabase
      .from("file_links")
      .select("file_id, files(id, naam, mime, grootte, gemaakt_op, geupload_door)")
      .eq("entity_type", "deal")
      .eq("entity_id", id)
      .eq("tenant_id", ctx.tenantId),
  ]);

  const deal = dealRes.data;
  if (!deal) notFound();

  const stages = ((stagesRes.data as any[]) ?? [])
    .filter((s) => s.pipeline_id === deal.pipeline_id)
    .sort((a, b) => a.volgorde - b.volgorde);

  // Map history naar stage_id → datum (eerste keer dat fase werd bereikt)
  const stageDates = new Map<string, string>();
  for (const h of (historyRes.data ?? []) as any[]) {
    if (!stageDates.has(h.naar_stage_id)) {
      stageDates.set(h.naar_stage_id, h.gewijzigd_op);
    }
  }
  // Huidige fase ook tonen met laatste-gewijzigd-op of created_at
  if (!stageDates.has(deal.stage_id)) {
    stageDates.set(deal.stage_id, deal.created_at);
  }

  const huidigeStageVolgorde = stages.find((s) => s.id === deal.stage_id)?.volgorde ?? 0;

  const tab = sp.tab ?? "activiteit";
  const activity = await getDealActivity(ctx.tenantId, deal.id);

  return (
    <div className="space-y-6">
      <DealHeader
        dealId={deal.id}
        titel={deal.titel}
        status={deal.status}
        huidigeStageNaam={(deal as any).pipeline_stages?.naam ?? "?"}
        huidigeStageKleur={(deal as any).pipeline_stages?.kleur ?? "#94A3B8"}
      />

      <DealTimeline
        stages={stages.map((s: any) => ({
          id: s.id,
          naam: s.naam,
          volgorde: s.volgorde,
          kleur: s.kleur,
          categorie: s.categorie,
          is_lost: s.is_lost,
        }))}
        huidigeStageVolgorde={huidigeStageVolgorde}
        huidigeStageId={deal.stage_id}
        stageDates={Object.fromEntries(stageDates)}
        dealId={deal.id}
      />

      <DealActies dealId={deal.id} />

      <DealRollup
        dealWaarde={Number(deal.waarde_excl_btw ?? 0)}
        dealMarge={Number(deal.marge_excl_btw ?? 0)}
        quotations={(quotationsRes.data ?? []) as any[]}
        invoices={(invoicesRes.data ?? []) as any[]}
        purchaseOrders={(purchaseOrdersRes.data ?? []) as any[]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border p-5">
          <h2 className="font-semibold text-enervia-700 mb-3">Details</h2>
          <dl className="space-y-2 text-sm">
            <Row label="Bedrag">
              <span className="font-mono">
                € {Number(deal.waarde_excl_btw).toLocaleString("nl-BE", { minimumFractionDigits: 2 })}
              </span>
            </Row>
            <Row label="Marge">
              <span className="font-mono">
                € {Number(deal.marge_excl_btw ?? 0).toLocaleString("nl-BE", { minimumFractionDigits: 2 })}
              </span>
            </Row>
            <Row label="Slaagkans">
              {deal.slaagkans ?? (deal as any).pipeline_stages?.waarschijnlijkheid ?? 0} %
            </Row>
            <Row label="Pipeline">{(deal as any).pipelines?.naam ?? "—"}</Row>
            <Row label="Verantwoordelijke">{deal.eigenaar_id ?? "—"}</Row>
            {deal.lead_categorie && <Row label="Categorie">{deal.lead_categorie}</Row>}
            {deal.lead_bron && <Row label="Bron">{deal.lead_bron}</Row>}
            {deal.verwacht_afgesloten && (
              <Row label="Beslissingsdatum">
                {new Date(deal.verwacht_afgesloten).toLocaleDateString("nl-BE")}
              </Row>
            )}
          </dl>
          {(deal as any).contacts && (
            <>
              <div className="mt-4 pt-4 border-t">
                <div className="text-xs uppercase text-muted-foreground mb-2">Klant</div>
                <Link
                  href={`/app/contacten/${(deal as any).contacts.id}`}
                  className="block text-enervia-700 hover:underline font-medium"
                >
                  {(deal as any).contacts.voornaam} {(deal as any).contacts.achternaam}
                </Link>
                {(deal as any).contacts.email && (
                  <a
                    href={`mailto:${(deal as any).contacts.email}`}
                    className="block text-sm text-blue-600 hover:underline"
                  >
                    {(deal as any).contacts.email}
                  </a>
                )}
                {((deal as any).contacts.telefoon || (deal as any).contacts.gsm) && (
                  <a
                    href={`tel:${(deal as any).contacts.telefoon ?? (deal as any).contacts.gsm}`}
                    className="block text-sm text-blue-600 hover:underline"
                  >
                    {(deal as any).contacts.telefoon ?? (deal as any).contacts.gsm}
                  </a>
                )}
              </div>
            </>
          )}
          {(deal as any).companies && (
            <div className="mt-4 pt-4 border-t">
              <div className="text-xs uppercase text-muted-foreground mb-2">Bedrijf</div>
              <Link
                href={`/app/bedrijven/${(deal as any).companies.id}`}
                className="block text-enervia-700 hover:underline font-medium"
              >
                {(deal as any).companies.naam}
              </Link>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg border p-5 lg:col-span-2">
          <h2 className="font-semibold text-enervia-700 mb-3">Opmerkingen & activiteit</h2>
          <DealNotes
            dealId={deal.id}
            initial={(notesRes.data as any[]) ?? []}
          />
        </div>
      </div>

      <DealSubtabs
        dealId={deal.id}
        activeTab={tab}
        quotations={quotationsRes.data ?? []}
        invoices={invoicesRes.data ?? []}
        purchaseOrders={purchaseOrdersRes.data ?? []}
        orderConfirmations={orderConfirmsRes.data ?? []}
        deliveryNotes={deliveryNotesRes.data ?? []}
        projects={projectsRes.data ?? []}
        files={(filesRes.data ?? []).map((l: any) => l.files).filter(Boolean)}
        activity={activity}
      />
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between items-baseline">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

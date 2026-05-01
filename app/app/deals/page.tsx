import Link from "next/link";
import { requireTenant } from "@/lib/tenancy/context";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { DealsKanban } from "@/components/crm/deals-kanban";
import { DealsStatsCards } from "@/components/crm/deals-stats-cards";
import { DealsFilters } from "@/components/crm/deals-filters";

export const dynamic = "force-dynamic";

export default async function DealsPage({
  searchParams,
}: {
  searchParams: Promise<{
    pipeline?: string;
    status?: string;
    eigenaar?: string;
    bron?: string;
    categorie?: string;
    q?: string;
  }>;
}) {
  const ctx = await requireTenant();
  const supabase = createAdminSupabaseClient();
  const sp = await searchParams;

  const [pipelinesRes, ownersRes, brons, categorieen] = await Promise.all([
    supabase
      .from("pipelines")
      .select("id, naam, is_default")
      .eq("tenant_id", ctx.tenantId)
      .eq("gearchiveerd", false)
      .order("volgorde"),
    supabase
      .from("tenant_members")
      .select("user_id, users(email)")
      .eq("tenant_id", ctx.tenantId),
    supabase
      .from("deals")
      .select("lead_bron")
      .eq("tenant_id", ctx.tenantId)
      .not("lead_bron", "is", null),
    supabase
      .from("deals")
      .select("lead_categorie")
      .eq("tenant_id", ctx.tenantId)
      .not("lead_categorie", "is", null),
  ]);

  const pipelines = pipelinesRes.data ?? [];
  const activePipeline =
    pipelines.find((p) => p.id === sp.pipeline) ??
    pipelines.find((p) => p.is_default) ??
    pipelines[0];

  if (!activePipeline) {
    return (
      <div className="text-center py-12 bg-white rounded-lg border">
        <div className="text-muted-foreground">
          Nog geen pipeline aangemaakt.
        </div>
      </div>
    );
  }

  const [stagesRes, dealsRes, statsRes] = await Promise.all([
    supabase
      .from("pipeline_stages")
      .select("id, naam, kleur, volgorde, is_won, is_lost, waarschijnlijkheid, categorie, rotting_dagen")
      .eq("pipeline_id", activePipeline.id)
      .order("volgorde"),
    supabase
      .from("deals")
      .select(
        "id, titel, waarde_excl_btw, marge_excl_btw, stage_id, status, eigenaar_id, lead_bron, lead_categorie, verwacht_afgesloten, laatste_activiteit, created_at, contacts(voornaam,achternaam), companies(naam)",
      )
      .eq("tenant_id", ctx.tenantId)
      .eq("pipeline_id", activePipeline.id)
      .eq("status", sp.status ?? "open"),
    supabase
      .from("deals")
      .select("id, waarde_excl_btw, laatste_activiteit, verwacht_afgesloten, created_at")
      .eq("tenant_id", ctx.tenantId)
      .eq("status", "open"),
  ]);

  // Filter client-side voor vrij-tekst en eigenaar/bron/categorie
  let deals = (dealsRes.data ?? []) as any[];
  if (sp.q) {
    const q = sp.q.toLowerCase();
    deals = deals.filter(
      (d) =>
        d.titel?.toLowerCase().includes(q) ||
        d.contacts?.voornaam?.toLowerCase().includes(q) ||
        d.contacts?.achternaam?.toLowerCase().includes(q) ||
        d.companies?.naam?.toLowerCase().includes(q),
    );
  }
  if (sp.eigenaar) deals = deals.filter((d) => d.eigenaar_id === sp.eigenaar);
  if (sp.bron) deals = deals.filter((d) => d.lead_bron === sp.bron);
  if (sp.categorie)
    deals = deals.filter((d) => d.lead_categorie === sp.categorie);

  // Stats berekenen
  const allOpen = (statsRes.data ?? []) as any[];
  const nu = Date.now();
  const drieMaanden = 90 * 24 * 3600 * 1000;
  const dertigDagen = 30 * 24 * 3600 * 1000;
  const totaalWaarde = allOpen.reduce(
    (s, d) => s + Number(d.waarde_excl_btw ?? 0),
    0,
  );
  const zonderActiviteit = allOpen.filter(
    (d) =>
      !d.laatste_activiteit ||
      nu - new Date(d.laatste_activiteit).getTime() > dertigDagen,
  ).length;
  const ouderDan3Maanden = allOpen.filter(
    (d) => nu - new Date(d.created_at).getTime() > drieMaanden,
  ).length;
  const zonderBeslissingsdatum = allOpen.filter(
    (d) => !d.verwacht_afgesloten,
  ).length;

  const owners = ((ownersRes.data as any[]) ?? []).map((m) => ({
    id: m.user_id,
    email: m.users?.email ?? m.user_id,
  }));
  const uniekeBrons = Array.from(
    new Set((brons.data ?? []).map((d: any) => d.lead_bron).filter(Boolean)),
  );
  const uniekeCategorieen = Array.from(
    new Set(
      (categorieen.data ?? []).map((d: any) => d.lead_categorie).filter(Boolean),
    ),
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-enervia-700">Deals</h1>
          <p className="text-muted-foreground text-sm">
            {allOpen.length.toLocaleString("nl-BE")} open deals · €{" "}
            {totaalWaarde.toLocaleString("nl-BE", { maximumFractionDigits: 0 })}
          </p>
        </div>
        <Link
          href={`/app/deals/nieuw?pipeline=${activePipeline.id}`}
          className="px-4 py-2 bg-enervia-600 text-white rounded hover:bg-enervia-700 text-sm"
        >
          + Nieuwe deal
        </Link>
      </div>

      <DealsFilters
        pipelines={pipelines}
        activePipelineId={activePipeline.id}
        owners={owners}
        bronnen={uniekeBrons as string[]}
        categorieen={uniekeCategorieen as string[]}
      />

      <DealsStatsCards
        zonderActiviteit={zonderActiviteit}
        ouderDan3Maanden={ouderDan3Maanden}
        zonderBeslissingsdatum={zonderBeslissingsdatum}
      />

      <DealsKanban
        stages={(stagesRes.data ?? []) as any[]}
        deals={deals}
      />
    </div>
  );
}

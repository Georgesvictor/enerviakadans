import { requireTenant } from "@/lib/tenancy/context";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { BarChart3, TrendingUp, Users, Receipt, Euro } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function RapportenPage() {
  const ctx = await requireTenant();
  const supabase = createAdminSupabaseClient();

  const [
    dealsTotaal,
    dealsGewonnen,
    dealsOpen,
    omzetJaar,
    openstaand,
    nieuwsContacten,
  ] = await Promise.all([
    supabase
      .from("deals")
      .select("waarde_excl_btw, status, afgesloten_op")
      .eq("tenant_id", ctx.tenantId),
    supabase
      .from("deals")
      .select("waarde_excl_btw")
      .eq("tenant_id", ctx.tenantId)
      .eq("status", "won"),
    supabase
      .from("deals")
      .select("waarde_excl_btw")
      .eq("tenant_id", ctx.tenantId)
      .eq("status", "open"),
    supabase
      .from("invoices")
      .select("totaal_incl_btw, datum, status")
      .eq("tenant_id", ctx.tenantId)
      .gte("datum", `${new Date().getFullYear()}-01-01`),
    supabase
      .from("invoices")
      .select("totaal_incl_btw, reeds_betaald, vervaldatum, status")
      .eq("tenant_id", ctx.tenantId)
      .in("status", ["verzonden", "deels_betaald", "vervallen"]),
    supabase
      .from("contacts")
      .select("id, created_at")
      .eq("tenant_id", ctx.tenantId)
      .gte(
        "created_at",
        new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString(),
      ),
  ]);

  const totaalDeals = dealsTotaal.data?.length ?? 0;
  const gewonnenWaarde = (dealsGewonnen.data ?? []).reduce(
    (s: number, d: any) => s + Number(d.waarde_excl_btw ?? 0),
    0,
  );
  const openWaarde = (dealsOpen.data ?? []).reduce(
    (s: number, d: any) => s + Number(d.waarde_excl_btw ?? 0),
    0,
  );
  const conversie =
    totaalDeals > 0
      ? ((dealsGewonnen.data?.length ?? 0) / totaalDeals) * 100
      : 0;

  const omzetYTD = (omzetJaar.data ?? [])
    .filter((i: any) => i.status === "betaald")
    .reduce((s: number, i: any) => s + Number(i.totaal_incl_btw ?? 0), 0);

  const openstaandTotaal = (openstaand.data ?? []).reduce(
    (s: number, i: any) =>
      s + (Number(i.totaal_incl_btw ?? 0) - Number(i.reeds_betaald ?? 0)),
    0,
  );
  const vervallenTotaal = (openstaand.data ?? [])
    .filter(
      (i: any) => i.vervaldatum && new Date(i.vervaldatum) < new Date(),
    )
    .reduce(
      (s: number, i: any) =>
        s + (Number(i.totaal_incl_btw ?? 0) - Number(i.reeds_betaald ?? 0)),
      0,
    );

  const f = (n: number) =>
    `€ ${n.toLocaleString("nl-BE", { maximumFractionDigits: 0 })}`;

  const kaarten = [
    {
      titel: "Omzet dit jaar",
      waarde: f(omzetYTD),
      sub: "betaalde facturen",
      icon: <Euro size={20} />,
    },
    {
      titel: "Open deals",
      waarde: f(openWaarde),
      sub: `${dealsOpen.data?.length ?? 0} deals`,
      icon: <TrendingUp size={20} />,
    },
    {
      titel: "Gewonnen deals",
      waarde: f(gewonnenWaarde),
      sub: `${dealsGewonnen.data?.length ?? 0} deals`,
      icon: <BarChart3 size={20} />,
    },
    {
      titel: "Conversie",
      waarde: `${conversie.toFixed(1)} %`,
      sub: `${totaalDeals} deals totaal`,
      icon: <BarChart3 size={20} />,
    },
    {
      titel: "Openstaand",
      waarde: f(openstaandTotaal),
      sub: "facturen",
      icon: <Receipt size={20} />,
      accent: "oranje",
    },
    {
      titel: "Vervallen",
      waarde: f(vervallenTotaal),
      sub: "te laat",
      icon: <Receipt size={20} />,
      accent: "rood",
    },
    {
      titel: "Nieuwe contacten (30d)",
      waarde: String(nieuwsContacten.data?.length ?? 0),
      sub: "pipeline vulling",
      icon: <Users size={20} />,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-enervia-700">Rapporten</h1>
        <p className="text-muted-foreground text-sm">
          KPI's van je business in één oogopslag.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kaarten.map((k, i) => (
          <div key={i} className="bg-white rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">
                {k.titel}
              </div>
              <div className="text-muted-foreground">{k.icon}</div>
            </div>
            <div
              className={`text-2xl font-bold mt-2 ${
                k.accent === "oranje"
                  ? "text-accent-400"
                  : k.accent === "rood"
                    ? "text-red-600"
                    : "text-enervia-700"
              }`}
            >
              {k.waarde}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">{k.sub}</div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-lg border p-6 text-center text-muted-foreground">
        Grafieken en saved views volgen in de volgende iteratie.
      </div>
    </div>
  );
}

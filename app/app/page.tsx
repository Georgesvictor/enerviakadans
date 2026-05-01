/**
 * Kadans dashboard home — overzicht van de werkdag.
 */

import Link from "next/link";
import { requireTenant } from "@/lib/tenancy/context";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Users, TrendingUp, FileText, Receipt } from "lucide-react";
import { VandaagWidget } from "@/components/crm/vandaag-widget";

export const dynamic = "force-dynamic";

export default async function DashboardHome() {
  const ctx = await requireTenant();
  const supabase = createAdminSupabaseClient();

  const [contactsRes, dealsRes, offerteRes, factuurRes] = await Promise.all([
    supabase
      .from("contacts")
      .select("*", { count: "exact", head: true })
      .eq("tenant_id", ctx.tenantId),
    supabase
      .from("deals")
      .select("id, waarde_excl_btw, status", { count: "exact" })
      .eq("tenant_id", ctx.tenantId)
      .eq("status", "open"),
    supabase
      .from("dossiers")
      .select("*", { count: "exact", head: true })
      .eq("tenant_id", ctx.tenantId),
    supabase
      .from("gegenereerde_pdfs")
      .select("*", { count: "exact", head: true })
      .eq("tenant_id", ctx.tenantId),
  ]);

  const openDealWaarde = (dealsRes.data ?? []).reduce(
    (s: number, d: any) => s + (d.waarde_excl_btw ?? 0),
    0,
  );

  const cards = [
    {
      href: "/app/contacten",
      titel: "Contacten",
      waarde: (contactsRes.count ?? 0).toLocaleString("nl-BE"),
      icon: <Users size={20} />,
    },
    {
      href: "/app/deals",
      titel: "Open deals",
      waarde: `${dealsRes.count ?? 0} · € ${openDealWaarde.toLocaleString("nl-BE", { maximumFractionDigits: 0 })}`,
      icon: <TrendingUp size={20} />,
    },
    {
      href: "/app/renovatie",
      titel: "Renovatie-dossiers",
      waarde: (offerteRes.count ?? 0).toLocaleString("nl-BE"),
      icon: <FileText size={20} />,
    },
    {
      href: "/app/facturen",
      titel: "Documenten",
      waarde: (factuurRes.count ?? 0).toLocaleString("nl-BE"),
      icon: <Receipt size={20} />,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-enervia-700">Dashboard</h1>
        <p className="text-muted-foreground">
          Welkom terug — hier is wat er vandaag speelt.
        </p>
      </div>

      <VandaagWidget tenantId={ctx.tenantId} userId={ctx.userId} />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <Link key={c.href} href={c.href}>
            <Card className="hover:border-enervia-600 hover:shadow transition cursor-pointer">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                  {c.titel}
                  <span className="text-enervia-600">{c.icon}</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-enervia-700">
                  {c.waarde}
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Snelle acties</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Link
            href="/app/contacten/nieuw"
            className="px-4 py-2 bg-enervia-600 text-white rounded hover:bg-enervia-700 text-sm"
          >
            + Nieuw contact
          </Link>
          <Link
            href="/app/deals/nieuw"
            className="px-4 py-2 bg-white border text-enervia-700 rounded hover:bg-muted text-sm"
          >
            + Nieuwe deal
          </Link>
          <Link
            href="/app/offertes/nieuw"
            className="px-4 py-2 bg-white border text-enervia-700 rounded hover:bg-muted text-sm"
          >
            + Nieuwe offerte
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}

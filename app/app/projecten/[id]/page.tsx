/**
 * Project detail Teamleader-style:
 * Tabs: Werkoverzicht (taken in groepen) / Kanban / Projectinfo / Facturen
 */

import Link from "next/link";
import { notFound } from "next/navigation";
import { requireTenant } from "@/lib/tenancy/context";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { ProjectHeader } from "@/components/crm/project-header";
import { ProjectWerkoverzicht } from "@/components/crm/project-werkoverzicht";
import { ProjectKanban } from "@/components/crm/project-kanban";
import { ProjectInfo } from "@/components/crm/project-info";
import { ProjectFacturen } from "@/components/crm/project-facturen";

export const dynamic = "force-dynamic";

export default async function ProjectDetail({
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

  const [pRes, linesRes, invoicesRes, membersRes] = await Promise.all([
    supabase
      .from("projects")
      .select(
        "*, contacts(id,voornaam,achternaam), companies(id,naam), deals(id,titel)",
      )
      .eq("id", id)
      .eq("tenant_id", ctx.tenantId)
      .maybeSingle(),
    supabase
      .from("project_lines")
      .select("*, users:toegewezen_aan(email)")
      .eq("project_id", id)
      .eq("tenant_id", ctx.tenantId)
      .order("volgorde"),
    supabase
      .from("invoices")
      .select(
        "id, nummer, onderwerp, status, datum, factuur_type, totaal_incl_btw, reeds_betaald",
      )
      .eq("project_id", id)
      .eq("tenant_id", ctx.tenantId)
      .order("created_at", { ascending: false }),
    supabase
      .from("tenant_members")
      .select("user_id, users(email)")
      .eq("tenant_id", ctx.tenantId),
  ]);

  const p = pRes.data;
  if (!p) notFound();

  const tab = sp.tab ?? "werkoverzicht";
  const lines = (linesRes.data as any[]) ?? [];
  const invoices = (invoicesRes.data as any[]) ?? [];
  const members = ((membersRes.data as any[]) ?? []).map((m) => ({
    id: m.user_id,
    email: m.users?.email ?? m.user_id,
  }));

  // Berekenen
  const totaalPrijs = lines.reduce(
    (s, l) => (l.is_kop ? s : s + Number(l.aantal) * Number(l.prijs_excl_btw)),
    0,
  );
  const gefactureerd = invoices.reduce(
    (s, i) => s + Number(i.totaal_incl_btw ?? 0),
    0,
  );
  const aantalTaken = lines.filter((l) => !l.is_kop).length;
  const aantalKlaar = lines.filter((l) => !l.is_kop && l.status === "klaar")
    .length;

  return (
    <div className="space-y-6">
      <ProjectHeader
        project={p}
        totaalPrijs={totaalPrijs}
        budget={Number(p.budget_excl_btw ?? 0)}
        gefactureerd={gefactureerd}
      />

      {/* Tabs */}
      <div className="border-b flex gap-1">
        {[
          { code: "werkoverzicht", label: `Werkoverzicht ${aantalTaken}` },
          { code: "kanban", label: "Kanban" },
          { code: "projectinfo", label: "Projectinfo" },
          { code: "facturen", label: `Facturen ${invoices.length}` },
        ].map((t) => (
          <Link
            key={t.code}
            href={`?tab=${t.code}`}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
              tab === t.code
                ? "border-enervia-600 text-enervia-700"
                : "border-transparent text-muted-foreground hover:text-enervia-700"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {tab === "werkoverzicht" && (
        <ProjectWerkoverzicht
          projectId={id}
          lines={lines}
          members={members}
        />
      )}
      {tab === "kanban" && <ProjectKanban projectId={id} lines={lines} />}
      {tab === "projectinfo" && <ProjectInfo project={p} />}
      {tab === "facturen" && (
        <ProjectFacturen
          projectId={id}
          invoices={invoices}
          lines={lines}
          totaalPrijs={totaalPrijs}
          gefactureerd={gefactureerd}
        />
      )}
    </div>
  );
}

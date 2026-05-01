/**
 * Offerte detail-pagina — Teamleader-style.
 *
 * - 3-kolommen-grid metadata
 * - Tabs DETAIL / PREVIEW / FOLLOW-UP
 * - Hoofd-acties: "Omzetten naar factuur" + "Offerte verzenden"
 */

import Link from "next/link";
import { notFound } from "next/navigation";
import { requireTenant } from "@/lib/tenancy/context";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { DocumentActies } from "@/components/crm/document-acties";
import { OfferteDetailTabs } from "@/components/crm/offerte-detail-tabs";
import { Pencil, MoreVertical } from "lucide-react";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  concept: "Niet verzonden",
  verzonden: "Verzonden",
  bekeken: "Bekeken",
  aanvaard: "Aanvaard",
  geweigerd: "Geweigerd",
  vervallen: "Vervallen",
};

const STATUS_COLOR: Record<string, string> = {
  concept: "bg-slate-100 text-slate-700",
  verzonden: "bg-blue-100 text-blue-700",
  bekeken: "bg-amber-100 text-amber-700",
  aanvaard: "bg-emerald-100 text-emerald-700",
  geweigerd: "bg-red-100 text-red-700",
  vervallen: "bg-slate-100 text-slate-600",
};

export default async function OfferteDetailPage({
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
  const { data } = await supabase
    .from("quotations")
    .select(
      "*, contacts(id,voornaam,achternaam,email), companies(id,naam), deals(id,titel,status,pipelines(naam),pipeline_stages(naam)), business_entities(naam), users:eigenaar_id(email), quotation_lines(*)",
    )
    .eq("id", id)
    .eq("tenant_id", ctx.tenantId)
    .maybeSingle();
  if (!data) notFound();

  const regels = ((data.quotation_lines as any[]) ?? []).sort(
    (a, b) => a.volgorde - b.volgorde,
  );
  const status = data.status ?? "concept";
  const tab = sp.tab ?? "detail";

  // Aankoop-cost + marge
  let totalKost = 0;
  for (const r of regels) {
    if (!r.is_kop) totalKost += Number(r.aankoop_prijs_excl_btw ?? 0) * Number(r.aantal ?? 0);
  }
  const marge = Number(data.subtotaal_excl_btw ?? 0) - totalKost;
  const margePct =
    Number(data.subtotaal_excl_btw ?? 0) > 0
      ? (marge / Number(data.subtotaal_excl_btw)) * 100
      : 0;

  const f = (n: number) =>
    `€ ${Number(n).toLocaleString("nl-BE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  const dt = (s?: string | null) =>
    s ? new Date(s).toLocaleDateString("nl-BE") : "—";

  // CloudSign-style activity badge
  const cloudSignActivity =
    data.view_count > 0
      ? `Bekeken (${data.view_count}×)`
      : "Nog niet bekeken";

  const klantNaam =
    data.companies?.naam ??
    (data.contacts
      ? `${data.contacts.voornaam} ${data.contacts.achternaam}`.trim()
      : "—");

  return (
    <div className="max-w-6xl space-y-4">
      {/* HEADER */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link
            href="/app/offertes"
            className="text-xs text-muted-foreground hover:underline"
          >
            ← Offertes
          </Link>
          <div className="flex items-center gap-3 mt-1">
            <h1 className="text-3xl font-bold text-enervia-700">
              {data.nummer ?? "Offerte"}
            </h1>
            <Badge className={STATUS_COLOR[status] ?? STATUS_COLOR.concept}>
              {STATUS_LABEL[status] ?? status}
            </Badge>
          </div>
          {data.onderwerp && (
            <p className="text-sm text-muted-foreground mt-1">
              {data.onderwerp}
            </p>
          )}
        </div>
        <div className="flex gap-1.5">
          <Link
            href={`/app/offertes/${id}/bewerken`}
            className="p-2 hover:bg-muted rounded border"
            title="Bewerken"
          >
            <Pencil size={14} />
          </Link>
          <button className="p-2 hover:bg-muted rounded border" title="Meer">
            <MoreVertical size={14} />
          </button>
        </div>
      </div>

      {/* 3-KOLOMMEN METADATA GRID */}
      <div className="bg-white rounded-lg border p-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-3 text-sm">
          {/* Kolom 1 */}
          <Row label="Klant">
            {klantNaam !== "—" && data.contacts?.id ? (
              <Link
                href={`/app/contacten/${data.contacts.id}`}
                className="text-blue-600 hover:underline"
              >
                {klantNaam}
              </Link>
            ) : (
              klantNaam
            )}
          </Row>
          <Row label="Geldig tot en met">{dt(data.geldig_tot)}</Row>
          <Row label="Dealstatus">
            <span className="capitalize">
              {data.deals?.status ?? "—"}
            </span>
          </Row>
          <Row label="Contact">
            {data.contacts
              ? `${data.contacts.voornaam} ${data.contacts.achternaam}`
              : "—"}
          </Row>
          <Row label="Gelinkte factuur">
            {data.invoice_id ? (
              <Link
                href={`/app/facturen/${data.invoice_id}`}
                className="text-blue-600 hover:underline"
              >
                Factuur openen
              </Link>
            ) : (
              "—"
            )}
          </Row>
          <Row label="Pipeline">
            {(data.deals as any)?.pipelines?.naam ?? "—"}
          </Row>
          <Row label="Bedrijfsentiteit">
            {(data.business_entities as any)?.naam ?? "—"}
          </Row>
          <Row label="Gefactureerd">{data.invoice_id ? "Ja" : "Nee"}</Row>
          <Row label="Munteenheid">EUR — Euro</Row>
          <Row label="Medewerker">
            {(data.users as any)?.email ?? "—"}
          </Row>
          <Row label="Gelinkte projecten">{data.project_id ? "Ja" : "—"}</Row>
          <Row label="Wisselkoers">1.0000</Row>
          <Row label="CloudSign-activiteit">
            <span
              className={
                data.view_count > 0 ? "text-blue-600 hover:underline cursor-pointer" : ""
              }
            >
              {cloudSignActivity}
            </span>
          </Row>
          <Row label="Dealtitel">
            {data.deals ? (
              <Link
                href={`/app/deals/${data.deals.id}`}
                className="text-blue-600 hover:underline"
              >
                {data.deals.titel}
              </Link>
            ) : (
              "—"
            )}
          </Row>
          <Row label="Totaal exclusief btw">
            <span className="font-mono">
              {f(Number(data.subtotaal_excl_btw ?? 0))}
            </span>
          </Row>
          <Row label="Datum aangemaakt">{dt(data.datum)}</Row>
          <Row label="Dealnummer">
            {(data.deals as any)?.id ? `#${(data.deals as any).id.slice(-4)}` : "—"}
          </Row>
          <Row label="Totaal inclusief btw">
            <span className="font-mono font-semibold">
              {f(Number(data.totaal_incl_btw ?? 0))}
            </span>
          </Row>
          <Row label="Datum aanvaard">{dt(data.aanvaard_op)}</Row>
          <Row label="Dealfase">
            {(data.deals as any)?.pipeline_stages?.naam ?? "—"}
          </Row>
          <Row label="Marge">
            {marge >= 0 ? (
              <span className="text-emerald-700 font-mono">
                + {f(marge)} ({margePct.toFixed(1)}%)
              </span>
            ) : (
              <span className="text-red-700 font-mono">
                {f(marge)} ({margePct.toFixed(1)}%)
              </span>
            )}
          </Row>
        </div>
      </div>

      {/* TABS + ACTIES */}
      <OfferteDetailTabs
        id={id}
        nummer={data.nummer ?? null}
        activeTab={tab}
        regels={regels}
        opmerkingen={data.opmerkingen}
        voorwaarden={data.voorwaarden}
        bijlagen={data.bijlagen_jsonb ?? []}
        totalen={{
          subtotaal: Number(data.subtotaal_excl_btw ?? 0),
          btw: Number(data.totaal_btw ?? 0),
          totaal: Number(data.totaal_incl_btw ?? 0),
        }}
        status={status}
      />
    </div>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex justify-between items-baseline gap-2">
      <dt className="text-xs text-muted-foreground shrink-0">{label}</dt>
      <dd className="text-right truncate">{children}</dd>
    </div>
  );
}

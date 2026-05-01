"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Activity, FileText, Receipt, Briefcase, Package, ClipboardCheck, Truck, FolderOpen } from "lucide-react";
import { DealFiles } from "./deal-files";
import { DealActivity } from "./deal-activity";
import type { ActivityEvent } from "@/lib/deals/activity-feed";

const TABS = [
  { code: "activiteit", titel: "Activiteit", icon: Activity },
  { code: "offertes", titel: "Offertes", icon: FileText },
  { code: "facturen", titel: "Facturen", icon: Receipt },
  { code: "projecten", titel: "Projecten", icon: Briefcase },
  { code: "bestelbonnen", titel: "Bestelbonnen", icon: Package },
  { code: "orderbevest", titel: "Orderbevestigingen", icon: ClipboardCheck },
  { code: "leveringsbonnen", titel: "Leveringsbonnen", icon: Truck },
  { code: "bestanden", titel: "Bestanden", icon: FolderOpen },
];

export function DealSubtabs({
  dealId,
  activeTab,
  quotations,
  invoices,
  purchaseOrders,
  orderConfirmations,
  deliveryNotes,
  projects,
  files,
  activity = [],
}: {
  dealId: string;
  activeTab: string;
  quotations: any[];
  invoices: any[];
  purchaseOrders: any[];
  orderConfirmations: any[];
  deliveryNotes: any[];
  projects: any[];
  files: any[];
  activity?: ActivityEvent[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function setTab(code: string) {
    const p = new URLSearchParams(searchParams.toString());
    p.set("tab", code);
    router.replace(`?${p.toString()}`, { scroll: false });
  }

  const f = (n: number) =>
    `€ ${Number(n ?? 0).toLocaleString("nl-BE", { minimumFractionDigits: 2 })}`;

  return (
    <div className="bg-white rounded-lg border">
      <div className="flex overflow-x-auto border-b">
        {TABS.map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.code;
          const count =
            t.code === "activiteit" ? activity.length :
            t.code === "offertes" ? quotations.length :
            t.code === "facturen" ? invoices.length :
            t.code === "projecten" ? projects.length :
            t.code === "bestelbonnen" ? purchaseOrders.length :
            t.code === "orderbevest" ? orderConfirmations.length :
            t.code === "leveringsbonnen" ? deliveryNotes.length :
            t.code === "bestanden" ? files.length : 0;
          return (
            <button
              key={t.code}
              onClick={() => setTab(t.code)}
              className={`px-4 py-3 text-sm font-medium border-b-2 -mb-px flex items-center gap-2 whitespace-nowrap ${
                isActive
                  ? "border-enervia-600 text-enervia-700"
                  : "border-transparent text-muted-foreground hover:text-enervia-700"
              }`}
            >
              <Icon size={14} />
              {t.titel}
              {count > 0 && (
                <Badge variant="outline" className="text-xs h-5 px-1.5">
                  {count}
                </Badge>
              )}
            </button>
          );
        })}
      </div>

      <div className="p-5">
        {activeTab === "activiteit" && <DealActivity events={activity} />}
        {activeTab === "offertes" && (
          <Tabel
            items={quotations}
            kolommen={[
              { label: "Nr", get: (q) => q.nummer ?? "—" },
              { label: "Onderwerp", get: (q) => <Link href={`/app/offertes/${q.id}`} className="text-enervia-700 hover:underline">{q.onderwerp}</Link> },
              { label: "Datum", get: (q) => new Date(q.datum).toLocaleDateString("nl-BE") },
              { label: "Bedrag", get: (q) => f(q.totaal_incl_btw), align: "right" },
              { label: "Marge", get: (q) => <span className="text-emerald-600">{f(q.marge_excl_btw ?? 0)}</span>, align: "right" },
              { label: "Status", get: (q) => <Badge>{q.status}</Badge> },
            ]}
            empty={<>Geen offertes. <Link href={`/app/offertes/nieuw?deal_id=${dealId}`} className="text-enervia-600 hover:underline">+ Maak offerte</Link></>}
            actie={<Link href={`/app/offertes/nieuw?deal_id=${dealId}`} className="text-sm text-enervia-600 hover:underline">+ Nieuwe offerte</Link>}
          />
        )}
        {activeTab === "facturen" && (
          <Tabel
            items={invoices}
            kolommen={[
              { label: "Nr", get: (i) => i.nummer ?? "—" },
              { label: "Onderwerp", get: (i) => <Link href={`/app/facturen/${i.id}`} className="text-enervia-700 hover:underline">{i.onderwerp}</Link> },
              { label: "Datum", get: (i) => new Date(i.datum).toLocaleDateString("nl-BE") },
              { label: "Totaal", get: (i) => f(i.totaal_incl_btw), align: "right" },
              { label: "Betaald", get: (i) => f(i.reeds_betaald ?? 0), align: "right" },
              { label: "Status", get: (i) => <Badge>{i.status}</Badge> },
            ]}
            empty={<>Geen facturen. <Link href={`/app/facturen/nieuw?deal_id=${dealId}`} className="text-enervia-600 hover:underline">+ Maak factuur</Link></>}
            actie={<Link href={`/app/facturen/nieuw?deal_id=${dealId}`} className="text-sm text-enervia-600 hover:underline">+ Nieuwe factuur</Link>}
          />
        )}
        {activeTab === "projecten" && (
          <Tabel
            items={projects}
            kolommen={[
              { label: "Code", get: (p) => p.code ?? "—" },
              { label: "Naam", get: (p) => <Link href={`/app/projecten/${p.id}`} className="text-enervia-700 hover:underline">{p.naam}</Link> },
              { label: "Status", get: (p) => <Badge>{p.status}</Badge> },
            ]}
            empty="Geen projecten gekoppeld."
          />
        )}
        {activeTab === "bestelbonnen" && (
          <Tabel
            items={purchaseOrders}
            kolommen={[
              { label: "Nr", get: (p) => p.nummer ?? "—" },
              { label: "Onderwerp", get: (p) => p.onderwerp },
              { label: "Leverancier", get: (p) => p.companies?.naam ?? "—" },
              { label: "Datum", get: (p) => new Date(p.datum).toLocaleDateString("nl-BE") },
              { label: "Bedrag", get: (p) => f(p.totaal_incl_btw), align: "right" },
              { label: "Status", get: (p) => <Badge>{p.status}</Badge> },
            ]}
            empty="Geen bestelbonnen."
            actie={<Link href={`/app/bestelbonnen/nieuw?deal_id=${dealId}`} className="text-sm text-enervia-600 hover:underline">+ Nieuwe bestelbon</Link>}
          />
        )}
        {activeTab === "orderbevest" && (
          <Tabel
            items={orderConfirmations}
            kolommen={[
              { label: "Nr", get: (o) => o.nummer ?? "—" },
              { label: "Onderwerp", get: (o) => o.onderwerp },
              { label: "Datum", get: (o) => new Date(o.datum).toLocaleDateString("nl-BE") },
              { label: "Bedrag", get: (o) => f(o.totaal_incl_btw), align: "right" },
              { label: "Status", get: (o) => <Badge>{o.status}</Badge> },
            ]}
            empty="Geen orderbevestigingen."
          />
        )}
        {activeTab === "leveringsbonnen" && (
          <Tabel
            items={deliveryNotes}
            kolommen={[
              { label: "Nr", get: (d) => d.nummer ?? "—" },
              { label: "Onderwerp", get: (d) => d.onderwerp },
              { label: "Datum", get: (d) => new Date(d.datum).toLocaleDateString("nl-BE") },
              { label: "Geleverd", get: (d) => d.geleverd_op ? new Date(d.geleverd_op).toLocaleDateString("nl-BE") : "—" },
              { label: "Status", get: (d) => <Badge>{d.status}</Badge> },
            ]}
            empty="Geen leveringsbonnen."
          />
        )}
        {activeTab === "bestanden" && (
          <DealFiles dealId={dealId} initial={files} />
        )}
      </div>
    </div>
  );
}

function Tabel({
  items,
  kolommen,
  empty,
  actie,
}: {
  items: any[];
  kolommen: { label: string; get: (item: any) => any; align?: "left" | "right" }[];
  empty: React.ReactNode;
  actie?: React.ReactNode;
}) {
  if (!items || items.length === 0) {
    return (
      <div>
        <div className="text-center py-6 text-sm text-muted-foreground">{empty}</div>
      </div>
    );
  }
  return (
    <div>
      {actie && <div className="mb-3 flex justify-end">{actie}</div>}
      <table className="w-full text-sm">
        <thead className="text-xs uppercase text-muted-foreground border-b">
          <tr>
            {kolommen.map((k) => (
              <th
                key={k.label}
                className={`px-3 py-2 ${k.align === "right" ? "text-right" : "text-left"}`}
              >
                {k.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y">
          {items.map((it, i) => (
            <tr key={it.id ?? i} className="hover:bg-muted/30">
              {kolommen.map((k) => (
                <td
                  key={k.label}
                  className={`px-3 py-2 ${k.align === "right" ? "text-right font-mono" : ""}`}
                >
                  {k.get(it)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

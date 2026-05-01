/**
 * Deal-rollup: berekent automatisch op basis van gekoppelde documenten:
 *  - Totaal gefactureerd (alle facturen)
 *  - Reeds betaald
 *  - Openstaand
 *  - Marge (uit offertes/facturen)
 *  - Inkoop (uit bestelbonnen)
 */

import { Euro, Receipt, Package, TrendingUp } from "lucide-react";

export function DealRollup({
  dealWaarde,
  dealMarge,
  quotations,
  invoices,
  purchaseOrders,
}: {
  dealWaarde: number;
  dealMarge: number;
  quotations: any[];
  invoices: any[];
  purchaseOrders: any[];
}) {
  const totaalOfferte = quotations.reduce(
    (s, q) => s + Number(q.totaal_incl_btw ?? 0),
    0,
  );
  const margeOfferte = quotations.reduce(
    (s, q) => s + Number(q.marge_excl_btw ?? 0),
    0,
  );
  const totaalGefactureerd = invoices.reduce(
    (s, i) => s + Number(i.totaal_incl_btw ?? 0),
    0,
  );
  const reedsBetaald = invoices.reduce(
    (s, i) => s + Number(i.reeds_betaald ?? 0),
    0,
  );
  const openstaand = totaalGefactureerd - reedsBetaald;
  const totaalInkoop = purchaseOrders.reduce(
    (s, p) => s + Number(p.totaal_incl_btw ?? 0),
    0,
  );

  const f = (n: number) =>
    `€ ${n.toLocaleString("nl-BE", { maximumFractionDigits: 0 })}`;

  const cards = [
    {
      titel: "Deal-waarde",
      waarde: f(dealWaarde),
      sub: `Marge: ${f(dealMarge)}`,
      icon: <Euro size={16} />,
      kleur: "text-enervia-700",
    },
    {
      titel: "In offertes",
      waarde: f(totaalOfferte),
      sub: `${quotations.length} doc · ${f(margeOfferte)} marge`,
      icon: <TrendingUp size={16} />,
      kleur: "text-blue-700",
    },
    {
      titel: "Gefactureerd",
      waarde: f(totaalGefactureerd),
      sub: `${invoices.length} factu${invoices.length === 1 ? "ur" : "ren"} · ${f(reedsBetaald)} betaald`,
      icon: <Receipt size={16} />,
      kleur: "text-emerald-700",
    },
    {
      titel: "Openstaand",
      waarde: f(openstaand),
      sub: openstaand > 0 ? "te ontvangen" : "alles betaald",
      icon: <Receipt size={16} />,
      kleur: openstaand > 0 ? "text-accent-400" : "text-muted-foreground",
    },
    {
      titel: "Inkoop (bestelbonnen)",
      waarde: f(totaalInkoop),
      sub: `${purchaseOrders.length} bestelbon${purchaseOrders.length === 1 ? "" : "nen"}`,
      icon: <Package size={16} />,
      kleur: "text-purple-700",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      {cards.map((c) => (
        <div
          key={c.titel}
          className="bg-white rounded-lg border p-3"
        >
          <div className="flex items-center justify-between text-xs uppercase text-muted-foreground">
            <span>{c.titel}</span>
            <span className={c.kleur}>{c.icon}</span>
          </div>
          <div className={`text-xl font-bold mt-1 font-mono ${c.kleur}`}>
            {c.waarde}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">{c.sub}</div>
        </div>
      ))}
    </div>
  );
}

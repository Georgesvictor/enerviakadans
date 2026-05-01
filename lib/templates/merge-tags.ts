/**
 * Merge-tags voor templates.
 *
 * Beschikbare tags die in de body van offerte/factuur/email-templates
 * gebruikt kunnen worden. Bij PDF-rendering / preview worden ze vervangen
 * door de werkelijke waarden.
 */

export interface MergeTag {
  tag: string;
  beschrijving: string;
  voorbeeld: string;
}

export const MERGE_TAGS: MergeTag[] = [
  { tag: "#TODAY", beschrijving: "Datum vandaag", voorbeeld: "01/05/2026" },
  { tag: "#OFFER_NR", beschrijving: "Offertenummer", voorbeeld: "OFF-2026-0001" },
  {
    tag: "#INVOICE_NR",
    beschrijving: "Factuurnummer",
    voorbeeld: "FAC-2026-0001",
  },
  {
    tag: "#DEAL_TITLE",
    beschrijving: "Titel van de deal",
    voorbeeld: "Totaalrenovatie Tarwestraat 60",
  },
  {
    tag: "#DEAL_VALUE",
    beschrijving: "Bedrag van de deal",
    voorbeeld: "€ 73.839,07",
  },
  {
    tag: "#PRICE_EXCL",
    beschrijving: "Prijs excl. btw",
    voorbeeld: "€ 69.659,50",
  },
  {
    tag: "#PRICE_INCL",
    beschrijving: "Prijs incl. btw",
    voorbeeld: "€ 73.839,07",
  },
  {
    tag: "#VALID_UNTIL_DATE",
    beschrijving: "Geldigheidsdatum offerte",
    voorbeeld: "31/05/2026",
  },
  {
    tag: "#DUE_DATE",
    beschrijving: "Vervaldatum factuur",
    voorbeeld: "31/05/2026",
  },
  {
    tag: "#CUSTOMER_NAME",
    beschrijving: "Naam van klant",
    voorbeeld: "Nathalie Waumans",
  },
  {
    tag: "#CUSTOMER_ADDRESS",
    beschrijving: "Adres van klant",
    voorbeeld: "Piersstraat 19, 2550 Kontich",
  },
  {
    tag: "#CUSTOMER_VAT",
    beschrijving: "BTW-nummer klant",
    voorbeeld: "BE0123456789",
  },
  {
    tag: "#SALE_CONTACT_PERSON",
    beschrijving: "Contactpersoon verkoop",
    voorbeeld: "Giljom Arts",
  },
  { tag: "#MY_NAME", beschrijving: "Naam ingelogde gebruiker", voorbeeld: "Giljom Arts" },
  { tag: "#MY_EMAIL", beschrijving: "E-mail gebruiker", voorbeeld: "info@enervia.be" },
  {
    tag: "#DEPARTMENT_NAME",
    beschrijving: "Naam afdeling/team",
    voorbeeld: "Verkoop",
  },
  {
    tag: "#COMPANY_NAME",
    beschrijving: "Naam bedrijfsentiteit",
    voorbeeld: "Enervia BV",
  },
  {
    tag: "#COMPANY_VAT",
    beschrijving: "BTW-nummer entiteit",
    voorbeeld: "BE1030660236",
  },
  {
    tag: "#COMPANY_IBAN",
    beschrijving: "IBAN entiteit",
    voorbeeld: "BE39 7380 5179 7719",
  },
  {
    tag: "#COMPANY_BIC",
    beschrijving: "BIC/SWIFT",
    voorbeeld: "KREDBEBB",
  },
  {
    tag: "#STRUCTURED_REF",
    beschrijving: "Gestructureerde mededeling",
    voorbeeld: "+++123/4567/89012+++",
  },
];

export interface MergeContext {
  offer_nr?: string | null;
  invoice_nr?: string | null;
  deal_title?: string | null;
  deal_value?: number | null;
  price_excl?: number | null;
  price_incl?: number | null;
  valid_until?: string | null;
  due_date?: string | null;
  customer_name?: string | null;
  customer_address?: string | null;
  customer_vat?: string | null;
  sale_contact_person?: string | null;
  my_name?: string | null;
  my_email?: string | null;
  department_name?: string | null;
  company_name?: string | null;
  company_vat?: string | null;
  company_iban?: string | null;
  company_bic?: string | null;
  structured_ref?: string | null;
  today?: string;
}

const CURRENCY_NL = (n: number) =>
  `€ ${n.toLocaleString("nl-BE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const DATE_NL = (s: string | null | undefined) => {
  if (!s) return "—";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleDateString("nl-BE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

export function renderMergeTags(
  text: string | null | undefined,
  ctx: MergeContext,
): string {
  if (!text) return "";
  const today = ctx.today ?? new Date().toISOString();
  const replacements: Record<string, string> = {
    "#TODAY": DATE_NL(today),
    "#OFFER_NR": ctx.offer_nr ?? "—",
    "#INVOICE_NR": ctx.invoice_nr ?? "—",
    "#DEAL_TITLE": ctx.deal_title ?? "—",
    "#DEAL_VALUE":
      ctx.deal_value != null ? CURRENCY_NL(ctx.deal_value) : "—",
    "#PRICE_EXCL":
      ctx.price_excl != null ? CURRENCY_NL(ctx.price_excl) : "—",
    "#PRICE_INCL":
      ctx.price_incl != null ? CURRENCY_NL(ctx.price_incl) : "—",
    "#VALID_UNTIL_DATE": DATE_NL(ctx.valid_until),
    "#DUE_DATE": DATE_NL(ctx.due_date),
    "#CUSTOMER_NAME": ctx.customer_name ?? "—",
    "#CUSTOMER_ADDRESS": ctx.customer_address ?? "—",
    "#CUSTOMER_VAT": ctx.customer_vat ?? "—",
    "#SALE_CONTACT_PERSON": ctx.sale_contact_person ?? "—",
    "#MY_NAME": ctx.my_name ?? "—",
    "#MY_EMAIL": ctx.my_email ?? "—",
    "#DEPARTMENT_NAME": ctx.department_name ?? "—",
    "#COMPANY_NAME": ctx.company_name ?? "—",
    "#COMPANY_VAT": ctx.company_vat ?? "—",
    "#COMPANY_IBAN": ctx.company_iban ?? "—",
    "#COMPANY_BIC": ctx.company_bic ?? "—",
    "#STRUCTURED_REF": ctx.structured_ref ?? "—",
  };
  let out = text;
  // Sorted by length desc to avoid #DEAL matching before #DEAL_VALUE etc.
  const tags = Object.keys(replacements).sort((a, b) => b.length - a.length);
  for (const t of tags) {
    out = out.split(t).join(replacements[t]);
  }
  return out;
}

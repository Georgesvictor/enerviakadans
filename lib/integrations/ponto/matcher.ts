/**
 * Banking transaction → invoice matcher.
 *
 * Strategie (in volgorde van vertrouwen):
 *  1. Match op gestructureerde mededeling (OGM/VCS) — vertrouwen 100
 *  2. Exacte bedrag-match + tegenpartij name-match (fuzzy) — vertrouwen 80
 *  3. Exacte bedrag-match zonder mededeling — vertrouwen 60 (geen auto-koppel)
 *
 * Bij auto-match: insert in transaction_matches + update invoice.reeds_betaald.
 * Bij volledig betaald: invoice.status = 'betaald'.
 */

import { createAdminSupabaseClient } from "@/lib/supabase/server";

export interface MatchResultaat {
  transactie_id: string;
  invoice_id: string | null;
  bedrag: number;
  match_type: string;
  vertrouwen: number;
  reden?: string;
}

const norm = (s: string | null | undefined) =>
  (s ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");

export async function matchTransactions(
  tenantId: string,
  transactie_ids?: string[],
): Promise<MatchResultaat[]> {
  const supabase = createAdminSupabaseClient();

  // Fetch ongematchte credit-transacties (inkomend geld)
  let q = supabase
    .from("banking_transactions")
    .select("*")
    .eq("tenant_id", tenantId)
    .gt("bedrag", 0)
    .order("datum", { ascending: false });
  if (transactie_ids) q = q.in("id", transactie_ids);
  const { data: trans } = await q;
  if (!trans || trans.length === 0) return [];

  // Fetch openstaande facturen
  const { data: invs } = await supabase
    .from("invoices")
    .select("id, totaal_incl_btw, reeds_betaald, gestructureerde_mededeling, companies(naam), contacts(voornaam,achternaam)")
    .eq("tenant_id", tenantId)
    .in("status", ["verzonden", "deels_betaald", "vervallen"]);

  const resultaten: MatchResultaat[] = [];

  for (const t of trans as any[]) {
    // Skip als deze transactie al gematcht is
    const { data: bestaande } = await supabase
      .from("transaction_matches")
      .select("id")
      .eq("transaction_id", t.id)
      .maybeSingle();
    if (bestaande) continue;

    let match: { invoice: any; type: string; vertrouwen: number } | null = null;

    // 1. Gestructureerde mededeling
    if (t.gestructureerde_mededeling) {
      const gm = norm(t.gestructureerde_mededeling);
      const inv = (invs ?? []).find(
        (i: any) => norm(i.gestructureerde_mededeling) === gm,
      );
      if (inv) match = { invoice: inv, type: "auto_mededeling", vertrouwen: 100 };
    }

    // 2. Ongestructureerde mededeling: zoek invoice nummer of naam
    if (!match && t.mededeling) {
      const med = t.mededeling as string;
      const invByMed = (invs ?? []).find((i: any) => {
        const openstaand =
          Number(i.totaal_incl_btw) - Number(i.reeds_betaald ?? 0);
        const bedragMatch =
          Math.abs(openstaand - Number(t.bedrag)) < 0.01;
        if (!bedragMatch) return false;
        const tegenNaam = norm(t.tegenpartij_naam);
        const klantNaam = norm(
          i.companies?.naam ??
            `${i.contacts?.voornaam ?? ""}${i.contacts?.achternaam ?? ""}`,
        );
        const naamMatch =
          tegenNaam && klantNaam && tegenNaam.includes(klantNaam);
        const medBevatNummer = med
          .toLowerCase()
          .includes(`${i.id.slice(0, 8)}`);
        return naamMatch || medBevatNummer;
      });
      if (invByMed)
        match = { invoice: invByMed, type: "auto_bedrag_datum", vertrouwen: 80 };
    }

    if (match) {
      const bedrag = Math.min(
        Number(t.bedrag),
        Number(match.invoice.totaal_incl_btw) -
          Number(match.invoice.reeds_betaald ?? 0),
      );
      await supabase.from("transaction_matches").insert({
        tenant_id: tenantId,
        transaction_id: t.id,
        invoice_id: match.invoice.id,
        bedrag_gematcht: bedrag,
        match_type: match.type,
        vertrouwen: match.vertrouwen,
      });
      const nieuwBetaald = Number(match.invoice.reeds_betaald ?? 0) + bedrag;
      const volledig = nieuwBetaald >= Number(match.invoice.totaal_incl_btw);
      await supabase
        .from("invoices")
        .update({
          reeds_betaald: nieuwBetaald,
          status: volledig ? "betaald" : "deels_betaald",
        })
        .eq("id", match.invoice.id);

      resultaten.push({
        transactie_id: t.id,
        invoice_id: match.invoice.id,
        bedrag,
        match_type: match.type,
        vertrouwen: match.vertrouwen,
      });
    } else {
      resultaten.push({
        transactie_id: t.id,
        invoice_id: null,
        bedrag: Number(t.bedrag),
        match_type: "geen_match",
        vertrouwen: 0,
        reden: "Geen matching openstaande factuur gevonden",
      });
    }
  }

  return resultaten;
}

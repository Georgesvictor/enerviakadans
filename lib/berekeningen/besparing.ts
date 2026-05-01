/**
 * Aggregatie-module: combineert warmtepomp + PV + batterij besparingen
 * tot één `BesparingResultaat` dat klaar is voor UI en opslag.
 */

import type {
  BesparingResultaat,
  KlantParameters,
  OfferteExtractie,
  PremiesOverzicht,
} from "./types";
import { berekenWarmtepompBesparing } from "./besparing-warmtepomp";
import { berekenPVBesparing } from "./besparing-pv";
import { bouwProjectie10j } from "./projectie-10j";
import { bouwIngrepen } from "./besparing-per-ingreep";

export interface EnergiePrijzenSnapshot {
  elektriciteit_per_kwh: number;
  gas_per_kwh: number;
  stookolie_per_liter: number;
  terugleververgoeding_per_kwh: number;
}

/**
 * Fallback-prijzen (all-in, inclusief distributie + taksen + BTW).
 * Referentie: CREG/VREG gemiddelden Q1 2026.
 * In productie wordt dit overschreven door getActueleEnergieprijzen().
 */
export const DEFAULT_ENERGIEPRIJZEN: EnergiePrijzenSnapshot = {
  elektriciteit_per_kwh: 0.32,   // Capaciteitstarief dagprijs
  gas_per_kwh: 0.105,            // All-in 2026
  stookolie_per_liter: 0.98,
  terugleververgoeding_per_kwh: 0.04,
};

export interface BesparingInput {
  extractie: OfferteExtractie;
  parameters: KlantParameters;
  prijzen?: EnergiePrijzenSnapshot;
  eigen_inbreng: number;
  jaarlijkse_prijsstijging?: number;
  premies?: PremiesOverzicht;
}

export function berekenTotaleBesparing(
  input: BesparingInput,
): BesparingResultaat {
  const prijzen = input.prijzen ?? DEFAULT_ENERGIEPRIJZEN;

  // Warmtepomp — enkel indien in offerte
  const wpType = input.extractie.specifiek.warmtepomp_type;
  const wpInvestering = input.extractie.categorieen.warmtepomp?.excl_btw ?? 0;
  const heeftWP = !!wpType && wpInvestering > 0;

  const wpBesparing = heeftWP
    ? berekenWarmtepompBesparing({
        parameters: input.parameters,
        wp_type: wpType,
        elek_prijs_per_kwh: prijzen.elektriciteit_per_kwh,
        gas_prijs_per_kwh: prijzen.gas_per_kwh,
        stookolie_prijs_per_liter: prijzen.stookolie_per_liter,
      })
    : null;

  // PV — enkel indien in offerte
  const pvWp = input.extractie.specifiek.pv_wp ?? 0;
  const batterijKwh = input.extractie.specifiek.batterij_kwh;
  const heeftPV = pvWp > 0;

  const pvBesparing = heeftPV
    ? berekenPVBesparing({
        pv_wp_totaal: pvWp,
        batterij_kwh: batterijKwh,
        elek_prijs_per_kwh: prijzen.elektriciteit_per_kwh,
        terugleververgoeding_per_kwh: prijzen.terugleververgoeding_per_kwh,
      })
    : null;

  const jaarlijksWP = wpBesparing?.besparing ?? 0;
  const jaarlijksPV = pvBesparing?.totaal_besparing ?? 0;
  // Extra "batterij-component" = PV met batterij t.o.v. PV zonder batterij
  let jaarlijksBatterij = 0;
  if (heeftPV && batterijKwh && batterijKwh > 0) {
    const zonderBatterij = berekenPVBesparing({
      pv_wp_totaal: pvWp,
      elek_prijs_per_kwh: prijzen.elektriciteit_per_kwh,
      terugleververgoeding_per_kwh: prijzen.terugleververgoeding_per_kwh,
    });
    jaarlijksBatterij =
      (pvBesparing?.totaal_besparing ?? 0) - zonderBatterij.totaal_besparing;
  }

  // Per-ingreep breakdown (nieuw, inclusief isolatie)
  const perIngreep = input.premies
    ? bouwIngrepen({
        extractie: input.extractie,
        parameters: input.parameters,
        premies: input.premies,
        prijzen,
      })
    : null;

  // Totale besparing: gebruik per-ingreep som als beschikbaar (inclusief isolatie),
  // anders fallback op oude 3-lijnen-aggregatie.
  const totaal = perIngreep
    ? perIngreep.totaal_besparing_euro
    : jaarlijksWP + jaarlijksPV;

  const { jaren, terugverdientijd_jaar } = bouwProjectie10j({
    basis_jaarlijkse_besparing: totaal,
    eigen_inbreng: input.eigen_inbreng,
    jaarlijkse_prijsstijging: input.jaarlijkse_prijsstijging ?? 0.03,
  });

  return {
    jaarlijkse_besparing_warmtepomp: Math.round(jaarlijksWP * 100) / 100,
    jaarlijkse_besparing_pv:
      Math.round((jaarlijksPV - jaarlijksBatterij) * 100) / 100,
    jaarlijkse_besparing_batterij: Math.round(jaarlijksBatterij * 100) / 100,
    totale_jaarlijkse_besparing: Math.round(totaal * 100) / 100,
    terugverdientijd_jaar,
    projectie_10j: jaren,
    gebruikte_energieprijzen: prijzen,
    jaarlijkse_prijsstijging: input.jaarlijkse_prijsstijging ?? 0.03,
    ingrepen: perIngreep?.ingrepen,
    maandelijkse_besparing_gas_euro: perIngreep?.maandelijks_gas_euro,
    maandelijkse_besparing_elek_euro: perIngreep?.maandelijks_elek_euro,
    maandelijkse_besparing_totaal_euro: perIngreep?.maandelijks_totaal_euro,
    co2_reductie_kg_jaar: perIngreep?.co2_reductie_kg_jaar,
    epc_label_voor: perIngreep?.epc_label_voor,
    epc_label_verwacht: perIngreep?.epc_label_verwacht,
    epc_kwh_m2_voor: perIngreep?.epc_kwh_m2_voor,
    epc_kwh_m2_na: perIngreep?.epc_kwh_m2_na,
  };
}

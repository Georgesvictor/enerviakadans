/**
 * Aggregatie-module: combineert warmtepomp + PV + batterij besparingen
 * tot één `BesparingResultaat` dat klaar is voor UI en opslag.
 */

import type {
  BesparingResultaat,
  KlantParameters,
  OfferteExtractie,
} from "./types";
import { berekenWarmtepompBesparing } from "./besparing-warmtepomp";
import { berekenPVBesparing } from "./besparing-pv";
import { bouwProjectie10j } from "./projectie-10j";

export interface EnergiePrijzenSnapshot {
  elektriciteit_per_kwh: number;
  gas_per_kwh: number;
  stookolie_per_liter: number;
  terugleververgoeding_per_kwh: number;
}

export const DEFAULT_ENERGIEPRIJZEN: EnergiePrijzenSnapshot = {
  elektriciteit_per_kwh: 0.35,
  gas_per_kwh: 0.11,
  stookolie_per_liter: 1.05,
  terugleververgoeding_per_kwh: 0.04,
};

export interface BesparingInput {
  extractie: OfferteExtractie;
  parameters: KlantParameters;
  prijzen?: EnergiePrijzenSnapshot;
  eigen_inbreng: number;
  jaarlijkse_prijsstijging?: number;
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

  const totaal = jaarlijksWP + jaarlijksPV;

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
  };
}

/**
 * Warmtepomp besparingsberekening.
 * Sectie D.4 van de projectblueprint.
 *
 * Uitgangspunt: klant vervangt bestaande verwarming door lucht-water WP.
 *  - Gas: X kWh/jaar × gasprijs = oude kost
 *  - Stookolie: Y liter × 10 kWh/liter × stookolieprijs
 *  - Elektrisch: Z kWh × elekprijs
 *
 * Na WP: thermische vraag / COP = nieuw elekverbruik
 *  - Default COP lucht-water: 3.2 (conservatief; Vaillant aroTHERM haalt 3.5-4.0)
 *
 * Besparing/jaar = oude kost − nieuwe elekkost
 */

import type { KlantParameters, WarmtepompType } from "./types";

export interface WPBesparingInput {
  parameters: KlantParameters;
  wp_type: WarmtepompType;
  elek_prijs_per_kwh: number;
  gas_prijs_per_kwh: number;
  stookolie_prijs_per_liter: number;
  /** Override COP (default per WP-type) */
  cop?: number;
}

/** Default COP-waarden per WP-type (conservatief in Belgisch klimaat) */
export const DEFAULT_COP: Record<WarmtepompType, number> = {
  lucht_water: 3.2,
  geothermisch: 4.5,
  lucht_lucht: 3.0,
  hybride: 3.5,
};

const KWH_PER_LITER_STOOKOLIE = 10;

export function berekenWarmtepompBesparing(
  input: WPBesparingInput,
): {
  oude_jaarkost: number;
  nieuwe_jaarkost: number;
  besparing: number;
  thermische_vraag_kwh: number;
  nieuw_elek_verbruik_kwh: number;
  cop_gebruikt: number;
} {
  const p = input.parameters;
  const cop = input.cop ?? DEFAULT_COP[input.wp_type];

  // Bereken thermische vraag + oude kost
  let thermischeVraag = 0;
  let oudeKost = 0;

  switch (p.huidig_verwarmingstype) {
    case "gas":
      thermischeVraag = p.jaarverbruik_gas_kwh;
      oudeKost = thermischeVraag * input.gas_prijs_per_kwh;
      break;
    case "stookolie": {
      const liters = p.jaarverbruik_stookolie_liter ?? 0;
      thermischeVraag = liters * KWH_PER_LITER_STOOKOLIE;
      oudeKost = liters * input.stookolie_prijs_per_liter;
      break;
    }
    case "elektrisch":
      // Bij elektrische verwarming is verbruik al = thermische vraag (weerstand),
      // WP doet hetzelfde werk met factor COP minder elektriciteit.
      thermischeVraag = p.jaarverbruik_elektriciteit_kwh;
      oudeKost = thermischeVraag * input.elek_prijs_per_kwh;
      break;
    case "hout":
      // Geen meerwaarde berekening voor houtverwarming; zet op 0.
      thermischeVraag = 0;
      oudeKost = 0;
      break;
  }

  const nieuwElekVerbruik = thermischeVraag / cop;
  const nieuweKost = nieuwElekVerbruik * input.elek_prijs_per_kwh;
  const besparing = Math.max(0, oudeKost - nieuweKost);

  return {
    oude_jaarkost: Math.round(oudeKost * 100) / 100,
    nieuwe_jaarkost: Math.round(nieuweKost * 100) / 100,
    besparing: Math.round(besparing * 100) / 100,
    thermische_vraag_kwh: Math.round(thermischeVraag),
    nieuw_elek_verbruik_kwh: Math.round(nieuwElekVerbruik),
    cop_gebruikt: cop,
  };
}

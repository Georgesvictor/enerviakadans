/**
 * Isolatie-besparingsberekening volgens U-waarde methode.
 *
 * Formule:
 *   Q = (U_voor − U_na) × A × Kd × 24u / 1000  [kWh/jaar warmtevraag-reductie]
 *   Besparing_kWh_brandstof = Q / rendement_verwarming
 *   Besparing_€ = Besparing_kWh_brandstof × prijs
 *
 * Bron: fysisch warmteverliesmodel conform TABULA BE + EPB-richtlijnen.
 * Graaddagen Ukkel 18°C basis = 2100 Kd/jaar.
 */

import {
  GRAADDAGEN_FACTOR,
  RENDEMENT_VERWARMING,
  STOOKOLIE_KWH_PER_LITER,
  U_WAARDEN,
} from "./constanten";
import type { VerwarmingsType } from "./types";

export interface IsolatieInput {
  oppervlakte_m2: number;
  u_voor: number;
  u_na: number;
  verwarmingstype: VerwarmingsType;
  prijs_gas_per_kwh: number;
  prijs_stookolie_per_liter: number;
  prijs_elektriciteit_per_kwh: number;
  vervangt_warmtepomp_cop?: number; // als WP wordt geïnstalleerd, betrek COP
}

export interface IsolatieResultaat {
  warmtevraag_reductie_kwh: number;   // netto warmtevraag minder
  besparing_brandstof_kwh: number;    // op basis van rendement
  besparing_euro: number;
  besparing_bron: "gas" | "elektriciteit" | "stookolie";
  besparing_gas_kwh: number;
  besparing_elek_kwh: number;
  formule: string;
}

export function berekenIsolatieBesparing(input: IsolatieInput): IsolatieResultaat {
  const {
    oppervlakte_m2,
    u_voor,
    u_na,
    verwarmingstype,
    prijs_gas_per_kwh,
    prijs_stookolie_per_liter,
    prijs_elektriciteit_per_kwh,
    vervangt_warmtepomp_cop,
  } = input;

  // Δ U × A × factor(2100·24/1000) = warmtevraag reductie in kWh/jaar
  const deltaU = Math.max(0, u_voor - u_na);
  const warmtevraag_reductie_kwh = deltaU * oppervlakte_m2 * GRAADDAGEN_FACTOR;

  let besparing_brandstof_kwh: number;
  let besparing_euro: number;
  let besparing_bron: "gas" | "elektriciteit" | "stookolie";
  let besparing_gas_kwh = 0;
  let besparing_elek_kwh = 0;
  let prijsLabel: string;

  if (vervangt_warmtepomp_cop && vervangt_warmtepomp_cop > 1) {
    // Isolatie wordt bediend door een WP → besparing is elektriciteit
    besparing_brandstof_kwh = warmtevraag_reductie_kwh / vervangt_warmtepomp_cop;
    besparing_euro = besparing_brandstof_kwh * prijs_elektriciteit_per_kwh;
    besparing_bron = "elektriciteit";
    besparing_elek_kwh = besparing_brandstof_kwh;
    prijsLabel = `€ ${prijs_elektriciteit_per_kwh.toFixed(3)}/kWh elek (WP COP ${vervangt_warmtepomp_cop})`;
  } else if (verwarmingstype === "gas") {
    const rend = RENDEMENT_VERWARMING.gas;
    besparing_brandstof_kwh = warmtevraag_reductie_kwh / rend;
    besparing_euro = besparing_brandstof_kwh * prijs_gas_per_kwh;
    besparing_bron = "gas";
    besparing_gas_kwh = besparing_brandstof_kwh;
    prijsLabel = `€ ${prijs_gas_per_kwh.toFixed(3)}/kWh gas (rend. ${Math.round(rend * 100)}%)`;
  } else if (verwarmingstype === "stookolie") {
    const rend = RENDEMENT_VERWARMING.stookolie;
    besparing_brandstof_kwh = warmtevraag_reductie_kwh / rend;
    const liter = besparing_brandstof_kwh / STOOKOLIE_KWH_PER_LITER;
    besparing_euro = liter * prijs_stookolie_per_liter;
    besparing_bron = "stookolie";
    prijsLabel = `€ ${prijs_stookolie_per_liter.toFixed(2)}/liter (${liter.toFixed(0)} liter/j)`;
  } else if (verwarmingstype === "elektrisch") {
    besparing_brandstof_kwh = warmtevraag_reductie_kwh / RENDEMENT_VERWARMING.elektrisch;
    besparing_euro = besparing_brandstof_kwh * prijs_elektriciteit_per_kwh;
    besparing_bron = "elektriciteit";
    besparing_elek_kwh = besparing_brandstof_kwh;
    prijsLabel = `€ ${prijs_elektriciteit_per_kwh.toFixed(3)}/kWh elek`;
  } else {
    // hout: niet in €-waarde uit te drukken → klein conservatief bedrag
    besparing_brandstof_kwh = warmtevraag_reductie_kwh / RENDEMENT_VERWARMING.hout;
    besparing_euro = besparing_brandstof_kwh * 0.03; // ± € 0,03/kWh hout
    besparing_bron = "gas";
    prijsLabel = "hout";
  }

  const formule = `(${u_voor.toFixed(2)} − ${u_na.toFixed(2)}) W/m²K × ${oppervlakte_m2} m² × ${GRAADDAGEN_FACTOR.toFixed(1)} = ${warmtevraag_reductie_kwh.toFixed(0)} kWh/j · ${prijsLabel}`;

  return {
    warmtevraag_reductie_kwh,
    besparing_brandstof_kwh,
    besparing_euro,
    besparing_bron,
    besparing_gas_kwh,
    besparing_elek_kwh,
    formule,
  };
}

/**
 * Kies de juiste U-voor waarde op basis van beschikbare info over woning.
 * Default: oudere ongeïsoleerde woning.
 */
export function uVoorDak(woningOuderdom: string): number {
  // "voor_2006" → aannemelijk onisoleerd of licht geïsoleerd
  if (woningOuderdom === "na_2006_min_5j") {
    return U_WAARDEN.dak.voor_licht_geisoleerd;
  }
  return U_WAARDEN.dak.voor;
}

export function uVoorGevel(): number {
  return U_WAARDEN.gevel.voor;
}

export function uVoorRamen(bestaandType: "enkel" | "dubbel_oud" | "hr_plus" = "dubbel_oud"): number {
  return U_WAARDEN.ramen[`voor_${bestaandType}` as const];
}

export function uVoorVloer(): number {
  return U_WAARDEN.vloer.voor;
}

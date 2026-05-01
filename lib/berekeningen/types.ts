/**
 * Gedeelde types voor berekeningen. Deze types zijn de contract-basis
 * tussen extractie, UI, simulaties en PDF-templates.
 */

export type InkomensCategorie = 1 | 2 | 3;
export type BurgerlijkeStaat = "alleenstaand" | "koppel";
export type EPCLabel = "A" | "B" | "C" | "D" | "E" | "F";
export type WarmtepompType =
  | "lucht_water"
  | "geothermisch"
  | "lucht_lucht"
  | "hybride";
export type VerwarmingsType = "gas" | "stookolie" | "elektrisch" | "hout";

export interface OfferteExtractie {
  totaal_excl_btw: number;
  totaal_incl_btw: number;
  btw_tarief: number;
  categorieen: {
    werfinrichting?: CategorieItem;
    afbraak?: CategorieItem;
    dak?: CategorieItem;
    gevel?: CategorieItem;
    ramen_deuren?: CategorieItem;
    warmtepomp?: CategorieItem;
    warmtepompboiler?: CategorieItem;
    zonnepanelen?: CategorieItem;
    thuisbatterij?: CategorieItem;
    vloer?: CategorieItem;
    voorbereidingswerken?: CategorieItem;
    korting?: CategorieItem;
    [key: string]: CategorieItem | undefined;
  };
  specifiek: {
    heeft_asbest: boolean;
    asbest_kosten_excl: number;
    asbest_dak_m2?: number;
    dak_m2?: number;
    gevel_m2?: number;
    ramen_m2?: number;
    vloer_m2?: number;
    pv_wp?: number;
    pv_aantal_panelen?: number;
    batterij_kwh?: number;
    warmtepomp_type?: WarmtepompType;
    warmtepomp_merk?: string;
    vervangt_elektrische_verwarming?: boolean;
    in_zone_zonder_gasnet?: boolean;
  };
}

export interface CategorieItem {
  excl_btw: number;
  details?: Array<{ omschrijving: string; bedrag: number }>;
}

export interface KlantParameters {
  inkomenscategorie: InkomensCategorie;
  gezamenlijk_inkomen: number;
  burgerlijke_staat: BurgerlijkeStaat;
  personen_ten_laste: number;
  epc_label_voor: EPCLabel;
  epc_label_verwacht: "A" | "B" | "C";
  woning_ouderdom: "voor_2006" | "na_2006_min_5j";
  is_eigenaar: boolean;
  andere_woning_eigendom: boolean;
  is_gedomicilieerd: boolean;
  heeft_ventilatie: boolean;
  jaarverbruik_gas_kwh: number;
  jaarverbruik_elektriciteit_kwh: number;
  huidig_verwarmingstype: VerwarmingsType;
  jaarverbruik_stookolie_liter?: number;
}

export interface PremieResultaat {
  bedrag: number;
  maximum_bereikt: boolean;
  van_toepassing: boolean;
  formule: string;
  details?: string;
}

export interface PremiesOverzicht {
  dak: PremieResultaat;
  ramen_deuren: PremieResultaat;
  gevel: PremieResultaat;
  vloer: PremieResultaat;
  warmtepomp: PremieResultaat;
  warmtepompboiler: PremieResultaat;
  zonnepanelen: PremieResultaat;
  asbest: PremieResultaat;
  asbest_veka_bonus: PremieResultaat;
  epc_label: PremieResultaat;
  voorbereidingswerken: PremieResultaat;
  totaal: number;
}

export interface LeningInput {
  type: "mijnverbouwlening" | "commercieel";
  leenbedrag: number;
  rentevoet_jaarlijks: number; // bv 0.01 voor 1%
  looptijd_jaar: number;
  eigen_inbreng: number;
}

export interface LeningResultaat {
  maandelijkse_afbetaling: number;
  totale_interestkost: number;
  totaal_terug_te_betalen: number;
  leenbedrag: number;
  rentevoet_jaarlijks: number;
  looptijd_jaar: number;
}

export interface MVLGeschiktheid {
  geschikt: boolean;
  reden?: string;
  rentevoet: number; // 0 voor cat.1, 0.01 voor cat.2, NaN voor cat.3
  max_leenbedrag: number;
}

export interface BesparingResultaat {
  jaarlijkse_besparing_warmtepomp: number;
  jaarlijkse_besparing_pv: number;
  jaarlijkse_besparing_batterij: number;
  totale_jaarlijkse_besparing: number;
  terugverdientijd_jaar: number;
  projectie_10j: Array<{
    jaar: number;
    besparing: number;
    cumulatief: number;
    investering_terug: number;
  }>;
  gebruikte_energieprijzen: {
    elektriciteit_per_kwh: number;
    gas_per_kwh: number;
    stookolie_per_liter: number;
    terugleververgoeding_per_kwh: number;
  };
  jaarlijkse_prijsstijging: number;
  // Nieuwe velden (achterwaarts compatibel, optioneel)
  ingrepen?: IngreepBesparing[];
  maandelijkse_besparing_gas_euro?: number;
  maandelijkse_besparing_elek_euro?: number;
  maandelijkse_besparing_totaal_euro?: number;
  co2_reductie_kg_jaar?: number;
  epc_label_voor?: "A" | "B" | "C" | "D" | "E" | "F";
  epc_label_verwacht?: "A" | "B" | "C" | "D" | "E" | "F";
  epc_kwh_m2_voor?: number;
  epc_kwh_m2_na?: number;
}

export type IngreepCode =
  | "dak"
  | "gevel"
  | "ramen_deuren"
  | "vloer"
  | "warmtepomp"
  | "warmtepompboiler"
  | "zonnepanelen"
  | "thuisbatterij"
  | "voorbereidingswerken";

export type BesparingBron = "gas" | "elektriciteit" | "gemengd" | "geen";
export type EPCImpactNiveau = "geen" | "klein" | "middel" | "groot" | "zeer_groot";

export interface IngreepBesparing {
  code: IngreepCode;
  titel: string;                      // "Dakisolatie 140mm PIR (Rd 6,35)"
  korte_omschrijving: string;         // "65 m² hellend dak + afwerking"
  technische_specs: string[];         // ["140mm PIR λ 0,022", "Rd-waarde 6,35 m²K/W", ...]
  investering_excl_btw: number;
  investering_incl_btw: number;
  premie_bedrag: number;
  netto_investering: number;          // investering_incl − premie
  jaarlijkse_besparing_euro: number;
  jaarlijkse_besparing_kwh: number;
  besparing_bron: BesparingBron;
  besparing_gas_kwh: number;          // bespaarde gas-kWh
  besparing_elek_kwh: number;         // bespaarde elek-kWh (kan negatief = extra verbruik)
  maandelijkse_besparing_euro: number;
  epc_impact_kwh_m2_jaar: number;     // bijdrage reductie EPC-score
  epc_impact_niveau: EPCImpactNiveau;
  terugverdientijd_jaar: number | null; // null als niet berekenbaar (geen besparing)
  co2_reductie_kg_jaar: number;
  toelichting: string;                // "Vermindert warmteverlies via dak met 93%"
  formule?: string;                   // bv. "(2,5 − 0,18) × 65 m² × 50,4 = 7.604 kWh/j × € 0,095/kWh gas"
}

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
}

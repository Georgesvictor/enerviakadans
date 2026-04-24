/**
 * MijnVerbouwPremie + aanvullende premies berekening (2026 tarieven).
 *
 * Bron: www.vlaanderen.be/mijnverbouwpremie (cat. 3, eigenaar-bewoner)
 * Sectie D.2 van de projectblueprint.
 *
 * Alle bedragen in EUR excl. BTW tenzij anders aangegeven.
 * Investering = factuur excl. BTW.
 *
 * Verschillende premiepercentages per inkomenscategorie:
 *  - Cat.1 = 50% (behalve WP die forfait is)
 *  - Cat.2 = 40%
 *  - Cat.3 = 35%
 *
 * Maximumpremie staat per categorie/type opgesomd in PREMIE_REGELS.
 *
 * NB: Sommige premies (zoals WP basispremies) zijn forfaits en dus
 * onafhankelijk van inkomenscategorie, wel met 35% factuur-cap.
 */

import type {
  InkomensCategorie,
  KlantParameters,
  OfferteExtractie,
  PremieResultaat,
  PremiesOverzicht,
} from "@/lib/berekeningen/types";

const MIN_INVESTERING = 1_000;

export interface PremieConfig {
  /** Percentage van investering dat gedekt wordt per categorie */
  percentage_per_cat: Record<InkomensCategorie, number>;
  /** Maximumpremie per categorie */
  max_per_cat: Record<InkomensCategorie, number>;
  /** Minimum investering (default 1000) */
  min_investering?: number;
}

/**
 * Premie-regels per type (cat.3 eigenaar-bewoner tarieven uit blueprint).
 * Cat.1 en cat.2 percentages volgen VEKA standaard (50/40/35).
 */
export const PREMIE_REGELS = {
  dak: {
    percentage_per_cat: { 1: 0.5, 2: 0.4, 3: 0.35 } as Record<
      InkomensCategorie,
      number
    >,
    max_per_cat: { 1: 5_750, 2: 4_600, 3: 4_025 } as Record<
      InkomensCategorie,
      number
    >,
  },
  ramen_deuren: {
    percentage_per_cat: { 1: 0.5, 2: 0.4, 3: 0.35 } as Record<
      InkomensCategorie,
      number
    >,
    max_per_cat: { 1: 5_250, 2: 4_200, 3: 3_675 } as Record<
      InkomensCategorie,
      number
    >,
  },
  gevel: {
    percentage_per_cat: { 1: 0.5, 2: 0.4, 3: 0.35 } as Record<
      InkomensCategorie,
      number
    >,
    max_per_cat: { 1: 5_000, 2: 4_000, 3: 3_500 } as Record<
      InkomensCategorie,
      number
    >,
  },
  vloer: {
    percentage_per_cat: { 1: 0.5, 2: 0.4, 3: 0.35 } as Record<
      InkomensCategorie,
      number
    >,
    max_per_cat: { 1: 1_500, 2: 1_200, 3: 1_050 } as Record<
      InkomensCategorie,
      number
    >,
  },
  voorbereidingswerken: {
    percentage_per_cat: { 1: 0.5, 2: 0.4, 3: 0.35 } as Record<
      InkomensCategorie,
      number
    >,
    max_per_cat: { 1: 3_000, 2: 2_400, 3: 2_100 } as Record<
      InkomensCategorie,
      number
    >,
  },
} satisfies Record<string, PremieConfig>;

/** Warmtepomp-basispremies (forfait, onafhankelijk van inkomenscategorie) */
export const WP_FORFAITS = {
  lucht_water: 4_500,
  geothermisch: 6_000,
  lucht_lucht: 450,
  hybride: 3_000,
  warmtepompboiler: 800,
};

/** EPC-labelpremie cat.3 eigenaar-bewoner, met ventilatie-systeem */
export const EPC_LABEL_PREMIES: Record<
  InkomensCategorie,
  {
    A: { met_vent: number; zonder_vent: number };
    B: { met_vent: number; zonder_vent: number };
    C: { met_vent: number; zonder_vent: number };
  }
> = {
  1: {
    A: { met_vent: 7_000, zonder_vent: 6_500 },
    B: { met_vent: 5_000, zonder_vent: 4_500 },
    C: { met_vent: 2_500, zonder_vent: 2_000 },
  },
  2: {
    A: { met_vent: 6_000, zonder_vent: 5_500 },
    B: { met_vent: 4_250, zonder_vent: 3_750 },
    C: { met_vent: 2_000, zonder_vent: 1_500 },
  },
  3: {
    A: { met_vent: 5_000, zonder_vent: 4_500 },
    B: { met_vent: 3_500, zonder_vent: 3_000 },
    C: { met_vent: 1_750, zonder_vent: 1_250 },
  },
};

/** Asbestverwijderingspremie (via OVAM) - 50% van factuur, max €50/m² */
export const ASBEST_REGELS = {
  percentage: 0.5,
  max_per_m2: 50,
  /** VEKA bonus: €8/m² dakisolatie na asbestverwijdering */
  veka_bonus_per_m2: 8,
};

function berekenStandaardPremie(
  investering: number,
  cat: InkomensCategorie,
  regel: PremieConfig,
  label: string,
): PremieResultaat {
  const minInv = regel.min_investering ?? MIN_INVESTERING;
  if (investering < minInv) {
    return {
      bedrag: 0,
      maximum_bereikt: false,
      van_toepassing: false,
      formule: `Investering € ${investering.toFixed(2)} ligt onder minimum € ${minInv}`,
    };
  }

  const pct = regel.percentage_per_cat[cat];
  const max = regel.max_per_cat[cat];
  const berekend = investering * pct;
  const bedrag = Math.min(berekend, max);
  const maxBereikt = berekend >= max;

  return {
    bedrag: Math.round(bedrag * 100) / 100,
    maximum_bereikt: maxBereikt,
    van_toepassing: true,
    formule: maxBereikt
      ? `Maximum cat.${cat} ${label} bereikt (€ ${max})`
      : `${(pct * 100).toFixed(0)}% van € ${investering.toFixed(2)}`,
  };
}

export function berekenPremies(
  extractie: OfferteExtractie,
  params: KlantParameters,
): PremiesOverzicht {
  const cat = params.inkomenscategorie;

  const dak = berekenStandaardPremie(
    extractie.categorieen.dak?.excl_btw ?? 0,
    cat,
    PREMIE_REGELS.dak,
    "dakisolatie",
  );

  const ramen_deuren = berekenStandaardPremie(
    extractie.categorieen.ramen_deuren?.excl_btw ?? 0,
    cat,
    PREMIE_REGELS.ramen_deuren,
    "ramen/deuren",
  );

  const gevel = berekenStandaardPremie(
    extractie.categorieen.gevel?.excl_btw ?? 0,
    cat,
    PREMIE_REGELS.gevel,
    "gevelisolatie",
  );

  const vloer = berekenStandaardPremie(
    extractie.categorieen.vloer?.excl_btw ?? 0,
    cat,
    PREMIE_REGELS.vloer,
    "vloerisolatie",
  );

  const voorbereidingswerken = berekenStandaardPremie(
    extractie.categorieen.voorbereidingswerken?.excl_btw ?? 0,
    cat,
    PREMIE_REGELS.voorbereidingswerken,
    "voorbereiding elek/sanitair",
  );

  const warmtepomp = berekenWarmtepompPremie(extractie, params);
  const warmtepompboiler = berekenWPBoilerPremie(extractie, params);
  const zonnepanelen = berekenZonnepanelenPremie();
  const asbest = berekenAsbestPremie(extractie);
  const asbest_veka_bonus = berekenAsbestVEKABonus(extractie);
  const epc_label = berekenEPCLabelPremie(params);

  const totaal =
    dak.bedrag +
    ramen_deuren.bedrag +
    gevel.bedrag +
    vloer.bedrag +
    warmtepomp.bedrag +
    warmtepompboiler.bedrag +
    zonnepanelen.bedrag +
    asbest.bedrag +
    asbest_veka_bonus.bedrag +
    epc_label.bedrag +
    voorbereidingswerken.bedrag;

  return {
    dak,
    ramen_deuren,
    gevel,
    vloer,
    warmtepomp,
    warmtepompboiler,
    zonnepanelen,
    asbest,
    asbest_veka_bonus,
    epc_label,
    voorbereidingswerken,
    totaal: Math.round(totaal * 100) / 100,
  };
}

function berekenWarmtepompPremie(
  extractie: OfferteExtractie,
  params: KlantParameters,
): PremieResultaat {
  const investering = extractie.categorieen.warmtepomp?.excl_btw ?? 0;
  const wpType = extractie.specifiek.warmtepomp_type;

  if (!wpType || investering < MIN_INVESTERING) {
    return {
      bedrag: 0,
      maximum_bereikt: false,
      van_toepassing: false,
      formule: "Geen warmtepomp of investering onder minimum",
    };
  }

  let basis = WP_FORFAITS[wpType];
  const formuleBasis = `Basispremie ${wpType.replace("_", "-")}: € ${basis}`;

  let bonus = 0;
  let bonusTekst = "";
  if (
    extractie.specifiek.vervangt_elektrische_verwarming ||
    extractie.specifiek.in_zone_zonder_gasnet ||
    params.huidig_verwarmingstype === "elektrisch"
  ) {
    bonus = basis * 0.5;
    bonusTekst =
      " + 50% bonus (vervanging elektrische verwarming / zone zonder gasnet)";
  }

  const forfait = basis + bonus;
  const factuurCap = investering * 0.35;
  const bedrag = Math.min(forfait, factuurCap);

  return {
    bedrag: Math.round(bedrag * 100) / 100,
    maximum_bereikt: bedrag === factuurCap,
    van_toepassing: true,
    formule:
      bedrag === factuurCap
        ? `35%-factuurplafond: € ${bedrag.toFixed(2)} (forfait € ${forfait} was hoger)`
        : formuleBasis + bonusTekst,
  };
}

function berekenWPBoilerPremie(
  extractie: OfferteExtractie,
  _params: KlantParameters,
): PremieResultaat {
  const inv = extractie.categorieen.warmtepompboiler?.excl_btw ?? 0;
  if (inv < MIN_INVESTERING) {
    return {
      bedrag: 0,
      maximum_bereikt: false,
      van_toepassing: false,
      formule: "Geen warmtepompboiler in offerte",
    };
  }
  const forfait = WP_FORFAITS.warmtepompboiler;
  const cap = inv * 0.35;
  const bedrag = Math.min(forfait, cap);
  return {
    bedrag: Math.round(bedrag * 100) / 100,
    maximum_bereikt: bedrag === cap,
    van_toepassing: true,
    formule: `Basispremie € ${forfait}, 35% factuurplafond € ${cap.toFixed(2)}`,
  };
}

function berekenZonnepanelenPremie(): PremieResultaat {
  return {
    bedrag: 0,
    maximum_bereikt: false,
    van_toepassing: false,
    formule:
      "Geen MijnVerbouwPremie meer in 2026 (wel terugleververgoeding VREG + digitale meter)",
  };
}

function berekenAsbestPremie(extractie: OfferteExtractie): PremieResultaat {
  if (
    !extractie.specifiek.heeft_asbest ||
    extractie.specifiek.asbest_kosten_excl < MIN_INVESTERING
  ) {
    return {
      bedrag: 0,
      maximum_bereikt: false,
      van_toepassing: false,
      formule: "Geen asbestverwijdering of onder minimum",
    };
  }

  const factuur = extractie.specifiek.asbest_kosten_excl;
  const m2 = extractie.specifiek.asbest_dak_m2 ?? extractie.specifiek.dak_m2 ?? 0;
  const berekend = factuur * ASBEST_REGELS.percentage;
  const maxViaM2 = m2 * ASBEST_REGELS.max_per_m2;
  const bedrag = m2 > 0 ? Math.min(berekend, maxViaM2) : berekend;

  return {
    bedrag: Math.round(bedrag * 100) / 100,
    maximum_bereikt: bedrag === maxViaM2,
    van_toepassing: true,
    formule: `50% van € ${factuur.toFixed(2)} asbestverwijdering${
      m2 > 0 ? ` (max € ${ASBEST_REGELS.max_per_m2}/m² × ${m2}m²)` : ""
    }`,
  };
}

function berekenAsbestVEKABonus(extractie: OfferteExtractie): PremieResultaat {
  if (!extractie.specifiek.heeft_asbest) {
    return {
      bedrag: 0,
      maximum_bereikt: false,
      van_toepassing: false,
      formule: "Geen asbestverwijdering",
    };
  }

  const m2 =
    extractie.specifiek.asbest_dak_m2 ?? extractie.specifiek.dak_m2 ?? 0;
  if (m2 <= 0) {
    return {
      bedrag: 0,
      maximum_bereikt: false,
      van_toepassing: false,
      formule: "Geen dak-m² bekend voor VEKA-bonus",
    };
  }

  const bedrag = m2 * ASBEST_REGELS.veka_bonus_per_m2;
  return {
    bedrag: Math.round(bedrag * 100) / 100,
    maximum_bereikt: false,
    van_toepassing: true,
    formule: `€ ${ASBEST_REGELS.veka_bonus_per_m2}/m² dakisolatie na asbestverwijdering (${m2} m²)`,
  };
}

function berekenEPCLabelPremie(params: KlantParameters): PremieResultaat {
  const label = params.epc_label_verwacht;
  const cat = params.inkomenscategorie;
  const tabel = EPC_LABEL_PREMIES[cat][label];

  if (!tabel) {
    return {
      bedrag: 0,
      maximum_bereikt: false,
      van_toepassing: false,
      formule: "Geen EPC-labelpremie voor dit label",
    };
  }

  const bedrag = params.heeft_ventilatie ? tabel.met_vent : tabel.zonder_vent;
  return {
    bedrag,
    maximum_bereikt: false,
    van_toepassing: true,
    formule: `Forfait cat.${cat} sprong naar label ${label}${
      params.heeft_ventilatie ? " met ventilatie" : " zonder ventilatie"
    }`,
  };
}

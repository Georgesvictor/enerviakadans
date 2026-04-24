/**
 * MijnVerbouwLening (2026) en commerciële leningsimulatie.
 *
 * Bron: www.mijnverbouwlening.be
 * Sectie D.3 van de projectblueprint.
 */

import type {
  InkomensCategorie,
  KlantParameters,
  LeningInput,
  LeningResultaat,
  MVLGeschiktheid,
} from "@/lib/berekeningen/types";

export const MVL_MAX_LEENBEDRAG = 60_000;
export const MVL_MAX_LOOPTIJD = 25;

export const MVL_RENTETARIEVEN_2026: Record<InkomensCategorie, number> = {
  1: 0,
  2: 0.01,
  3: Number.NaN, // cat.3 komt niet in aanmerking
};

/**
 * Bepaalt of een dossier in aanmerking komt voor MijnVerbouwLening.
 * Alle voorwaarden moeten waar zijn.
 */
export function checkMVLGeschiktheid(
  params: KlantParameters,
): MVLGeschiktheid {
  const reden: string[] = [];

  if (!params.is_eigenaar) {
    reden.push("Klant is geen eigenaar van de woning");
  }
  if (params.andere_woning_eigendom) {
    reden.push("Klant heeft andere woning of bouwgrond in volle eigendom");
  }
  if (!params.is_gedomicilieerd) {
    reden.push(
      "Klant is niet gedomicilieerd (moet binnen 36 maanden gebeuren)",
    );
  }
  if (params.woning_ouderdom !== "voor_2006") {
    reden.push(
      "Woning is aangesloten na 2006 (enkel uitzondering voor WP/PV op ≥5j oude woning, check manueel)",
    );
  }
  if (params.inkomenscategorie === 3) {
    reden.push("Inkomenscategorie 3 komt niet in aanmerking (MVL stopt bij cat.2)");
  }

  if (reden.length > 0) {
    return {
      geschikt: false,
      reden: reden.join(". "),
      rentevoet: Number.NaN,
      max_leenbedrag: 0,
    };
  }

  return {
    geschikt: true,
    rentevoet: MVL_RENTETARIEVEN_2026[params.inkomenscategorie],
    max_leenbedrag: MVL_MAX_LEENBEDRAG,
  };
}

/**
 * Berekent annuïtaire lening: vaste maandaflossing gedurende looptijd.
 *
 * Formule: M = P × (r × (1+r)^n) / ((1+r)^n - 1)
 *  met M = maandaflossing, P = hoofdsom, r = rente/12, n = aantal maanden.
 * Bij r = 0 valt de formule terug naar M = P / n.
 */
export function berekenLening(input: LeningInput): LeningResultaat {
  const P = input.leenbedrag;
  const n = input.looptijd_jaar * 12;
  const rMaand = input.rentevoet_jaarlijks / 12;

  let maand: number;
  if (rMaand === 0) {
    maand = P / n;
  } else {
    const factor = Math.pow(1 + rMaand, n);
    maand = (P * (rMaand * factor)) / (factor - 1);
  }

  const totaal = maand * n;
  const rente = totaal - P;

  return {
    maandelijkse_afbetaling: Math.round(maand * 100) / 100,
    totale_interestkost: Math.round(rente * 100) / 100,
    totaal_terug_te_betalen: Math.round(totaal * 100) / 100,
    leenbedrag: P,
    rentevoet_jaarlijks: input.rentevoet_jaarlijks,
    looptijd_jaar: input.looptijd_jaar,
  };
}

/** Standaard commerciële rente voor energierenovatielening 2026 */
export const COMMERCIEEL_DEFAULT_RENTE = 0.035;

/**
 * Hulpfunctie: bepaal aanbevolen leenbedrag op basis van netto investering
 * (na premies) minus eigen inbreng.
 */
export function bepaalLeenbedrag(
  nettoInvestering: number,
  eigenInbreng: number,
): number {
  return Math.max(0, nettoInvestering - eigenInbreng);
}

/**
 * MijnVerbouwPremie inkomenscategorieën 2026.
 *
 * Bron: www.vlaanderen.be/mijnverbouwpremie
 * Drempels veranderen jaarlijks — admin kan overridden via settings tabel
 * (zie `lib/veka/inkomens-override.ts`).
 */

import type {
  BurgerlijkeStaat,
  InkomensCategorie,
  KlantParameters,
} from "@/lib/berekeningen/types";

export interface InkomensDrempels {
  alleenstaand: { cat1: number; cat2: number };
  koppel: { cat1: number; cat2: number };
  verhoging_per_persoon_ten_laste: number;
}

export const DREMPELS_2026: InkomensDrempels = {
  alleenstaand: { cat1: 27_440, cat2: 45_550 },
  koppel: { cat1: 38_170, cat2: 65_080 },
  verhoging_per_persoon_ten_laste: 4_290,
};

export function bepaalCategorie(
  inkomen: number,
  staat: BurgerlijkeStaat,
  ptl: number,
  drempels: InkomensDrempels = DREMPELS_2026,
): InkomensCategorie {
  const basis = staat === "alleenstaand" ? drempels.alleenstaand : drempels.koppel;
  const verhoging = ptl * drempels.verhoging_per_persoon_ten_laste;
  const cat1Grens = basis.cat1 + verhoging;
  const cat2Grens = basis.cat2 + verhoging;

  if (inkomen <= cat1Grens) return 1;
  if (inkomen <= cat2Grens) return 2;
  return 3;
}

export function verifieerCategorie(p: KlantParameters): {
  berekend: InkomensCategorie;
  matcht_opgave: boolean;
} {
  const berekend = bepaalCategorie(
    p.gezamenlijk_inkomen,
    p.burgerlijke_staat,
    p.personen_ten_laste,
  );
  return { berekend, matcht_opgave: berekend === p.inkomenscategorie };
}

/**
 * 10-jaar projectie van besparingen en terugverdientijd.
 * Sectie D.6 van de projectblueprint.
 *
 * Jaar N besparing = basis_besparing × (1 + inflatie)^(N-1)
 * (3% energieprijsstijging per jaar, aanpasbaar via settings)
 *
 * Cumulatief = som van jaar 1 tot N
 * Terugverdientijd = eerste jaar waar cumulatief ≥ eigen_inbreng
 */

export interface ProjectieInput {
  basis_jaarlijkse_besparing: number;
  eigen_inbreng: number;
  jaarlijkse_prijsstijging?: number;
  jaren?: number;
}

export interface ProjectieJaar {
  jaar: number;
  besparing: number;
  cumulatief: number;
  /** Fractie van eigen inbreng dat al terugverdiend is */
  investering_terug: number;
}

export function bouwProjectie10j(input: ProjectieInput): {
  jaren: ProjectieJaar[];
  terugverdientijd_jaar: number;
} {
  const jaren = input.jaren ?? 10;
  const inflatie = input.jaarlijkse_prijsstijging ?? 0.03;
  const basis = input.basis_jaarlijkse_besparing;
  const inbreng = input.eigen_inbreng;

  const resultaat: ProjectieJaar[] = [];
  let cumulatief = 0;
  let terugverdien = Number.POSITIVE_INFINITY;

  for (let n = 1; n <= jaren; n++) {
    const bespJaar = basis * Math.pow(1 + inflatie, n - 1);
    cumulatief += bespJaar;
    const fractie = inbreng > 0 ? Math.min(1, cumulatief / inbreng) : 1;

    resultaat.push({
      jaar: n,
      besparing: Math.round(bespJaar * 100) / 100,
      cumulatief: Math.round(cumulatief * 100) / 100,
      investering_terug: Math.round(fractie * 10000) / 10000,
    });

    if (terugverdien === Number.POSITIVE_INFINITY && cumulatief >= inbreng && inbreng > 0) {
      // lineaire interpolatie binnen jaar voor fijnere terugverdientijd
      const vorigCumulatief = cumulatief - bespJaar;
      const fractieBinnenJaar = (inbreng - vorigCumulatief) / bespJaar;
      terugverdien = n - 1 + fractieBinnenJaar;
    }
  }

  // Indien niet terugverdiend binnen horizon: extrapoleer
  if (terugverdien === Number.POSITIVE_INFINITY && basis > 0 && inbreng > 0) {
    // oplossen cumulatief(n) = inbreng via meetkundige reeks
    // cumulatief = basis × ((1+i)^n − 1) / i  ⇒ (1+i)^n = 1 + inbreng × i / basis
    if (inflatie === 0) {
      terugverdien = inbreng / basis;
    } else {
      const rechterlid = 1 + (inbreng * inflatie) / basis;
      terugverdien = Math.log(rechterlid) / Math.log(1 + inflatie);
    }
  }

  return {
    jaren: resultaat,
    terugverdientijd_jaar: Math.round(terugverdien * 100) / 100,
  };
}

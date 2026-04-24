/**
 * PV + batterij besparingsberekening.
 * Sectie D.5 van de projectblueprint.
 *
 * Opbrengst PV (Vlaanderen): wp_totaal × 0.92 rendementsfactor in kWh/jaar
 *   = 6.060 Wp × 0.92 / 1000 × 1000 = 5.575 kWh voor 6.06 kWp systeem
 *
 * Zonder batterij: 40% direct verbruik, 60% injectie
 * Met batterij 5 kWh: ~70% direct verbruik, 30% injectie
 *
 * Besparing = (directe % × opbrengst × elekprijs)
 *           + (injectie % × opbrengst × terugleververgoeding)
 */

export interface PVBesparingInput {
  pv_wp_totaal: number;
  batterij_kwh?: number;
  elek_prijs_per_kwh: number;
  terugleververgoeding_per_kwh: number;
  /** Override van rendementsfactor (default 0.92) */
  rendementsfactor?: number;
}

export interface PVBesparingOutput {
  jaarlijkse_opbrengst_kwh: number;
  direct_verbruik_kwh: number;
  injectie_kwh: number;
  besparing_direct_verbruik: number;
  opbrengst_injectie: number;
  totaal_besparing: number;
  fractie_direct_verbruik: number;
}

const RENDEMENT_DEFAULT = 0.92;

export function berekenPVBesparing(input: PVBesparingInput): PVBesparingOutput {
  const rendement = input.rendementsfactor ?? RENDEMENT_DEFAULT;
  const opbrengstKwh = (input.pv_wp_totaal / 1000) * 1000 * rendement; // Wp → kWh/jaar (Vlaanderen ~920 kWh/kWp)
  const opbrengst = (input.pv_wp_totaal / 1000) * 920 * (rendement / RENDEMENT_DEFAULT);

  const heeftBatterij = (input.batterij_kwh ?? 0) >= 3; // minimum zinvolle grootte
  const fractieDirect = heeftBatterij ? interpoleerBatterijFractie(input.batterij_kwh!) : 0.4;
  const fractieInjectie = 1 - fractieDirect;

  const directKwh = opbrengst * fractieDirect;
  const injectieKwh = opbrengst * fractieInjectie;

  const besparingDirect = directKwh * input.elek_prijs_per_kwh;
  const opbrengstInjectie = injectieKwh * input.terugleververgoeding_per_kwh;
  const totaal = besparingDirect + opbrengstInjectie;

  return {
    jaarlijkse_opbrengst_kwh: Math.round(opbrengst),
    direct_verbruik_kwh: Math.round(directKwh),
    injectie_kwh: Math.round(injectieKwh),
    besparing_direct_verbruik: Math.round(besparingDirect * 100) / 100,
    opbrengst_injectie: Math.round(opbrengstInjectie * 100) / 100,
    totaal_besparing: Math.round(totaal * 100) / 100,
    fractie_direct_verbruik: fractieDirect,
  };
}

/**
 * Interpoleer direct-verbruikfractie op basis van batterijgrootte.
 *  3 kWh → ~55%, 5 kWh → 70%, 10 kWh → 85%
 */
function interpoleerBatterijFractie(batterijKwh: number): number {
  if (batterijKwh <= 3) return 0.55;
  if (batterijKwh >= 10) return 0.85;
  if (batterijKwh <= 5) return 0.55 + ((batterijKwh - 3) / 2) * 0.15; // lineair 3→5
  return 0.7 + ((batterijKwh - 5) / 5) * 0.15; // lineair 5→10
}

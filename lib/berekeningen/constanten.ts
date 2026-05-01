/**
 * Fysische & bouwtechnische constanten voor per-ingreep besparingsberekening.
 *
 * BRONNEN:
 *  - Graaddagen Ukkel 18 °C basis: KMI/Fluvius jaargemiddelde
 *  - U-waarden ongeïsoleerd vs. geïsoleerd: TABULA Belgium + ATIC
 *  - EPC-bijdrages: indicatief op basis van EPB 2022 reductiecurves (niet juridisch bindend)
 *  - CO2-factoren: ECOSCORE / CREG
 *
 * Alle waarden zijn conservatief (onderkant van range) voor geloofwaardige klant-communicatie.
 */

// Graaddagen Ukkel (Kelvin·dagen per jaar, basis 18°C)
export const GRAADDAGEN_UKKEL = 2100;
// Uren per dag waarbij we verwarmen (netto gebruik)
export const VERWARMINGSUREN_PER_DAG = 24;
// Factor om graaddagen om te zetten naar kWh-verlies: (Kd × 24u) / 1000 W/kW = kWh
export const GRAADDAGEN_FACTOR = (GRAADDAGEN_UKKEL * VERWARMINGSUREN_PER_DAG) / 1000;
// = 50,4 (klopt met TABULA warmteverlies-cijfers)

/**
 * U-waarden (W/m²K). Voor = bestaande situatie (niet of slecht geïsoleerd),
 * Na = situatie na de betreffende Enervia-ingreep.
 */
export const U_WAARDEN = {
  dak: {
    voor: 2.5,   // Ongeïsoleerd hellend dak of plat dak
    voor_licht_geisoleerd: 0.8, // Ouder dak met 4-5cm minerale wol
    na: 0.18,    // 140mm PIR (Rd 6,35)
  },
  gevel: {
    voor: 1.5,   // Spouwmuur zonder vulling (≈1965-1995)
    voor_massief: 2.0, // Massieve gevel
    na_spouw: 0.36, // Spouwvulling 5-6cm λ 0,036
    na_buitenisolatie: 0.22, // Buitenisolatie 12cm
  },
  ramen: {
    voor_enkel: 5.7,    // Enkel glas
    voor_dubbel_oud: 2.8, // Dubbel glas pré-1995
    voor_hr_plus: 1.4,    // HR+ dubbel glas
    na_hr_plus: 1.1,      // Nieuw HR+ PVC
    na_triple: 0.7,       // Triple glas
  },
  vloer: {
    voor: 1.2,   // Ongeïsoleerde betonvloer op volle grond
    na: 0.24,    // 8cm PUR
  },
} as const;

/**
 * Rendement bestaande verwarmingsketel / systeem.
 * Bepaalt hoeveel kWh brandstof nodig is om 1 kWh warmte te leveren.
 */
export const RENDEMENT_VERWARMING: Record<
  "gas" | "stookolie" | "elektrisch" | "hout",
  number
> = {
  gas: 0.92,         // Modern condensatieketel 92% rendement op onderwaarde
  stookolie: 0.85,   // Stookolieketel oudere generatie
  elektrisch: 1.0,   // Direct elektrisch (weerstand)
  hout: 0.75,        // Houtkachel
};

/** Kalorische waarden */
export const STOOKOLIE_KWH_PER_LITER = 10.0; // 10 kWh/liter stookolie

/**
 * EPC-impact per ingreep (kWh/m² woning · jaar reductie)
 *
 * Dit is een indicatieve bijdrage tot EPC-daling. Formeel correcte EPC
 * vergt certificatie-software (VEA). Gebruik uitsluitend voor
 * informatieve communicatie; disclaimer altijd zichtbaar.
 *
 * Referentiecurve: een woning van 150 m² met label E (±400 kWh/m²·j)
 * die alle ingrepen doet daalt naar label B (±180 kWh/m²·j).
 */
export const EPC_BIJDRAGE_KWH_M2_JAAR = {
  dak_volledig: 35,        // Volledige dakisolatie + afwerking
  dak_alleen_isolatie: 28, // Enkel isolatie zonder vernieuwing dakbedekking
  gevel_spouw: 25,
  gevel_buitenisolatie: 30,
  ramen_triple: 15,
  ramen_hr_plus: 10,
  vloer: 10,
  warmtepomp_lucht_water: 50,
  warmtepomp_geothermisch: 65,
  warmtepomp_hybride: 30,
  warmtepompboiler: 8,
  zonnepanelen_per_kwp: 7,  // ×kWp, typisch 6kWp → ±40
  thuisbatterij: 5,
  voorbereidingswerken: 0,
} as const;

/**
 * Indicatief niveau voor visuele communicatie (badge-kleur in UI/PDF).
 */
export type EPCNiveau = "geen" | "klein" | "middel" | "groot" | "zeer_groot";

export function epcNiveau(bijdrage: number): EPCNiveau {
  if (bijdrage === 0) return "geen";
  if (bijdrage < 10) return "klein";
  if (bijdrage < 25) return "middel";
  if (bijdrage < 45) return "groot";
  return "zeer_groot";
}

/**
 * Referentie EPC-waarden (kWh/m² · jaar) per label.
 * Conform Vlaamse methodologie voor open/halfopen/rijwoningen.
 */
export const EPC_LABEL_GRENZEN = {
  A: 100,   // ≤ 100
  B: 200,   // 101-200
  C: 300,   // 201-300
  D: 400,   // 301-400
  E: 500,   // 401-500
  F: 600,   // > 500
} as const;

export function epcLabelVanWaarde(kwh_m2_jaar: number): "A" | "B" | "C" | "D" | "E" | "F" {
  if (kwh_m2_jaar <= 100) return "A";
  if (kwh_m2_jaar <= 200) return "B";
  if (kwh_m2_jaar <= 300) return "C";
  if (kwh_m2_jaar <= 400) return "D";
  if (kwh_m2_jaar <= 500) return "E";
  return "F";
}

export function startwaardeVoorLabel(label: "A" | "B" | "C" | "D" | "E" | "F"): number {
  // Midden van het label-interval als startwaarde
  return { A: 80, B: 150, C: 250, D: 350, E: 450, F: 550 }[label];
}

/**
 * CO₂-emissiefactoren (kg CO₂ per kWh eindenergie).
 * Bron: VMM/ECOSCORE 2024.
 */
export const CO2_FACTOR_KG_PER_KWH = {
  aardgas: 0.202,
  stookolie: 0.267,
  elektriciteit_mix_be: 0.162,
  hout: 0.04, // (biogeen, enkel schoorsteen-emissies)
} as const;

/**
 * Referentie-woningoppervlak voor EPC-berekening wanneer niet bekend.
 * Gemiddelde Vlaamse eengezinswoning.
 */
export const DEFAULT_WONING_M2 = 150;

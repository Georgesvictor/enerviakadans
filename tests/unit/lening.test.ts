import { describe, expect, it } from "vitest";
import {
  berekenLening,
  checkMVLGeschiktheid,
} from "@/lib/veka/lening";
import type { KlantParameters } from "@/lib/berekeningen/types";

function baseParams(overrides: Partial<KlantParameters> = {}): KlantParameters {
  return {
    inkomenscategorie: 1,
    gezamenlijk_inkomen: 25_000,
    burgerlijke_staat: "alleenstaand",
    personen_ten_laste: 0,
    epc_label_voor: "E",
    epc_label_verwacht: "A",
    woning_ouderdom: "voor_2006",
    is_eigenaar: true,
    andere_woning_eigendom: false,
    is_gedomicilieerd: true,
    heeft_ventilatie: false,
    jaarverbruik_gas_kwh: 18_000,
    jaarverbruik_elektriciteit_kwh: 3_500,
    huidig_verwarmingstype: "gas",
    ...overrides,
  };
}

describe("MijnVerbouwLening geschiktheid", () => {
  it("cat.1 met alle voorwaarden is geschikt aan 0%", () => {
    const r = checkMVLGeschiktheid(baseParams());
    expect(r.geschikt).toBe(true);
    expect(r.rentevoet).toBe(0);
  });

  it("cat.2 geschikt aan 1%", () => {
    const r = checkMVLGeschiktheid(baseParams({ inkomenscategorie: 2 }));
    expect(r.geschikt).toBe(true);
    expect(r.rentevoet).toBe(0.01);
  });

  it("cat.3 nooit geschikt", () => {
    const r = checkMVLGeschiktheid(baseParams({ inkomenscategorie: 3 }));
    expect(r.geschikt).toBe(false);
  });

  it("niet-eigenaar is niet geschikt", () => {
    const r = checkMVLGeschiktheid(baseParams({ is_eigenaar: false }));
    expect(r.geschikt).toBe(false);
  });

  it("andere woning in eigendom is niet geschikt", () => {
    const r = checkMVLGeschiktheid(baseParams({ andere_woning_eigendom: true }));
    expect(r.geschikt).toBe(false);
  });
});

describe("annuïtaire lening formule", () => {
  it("0% rente = leenbedrag / (looptijd × 12)", () => {
    const r = berekenLening({
      type: "mijnverbouwlening",
      leenbedrag: 60_000,
      rentevoet_jaarlijks: 0,
      looptijd_jaar: 20,
      eigen_inbreng: 0,
    });
    expect(r.maandelijkse_afbetaling).toBeCloseTo(250, 2);
    expect(r.totale_interestkost).toBe(0);
  });

  it("3.5% rente over 20 jaar op 30k ≈ 174€/maand", () => {
    const r = berekenLening({
      type: "commercieel",
      leenbedrag: 30_000,
      rentevoet_jaarlijks: 0.035,
      looptijd_jaar: 20,
      eigen_inbreng: 0,
    });
    // standaard annuiteiten-tabellen: ~173.97 EUR
    expect(r.maandelijkse_afbetaling).toBeGreaterThan(172);
    expect(r.maandelijkse_afbetaling).toBeLessThan(175);
  });

  it("totale terugbetaling = maand × looptijd × 12", () => {
    const r = berekenLening({
      type: "commercieel",
      leenbedrag: 10_000,
      rentevoet_jaarlijks: 0.04,
      looptijd_jaar: 10,
      eigen_inbreng: 0,
    });
    // Rounding: maandafl. op 2 decimalen, totaal_terug_te_betalen is de
    // niet-gerolde exacte som. Verschil ≤ 1 EUR over 120 maanden.
    const diff = Math.abs(
      r.totaal_terug_te_betalen - r.maandelijkse_afbetaling * 10 * 12,
    );
    expect(diff).toBeLessThan(1);
    expect(r.totale_interestkost).toBeCloseTo(
      r.totaal_terug_te_betalen - 10_000,
      1,
    );
  });
});

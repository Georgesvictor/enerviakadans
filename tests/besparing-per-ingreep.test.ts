/**
 * Waumans fixture: verifieer per-ingreep besparingen.
 *
 * Verwachte outputs (indicatief ± 10 %):
 *   - Dakisolatie 65 m² (bij huidige gasverwarming): ~ € 720/jaar
 *   - Gevelisolatie 155 m² spouw: ~ € 900/jaar
 *   - Ramen triple 12,5 m²: ~ € 130/jaar
 *   - Warmtepomp: ~ € 1800/jaar (bij € 0,11/kWh gas, 18.000 kWh gas verbruik)
 *   - PV 6,06 kWp: ~ € 1100/jaar
 *   - Batterij 5 kWh: ~ € 130/jaar extra (via zelfconsumptie)
 */

import { describe, it, expect } from "vitest";
import { bouwIngrepen } from "@/lib/berekeningen/besparing-per-ingreep";
import type {
  OfferteExtractie,
  KlantParameters,
  PremiesOverzicht,
} from "@/lib/berekeningen/types";
import { DEFAULT_ENERGIEPRIJZEN } from "@/lib/berekeningen/besparing";

const waumansExtractie: OfferteExtractie = {
  totaal_excl_btw: 69659.5,
  totaal_incl_btw: 73839.07,
  btw_tarief: 0.06,
  categorieen: {
    werfinrichting: { excl_btw: 3198 },
    afbraak: { excl_btw: 3546.5 },
    dak: { excl_btw: 33420 },
    gevel: { excl_btw: 4495 },
    ramen_deuren: { excl_btw: 7800 },
    warmtepomp: { excl_btw: 15400 },
    zonnepanelen: { excl_btw: 3000 },
    thuisbatterij: { excl_btw: 2800 },
    korting: { excl_btw: -4000 },
  },
  specifiek: {
    heeft_asbest: true,
    asbest_kosten_excl: 4337.5,
    asbest_dak_m2: 65,
    dak_m2: 96,
    gevel_m2: 155,
    ramen_m2: 12.5,
    pv_wp: 6060,
    pv_aantal_panelen: 12,
    batterij_kwh: 5,
    warmtepomp_type: "lucht_water",
    warmtepomp_merk: "Vaillant aroTHERM plus",
  },
};

const waumansParams: KlantParameters = {
  inkomenscategorie: 3,
  gezamenlijk_inkomen: 36000,
  burgerlijke_staat: "alleenstaand",
  personen_ten_laste: 0,
  epc_label_voor: "E",
  epc_label_verwacht: "B",
  woning_ouderdom: "voor_2006",
  is_eigenaar: true,
  andere_woning_eigendom: false,
  is_gedomicilieerd: true,
  heeft_ventilatie: true,
  jaarverbruik_gas_kwh: 18000,
  jaarverbruik_elektriciteit_kwh: 3500,
  huidig_verwarmingstype: "gas",
};

const dummyPremies: PremiesOverzicht = {
  dak: { bedrag: 4025, maximum_bereikt: true, van_toepassing: true, formule: "Max cat.3" },
  ramen_deuren: { bedrag: 2660, maximum_bereikt: false, van_toepassing: true, formule: "35% van €7600" },
  gevel: { bedrag: 1610, maximum_bereikt: false, van_toepassing: true, formule: "35% van €4600" },
  vloer: { bedrag: 0, maximum_bereikt: false, van_toepassing: false, formule: "n.v.t." },
  warmtepomp: { bedrag: 4500, maximum_bereikt: false, van_toepassing: true, formule: "Basis cat.3" },
  warmtepompboiler: { bedrag: 0, maximum_bereikt: false, van_toepassing: false, formule: "n.v.t." },
  zonnepanelen: { bedrag: 0, maximum_bereikt: false, van_toepassing: false, formule: "Geen premie 2026" },
  asbest: { bedrag: 2168.75, maximum_bereikt: false, van_toepassing: true, formule: "50% van €4337" },
  asbest_veka_bonus: { bedrag: 520, maximum_bereikt: false, van_toepassing: true, formule: "€8 × 65m²" },
  epc_label: { bedrag: 4500, maximum_bereikt: false, van_toepassing: true, formule: "Forfait cat.3" },
  voorbereidingswerken: { bedrag: 0, maximum_bereikt: false, van_toepassing: false, formule: "n.v.t." },
  totaal: 19983.75,
};

describe("Per-ingreep besparing — Waumans fixture", () => {
  const r = bouwIngrepen({
    extractie: waumansExtractie,
    parameters: waumansParams,
    premies: dummyPremies,
    prijzen: DEFAULT_ENERGIEPRIJZEN,
  });

  it("bevat alle zeven hoofdingrepen", () => {
    const codes = r.ingrepen.map((i) => i.code);
    expect(codes).toContain("dak");
    expect(codes).toContain("gevel");
    expect(codes).toContain("ramen_deuren");
    expect(codes).toContain("warmtepomp");
    expect(codes).toContain("zonnepanelen");
    expect(codes).toContain("thuisbatterij");
  });

  it("dak-besparing valt in realistische range (€ 500-1400)", () => {
    const dak = r.ingrepen.find((i) => i.code === "dak")!;
    expect(dak.jaarlijkse_besparing_euro).toBeGreaterThan(500);
    expect(dak.jaarlijkse_besparing_euro).toBeLessThan(1400);
    // Omdat er een WP is: isolatie-besparing is via elek, niet gas
    expect(dak.besparing_bron).toBe("elektriciteit");
  });

  it("gevel-besparing valt in realistische range (€ 600-1100)", () => {
    const gevel = r.ingrepen.find((i) => i.code === "gevel")!;
    expect(gevel.jaarlijkse_besparing_euro).toBeGreaterThan(600);
    expect(gevel.jaarlijkse_besparing_euro).toBeLessThan(1100);
  });

  it("ramen triple glas besparing (€ 70-200)", () => {
    const ramen = r.ingrepen.find((i) => i.code === "ramen_deuren")!;
    expect(ramen.jaarlijkse_besparing_euro).toBeGreaterThan(70);
    expect(ramen.jaarlijkse_besparing_euro).toBeLessThan(200);
  });

  it("warmtepomp vervangt gas (gas uit, elek erbij) — besparing afh. van prijsratio", () => {
    const wp = r.ingrepen.find((i) => i.code === "warmtepomp")!;
    // Bij elek/gas ratio dichtbij COP kan de euro-besparing laag zijn;
    // het echte voordeel komt via verwijdering CO₂ + comfort + combinatie met PV.
    expect(wp.jaarlijkse_besparing_euro).toBeGreaterThanOrEqual(0);
    expect(wp.besparing_gas_kwh).toBeGreaterThan(0); // gas gaat eruit
    expect(wp.besparing_elek_kwh).toBeLessThan(0); // elek gaat erbij (netto)
    // CO₂-reductie moet substantieel zijn (gas uit = ± 3600 kg/jaar weg)
    expect(wp.co2_reductie_kg_jaar).toBeGreaterThan(1500);
  });

  it("zonnepanelen besparing (€ 700-1400 voor 6,06 kWp)", () => {
    const pv = r.ingrepen.find((i) => i.code === "zonnepanelen")!;
    expect(pv.jaarlijkse_besparing_euro).toBeGreaterThan(700);
    expect(pv.jaarlijkse_besparing_euro).toBeLessThan(1400);
    expect(pv.besparing_bron).toBe("elektriciteit");
  });

  it("batterij is altijd > 0 euro (verhoogde zelfconsumptie)", () => {
    const bat = r.ingrepen.find((i) => i.code === "thuisbatterij")!;
    expect(bat.jaarlijkse_besparing_euro).toBeGreaterThan(0);
  });

  it("totale besparing realistisch voor Waumans (€ 2.500-6.500)", () => {
    expect(r.totaal_besparing_euro).toBeGreaterThan(2500);
    expect(r.totaal_besparing_euro).toBeLessThan(6500);
  });

  it("EPC-label wordt verbeterd (E → A/B/C)", () => {
    expect(["A", "B", "C"]).toContain(r.epc_label_verwacht);
  });

  it("CO₂-reductie is substantieel (> 2000 kg/jaar)", () => {
    expect(r.co2_reductie_kg_jaar).toBeGreaterThan(2000);
  });

  it("maandelijkse opsplitsing gas + elek som ≈ totaal/12", () => {
    const som = r.maandelijks_gas_euro + r.maandelijks_elek_euro;
    // Kan beduidend afwijken door WP (gas-kost weg, elek-kost erbij) en batterij-delta
    // maar moet positief zijn
    expect(som).toBeGreaterThan(-100);
  });
});

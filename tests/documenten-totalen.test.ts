import { describe, it, expect } from "vitest";
import {
  berekenTotalen,
  gestructureerdeMedeling,
} from "@/lib/documenten/totalen";

describe("Document totalen", () => {
  it("berekent subtotalen + BTW correct voor simpele regels", () => {
    const r = berekenTotalen([
      { aantal: 2, prijs_excl_btw: 100, btw_tarief: 0.21 },
      { aantal: 5, prijs_excl_btw: 10, btw_tarief: 0.21 },
    ]);
    expect(r.subtotaal_excl_btw).toBe(250);
    expect(r.totaal_btw).toBeCloseTo(52.5, 2);
    expect(r.totaal_incl_btw).toBeCloseTo(302.5, 2);
  });

  it("past korting correct toe", () => {
    const r = berekenTotalen(
      [
        { aantal: 1, prijs_excl_btw: 100, btw_tarief: 0.21 },
        { aantal: 1, prijs_excl_btw: 100, btw_tarief: 0.21 },
      ],
      10, // 10 % korting
    );
    expect(r.subtotaal_excl_btw).toBe(180);
    expect(r.korting_bedrag).toBe(20);
  });

  it("regelkorting + globale korting combineren", () => {
    const r = berekenTotalen(
      [{ aantal: 1, prijs_excl_btw: 100, korting_pct: 10, btw_tarief: 0.21 }],
      10,
    );
    expect(r.subtotaal_excl_btw).toBe(81); // 100 -10% = 90, -10% = 81
  });

  it("groepeert BTW per tarief", () => {
    const r = berekenTotalen([
      { aantal: 1, prijs_excl_btw: 100, btw_tarief: 0.21 },
      { aantal: 1, prijs_excl_btw: 200, btw_tarief: 0.06 },
      { aantal: 1, prijs_excl_btw: 50, btw_tarief: 0.21 },
    ]);
    expect(r.btw_per_tarief).toHaveLength(2);
    const t21 = r.btw_per_tarief.find((t) => t.tarief === 0.21)!;
    expect(t21.grondslag).toBe(150);
    expect(t21.btw).toBeCloseTo(31.5, 2);
  });

  it("kop-regels tellen niet mee", () => {
    const r = berekenTotalen([
      { aantal: 0, prijs_excl_btw: 0, btw_tarief: 0, is_kop: true },
      { aantal: 1, prijs_excl_btw: 100, btw_tarief: 0.21 },
    ]);
    expect(r.subtotaal_excl_btw).toBe(100);
  });

  it("gestructureerde mededeling heeft correct formaat", () => {
    const m = gestructureerdeMedeling("123456789");
    expect(m).toMatch(/^\+\+\+\d{3}\/\d{4}\/\d{5}\+\+\+$/);
  });

  it("gestructureerde mededeling check-digits correct", () => {
    // 2023000123 % 97 = 36
    const m = gestructureerdeMedeling("2023000123");
    expect(m.slice(-5, -3)).toBe("36");
  });
});

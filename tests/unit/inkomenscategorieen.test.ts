import { describe, expect, it } from "vitest";
import {
  bepaalCategorie,
  DREMPELS_2026,
} from "@/lib/veka/inkomenscategorieen";

describe("inkomenscategorieën 2026", () => {
  it("plaatst laag inkomen alleenstaand in cat.1", () => {
    expect(bepaalCategorie(20_000, "alleenstaand", 0)).toBe(1);
  });

  it("net onder drempel cat.1 alleenstaand blijft cat.1", () => {
    expect(bepaalCategorie(DREMPELS_2026.alleenstaand.cat1, "alleenstaand", 0)).toBe(1);
  });

  it("1 eur boven cat.1 alleenstaand springt naar cat.2", () => {
    expect(
      bepaalCategorie(DREMPELS_2026.alleenstaand.cat1 + 1, "alleenstaand", 0),
    ).toBe(2);
  });

  it("Waumans-scenario: 36k inkomen alleenstaand = cat.2", () => {
    expect(bepaalCategorie(36_000, "alleenstaand", 0)).toBe(2);
  });

  it("koppel hoog inkomen valt in cat.3", () => {
    expect(bepaalCategorie(80_000, "koppel", 0)).toBe(3);
  });

  it("2 kinderen verhogen drempels", () => {
    // koppel cat.1 = 38170, +2*4290 = 46750
    expect(bepaalCategorie(45_000, "koppel", 2)).toBe(1);
    expect(bepaalCategorie(48_000, "koppel", 2)).toBe(2);
  });
});

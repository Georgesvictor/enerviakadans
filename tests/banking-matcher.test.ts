/**
 * Simpele unit-tests voor banking matcher — pure functies zonder DB.
 */

import { describe, it, expect } from "vitest";

// Re-implementeer de match-logica als pure functie voor testbaarheid
interface TestTransactie {
  gestructureerde_mededeling?: string;
  mededeling?: string;
  bedrag: number;
  tegenpartij_naam?: string;
}

interface TestInvoice {
  gestructureerde_mededeling?: string;
  totaal_incl_btw: number;
  reeds_betaald: number;
  klantnaam: string;
}

function norm(s: string | null | undefined): string {
  return (s ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function match(t: TestTransactie, invoices: TestInvoice[]) {
  if (t.gestructureerde_mededeling) {
    const gm = norm(t.gestructureerde_mededeling);
    const inv = invoices.find(
      (i) => norm(i.gestructureerde_mededeling) === gm,
    );
    if (inv) return { invoice: inv, vertrouwen: 100, type: "auto_mededeling" };
  }
  const inv = invoices.find((i) => {
    const open = i.totaal_incl_btw - i.reeds_betaald;
    if (Math.abs(open - t.bedrag) > 0.01) return false;
    const naamMatch =
      norm(t.tegenpartij_naam).includes(norm(i.klantnaam));
    return naamMatch;
  });
  if (inv) return { invoice: inv, vertrouwen: 80, type: "auto_bedrag_datum" };
  return null;
}

describe("Banking matcher", () => {
  const invoices: TestInvoice[] = [
    {
      gestructureerde_mededeling: "+++123/4567/89012+++",
      totaal_incl_btw: 1000,
      reeds_betaald: 0,
      klantnaam: "Waumans Nathalie",
    },
    {
      gestructureerde_mededeling: "+++999/9999/99988+++",
      totaal_incl_btw: 500,
      reeds_betaald: 0,
      klantnaam: "De Smet",
    },
  ];

  it("matcht op exacte gestructureerde mededeling", () => {
    const t: TestTransactie = {
      gestructureerde_mededeling: "+++123/4567/89012+++",
      bedrag: 1000,
    };
    const m = match(t, invoices);
    expect(m?.vertrouwen).toBe(100);
    expect(m?.invoice.klantnaam).toBe("Waumans Nathalie");
  });

  it("matcht op bedrag + tegenpartij naam bij ongestructureerde mededeling", () => {
    const t: TestTransactie = {
      mededeling: "Betaling voor renovatie",
      bedrag: 500,
      tegenpartij_naam: "De Smet Johan",
    };
    const m = match(t, invoices);
    expect(m?.vertrouwen).toBe(80);
    expect(m?.invoice.klantnaam).toBe("De Smet");
  });

  it("faalt als bedrag niet klopt", () => {
    const t: TestTransactie = {
      mededeling: "Iets",
      bedrag: 999,
      tegenpartij_naam: "De Smet",
    };
    expect(match(t, invoices)).toBeNull();
  });

  it("negeert spaties en leestekens in gestructureerde mededeling", () => {
    const t: TestTransactie = {
      gestructureerde_mededeling: "123/4567/89012",
      bedrag: 1000,
    };
    const m = match(t, invoices);
    expect(m?.vertrouwen).toBe(100);
  });
});

/**
 * Dagelijkse update van energieprijzen.
 *
 * VREG publiceert elektriciteitsprijzen via hun V-test API.
 * CREG publiceert gasprijzen via hun dashboard (scraping).
 * Stookolie: Vlaamse stookoliefederatie publiceert dagprijzen.
 *
 * In productie: roep deze op via cronjob `app/api/cron/energieprijzen/route.ts`.
 * In fallback: admin kan manueel prijzen invoeren in /dashboard/instellingen.
 */

import { setEnergieprijs } from "./index";

const VREG_FALLBACK = 0.35; // EUR/kWh (all-in cat.3 zonder kortingen)
const CREG_GAS_FALLBACK = 0.11;
const STOOKOLIE_FALLBACK = 1.05;
const TERUGLEVER_FALLBACK = 0.04;

/**
 * Haalt gemiddelde all-in elektriciteitsprijs op voor een Vlaams
 * huishouden met digitale meter en zonnepanelen-vergoeding.
 *
 * Noot: VREG API endpoints veranderen frequent. Bij 404 of HTML-
 * response valt deze functie terug op een laatst-bekende waarde.
 */
export async function haalVREGElektriciteit(): Promise<number> {
  try {
    const res = await fetch(
      "https://api.vreg.be/v1/energieprijzen/elektriciteit/gemiddelde",
      { signal: AbortSignal.timeout(10_000) },
    );
    if (!res.ok) return VREG_FALLBACK;
    const json = (await res.json()) as { prijs_kwh?: number };
    return json.prijs_kwh ?? VREG_FALLBACK;
  } catch {
    return VREG_FALLBACK;
  }
}

export async function haalCREGGas(): Promise<number> {
  try {
    const res = await fetch("https://www.creg.be/nl/data/prices/gas.json", {
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return CREG_GAS_FALLBACK;
    const json = (await res.json()) as { average_kwh?: number };
    return json.average_kwh ?? CREG_GAS_FALLBACK;
  } catch {
    return CREG_GAS_FALLBACK;
  }
}

export async function haalStookolieprijs(): Promise<number> {
  try {
    const res = await fetch(
      "https://economie.fgov.be/api/maximum-stookolieprijs",
      { signal: AbortSignal.timeout(10_000) },
    );
    if (!res.ok) return STOOKOLIE_FALLBACK;
    const json = (await res.json()) as { prijs_per_liter?: number };
    return json.prijs_per_liter ?? STOOKOLIE_FALLBACK;
  } catch {
    return STOOKOLIE_FALLBACK;
  }
}

export async function updateAllePrijzen(): Promise<void> {
  const [elek, gas, stookolie] = await Promise.all([
    haalVREGElektriciteit(),
    haalCREGGas(),
    haalStookolieprijs(),
  ]);

  await Promise.all([
    setEnergieprijs("elektriciteit", elek, "VREG"),
    setEnergieprijs("gas", gas, "CREG"),
    setEnergieprijs("stookolie", stookolie, "manueel"),
    setEnergieprijs("teruglevering", TERUGLEVER_FALLBACK, "VREG"),
  ]);
}

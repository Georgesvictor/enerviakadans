/**
 * VEKA MijnVerbouwPremie + MijnVerbouwLening scraper voor verificatie.
 *
 * Wordt asynchroon uitgevoerd via BullMQ (niet-blokkerend).
 * Resultaat gaat naar `premie_simulaties.veka_resultaat` en wordt
 * vergeleken met onze eigen berekening — mismatches tonen in admin.
 */

import { chromium, type Browser } from "playwright";
import type { KlantParameters } from "@/lib/berekeningen/types";

const VEKA_PREMIE_URL = "https://apps.energiesparen.be/mijnverbouwpremie";
const VEKA_LENING_URL = "https://apps.energiesparen.be/mijnverbouwlening";

let sharedBrowser: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  if (sharedBrowser) return sharedBrowser;
  sharedBrowser = await chromium.launch({ headless: true });
  return sharedBrowser;
}

export async function scrapeVEKAPremie(
  params: KlantParameters,
  investeringen: {
    dak?: number;
    gevel?: number;
    ramen?: number;
    vloer?: number;
    warmtepomp?: number;
  },
): Promise<{ totaal: number; details: Record<string, number> } | null> {
  const browser = await getBrowser();
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  try {
    await page.goto(VEKA_PREMIE_URL, { waitUntil: "networkidle" });

    // VEKA's simulator is een wizard; vul stap voor stap in.
    // Dit is een best-effort implementatie - exacte selectors moeten
    // manueel nagekeken worden bij eerste run (en bij elke VEKA-update).

    await page
      .getByLabel("Burgerlijke staat")
      .selectOption(params.burgerlijke_staat === "koppel" ? "koppel" : "alleen");
    await page
      .getByLabel("Gezamenlijk inkomen")
      .fill(String(params.gezamenlijk_inkomen));
    if (params.personen_ten_laste > 0) {
      await page
        .getByLabel("Personen ten laste")
        .fill(String(params.personen_ten_laste));
    }
    await page.getByRole("button", { name: /Volgende/i }).click();

    // Werken-selectie
    if (investeringen.dak && investeringen.dak > 0) {
      await page.getByLabel(/Dakisolatie/i).check();
      await page
        .getByLabel(/Investering dak/i)
        .fill(String(investeringen.dak));
    }
    if (investeringen.gevel && investeringen.gevel > 0) {
      await page.getByLabel(/Gevelisolatie/i).check();
      await page.getByLabel(/Investering gevel/i).fill(String(investeringen.gevel));
    }
    if (investeringen.ramen && investeringen.ramen > 0) {
      await page.getByLabel(/Ramen/i).check();
      await page.getByLabel(/Investering ramen/i).fill(String(investeringen.ramen));
    }
    if (investeringen.warmtepomp && investeringen.warmtepomp > 0) {
      await page.getByLabel(/Warmtepomp/i).check();
      await page
        .getByLabel(/Investering warmtepomp/i)
        .fill(String(investeringen.warmtepomp));
    }

    await page.getByRole("button", { name: /Bereken/i }).click();
    await page.waitForSelector('[data-testid="totaal-premie"]', {
      timeout: 20_000,
    });

    const totaalText = await page.textContent('[data-testid="totaal-premie"]');
    const totaal = Number(totaalText?.replace(/[^0-9,]/g, "").replace(",", "."));

    const details: Record<string, number> = {};
    for (const [key] of Object.entries(investeringen)) {
      const txt = await page
        .textContent(`[data-testid="premie-${key}"]`)
        .catch(() => null);
      if (txt) {
        details[key] = Number(txt.replace(/[^0-9,]/g, "").replace(",", "."));
      }
    }

    return { totaal, details };
  } catch (err) {
    console.error("VEKA scrape faalde:", err);
    return null;
  } finally {
    await ctx.close();
  }
}

export async function closeScrapeBrowser() {
  if (sharedBrowser) {
    await sharedBrowser.close();
    sharedBrowser = null;
  }
}

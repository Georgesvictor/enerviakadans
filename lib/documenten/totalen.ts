/**
 * Herbruikbare berekeningslogica voor offertes/facturen.
 * Berekent subtotalen, BTW en totalen voor een set regels.
 */

export interface DocumentRegel {
  aantal: number;
  prijs_excl_btw: number;
  korting_pct?: number;
  btw_tarief: number; // 0.21, 0.06, ...
  is_kop?: boolean;
}

export interface RegelTotalen extends DocumentRegel {
  subtotaal_excl_btw: number;
  subtotaal_btw: number;
  subtotaal_incl_btw: number;
}

export interface DocumentTotalen {
  regels: RegelTotalen[];
  subtotaal_excl_btw: number;   // som van regels na korting, excl BTW
  totaal_btw: number;
  totaal_incl_btw: number;
  btw_per_tarief: Array<{ tarief: number; grondslag: number; btw: number }>;
  korting_bedrag: number;       // absolute korting toegepast op kop-niveau
}

export function berekenRegel(r: DocumentRegel): RegelTotalen {
  if (r.is_kop) {
    return { ...r, subtotaal_excl_btw: 0, subtotaal_btw: 0, subtotaal_incl_btw: 0 };
  }
  const bruto = r.aantal * r.prijs_excl_btw;
  const korting = bruto * ((r.korting_pct ?? 0) / 100);
  const netto = Math.max(0, bruto - korting);
  const btw = netto * r.btw_tarief;
  return {
    ...r,
    subtotaal_excl_btw: round2(netto),
    subtotaal_btw: round2(btw),
    subtotaal_incl_btw: round2(netto + btw),
  };
}

export function berekenTotalen(
  regels: DocumentRegel[],
  kortingPct = 0,
): DocumentTotalen {
  const berekend = regels.map(berekenRegel);

  const subtotaalVoorKorting = berekend.reduce(
    (s, r) => s + r.subtotaal_excl_btw,
    0,
  );
  const kortingBedrag = subtotaalVoorKorting * (kortingPct / 100);
  const factor = subtotaalVoorKorting > 0
    ? (subtotaalVoorKorting - kortingBedrag) / subtotaalVoorKorting
    : 1;

  // Pas korting evenredig toe per regel voor correcte BTW-groepering
  const aangepast = berekend.map((r) => ({
    ...r,
    subtotaal_excl_btw: round2(r.subtotaal_excl_btw * factor),
    subtotaal_btw: round2(r.subtotaal_btw * factor),
    subtotaal_incl_btw: round2(r.subtotaal_incl_btw * factor),
  }));

  const subtotaal = aangepast.reduce((s, r) => s + r.subtotaal_excl_btw, 0);
  const totaalBtw = aangepast.reduce((s, r) => s + r.subtotaal_btw, 0);
  const totaalIncl = subtotaal + totaalBtw;

  const tarieven = new Map<number, { grondslag: number; btw: number }>();
  for (const r of aangepast) {
    if (r.is_kop || r.subtotaal_excl_btw === 0) continue;
    const cur = tarieven.get(r.btw_tarief) ?? { grondslag: 0, btw: 0 };
    cur.grondslag += r.subtotaal_excl_btw;
    cur.btw += r.subtotaal_btw;
    tarieven.set(r.btw_tarief, cur);
  }
  const btw_per_tarief = Array.from(tarieven.entries()).map(([tarief, v]) => ({
    tarief,
    grondslag: round2(v.grondslag),
    btw: round2(v.btw),
  }));

  return {
    regels: aangepast,
    subtotaal_excl_btw: round2(subtotaal),
    totaal_btw: round2(totaalBtw),
    totaal_incl_btw: round2(totaalIncl),
    btw_per_tarief,
    korting_bedrag: round2(kortingBedrag),
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Gestructureerde mededeling (OGM/VCS) voor Belgische overschrijvingen.
 * Formaat: +++XXX/XXXX/XXXXX+++
 * Check-digits = getal % 97, 00 → 97
 */
export function gestructureerdeMedeling(base: string): string {
  // Maak base numeriek (neem enkel cijfers, pad tot 10)
  const cijfers = base.replace(/\D/g, "").slice(-10).padStart(10, "0");
  // Modulo 97 zonder BigInt: chunked berekening voor veilige precisie
  let mod = 0;
  for (let i = 0; i < cijfers.length; i++) {
    mod = (mod * 10 + Number(cijfers[i])) % 97;
  }
  let controle = mod;
  if (controle === 0) controle = 97;
  const full = cijfers + controle.toString().padStart(2, "0");
  return `+++${full.slice(0, 3)}/${full.slice(3, 7)}/${full.slice(7)}+++`;
}

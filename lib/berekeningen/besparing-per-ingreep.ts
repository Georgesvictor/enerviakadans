/**
 * Per-ingreep besparingsorchestrator.
 *
 * Bouwt een IngreepBesparing[] — één lijn per werk uit de offerte — met
 * per-ingreep technische fiche, jaarlijkse besparing (€ en kWh), EPC-impact,
 * CO₂-reductie en terugverdientijd.
 *
 * Strategie:
 *  1. Bepaal welke ingrepen aanwezig zijn in de extractie.
 *  2. Bereken per isolatie-ingreep via U-waarde methode.
 *  3. Herbruik bestaande warmtepomp- en PV-logica.
 *  4. Koppel premies uit PremiesOverzicht aan elke ingreep (voor ROI).
 *  5. Bepaal gas- versus elektriciteit-splitsing per ingreep.
 *  6. Bereken EPC-impact + verwacht label.
 */

import type {
  IngreepBesparing,
  KlantParameters,
  OfferteExtractie,
  PremiesOverzicht,
  IngreepCode,
  BesparingBron,
} from "./types";
import {
  berekenIsolatieBesparing,
  uVoorDak,
  uVoorGevel,
  uVoorRamen,
  uVoorVloer,
} from "./besparing-isolatie";
import { berekenWarmtepompBesparing, defaultCOP } from "./besparing-warmtepomp";
import { berekenPVBesparing } from "./besparing-pv";
import {
  CO2_FACTOR_KG_PER_KWH,
  DEFAULT_WONING_M2,
  EPC_BIJDRAGE_KWH_M2_JAAR,
  U_WAARDEN,
  epcLabelVanWaarde,
  epcNiveau,
  startwaardeVoorLabel,
} from "./constanten";
import type { EnergiePrijzenSnapshot } from "./besparing";

export interface PerIngreepInput {
  extractie: OfferteExtractie;
  parameters: KlantParameters;
  premies: PremiesOverzicht;
  prijzen: EnergiePrijzenSnapshot;
  woning_m2?: number;
}

export interface PerIngreepResultaat {
  ingrepen: IngreepBesparing[];
  totaal_besparing_euro: number;
  totaal_besparing_gas_kwh: number;
  totaal_besparing_elek_kwh: number;
  maandelijks_gas_euro: number;
  maandelijks_elek_euro: number;
  maandelijks_totaal_euro: number;
  co2_reductie_kg_jaar: number;
  epc_kwh_m2_voor: number;
  epc_kwh_m2_na: number;
  epc_label_voor: "A" | "B" | "C" | "D" | "E" | "F";
  epc_label_verwacht: "A" | "B" | "C" | "D" | "E" | "F";
}

function buildIngreep(args: {
  code: IngreepCode;
  titel: string;
  korte_omschrijving: string;
  technische_specs: string[];
  investering_excl_btw: number;
  btw_tarief: number;
  premie_bedrag: number;
  jaarlijkse_besparing_euro: number;
  jaarlijkse_besparing_kwh: number;
  besparing_gas_kwh: number;
  besparing_elek_kwh: number;
  besparing_bron: BesparingBron;
  epc_impact_kwh_m2_jaar: number;
  toelichting: string;
  formule?: string;
}): IngreepBesparing {
  const invIncl = args.investering_excl_btw * (1 + args.btw_tarief);
  const netto = Math.max(0, invIncl - args.premie_bedrag);
  const maand = args.jaarlijkse_besparing_euro / 12;
  const tvt = args.jaarlijkse_besparing_euro > 0
    ? netto / args.jaarlijkse_besparing_euro
    : null;
  const co2 =
    args.besparing_gas_kwh * CO2_FACTOR_KG_PER_KWH.aardgas +
    Math.max(0, args.besparing_elek_kwh) * CO2_FACTOR_KG_PER_KWH.elektriciteit_mix_be;

  return {
    code: args.code,
    titel: args.titel,
    korte_omschrijving: args.korte_omschrijving,
    technische_specs: args.technische_specs,
    investering_excl_btw: round2(args.investering_excl_btw),
    investering_incl_btw: round2(invIncl),
    premie_bedrag: round2(args.premie_bedrag),
    netto_investering: round2(netto),
    jaarlijkse_besparing_euro: round2(args.jaarlijkse_besparing_euro),
    jaarlijkse_besparing_kwh: Math.round(args.jaarlijkse_besparing_kwh),
    besparing_bron: args.besparing_bron,
    besparing_gas_kwh: Math.round(args.besparing_gas_kwh),
    besparing_elek_kwh: Math.round(args.besparing_elek_kwh),
    maandelijkse_besparing_euro: round2(maand),
    epc_impact_kwh_m2_jaar: round1(args.epc_impact_kwh_m2_jaar),
    epc_impact_niveau: epcNiveau(args.epc_impact_kwh_m2_jaar),
    terugverdientijd_jaar: tvt !== null ? round1(tvt) : null,
    co2_reductie_kg_jaar: Math.round(co2),
    toelichting: args.toelichting,
    formule: args.formule,
  };
}

const round1 = (n: number) => Math.round(n * 10) / 10;
const round2 = (n: number) => Math.round(n * 100) / 100;

export function bouwIngrepen(input: PerIngreepInput): PerIngreepResultaat {
  const { extractie, parameters, premies, prijzen } = input;
  const btw = extractie.btw_tarief;
  const cat = extractie.categorieen;
  const sp = extractie.specifiek;
  const heeftWP = !!sp.warmtepomp_type && (cat.warmtepomp?.excl_btw ?? 0) > 0;
  const wpCOP = sp.warmtepomp_type ? defaultCOP(sp.warmtepomp_type) : undefined;

  const ingrepen: IngreepBesparing[] = [];

  const commonIsolatie = {
    verwarmingstype: parameters.huidig_verwarmingstype,
    prijs_gas_per_kwh: prijzen.gas_per_kwh,
    prijs_stookolie_per_liter: prijzen.stookolie_per_liter,
    prijs_elektriciteit_per_kwh: prijzen.elektriciteit_per_kwh,
    vervangt_warmtepomp_cop: heeftWP ? wpCOP : undefined,
  };

  // -------- DAK --------
  if (cat.dak && sp.dak_m2 && sp.dak_m2 > 0) {
    const uVoor = uVoorDak(parameters.woning_ouderdom);
    const res = berekenIsolatieBesparing({
      ...commonIsolatie,
      oppervlakte_m2: sp.dak_m2,
      u_voor: uVoor,
      u_na: U_WAARDEN.dak.na,
    });
    ingrepen.push(
      buildIngreep({
        code: "dak",
        titel: `Dakrenovatie met 140 mm PIR-isolatie (${sp.dak_m2} m²)`,
        korte_omschrijving: sp.heeft_asbest
          ? `Asbest-dak verwijderd + ${sp.dak_m2} m² nieuwe opbouw met hoogrendement PIR-isolatie`
          : `${sp.dak_m2} m² dakvernieuwing met hoogrendement PIR-isolatie`,
        technische_specs: [
          "140 mm PIR-isolatie, λ = 0,022 W/mK",
          "Rd-waarde 6,35 m²K/W (conform EPB-eisen)",
          `Nieuwe U-waarde: ${U_WAARDEN.dak.na.toFixed(2)} W/m²K (was ${uVoor.toFixed(1)})`,
          sp.heeft_asbest ? "Asbesthoudende dakbedekking gesaneerd volgens OVAM-richtlijnen" : "",
          "Dampdoorlatend onderdak, nieuwe pannen/roofing, dakrand en goten",
        ].filter(Boolean),
        investering_excl_btw: cat.dak.excl_btw,
        btw_tarief: btw,
        premie_bedrag: (premies.dak?.bedrag ?? 0) + (premies.asbest?.bedrag ?? 0) + (premies.asbest_veka_bonus?.bedrag ?? 0),
        jaarlijkse_besparing_euro: res.besparing_euro,
        jaarlijkse_besparing_kwh: res.warmtevraag_reductie_kwh,
        besparing_gas_kwh: res.besparing_gas_kwh,
        besparing_elek_kwh: res.besparing_elek_kwh,
        besparing_bron: res.besparing_bron === "stookolie" ? "gas" : (res.besparing_bron as BesparingBron),
        epc_impact_kwh_m2_jaar: EPC_BIJDRAGE_KWH_M2_JAAR.dak_volledig,
        toelichting: `Reduceert het warmteverlies via het dak met ± ${Math.round((1 - U_WAARDEN.dak.na / uVoor) * 100)} %. Essentieel voor comfort en EPC-sprong.`,
        formule: res.formule,
      }),
    );
  }

  // -------- GEVEL --------
  if (cat.gevel && sp.gevel_m2 && sp.gevel_m2 > 0) {
    const res = berekenIsolatieBesparing({
      ...commonIsolatie,
      oppervlakte_m2: sp.gevel_m2,
      u_voor: uVoorGevel(),
      u_na: U_WAARDEN.gevel.na_spouw,
    });
    ingrepen.push(
      buildIngreep({
        code: "gevel",
        titel: `Gevelisolatie (spouwvulling, ${sp.gevel_m2} m²)`,
        korte_omschrijving: `Spouwmuurisolatie ${sp.gevel_m2} m² — reduceert warmteverlies via gevel`,
        technische_specs: [
          "Spouwmuurvulling Isobouw Ecocons (5-6 cm), λ = 0,036 W/mK",
          `Nieuwe U-waarde: ${U_WAARDEN.gevel.na_spouw.toFixed(2)} W/m²K (was ${U_WAARDEN.gevel.voor.toFixed(1)})`,
          "Verhoogt comfort in zomer én winter, vermijdt koudebruggen",
        ],
        investering_excl_btw: cat.gevel.excl_btw,
        btw_tarief: btw,
        premie_bedrag: premies.gevel?.bedrag ?? 0,
        jaarlijkse_besparing_euro: res.besparing_euro,
        jaarlijkse_besparing_kwh: res.warmtevraag_reductie_kwh,
        besparing_gas_kwh: res.besparing_gas_kwh,
        besparing_elek_kwh: res.besparing_elek_kwh,
        besparing_bron: res.besparing_bron === "stookolie" ? "gas" : (res.besparing_bron as BesparingBron),
        epc_impact_kwh_m2_jaar: EPC_BIJDRAGE_KWH_M2_JAAR.gevel_spouw,
        toelichting: `Ongeïsoleerde gevel is doorgaans verantwoordelijk voor 25-30 % van het warmteverlies. Spouwvulling is de meest kostenefficiënte ingreep.`,
        formule: res.formule,
      }),
    );
  }

  // -------- RAMEN --------
  if (cat.ramen_deuren && sp.ramen_m2 && sp.ramen_m2 > 0) {
    const uVoor = uVoorRamen("dubbel_oud");
    const res = berekenIsolatieBesparing({
      ...commonIsolatie,
      oppervlakte_m2: sp.ramen_m2,
      u_voor: uVoor,
      u_na: U_WAARDEN.ramen.na_triple,
    });
    ingrepen.push(
      buildIngreep({
        code: "ramen_deuren",
        titel: `Ramen & deuren in PVC met triple glas (${sp.ramen_m2} m²)`,
        korte_omschrijving: `${sp.ramen_m2} m² nieuw buitenschrijnwerk met triple beglazing en ventilatieroosters`,
        technische_specs: [
          "PVC-profielsysteem Aluplast Ideal Neo (meerkamerig)",
          "Triple beglazing (3-dubbel glas) Ug = 0,6 W/m²K",
          `Nieuwe U-waarde (raam): ${U_WAARDEN.ramen.na_triple.toFixed(1)} W/m²K (was ${uVoor.toFixed(1)})`,
          "Renson Variavent-ventilatieroosters (voldoen aan EPB-eisen)",
          "Inclusief hef-schuifdeur en sectionale garagepoort waar van toepassing",
        ],
        investering_excl_btw: cat.ramen_deuren.excl_btw,
        btw_tarief: btw,
        premie_bedrag: premies.ramen_deuren?.bedrag ?? 0,
        jaarlijkse_besparing_euro: res.besparing_euro,
        jaarlijkse_besparing_kwh: res.warmtevraag_reductie_kwh,
        besparing_gas_kwh: res.besparing_gas_kwh,
        besparing_elek_kwh: res.besparing_elek_kwh,
        besparing_bron: res.besparing_bron === "stookolie" ? "gas" : (res.besparing_bron as BesparingBron),
        epc_impact_kwh_m2_jaar: EPC_BIJDRAGE_KWH_M2_JAAR.ramen_triple,
        toelichting: `Triple glas heeft 4× minder warmteverlies dan oude dubbele beglazing. Belangrijke comfortverbetering (geen koude raamwanden) én geluidsisolatie.`,
        formule: res.formule,
      }),
    );
  }

  // -------- VLOER --------
  if (cat.vloer && sp.vloer_m2 && sp.vloer_m2 > 0) {
    const res = berekenIsolatieBesparing({
      ...commonIsolatie,
      oppervlakte_m2: sp.vloer_m2,
      u_voor: uVoorVloer(),
      u_na: U_WAARDEN.vloer.na,
    });
    ingrepen.push(
      buildIngreep({
        code: "vloer",
        titel: `Vloerisolatie (${sp.vloer_m2} m²)`,
        korte_omschrijving: `${sp.vloer_m2} m² vloerisolatie tegen koude opstijgende vloertemperaturen`,
        technische_specs: [
          "8 cm PUR-isolatie λ = 0,023 W/mK",
          `Nieuwe U-waarde: ${U_WAARDEN.vloer.na.toFixed(2)} W/m²K (was ${U_WAARDEN.vloer.voor.toFixed(1)})`,
        ],
        investering_excl_btw: cat.vloer.excl_btw,
        btw_tarief: btw,
        premie_bedrag: premies.vloer?.bedrag ?? 0,
        jaarlijkse_besparing_euro: res.besparing_euro,
        jaarlijkse_besparing_kwh: res.warmtevraag_reductie_kwh,
        besparing_gas_kwh: res.besparing_gas_kwh,
        besparing_elek_kwh: res.besparing_elek_kwh,
        besparing_bron: res.besparing_bron === "stookolie" ? "gas" : (res.besparing_bron as BesparingBron),
        epc_impact_kwh_m2_jaar: EPC_BIJDRAGE_KWH_M2_JAAR.vloer,
        toelichting: `Vloerisolatie elimineert koude lucht nabij de vloer en is cruciaal bij vloerverwarming gecombineerd met warmtepomp.`,
        formule: res.formule,
      }),
    );
  }

  // -------- WARMTEPOMP --------
  if (heeftWP && sp.warmtepomp_type) {
    const wp = berekenWarmtepompBesparing({
      parameters,
      wp_type: sp.warmtepomp_type,
      elek_prijs_per_kwh: prijzen.elektriciteit_per_kwh,
      gas_prijs_per_kwh: prijzen.gas_per_kwh,
      stookolie_prijs_per_liter: prijzen.stookolie_per_liter,
    });
    // Splitsing gas/elek voor WP: huidig verbruik verdwijnt, elek-verbruik erbij
    let besparing_gas_kwh = 0;
    let besparing_elek_kwh = 0;
    if (parameters.huidig_verwarmingstype === "gas") {
      besparing_gas_kwh = parameters.jaarverbruik_gas_kwh;
      besparing_elek_kwh = -wp.nieuw_elek_verbruik_kwh; // extra elek-verbruik
    } else if (parameters.huidig_verwarmingstype === "elektrisch") {
      besparing_elek_kwh = parameters.jaarverbruik_elektriciteit_kwh - wp.nieuw_elek_verbruik_kwh;
    }
    const epcBron =
      sp.warmtepomp_type === "geothermisch"
        ? EPC_BIJDRAGE_KWH_M2_JAAR.warmtepomp_geothermisch
        : sp.warmtepomp_type === "hybride"
          ? EPC_BIJDRAGE_KWH_M2_JAAR.warmtepomp_hybride
          : EPC_BIJDRAGE_KWH_M2_JAAR.warmtepomp_lucht_water;

    ingrepen.push(
      buildIngreep({
        code: "warmtepomp",
        titel: `${sp.warmtepomp_merk ?? "Warmtepomp"} (${sp.warmtepomp_type.replace(/_/g, "-")})`,
        korte_omschrijving: `Vervangt bestaande verwarmingsketel; levert verwarming én warm tapwater met rendement ± ${wp.cop_gebruikt.toFixed(1)}× (COP)`,
        technische_specs: [
          sp.warmtepomp_merk ? `Model: ${sp.warmtepomp_merk}` : "Premium lucht-waterwarmtepomp",
          `Seizoensgemiddelde COP: ${wp.cop_gebruikt.toFixed(1)}`,
          `Thermische vraag: ${Math.round(wp.thermische_vraag_kwh)} kWh/jaar`,
          `Nieuw elek-verbruik voor verwarming: ${Math.round(wp.nieuw_elek_verbruik_kwh)} kWh/jaar`,
          "Natuurlijk koudemiddel R290 (GWP = 3) waar beschikbaar",
          "Inclusief uniTOWER sanitaire boiler + multifunctioneel buffervat",
        ],
        investering_excl_btw: cat.warmtepomp?.excl_btw ?? 0,
        btw_tarief: btw,
        premie_bedrag: premies.warmtepomp?.bedrag ?? 0,
        jaarlijkse_besparing_euro: wp.besparing,
        jaarlijkse_besparing_kwh: wp.thermische_vraag_kwh - wp.nieuw_elek_verbruik_kwh,
        besparing_gas_kwh,
        besparing_elek_kwh,
        besparing_bron: "gemengd",
        epc_impact_kwh_m2_jaar: epcBron,
        toelichting: `Vervangt fossiele verwarming volledig. De oude jaarkost van ${Math.round(wp.oude_jaarkost)} € daalt naar ${Math.round(wp.nieuwe_jaarkost)} € elek. Geen aardgas- of stookolie-verbruik meer.`,
        formule: `Thermische vraag ${Math.round(wp.thermische_vraag_kwh)} kWh ÷ COP ${wp.cop_gebruikt.toFixed(1)} = ${Math.round(wp.nieuw_elek_verbruik_kwh)} kWh elek`,
      }),
    );
  }

  // -------- WARMTEPOMPBOILER --------
  if (cat.warmtepompboiler) {
    ingrepen.push(
      buildIngreep({
        code: "warmtepompboiler",
        titel: "Warmtepompboiler (sanitair warm water)",
        korte_omschrijving: "Vervangt elektrische boiler door warmtepompboiler met COP ± 3",
        technische_specs: ["Volume 200 L", "COP ± 3,0", "Integratie PV mogelijk"],
        investering_excl_btw: cat.warmtepompboiler.excl_btw,
        btw_tarief: btw,
        premie_bedrag: premies.warmtepompboiler?.bedrag ?? 0,
        jaarlijkse_besparing_euro: 250, // indicatief
        jaarlijkse_besparing_kwh: 1500,
        besparing_gas_kwh: 0,
        besparing_elek_kwh: 1500,
        besparing_bron: "elektriciteit",
        epc_impact_kwh_m2_jaar: EPC_BIJDRAGE_KWH_M2_JAAR.warmtepompboiler,
        toelichting: "Reduceert het elektriciteitsverbruik voor warm water met 60-70 %.",
      }),
    );
  }

  // -------- ZONNEPANELEN --------
  const pvInvestering = cat.zonnepanelen?.excl_btw ?? 0;
  if (pvInvestering > 0 && sp.pv_wp && sp.pv_wp > 0) {
    const pv = berekenPVBesparing({
      pv_wp_totaal: sp.pv_wp,
      elek_prijs_per_kwh: prijzen.elektriciteit_per_kwh,
      terugleververgoeding_per_kwh: prijzen.terugleververgoeding_per_kwh,
    });
    ingrepen.push(
      buildIngreep({
        code: "zonnepanelen",
        titel: `Zonnepanelen ${(sp.pv_wp / 1000).toFixed(2)} kWp${sp.pv_aantal_panelen ? ` (${sp.pv_aantal_panelen} panelen)` : ""}`,
        korte_omschrijving: `${(sp.pv_wp / 1000).toFixed(2)} kWp PV-installatie — levert ± ${Math.round(pv.jaarlijkse_opbrengst_kwh)} kWh/jaar`,
        technische_specs: [
          sp.pv_aantal_panelen ? `${sp.pv_aantal_panelen} × JA Solar Full Black 505 Wp` : "Premium full-black zonnepanelen",
          "30 jaar rendementsgarantie, 25 jaar productgarantie",
          "Omvormer inclusief, AREI-keuring uitgevoerd",
          `Jaarlijkse productie: ± ${Math.round(pv.jaarlijkse_opbrengst_kwh)} kWh`,
          `Direct verbruik: ${Math.round(pv.fractie_direct_verbruik * 100)} % → ${Math.round(pv.direct_verbruik_kwh)} kWh`,
          `Injectie: ${Math.round(pv.injectie_kwh)} kWh (terugleververgoeding € ${prijzen.terugleververgoeding_per_kwh.toFixed(3)}/kWh)`,
        ],
        investering_excl_btw: pvInvestering,
        btw_tarief: btw,
        premie_bedrag: premies.zonnepanelen?.bedrag ?? 0,
        jaarlijkse_besparing_euro: pv.totaal_besparing,
        jaarlijkse_besparing_kwh: pv.jaarlijkse_opbrengst_kwh,
        besparing_gas_kwh: 0,
        besparing_elek_kwh: pv.jaarlijkse_opbrengst_kwh,
        besparing_bron: "elektriciteit",
        epc_impact_kwh_m2_jaar: (sp.pv_wp / 1000) * EPC_BIJDRAGE_KWH_M2_JAAR.zonnepanelen_per_kwp,
        toelichting: `PV-installatie dekt ${Math.round((pv.jaarlijkse_opbrengst_kwh / parameters.jaarverbruik_elektriciteit_kwh) * 100)} % van het huidige elektriciteitsverbruik. Elke kWh zelf verbruikt = € ${prijzen.elektriciteit_per_kwh.toFixed(2)} bespaard.`,
      }),
    );
  }

  // -------- THUISBATTERIJ --------
  if (cat.thuisbatterij && sp.batterij_kwh && sp.batterij_kwh > 0 && sp.pv_wp) {
    const metBat = berekenPVBesparing({
      pv_wp_totaal: sp.pv_wp,
      batterij_kwh: sp.batterij_kwh,
      elek_prijs_per_kwh: prijzen.elektriciteit_per_kwh,
      terugleververgoeding_per_kwh: prijzen.terugleververgoeding_per_kwh,
    });
    const zonderBat = berekenPVBesparing({
      pv_wp_totaal: sp.pv_wp,
      elek_prijs_per_kwh: prijzen.elektriciteit_per_kwh,
      terugleververgoeding_per_kwh: prijzen.terugleververgoeding_per_kwh,
    });
    const batDelta = metBat.totaal_besparing - zonderBat.totaal_besparing;

    ingrepen.push(
      buildIngreep({
        code: "thuisbatterij",
        titel: `Thuisbatterij ${sp.batterij_kwh} kWh`,
        korte_omschrijving: `Verhoogt zelfconsumptie PV van ${Math.round(zonderBat.fractie_direct_verbruik * 100)} % → ${Math.round(metBat.fractie_direct_verbruik * 100)} %`,
        technische_specs: [
          `Growatt ${sp.batterij_kwh} kWh — LiFePO4-technologie`,
          "Uitbreidbaar tot 30 kWh",
          "10 jaar garantie, > 6000 cyclussen",
          "Bidirectionele omvormer met monitoring-app",
        ],
        investering_excl_btw: cat.thuisbatterij.excl_btw,
        btw_tarief: btw,
        premie_bedrag: 0,
        jaarlijkse_besparing_euro: batDelta,
        jaarlijkse_besparing_kwh: metBat.direct_verbruik_kwh - zonderBat.direct_verbruik_kwh,
        besparing_gas_kwh: 0,
        besparing_elek_kwh: metBat.direct_verbruik_kwh - zonderBat.direct_verbruik_kwh,
        besparing_bron: "elektriciteit",
        epc_impact_kwh_m2_jaar: EPC_BIJDRAGE_KWH_M2_JAAR.thuisbatterij,
        toelichting: `Slaat overtollige PV-productie op voor 's avonds. Belangrijke factor bij het nieuwe capaciteitstarief.`,
      }),
    );
  }

  // -------- VOORBEREIDINGSWERKEN --------
  if (cat.voorbereidingswerken) {
    ingrepen.push(
      buildIngreep({
        code: "voorbereidingswerken",
        titel: "Voorbereidingswerken (elektriciteit + sanitair)",
        korte_omschrijving: "Noodzakelijke werken voor correcte installatie warmtepomp en PV",
        technische_specs: [
          "Aanpassing elektrische installatie (kast, differentieel, leidingen)",
          "Aanpassing sanitaire leidingen voor WP-integratie",
          "Inclusief AREI-keuring",
        ],
        investering_excl_btw: cat.voorbereidingswerken.excl_btw,
        btw_tarief: btw,
        premie_bedrag: premies.voorbereidingswerken?.bedrag ?? 0,
        jaarlijkse_besparing_euro: 0,
        jaarlijkse_besparing_kwh: 0,
        besparing_gas_kwh: 0,
        besparing_elek_kwh: 0,
        besparing_bron: "geen",
        epc_impact_kwh_m2_jaar: 0,
        toelichting: "Geen directe besparing; essentieel om andere ingrepen veilig en conform te kunnen uitvoeren.",
      }),
    );
  }

  // -------- Aggregatie totalen --------
  const totaal_besparing_euro = ingrepen.reduce((s, i) => s + i.jaarlijkse_besparing_euro, 0);
  const totaal_besparing_gas_kwh = ingrepen.reduce((s, i) => s + i.besparing_gas_kwh, 0);
  const totaal_besparing_elek_kwh = ingrepen.reduce((s, i) => s + i.besparing_elek_kwh, 0);
  const co2_reductie_kg_jaar = ingrepen.reduce((s, i) => s + i.co2_reductie_kg_jaar, 0);

  // Maandelijks in euro: gas-besparing en elek-besparing apart
  const maandelijks_gas_euro =
    (totaal_besparing_gas_kwh * prijzen.gas_per_kwh) / 12;
  const maandelijks_elek_euro =
    (totaal_besparing_elek_kwh * prijzen.elektriciteit_per_kwh) / 12;
  const maandelijks_totaal_euro = totaal_besparing_euro / 12;

  // EPC-berekening
  const epc_kwh_m2_voor = startwaardeVoorLabel(parameters.epc_label_voor);
  const totaalEpcReductie = ingrepen.reduce((s, i) => s + i.epc_impact_kwh_m2_jaar, 0);
  const epc_kwh_m2_na = Math.max(40, epc_kwh_m2_voor - totaalEpcReductie);
  const epc_label_voor = parameters.epc_label_voor;
  const epc_label_verwacht = epcLabelVanWaarde(epc_kwh_m2_na);

  return {
    ingrepen,
    totaal_besparing_euro: round2(totaal_besparing_euro),
    totaal_besparing_gas_kwh: Math.round(totaal_besparing_gas_kwh),
    totaal_besparing_elek_kwh: Math.round(totaal_besparing_elek_kwh),
    maandelijks_gas_euro: round2(maandelijks_gas_euro),
    maandelijks_elek_euro: round2(maandelijks_elek_euro),
    maandelijks_totaal_euro: round2(maandelijks_totaal_euro),
    co2_reductie_kg_jaar: Math.round(co2_reductie_kg_jaar),
    epc_kwh_m2_voor,
    epc_kwh_m2_na: Math.round(epc_kwh_m2_na),
    epc_label_voor,
    epc_label_verwacht,
  };
}

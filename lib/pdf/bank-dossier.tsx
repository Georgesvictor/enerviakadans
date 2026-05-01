/**
 * Bank-dossier PDF — uitgebreide versie conform Waumans-referentie.
 * 10 secties: inleiding, gegevens, omschrijving werken, totale investering,
 * premies, financieringsbehoefte, betalingsschema, garanties, besluit, disclaimer.
 */

import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type {
  OfferteExtractie,
  PremiesOverzicht,
  LeningResultaat,
  BesparingResultaat,
  IngreepBesparing,
} from "@/lib/berekeningen/types";

const kleuren = {
  groen: "#1F4D3F",
  groen50: "#E8F0ED",
  oranje: "#E87722",
  grijs: "#6B7280",
  donkerGrijs: "#374151",
  rand: "#D1E1DB",
  tekst: "#0D1F1A",
};

const s = StyleSheet.create({
  page: {
    paddingTop: 50,
    paddingBottom: 60,
    paddingHorizontal: 45,
    fontSize: 9.5,
    fontFamily: "Helvetica",
    color: kleuren.tekst,
    lineHeight: 1.45,
  },
  headerBar: {
    position: "absolute",
    top: 20,
    left: 45,
    right: 45,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottom: `1.5pt solid ${kleuren.groen}`,
    paddingBottom: 8,
  },
  logo: { fontSize: 16, color: kleuren.groen, fontWeight: "bold", letterSpacing: 1.5 },
  headerMeta: { fontSize: 8, color: kleuren.grijs, textAlign: "right" },
  footer: {
    position: "absolute",
    left: 45,
    right: 45,
    bottom: 25,
    fontSize: 7,
    color: kleuren.grijs,
    borderTop: `0.5pt solid ${kleuren.rand}`,
    paddingTop: 6,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  coverHero: {
    backgroundColor: kleuren.groen,
    color: "white",
    padding: 24,
    marginTop: 40,
    marginBottom: 24,
  },
  coverBadge: {
    fontSize: 8,
    color: "white",
    letterSpacing: 2,
    marginBottom: 8,
    opacity: 0.8,
  },
  coverTitle: { fontSize: 22, color: "white", marginBottom: 4, fontWeight: "bold" },
  coverSub: { fontSize: 12, color: "white", opacity: 0.9 },
  intro: { marginTop: 10, marginBottom: 14, color: kleuren.donkerGrijs, textAlign: "justify" },
  h1: {
    fontSize: 13,
    color: kleuren.groen,
    marginTop: 16,
    marginBottom: 8,
    fontWeight: "bold",
    borderBottom: `1pt solid ${kleuren.rand}`,
    paddingBottom: 3,
  },
  h2: {
    fontSize: 10.5,
    color: kleuren.groen,
    marginTop: 10,
    marginBottom: 5,
    fontWeight: "bold",
  },
  p: { marginBottom: 5, textAlign: "justify" },
  strong: { fontWeight: "bold", color: kleuren.groen },
  table: { marginTop: 4, marginBottom: 6 },
  row: {
    flexDirection: "row",
    borderBottom: `0.5pt solid ${kleuren.rand}`,
    paddingVertical: 4,
    alignItems: "flex-start",
  },
  rowHeader: {
    backgroundColor: kleuren.groen50,
    fontWeight: "bold",
    color: kleuren.groen,
  },
  rowTotal: {
    backgroundColor: kleuren.groen,
    color: "white",
    fontWeight: "bold",
    paddingVertical: 6,
  },
  rowNet: {
    backgroundColor: kleuren.oranje,
    color: "white",
    fontWeight: "bold",
    paddingVertical: 6,
  },
  colLabel: { flex: 3, paddingHorizontal: 5 },
  colMid: { flex: 2, paddingHorizontal: 5, fontSize: 8.5, color: kleuren.grijs },
  colNum: { flex: 1.2, paddingHorizontal: 5, textAlign: "right" },
  keyValTable: { marginVertical: 4 },
  keyValRow: {
    flexDirection: "row",
    borderBottom: `0.5pt solid ${kleuren.rand}`,
    paddingVertical: 3,
  },
  keyLabel: { flex: 1.3, color: kleuren.grijs, paddingRight: 8 },
  keyVal: { flex: 2, color: kleuren.tekst },
  callout: {
    backgroundColor: kleuren.groen50,
    borderLeft: `3pt solid ${kleuren.groen}`,
    padding: 10,
    marginVertical: 8,
  },
  calloutTitle: {
    fontSize: 10,
    fontWeight: "bold",
    color: kleuren.groen,
    marginBottom: 3,
  },
  statsRow: { flexDirection: "row", gap: 6, marginVertical: 10 },
  stat: {
    flex: 1,
    padding: 10,
    border: `0.5pt solid ${kleuren.rand}`,
    backgroundColor: "#FAFBFB",
  },
  statLabel: { fontSize: 7.5, color: kleuren.grijs, letterSpacing: 0.5 },
  statValue: { fontSize: 14, color: kleuren.groen, fontWeight: "bold", marginTop: 2 },
  statValueOranje: { fontSize: 14, color: kleuren.oranje, fontWeight: "bold", marginTop: 2 },
  bullet: { flexDirection: "row", marginBottom: 3, paddingLeft: 4 },
  bulletDot: { width: 10, color: kleuren.oranje, fontWeight: "bold" },
  bulletText: { flex: 1 },
  disclaimer: {
    fontSize: 7.5,
    color: kleuren.grijs,
    fontStyle: "italic",
    marginTop: 12,
    padding: 8,
    backgroundColor: "#FAFBFB",
    border: `0.5pt solid ${kleuren.rand}`,
  },
  signature: { marginTop: 20 },
  signatureName: { fontWeight: "bold", color: kleuren.groen },
});

export interface BankDossierProps {
  klant: {
    voornaam: string;
    achternaam: string;
    adres?: string;
    postcode?: string;
    gemeente?: string;
    email?: string;
    tel?: string;
  };
  dossier: { referentie?: string; datum?: string };
  extractie: OfferteExtractie;
  premies: PremiesOverzicht;
  lening: LeningResultaat & { type: string; eigen_inbreng: number };
  besparing: BesparingResultaat;
  klantParams?: {
    inkomenscategorie?: 1 | 2 | 3;
    gezamenlijk_inkomen?: number;
    burgerlijke_staat?: string;
    personen_ten_laste?: number;
    epc_label_voor?: string;
    epc_label_verwacht?: string;
    woning_ouderdom?: string;
  };
}

const f = (n: number) =>
  `€ ${n.toLocaleString("nl-BE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fWhole = (n: number) => `€ ${n.toLocaleString("nl-BE", { maximumFractionDigits: 0 })}`;

function Header({ subtitle }: { subtitle: string }) {
  return (
    <View style={s.headerBar} fixed>
      <Text style={s.logo}>ENERVIA</Text>
      <Text style={s.headerMeta}>{subtitle}</Text>
    </View>
  );
}

function Footer({ referentie }: { referentie?: string }) {
  return (
    <View style={s.footer} fixed>
      <Text>
        Enervia BV · info@enervia.be · 03 808 8666 · www.enervia.be
      </Text>
      <Text
        render={({ pageNumber, totalPages }) =>
          `${referentie ?? ""} · Pagina ${pageNumber}/${totalPages}`
        }
      />
    </View>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <View style={s.bullet}>
      <Text style={s.bulletDot}>▸</Text>
      <Text style={s.bulletText}>{children}</Text>
    </View>
  );
}

export function BankDossier({
  klant,
  dossier,
  extractie,
  premies,
  lening,
  besparing,
  klantParams,
}: BankDossierProps) {
  const netto = Math.max(0, extractie.totaal_incl_btw - premies.totaal);
  const premiesPercent = extractie.totaal_incl_btw > 0
    ? (premies.totaal / extractie.totaal_incl_btw) * 100
    : 0;
  const ingrepen: IngreepBesparing[] = besparing.ingrepen ?? [];
  const klantnaam = `${klant.voornaam} ${klant.achternaam}`.trim();
  const adresFull = [klant.adres, `${klant.postcode ?? ""} ${klant.gemeente ?? ""}`.trim()]
    .filter(Boolean)
    .join(", ");
  const datumNu = new Date().toLocaleDateString("nl-BE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const datum = dossier.datum ?? datumNu;

  const categorieLabels: Record<string, string> = {
    werfinrichting: "Werfinrichting (administratie, asbest-afvoer, transport, stelling)",
    afbraak: "Afbraak (bestaand dak, goten, afvoer)",
    dak: "Dakwerken (isolatie, pannen, roofing, dakvensters)",
    gevel: "Gevelwerken (spouw- of buitenisolatie)",
    ramen_deuren: "Ramen & deuren (triple glas + ventilatieroosters)",
    warmtepomp: "Warmtepomp + plaatsing",
    warmtepompboiler: "Warmtepompboiler",
    zonnepanelen: "Zonnepanelen + omvormer",
    thuisbatterij: "Thuisbatterij",
    vloer: "Vloerisolatie",
    voorbereidingswerken: "Voorbereidingswerken (elek + sanitair)",
    korting: "Algemene projectkorting",
  };

  const premieLabels: Record<string, string> = {
    dak: "Dakrenovatie met isolatie (MijnVerbouwPremie)",
    ramen_deuren: "Ramen & deuren (MijnVerbouwPremie)",
    gevel: "Buitenmuurisolatie (MijnVerbouwPremie)",
    vloer: "Vloerisolatie (MijnVerbouwPremie)",
    warmtepomp: "Warmtepomp (MijnVerbouwPremie)",
    warmtepompboiler: "Warmtepompboiler (MijnVerbouwPremie)",
    zonnepanelen: "Zonnepanelen",
    asbest: "Asbestverwijdering dak — 50% (Vlaamse asbestpremie)",
    asbest_veka_bonus: "Asbest-bonus dakisolatie (VEKA)",
    epc_label: "EPC-labelpremie (na renovatie)",
    voorbereidingswerken: "Voorbereidingswerken elek + sanitair",
  };

  // --- Werken-omschrijvingen per categorie (on-the-fly genereren) ---
  const werkomschrijvingen: { titel: string; lijst: React.ReactNode[] }[] = [];
  const sp = extractie.specifiek;

  if (extractie.categorieen.dak) {
    const dakItems: React.ReactNode[] = [];
    if (sp.heeft_asbest && sp.asbest_dak_m2) {
      dakItems.push(
        <>
          <Text style={s.strong}>Verwijdering asbesthoudende dakbedekking:</Text>{" "}
          volledige sanering van het bestaand dak ({sp.asbest_dak_m2} m²) volgens
          de geldende asbestwetgeving, inclusief afvoer naar een erkend
          verwerkingscentrum.
        </>,
      );
    }
    if (sp.dak_m2) {
      dakItems.push(
        <>
          <Text style={s.strong}>Dakisolatie + afwerking ({sp.dak_m2} m²):</Text>{" "}
          hoogwaardige PIR-isolatie (λ 0,022 W/mK — Rd-waarde 6,35 m²K/W),
          plaatsing nieuwe dakbedekking (keramische pannen of bitumineuze roofing
          op plat dak), inclusief dakrand, goten en waar relevant dakvensters.
        </>,
      );
    }
    werkomschrijvingen.push({ titel: "Dakrenovatie", lijst: dakItems });
  }

  if (extractie.categorieen.gevel && sp.gevel_m2) {
    werkomschrijvingen.push({
      titel: "Gevelisolatie",
      lijst: [
        <>
          <Text style={s.strong}>Spouw- of buitenmuurisolatie ({sp.gevel_m2} m²):</Text>{" "}
          conform EPB-normen (λ ≤ 0,036 W/mK). Reduceert het energieverlies via
          de gevel en verhoogt het comfort in zowel zomer als winter.
        </>,
      ],
    });
  }

  if (extractie.categorieen.ramen_deuren) {
    werkomschrijvingen.push({
      titel: "Ramen en buitendeuren",
      lijst: [
        <>
          <Text style={s.strong}>Nieuw buitenschrijnwerk{sp.ramen_m2 ? ` (${sp.ramen_m2} m²)` : ""}:</Text>{" "}
          meerkamerig profielsysteem met uitstekende thermische isolatie,
          hoogrendement triple beglazing (3-dubbel glas) en ventilatieroosters die
          voldoen aan de EPB-ventilatie-eisen. Inclusief afwerking en plaatsing
          volgens de regels van de kunst.
        </>,
      ],
    });
  }

  if (extractie.categorieen.warmtepomp) {
    werkomschrijvingen.push({
      titel: "Warmtepomp",
      lijst: [
        <>
          <Text style={s.strong}>
            {sp.warmtepomp_merk ?? "Lucht-waterwarmtepomp"} (
            {sp.warmtepomp_type?.replace(/_/g, "-") ?? "lucht-water"}):
          </Text>{" "}
          hoogrendementswarmtepomp met moderne koudemiddel-technologie, inclusief
          sanitaire boiler, buffervat en volledige plaatsing. Vervangt de
          bestaande verwarmingsketel en levert zowel ruimteverwarming als
          warm tapwater.
        </>,
      ],
    });
  }

  if (extractie.categorieen.zonnepanelen || extractie.categorieen.thuisbatterij) {
    const lijst: React.ReactNode[] = [];
    if (extractie.categorieen.zonnepanelen && sp.pv_wp) {
      lijst.push(
        <>
          <Text style={s.strong}>
            {sp.pv_aantal_panelen ?? "—"} zonnepanelen ({(sp.pv_wp / 1000).toFixed(2)} kWp):
          </Text>{" "}
          premium full-black panelen met meerjarige rendementsgarantie,
          inclusief omvormer, montagesysteem en AREI-keuring.
        </>,
      );
    }
    if (extractie.categorieen.thuisbatterij && sp.batterij_kwh) {
      lijst.push(
        <>
          <Text style={s.strong}>Thuisbatterij {sp.batterij_kwh} kWh:</Text>{" "}
          LiFePO4-technologie voor maximale veiligheid en levensduur,
          uitbreidbaar, met monitoring-systeem.
        </>,
      );
    }
    werkomschrijvingen.push({ titel: "Zonnepanelen en thuisbatterij", lijst });
  }

  const premieRows = Object.entries(premies)
    .filter(([k, v]: any) => k !== "totaal" && v?.van_toepassing && v.bedrag > 0)
    .map(([k, v]: any) => ({
      label: premieLabels[k] ?? k.replace(/_/g, " "),
      formule: v.formule,
      bedrag: v.bedrag,
    }));

  const categorieRows = Object.entries(extractie.categorieen)
    .filter(([, v]) => v && v.excl_btw !== undefined && v.excl_btw !== 0)
    .map(([k, v]: any) => ({
      label: categorieLabels[k] ?? k.replace(/_/g, " "),
      excl: v.excl_btw as number,
      incl: (v.excl_btw as number) * (1 + extractie.btw_tarief),
    }));

  // ------------------------------------------------------------------
  return (
    <Document>
      <Page size="A4" style={s.page}>
        <Header subtitle={`Financieringsdossier · ${dossier.referentie ?? ""}`} />
        <Footer referentie={dossier.referentie} />

        {/* ---------- COVER ---------- */}
        <View style={s.coverHero}>
          <Text style={s.coverBadge}>FINANCIERINGSDOSSIER</Text>
          <Text style={s.coverTitle}>Totaalrenovatie woning {klant.achternaam}</Text>
          <Text style={s.coverSub}>
            Overzicht investering, Vlaamse premies en netto financieringsbehoefte
          </Text>
        </View>

        <Text style={{ marginBottom: 8 }}>Geachte heer, mevrouw,</Text>
        <Text style={s.intro}>
          Dit verslag werd opgesteld door <Text style={s.strong}>Enervia BV</Text> ter
          attentie van de kredietverstrekker van onze klant{" "}
          <Text style={s.strong}>{klantnaam}</Text>. Het bevat een transparant
          overzicht van de geplande energierenovatie{adresFull ? ` van de woning gelegen te ${adresFull}` : ""},
          evenals een onderbouwde raming van de Vlaamse premies waarop de klant
          recht heeft via MijnVerbouwPremie, de EPC-labelpremie en de
          asbestpremie.
        </Text>
        <Text style={s.intro}>
          Het doel van dit document is om de bank een volledig beeld te geven van
          de werkelijke financieringsbehoefte: de bruto investeringskost,
          verminderd met de tegemoetkomingen van de Vlaamse overheid, resulteert
          in een <Text style={s.strong}>netto bedrag</Text> dat de klant effectief
          zelf dient te financieren.
        </Text>

        {/* Samenvatting stats */}
        <View style={s.statsRow}>
          <View style={s.stat}>
            <Text style={s.statLabel}>TOTALE INVESTERING</Text>
            <Text style={s.statValue}>{fWhole(extractie.totaal_incl_btw)}</Text>
          </View>
          <View style={s.stat}>
            <Text style={s.statLabel}>VLAAMSE PREMIES</Text>
            <Text style={s.statValueOranje}>{fWhole(premies.totaal)}</Text>
          </View>
          <View style={s.stat}>
            <Text style={s.statLabel}>NETTO INVESTERING</Text>
            <Text style={s.statValue}>{fWhole(netto)}</Text>
          </View>
        </View>

        {/* ---------- 1. GEGEVENS ---------- */}
        <Text style={s.h1}>1. Gegevens kredietnemer en project</Text>
        <View style={s.keyValTable}>
          <View style={s.keyValRow}>
            <Text style={s.keyLabel}>Kredietnemer</Text>
            <Text style={s.keyVal}>{klantnaam}</Text>
          </View>
          {adresFull && (
            <View style={s.keyValRow}>
              <Text style={s.keyLabel}>Adres van de werf</Text>
              <Text style={s.keyVal}>{adresFull}</Text>
            </View>
          )}
          <View style={s.keyValRow}>
            <Text style={s.keyLabel}>Type woning</Text>
            <Text style={s.keyVal}>
              Eengezinswoning,{" "}
              {klantParams?.woning_ouderdom === "voor_2006"
                ? "aangesloten op elektriciteitsnet vóór 01/01/2006"
                : "minstens 5 jaar aangesloten op elektriciteitsnet"}
            </Text>
          </View>
          {klantParams?.epc_label_voor && (
            <View style={s.keyValRow}>
              <Text style={s.keyLabel}>EPC-label (voor)</Text>
              <Text style={s.keyVal}>Label {klantParams.epc_label_voor}</Text>
            </View>
          )}
          {klantParams?.epc_label_verwacht && (
            <View style={s.keyValRow}>
              <Text style={s.keyLabel}>EPC-label (verwacht na)</Text>
              <Text style={s.keyVal}>Label {klantParams.epc_label_verwacht}</Text>
            </View>
          )}
          <View style={s.keyValRow}>
            <Text style={s.keyLabel}>Projectreferentie</Text>
            <Text style={s.keyVal}>
              Enervia {dossier.referentie ?? ""} — Totaalproject {klant.achternaam}
            </Text>
          </View>
          <View style={s.keyValRow}>
            <Text style={s.keyLabel}>Datum offerte</Text>
            <Text style={s.keyVal}>{datum}</Text>
          </View>
        </View>

        {/* ---------- 2. OMSCHRIJVING ---------- */}
        <Text style={s.h1}>2. Omschrijving van de werken</Text>
        <Text style={s.p}>
          Het project betreft een grondige energetische renovatie met het oog op
          een substantiële verbetering van het EPC-label en een forse reductie
          van het energieverbruik. Alle werken worden uitgevoerd door{" "}
          <Text style={s.strong}>Enervia BV</Text> als één aanspreekpunt
          („alles onder één dak"), volgens de regels van de kunst en conform
          de geldende EPB-normen.
        </Text>

        {werkomschrijvingen.map((w, i) => (
          <View key={i} wrap={false}>
            <Text style={s.h2}>
              2.{i + 1} {w.titel}
            </Text>
            {w.lijst.map((l, j) => (
              <Bullet key={j}>{l}</Bullet>
            ))}
          </View>
        ))}

        {/* ---------- 3. TOTALE INVESTERING ---------- */}
        <Text style={s.h1} break>
          3. Totale investering
        </Text>
        <Text style={s.p}>
          Onderstaande tabel toont de volledige opsplitsing van de offerte. Alle
          prijzen zijn onderworpen aan het verlaagd btw-tarief van{" "}
          <Text style={s.strong}>{(extractie.btw_tarief * 100).toFixed(0)} %</Text>{" "}
          {extractie.btw_tarief === 0.06 &&
            "(renovatie van een woning ouder dan 10 jaar)."}
        </Text>

        <View style={s.table}>
          <View style={[s.row, s.rowHeader]}>
            <Text style={s.colLabel}>Onderdeel</Text>
            <Text style={s.colNum}>Excl. btw</Text>
            <Text style={s.colNum}>Incl. btw</Text>
          </View>
          {categorieRows.map((r, i) => (
            <View key={i} style={s.row}>
              <Text style={s.colLabel}>{r.label}</Text>
              <Text style={s.colNum}>{f(r.excl)}</Text>
              <Text style={s.colNum}>{f(r.incl)}</Text>
            </View>
          ))}
          <View style={[s.row, s.rowTotal]}>
            <Text style={s.colLabel}>TOTAAL PROJECT</Text>
            <Text style={s.colNum}>{f(extractie.totaal_excl_btw)}</Text>
            <Text style={s.colNum}>{f(extractie.totaal_incl_btw)}</Text>
          </View>
        </View>

        {/* ---------- 4. PREMIES ---------- */}
        <Text style={s.h1}>4. Vlaamse premies en tegemoetkomingen</Text>
        <Text style={s.p}>
          Op basis van de gezinssituatie van de klant
          {klantParams?.gezamenlijk_inkomen &&
            ` (${klantParams.burgerlijke_staat ?? "alleenstaande"} met een gezamenlijk inkomen van ${fWhole(
              klantParams.gezamenlijk_inkomen,
            )}${
              klantParams.personen_ten_laste
                ? ` en ${klantParams.personen_ten_laste} perso${klantParams.personen_ten_laste === 1 ? "on" : "nen"} ten laste`
                : " en geen personen ten laste"
            })`}
          {klantParams?.inkomenscategorie &&
            ` valt dit dossier onder inkomenscategorie ${klantParams.inkomenscategorie}`}{" "}
          van MijnVerbouwPremie.
          {klantParams?.epc_label_voor &&
            ` Het huidige EPC-label van de woning is ${klantParams.epc_label_voor}, waardoor de klant ook in aanmerking komt voor de EPC-labelpremie na realisatie van de werken.`}
        </Text>
        <Text style={s.p}>
          De onderstaande premies werden gesimuleerd via de officiële simulator
          van het <Text style={s.strong}>Vlaams Energie- en Klimaatagentschap (VEKA)</Text>{" "}
          op {datum}. De bedragen zijn indicatief en worden definitief
          vastgelegd na indiening van de aanvraag op loket.mijnverbouwpremie.be,
          op basis van de effectieve facturen.
        </Text>

        <Text style={s.h2}>4.1 Overzicht premies</Text>
        <View style={s.table}>
          <View style={[s.row, s.rowHeader]}>
            <Text style={s.colLabel}>Premie</Text>
            <Text style={s.colMid}>Basis berekening</Text>
            <Text style={s.colNum}>Bedrag</Text>
          </View>
          {premieRows.map((r, i) => (
            <View key={i} style={s.row}>
              <Text style={s.colLabel}>{r.label}</Text>
              <Text style={s.colMid}>{r.formule}</Text>
              <Text style={s.colNum}>{f(r.bedrag)}</Text>
            </View>
          ))}
          <View style={[s.row, s.rowTotal]}>
            <Text style={s.colLabel}>TOTAAL PREMIES</Text>
            <Text style={s.colMid}> </Text>
            <Text style={s.colNum}>{f(premies.totaal)}</Text>
          </View>
        </View>

        {sp.heeft_asbest && premies.asbest.bedrag > 0 && (
          <View style={s.callout}>
            <Text style={s.calloutTitle}>4.2 Toelichting asbestpremie (50 %)</Text>
            <Text style={s.p}>
              De Vlaamse overheid voorziet een tegemoetkoming van{" "}
              <Text style={s.strong}>50 %</Text> op de werkelijke kosten voor
              asbestverwijdering bij dakrenovaties, gekoppeld aan de plaatsing
              van nieuwe dakisolatie. In dit dossier gaat het om een
              asbestgerelateerde kost van {f(sp.asbest_kosten_excl)} (excl. btw),
              waardoor de premie{" "}
              <Text style={s.strong}>{f(premies.asbest.bedrag)}</Text> bedraagt.
            </Text>
          </View>
        )}

        {premies.epc_label.bedrag > 0 && (
          <View style={s.callout}>
            <Text style={s.calloutTitle}>4.3 EPC-labelpremie</Text>
            <Text style={s.p}>
              Door de combinatie van dakisolatie, gevelisolatie, nieuwe ramen,
              warmtepomp en PV-installatie zal het EPC-label na renovatie
              aanzienlijk verbeteren (verwachte sprong naar label{" "}
              {klantParams?.epc_label_verwacht ?? "A/B/C"}). Hiermee komt de klant
              in aanmerking voor een EPC-labelpremie van{" "}
              <Text style={s.strong}>{f(premies.epc_label.bedrag)}</Text>. De
              aanvraag dient ingediend te worden vóór 30/06/2026; Enervia
              verzorgt dit voor de klant.
            </Text>
          </View>
        )}

        <Text style={s.h2}>4.4 Premieaanvraag door Enervia</Text>
        <Text style={s.p}>
          Conform de Enervia-werkwijze („stap 6 — Premie aanvraag") verzamelt
          Enervia alle nodige documenten en dient zij alle premieaanvragen in bij
          de Vlaamse overheid in naam van de klant. Dit garandeert een correcte
          en volledige aanvraag en maximaliseert de kans op volledige uitkering.
        </Text>

        {/* ---------- 5. FINANCIERINGSBEHOEFTE ---------- */}
        <Text style={s.h1} break>
          5. Financieringsbehoefte
        </Text>
        <Text style={s.p}>
          Onderstaand het samenvattend overzicht van de werkelijke
          financieringsbehoefte na aftrek van de tegemoetkomingen van de
          Vlaamse overheid:
        </Text>
        <View style={s.table}>
          <View style={s.row}>
            <Text style={s.colLabel}>Totaal investering project (incl. btw)</Text>
            <Text style={s.colNum}>{f(extractie.totaal_incl_btw)}</Text>
          </View>
          <View style={s.row}>
            <Text style={s.colLabel}>
              Min: Vlaamse premies (MijnVerbouwPremie + EPC-label + asbest)
            </Text>
            <Text style={s.colNum}>- {f(premies.totaal)}</Text>
          </View>
          <View style={[s.row, s.rowNet]}>
            <Text style={s.colLabel}>NETTO INVESTERING TEN LASTE VAN DE KLANT</Text>
            <Text style={s.colNum}>{f(netto)}</Text>
          </View>
        </View>
        <Text style={s.p}>
          De premies vertegenwoordigen{" "}
          <Text style={s.strong}>{premiesPercent.toFixed(1)} %</Text> van de
          totale investering. Merk op dat de premies worden uitbetaald{" "}
          <Text style={s.strong}>na</Text> uitvoering en facturatie van de
          werken; de financiering dient initieel dus op de bruto projectwaarde
          berekend te worden, waarna de klant met de ontvangen premies een
          vervroegde terugbetaling kan doen of het saldo kan gebruiken.
        </Text>

        <Text style={s.h2}>Leningsimulatie</Text>
        <View style={s.table}>
          <View style={s.keyValRow}>
            <Text style={s.keyLabel}>Type lening</Text>
            <Text style={s.keyVal}>
              {lening.type === "mijnverbouwlening"
                ? "MijnVerbouwLening (Vlaamse energielening)"
                : "Commerciële renovatielening"}
            </Text>
          </View>
          <View style={s.keyValRow}>
            <Text style={s.keyLabel}>Leenbedrag</Text>
            <Text style={s.keyVal}>{f(lening.leenbedrag)}</Text>
          </View>
          <View style={s.keyValRow}>
            <Text style={s.keyLabel}>Eigen inbreng</Text>
            <Text style={s.keyVal}>{f(lening.eigen_inbreng)}</Text>
          </View>
          <View style={s.keyValRow}>
            <Text style={s.keyLabel}>Rentevoet (jaarlijks)</Text>
            <Text style={s.keyVal}>
              {(lening.rentevoet_jaarlijks * 100).toFixed(2)} %
            </Text>
          </View>
          <View style={s.keyValRow}>
            <Text style={s.keyLabel}>Looptijd</Text>
            <Text style={s.keyVal}>{lening.looptijd_jaar} jaar</Text>
          </View>
          <View style={s.keyValRow}>
            <Text style={s.keyLabel}>Maandelijkse afbetaling</Text>
            <Text style={[s.keyVal, s.strong]}>
              {f(lening.maandelijkse_afbetaling)}
            </Text>
          </View>
          <View style={s.keyValRow}>
            <Text style={s.keyLabel}>Totale interestkost over looptijd</Text>
            <Text style={s.keyVal}>{f(lening.totale_interestkost)}</Text>
          </View>
          <View style={s.keyValRow}>
            <Text style={s.keyLabel}>Totaal terug te betalen</Text>
            <Text style={s.keyVal}>
              {f(lening.maandelijkse_afbetaling * lening.looptijd_jaar * 12)}
            </Text>
          </View>
        </View>

        {/* ---------- 6. BETALINGSSCHEMA ---------- */}
        <Text style={s.h1}>6. Betalingsschema</Text>
        <Text style={s.p}>
          Enervia hanteert een gespreid en transparant betalingsplan volgens de
          vordering van de werken. Deze structuur laat toe dat opnames uit het
          krediet afgestemd kunnen worden op de reële werffases:
        </Text>
        <View style={s.table}>
          <View style={[s.row, s.rowHeader]}>
            <Text style={s.colLabel}>Werkencluster</Text>
            <Text style={s.colMid}>Betalingsschema</Text>
            <Text style={s.colNum}>Bedrag (incl.)</Text>
          </View>
          <View style={s.row}>
            <Text style={s.colLabel}>Dak, gevel & zonnepanelen</Text>
            <Text style={s.colMid}>
              0 % voorschot — 50 % levering — 40 % na isolatie — 10 % oplevering
            </Text>
            <Text style={s.colNum}>
              {f(
                ((extractie.categorieen.dak?.excl_btw ?? 0) +
                  (extractie.categorieen.gevel?.excl_btw ?? 0) +
                  (extractie.categorieen.zonnepanelen?.excl_btw ?? 0) +
                  (extractie.categorieen.thuisbatterij?.excl_btw ?? 0) +
                  (extractie.categorieen.werfinrichting?.excl_btw ?? 0) +
                  (extractie.categorieen.afbraak?.excl_btw ?? 0)) *
                  (1 + extractie.btw_tarief),
              )}
            </Text>
          </View>
          {extractie.categorieen.ramen_deuren && (
            <View style={s.row}>
              <Text style={s.colLabel}>Ramen & deuren</Text>
              <Text style={s.colMid}>
                50 % voorschot — 40 % levering — 10 % oplevering
              </Text>
              <Text style={s.colNum}>
                {f(
                  extractie.categorieen.ramen_deuren.excl_btw *
                    (1 + extractie.btw_tarief),
                )}
              </Text>
            </View>
          )}
          {extractie.categorieen.warmtepomp && (
            <View style={s.row}>
              <Text style={s.colLabel}>Warmtepomp</Text>
              <Text style={s.colMid}>
                0 % voorschot — 100 % bij start werken
              </Text>
              <Text style={s.colNum}>
                {f(
                  extractie.categorieen.warmtepomp.excl_btw *
                    (1 + extractie.btw_tarief),
                )}
              </Text>
            </View>
          )}
          {extractie.categorieen.korting && (
            <View style={s.row}>
              <Text style={s.colLabel}>Projectkorting</Text>
              <Text style={s.colMid}>Verrekend op eindfactuur</Text>
              <Text style={s.colNum}>
                {f(
                  extractie.categorieen.korting.excl_btw *
                    (1 + extractie.btw_tarief),
                )}
              </Text>
            </View>
          )}
          <View style={[s.row, s.rowTotal]}>
            <Text style={s.colLabel}>TOTAAL</Text>
            <Text style={s.colMid}>Gespreide betaling volgens werffase</Text>
            <Text style={s.colNum}>{f(extractie.totaal_incl_btw)}</Text>
          </View>
        </View>

        {/* ---------- 7. GARANTIES ---------- */}
        <Text style={s.h1} break>
          7. Garanties en bescherming van de investering
        </Text>
        <Text style={s.p}>
          Enervia biedt voor deze totaalrenovatie de volgende uitgebreide
          garanties — een belangrijke zekerheid voor zowel de klant als de
          kredietverstrekker met het oog op de duurzame waardeverhoging van het
          onroerend goed:
        </Text>
        {extractie.categorieen.dak && (
          <Bullet>
            <Text style={s.strong}>10 jaar garantie</Text> op dakwerken en
            dakisolatie
          </Bullet>
        )}
        {extractie.categorieen.gevel && (
          <Bullet>
            <Text style={s.strong}>10 jaar garantie</Text> op gevelisolatie
          </Bullet>
        )}
        {extractie.categorieen.ramen_deuren && (
          <Bullet>
            <Text style={s.strong}>5 jaar garantie</Text> op ramen en
            buitendeuren
          </Bullet>
        )}
        {extractie.categorieen.warmtepomp && (
          <Bullet>
            <Text style={s.strong}>3 jaar garantie</Text> op de
            warmtepompinstallatie (fabrikanten geven doorgaans bijkomende
            omruilwaarborg op compressor)
          </Bullet>
        )}
        {extractie.categorieen.zonnepanelen && (
          <Bullet>
            <Text style={s.strong}>30 jaar rendementsgarantie</Text> op de
            zonnepanelen en 25 jaar productgarantie
          </Bullet>
        )}
        {extractie.categorieen.thuisbatterij && (
          <Bullet>
            <Text style={s.strong}>10 jaar garantie</Text> op de thuisbatterij
            (LiFePO4-technologie)
          </Bullet>
        )}
        <Text style={s.p}>
          De geplaatste materialen behoren tot de topsegmenten in hun categorie.
          Dit garandeert een lange levensduur en zorgt voor een substantiële
          verhoging van de energie-efficiëntie en de marktwaarde van het pand.
        </Text>

        {/* ---------- 8. BESPARING — uitgebreide sectie ---------- */}
        <Text style={s.h1} break>
          8. Verwachte energiebesparing per ingreep
        </Text>
        <Text style={s.p}>
          Op basis van de huidige energieprijzen (elektriciteit{" "}
          {f(besparing.gebruikte_energieprijzen.elektriciteit_per_kwh)}/kWh · gas{" "}
          {f(besparing.gebruikte_energieprijzen.gas_per_kwh)}/kWh) en een
          conservatieve prijsstijging van{" "}
          {(besparing.jaarlijkse_prijsstijging * 100).toFixed(0)} % per jaar werd
          de energiebesparing per individuele ingreep berekend. De isolatie-
          besparingen volgen de U-waarde-methode (graaddagen Ukkel: 2100 Kd/j),
          de warmtepomp-besparing volgt uit het seizoensgemiddelde COP.
        </Text>

        {/* §8.1 — Overzichtstabel per ingreep */}
        {ingrepen.length > 0 && (
          <>
            <Text style={s.h2}>8.1 Overzichtstabel per ingreep</Text>
            <View style={s.table}>
              <View style={[s.row, s.rowHeader]}>
                <Text style={[s.colLabel, { flex: 2.6 }]}>Ingreep</Text>
                <Text style={s.colNum}>Invest.</Text>
                <Text style={s.colNum}>Premie</Text>
                <Text style={s.colNum}>Netto</Text>
                <Text style={s.colNum}>Bespar./j</Text>
                <Text style={s.colNum}>€/maand</Text>
                <Text style={[s.colNum, { flex: 0.9 }]}>ROI</Text>
              </View>
              {ingrepen.map((i) => (
                <View key={i.code} style={s.row}>
                  <Text style={[s.colLabel, { flex: 2.6, fontSize: 8.5 }]}>
                    {i.titel}
                  </Text>
                  <Text style={[s.colNum, { fontSize: 8.5 }]}>
                    {fWhole(i.investering_incl_btw)}
                  </Text>
                  <Text style={[s.colNum, { fontSize: 8.5, color: kleuren.oranje }]}>
                    {i.premie_bedrag > 0 ? `−${fWhole(i.premie_bedrag)}` : "—"}
                  </Text>
                  <Text style={[s.colNum, { fontSize: 8.5 }]}>
                    {fWhole(i.netto_investering)}
                  </Text>
                  <Text style={[s.colNum, { fontSize: 8.5, color: kleuren.groen, fontWeight: "bold" }]}>
                    {fWhole(i.jaarlijkse_besparing_euro)}
                  </Text>
                  <Text style={[s.colNum, { fontSize: 8.5 }]}>
                    {fWhole(i.maandelijkse_besparing_euro)}
                  </Text>
                  <Text style={[s.colNum, { flex: 0.9, fontSize: 8.5 }]}>
                    {i.terugverdientijd_jaar !== null
                      ? `${i.terugverdientijd_jaar.toFixed(0)}j`
                      : "—"}
                  </Text>
                </View>
              ))}
              <View style={[s.row, s.rowTotal]}>
                <Text style={[s.colLabel, { flex: 2.6 }]}>TOTAAL PROJECT</Text>
                <Text style={s.colNum}>
                  {fWhole(ingrepen.reduce((sm, i) => sm + i.investering_incl_btw, 0))}
                </Text>
                <Text style={s.colNum}>
                  −{fWhole(ingrepen.reduce((sm, i) => sm + i.premie_bedrag, 0))}
                </Text>
                <Text style={s.colNum}>
                  {fWhole(ingrepen.reduce((sm, i) => sm + i.netto_investering, 0))}
                </Text>
                <Text style={s.colNum}>
                  {fWhole(besparing.totale_jaarlijkse_besparing)}
                </Text>
                <Text style={s.colNum}>
                  {fWhole(besparing.maandelijkse_besparing_totaal_euro ?? 0)}
                </Text>
                <Text style={[s.colNum, { flex: 0.9 }]}>
                  {besparing.terugverdientijd_jaar?.toFixed(0)}j
                </Text>
              </View>
            </View>
          </>
        )}

        {/* §8.2 — Maandelijkse besparing gas vs elek */}
        <Text style={s.h2}>8.2 Maandelijkse besparing — gas vs. elektriciteit</Text>
        <Text style={s.p}>
          De besparingen zijn opgesplitst tussen gas/stookolie en elektriciteit.
          Dit is relevant voor de bank omdat het aantoont welke vaste
          energielasten structureel verdwijnen en welke variabele lasten
          verschuiven.
        </Text>
        <View style={s.statsRow}>
          <View style={s.stat}>
            <Text style={s.statLabel}>GAS / STOOKOLIE PER MAAND</Text>
            <Text style={s.statValue}>
              {fWhole(besparing.maandelijkse_besparing_gas_euro ?? 0)}
            </Text>
          </View>
          <View style={s.stat}>
            <Text style={s.statLabel}>ELEK PER MAAND (NETTO)</Text>
            <Text style={s.statValue}>
              {fWhole(besparing.maandelijkse_besparing_elek_euro ?? 0)}
            </Text>
          </View>
          <View style={s.stat}>
            <Text style={s.statLabel}>TOTAAL PER MAAND</Text>
            <Text style={s.statValueOranje}>
              {fWhole(besparing.maandelijkse_besparing_totaal_euro ?? 0)}
            </Text>
          </View>
        </View>
        <Text style={s.p}>
          Dit betekent concreet dat de klant zijn maandelijkse energiefactuur
          ziet dalen met circa{" "}
          <Text style={s.strong}>
            {fWhole(besparing.maandelijkse_besparing_totaal_euro ?? 0)}
          </Text>
          , wat de maandelijkse lasten van de lening voor een belangrijk deel
          compenseert.
        </Text>

        {/* §8.3 — EPC-impact */}
        {besparing.epc_kwh_m2_voor && besparing.epc_kwh_m2_na && (
          <View style={s.callout}>
            <Text style={s.calloutTitle}>8.3 EPC-impact per ingreep (indicatief)</Text>
            <Text style={s.p}>
              Som van alle EPC-bijdrages brengt het pand van{" "}
              <Text style={s.strong}>
                Label {besparing.epc_label_voor} ({besparing.epc_kwh_m2_voor} kWh/m²·j)
              </Text>{" "}
              naar een verwacht{" "}
              <Text style={s.strong}>
                Label {besparing.epc_label_verwacht} ({besparing.epc_kwh_m2_na} kWh/m²·j)
              </Text>
              . De definitieve EPC-waarde wordt bepaald door een
              erkend energiedeskundige na oplevering.
            </Text>
            <View style={s.table}>
              <View style={[s.row, s.rowHeader]}>
                <Text style={s.colLabel}>Ingreep</Text>
                <Text style={s.colNum}>Bijdrage kWh/m²·j</Text>
                <Text style={s.colNum}>CO₂ kg/j</Text>
              </View>
              {ingrepen
                .filter((i) => i.epc_impact_kwh_m2_jaar > 0)
                .map((i) => (
                  <View key={i.code} style={s.row}>
                    <Text style={s.colLabel}>{i.titel}</Text>
                    <Text style={s.colNum}>
                      −{i.epc_impact_kwh_m2_jaar.toFixed(1)}
                    </Text>
                    <Text style={s.colNum}>
                      {i.co2_reductie_kg_jaar.toLocaleString("nl-BE")}
                    </Text>
                  </View>
                ))}
              <View style={[s.row, s.rowTotal]}>
                <Text style={s.colLabel}>TOTAAL CO₂-REDUCTIE</Text>
                <Text style={s.colNum}>
                  −
                  {(
                    besparing.epc_kwh_m2_voor - besparing.epc_kwh_m2_na
                  ).toFixed(0)}
                </Text>
                <Text style={s.colNum}>
                  {(besparing.co2_reductie_kg_jaar ?? 0).toLocaleString("nl-BE")}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* §8.4 — 10-jaar projectie */}
        <Text style={s.h2}>8.4 10-jaar projectie cumulatieve besparing</Text>
        <Text style={s.p}>
          Hieronder de jaarlijkse en cumulatieve besparing, rekening houdend
          met {(besparing.jaarlijkse_prijsstijging * 100).toFixed(0)} %
          jaarlijkse energieprijsstijging.
          Het project verdient zichzelf terug op netto basis na circa{" "}
          <Text style={s.strong}>
            {besparing.terugverdientijd_jaar?.toFixed(1)} jaar
          </Text>
          .
        </Text>
        <View style={s.table}>
          <View style={[s.row, s.rowHeader]}>
            <Text style={s.colLabel}>Jaar</Text>
            <Text style={s.colNum}>Besparing</Text>
            <Text style={s.colNum}>Cumulatief</Text>
            <Text style={s.colNum}>% terugverdiend</Text>
          </View>
          {besparing.projectie_10j.map((j) => (
            <View key={j.jaar} style={s.row}>
              <Text style={s.colLabel}>Jaar {j.jaar}</Text>
              <Text style={s.colNum}>{f(j.besparing)}</Text>
              <Text style={s.colNum}>{f(j.cumulatief)}</Text>
              <Text style={s.colNum}>
                {(j.investering_terug * 100).toFixed(0)} %
              </Text>
            </View>
          ))}
        </View>

        {/* §8.5 — Technische fiches per grote ingreep */}
        {ingrepen.length > 0 && (
          <>
            <Text style={s.h1} break>
              8.5 Technische fiches per ingreep
            </Text>
            <Text style={s.p}>
              Per ingreep vindt u hieronder een technische fiche met omschrijving,
              materiaalspecificaties, berekeningsmethode en energie-impact.
            </Text>
            {ingrepen
              .filter((i) => i.jaarlijkse_besparing_euro > 0 || i.epc_impact_kwh_m2_jaar > 0)
              .map((ing, idx) => (
                <View
                  key={ing.code}
                  style={[s.callout, { marginVertical: 6 }]}
                  wrap={false}
                >
                  <Text style={s.calloutTitle}>
                    8.5.{idx + 1} {ing.titel}
                  </Text>
                  <Text style={{ marginBottom: 4, fontStyle: "italic" }}>
                    {ing.korte_omschrijving}
                  </Text>
                  <Text style={{ fontSize: 8.5, marginBottom: 3, fontWeight: "bold" }}>
                    Technische specificaties:
                  </Text>
                  {ing.technische_specs.map((spec, i) => (
                    <View key={i} style={s.bullet}>
                      <Text style={s.bulletDot}>▸</Text>
                      <Text style={[s.bulletText, { fontSize: 8.5 }]}>{spec}</Text>
                    </View>
                  ))}
                  <View style={{ marginTop: 5, flexDirection: "row", gap: 6 }}>
                    <View style={[s.stat, { flex: 1 }]}>
                      <Text style={s.statLabel}>BESPARING / JAAR</Text>
                      <Text style={s.statValue}>
                        {fWhole(ing.jaarlijkse_besparing_euro)}
                      </Text>
                    </View>
                    <View style={[s.stat, { flex: 1 }]}>
                      <Text style={s.statLabel}>BESPAARDE KWH / JAAR</Text>
                      <Text style={[s.statValue, { fontSize: 13 }]}>
                        {ing.jaarlijkse_besparing_kwh.toLocaleString("nl-BE")}
                      </Text>
                    </View>
                    <View style={[s.stat, { flex: 1 }]}>
                      <Text style={s.statLabel}>CO₂ / JAAR</Text>
                      <Text style={[s.statValue, { fontSize: 13 }]}>
                        {ing.co2_reductie_kg_jaar.toLocaleString("nl-BE")} kg
                      </Text>
                    </View>
                    <View style={[s.stat, { flex: 1 }]}>
                      <Text style={s.statLabel}>TERUGVERDIEND</Text>
                      <Text style={[s.statValue, { fontSize: 13 }]}>
                        {ing.terugverdientijd_jaar !== null
                          ? `${ing.terugverdientijd_jaar.toFixed(1)} j`
                          : "—"}
                      </Text>
                    </View>
                  </View>
                  {ing.formule && (
                    <Text
                      style={{
                        fontSize: 8,
                        color: kleuren.grijs,
                        marginTop: 5,
                        fontFamily: "Courier",
                      }}
                    >
                      Berekening: {ing.formule}
                    </Text>
                  )}
                  <Text style={{ marginTop: 4, fontSize: 9 }}>{ing.toelichting}</Text>
                </View>
              ))}
          </>
        )}

        {/* ---------- 9. BESLUIT ---------- */}
        <Text style={s.h1} break>
          9. Besluit
        </Text>
        <Text style={s.p}>
          Dit project betreft een integrale, toekomstbestendige energierenovatie
          van een bestaande woning. Na uitvoering voldoet de woning aan de
          actuele energievereisten, met een verwachte EPC-sprong naar label{" "}
          {klantParams?.epc_label_verwacht ?? "A, B of C"}. De investering
          resulteert in:
        </Text>
        <Bullet>
          Een <Text style={s.strong}>aanzienlijke waardestijging</Text> van het
          onroerend goed
        </Bullet>
        <Bullet>
          Een <Text style={s.strong}>sterke reductie van de energiefactuur</Text>{" "}
          door isolatie, warmtepomp en PV-installatie (± {fWhole(besparing.totale_jaarlijkse_besparing)} per jaar)
        </Bullet>
        <Bullet>
          Conformiteit met de <Text style={s.strong}>Vlaamse renovatieplicht</Text>{" "}
          voor woningen met slecht EPC-label
        </Bullet>
        <Bullet>
          <Text style={s.strong}>{f(premies.totaal)} aan Vlaamse premies</Text>{" "}
          die de effectieve financieringsbehoefte verlagen
        </Bullet>
        <Text style={s.p}>
          De netto financieringsbehoefte van de klant bedraagt, na aftrek van
          alle premies, <Text style={s.strong}>{f(netto)}</Text>. Enervia BV
          stelt zich graag ter beschikking voor bijkomende informatie of
          technische verduidelijking.
        </Text>

        <View style={s.signature}>
          <Text>Met vriendelijke groeten,</Text>
          <Text style={{ marginTop: 12 }}></Text>
          <Text style={s.signatureName}>Giljom Arts</Text>
          <Text style={{ color: kleuren.grijs, fontSize: 9 }}>
            Zaakvoerder Enervia BV
          </Text>
          <Text style={{ color: kleuren.grijs, fontSize: 9 }}>
            info@enervia.be · 03 808 8666 · www.enervia.be
          </Text>
        </View>

        <View style={s.disclaimer}>
          <Text style={{ fontWeight: "bold", marginBottom: 3 }}>Disclaimer</Text>
          <Text>
            De in dit verslag vermelde premiebedragen zijn gebaseerd op de
            officiële simulatie van VEKA (www.mijnverbouwpremie.be) op datum
            van {datum} en op de door de klant verstrekte inkomensgegevens.
            De definitieve bedragen worden pas vastgelegd na indiening van het
            aanvraagdossier op basis van de werkelijke facturen en de effectief
            uitgevoerde werken. De Vlaamse overheid behoudt zich het recht voor
            om premies te toetsen aan de geldende voorwaarden. Dit verslag is
            louter informatief en doet geen afbreuk aan de algemene voorwaarden
            van Enervia BV zoals opgenomen in de offerte {dossier.referentie ?? ""}.
          </Text>
        </View>
      </Page>
    </Document>
  );
}

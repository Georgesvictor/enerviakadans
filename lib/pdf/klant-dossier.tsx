/**
 * Klant-dossier PDF: klantvriendelijke variant met focus op comfort,
 * besparing en duurzaamheid. Per-ingreep overzicht in eenvoudige taal.
 */

import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type {
  OfferteExtractie,
  PremiesOverzicht,
  BesparingResultaat,
  LeningResultaat,
  IngreepBesparing,
} from "@/lib/berekeningen/types";

const kleuren = {
  groen: "#1F4D3F",
  groen50: "#E8F0ED",
  oranje: "#E87722",
  grijs: "#6B7280",
  tekst: "#0D1F1A",
};

const s = StyleSheet.create({
  page: { padding: 40, fontSize: 11, color: kleuren.tekst, paddingBottom: 60 },
  h1: { fontSize: 28, color: kleuren.groen, marginBottom: 8 },
  h2: { fontSize: 16, color: kleuren.groen, marginTop: 18, marginBottom: 8 },
  h3: { fontSize: 12, color: kleuren.groen, marginTop: 10, marginBottom: 5, fontWeight: "bold" },
  bigBox: {
    backgroundColor: kleuren.groen,
    color: "white",
    padding: 18,
    borderRadius: 8,
    marginVertical: 10,
  },
  accentBox: {
    backgroundColor: kleuren.oranje,
    color: "white",
    padding: 14,
    borderRadius: 8,
    marginVertical: 8,
  },
  softBox: {
    backgroundColor: kleuren.groen50,
    padding: 14,
    borderRadius: 8,
    marginVertical: 6,
  },
  statBig: { fontSize: 32, fontWeight: "bold", marginVertical: 4 },
  row: {
    flexDirection: "row",
    borderBottom: "0.5pt solid #D1E1DB",
    paddingVertical: 4,
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
  col: { flex: 2, paddingHorizontal: 5 },
  colNum: { flex: 1, paddingHorizontal: 5, textAlign: "right", fontSize: 10 },
  footer: {
    position: "absolute",
    bottom: 20,
    left: 40,
    right: 40,
    fontSize: 8,
    color: kleuren.grijs,
    textAlign: "center",
  },
});

const simpeleLabel: Record<string, string> = {
  dak: "Nieuw geïsoleerd dak",
  gevel: "Warmere gevel (spouwisolatie)",
  ramen_deuren: "Nieuwe ramen & deuren",
  vloer: "Vloerisolatie",
  warmtepomp: "Warmtepomp",
  warmtepompboiler: "Warmtepompboiler",
  zonnepanelen: "Zonnepanelen",
  thuisbatterij: "Thuisbatterij",
  voorbereidingswerken: "Voorbereidingswerken",
};

export function KlantDossier({
  klant,
  extractie,
  premies,
  besparing,
  lening,
}: {
  klant: { voornaam: string; achternaam: string };
  extractie: OfferteExtractie;
  premies: PremiesOverzicht;
  besparing: BesparingResultaat;
  lening: LeningResultaat;
}) {
  const netto = Math.max(0, extractie.totaal_incl_btw - premies.totaal);
  const f = (n: number) =>
    `€ ${n.toLocaleString("nl-BE", { maximumFractionDigits: 0 })}`;
  const ingrepen: IngreepBesparing[] = besparing.ingrepen ?? [];

  return (
    <Document>
      {/* ============ PAGINA 1 — HERO + KPI's ============ */}
      <Page size="A4" style={s.page}>
        <Text style={{ fontSize: 22, color: kleuren.groen, letterSpacing: 2 }}>
          ENERVIA
        </Text>
        <Text style={{ fontSize: 10, color: kleuren.grijs, marginBottom: 40 }}>
          simulatie.enervia.be · info@enervia.be · 03 808 8666
        </Text>
        <Text style={s.h1}>Jouw renovatieverhaal</Text>
        <Text style={{ fontSize: 14, color: kleuren.grijs, marginBottom: 20 }}>
          Persoonlijk voor {klant.voornaam} {klant.achternaam}
        </Text>

        <View style={s.bigBox}>
          <Text style={{ fontSize: 12, opacity: 0.8 }}>
            Wat kost deze renovatie jou écht?
          </Text>
          <Text style={s.statBig}>{f(netto)}</Text>
          <Text style={{ fontSize: 11 }}>
            Na aftrek van alle premies ({f(premies.totaal)})
          </Text>
        </View>

        <View style={{ flexDirection: "row", gap: 10 }}>
          <View style={[s.accentBox, { flex: 1 }]}>
            <Text style={{ fontSize: 11, opacity: 0.9 }}>
              Bespaar per jaar op energie
            </Text>
            <Text style={[s.statBig, { fontSize: 24 }]}>
              {f(besparing.totale_jaarlijkse_besparing)}
            </Text>
            <Text style={{ fontSize: 10 }}>
              Terugverdiend in {besparing.terugverdientijd_jaar?.toFixed(1)} jaar
            </Text>
          </View>
          <View style={[s.softBox, { flex: 1, backgroundColor: kleuren.groen50 }]}>
            <Text style={{ fontSize: 11, color: kleuren.groen }}>
              Per maand bespaar je
            </Text>
            <Text style={[s.statBig, { fontSize: 24, color: kleuren.groen }]}>
              {f(besparing.maandelijkse_besparing_totaal_euro ?? besparing.totale_jaarlijkse_besparing / 12)}
            </Text>
            <Text style={{ fontSize: 10, color: kleuren.grijs }}>
              Gas: {f(besparing.maandelijkse_besparing_gas_euro ?? 0)} · Elek: {f(besparing.maandelijkse_besparing_elek_euro ?? 0)}
            </Text>
          </View>
        </View>

        {besparing.epc_label_verwacht && besparing.epc_label_voor && (
          <View style={s.softBox}>
            <Text style={{ fontSize: 11, color: kleuren.grijs }}>
              Je EPC-label stijgt van
            </Text>
            <Text
              style={{
                fontSize: 20,
                color: kleuren.groen,
                fontWeight: "bold",
                marginTop: 4,
              }}
            >
              Label {besparing.epc_label_voor}{"  →  "}
              <Text style={{ color: kleuren.oranje }}>
                Label {besparing.epc_label_verwacht}
              </Text>
            </Text>
          </View>
        )}

        <Text style={s.h2}>Jouw maandelijks plaatje</Text>
        <View style={s.softBox}>
          <Text style={{ marginBottom: 4 }}>
            Je betaalt <Text style={{ fontWeight: "bold" }}>{f(lening.maandelijkse_afbetaling)}/maand</Text>{" "}
            voor de renovatielening ({lening.looptijd_jaar} jaar).
          </Text>
          <Text>
            En je bespaart maandelijks gemiddeld{" "}
            <Text style={{ fontWeight: "bold", color: kleuren.oranje }}>
              {f(besparing.maandelijkse_besparing_totaal_euro ?? besparing.totale_jaarlijkse_besparing / 12)}
            </Text>{" "}
            op je energiefactuur.
          </Text>
        </View>

        <Text style={s.footer}>
          Enervia BV · jouw partner in duurzaam renoveren · info@enervia.be
        </Text>
      </Page>

      {/* ============ PAGINA 2 — PER INGREEP OVERZICHT ============ */}
      <Page size="A4" style={s.page}>
        <Text style={s.h2}>Wat krijg je concreet?</Text>
        <Text style={{ marginBottom: 10, color: kleuren.grijs }}>
          Hier zie je per ingreep wat het doet voor je comfort, je rekening en je woning.
        </Text>

        {ingrepen.length > 0 ? (
          <>
            <View style={s.row}>
              <Text style={[s.col, s.rowHeader, { fontWeight: "bold" }]}>Ingreep</Text>
              <Text style={[s.colNum, s.rowHeader, { fontWeight: "bold" }]}>
                Kostprijs
              </Text>
              <Text style={[s.colNum, s.rowHeader, { fontWeight: "bold" }]}>Premie</Text>
              <Text style={[s.colNum, s.rowHeader, { fontWeight: "bold" }]}>
                Bespaart/jaar
              </Text>
            </View>
            {ingrepen.map((i) => (
              <View key={i.code} style={s.row}>
                <Text style={s.col}>{simpeleLabel[i.code] ?? i.titel}</Text>
                <Text style={s.colNum}>{f(i.investering_incl_btw)}</Text>
                <Text style={[s.colNum, { color: kleuren.oranje }]}>
                  {i.premie_bedrag > 0 ? `−${f(i.premie_bedrag)}` : "—"}
                </Text>
                <Text style={[s.colNum, { color: kleuren.groen, fontWeight: "bold" }]}>
                  {f(i.jaarlijkse_besparing_euro)}
                </Text>
              </View>
            ))}
            <View style={[s.row, s.rowTotal]}>
              <Text style={s.col}>TOTAAL</Text>
              <Text style={s.colNum}>{f(extractie.totaal_incl_btw)}</Text>
              <Text style={s.colNum}>−{f(premies.totaal)}</Text>
              <Text style={s.colNum}>
                {f(besparing.totale_jaarlijkse_besparing)}
              </Text>
            </View>

            <Text style={s.h3}>Waarom dit werkt</Text>
            {ingrepen
              .filter((i) => i.jaarlijkse_besparing_euro > 0 || i.epc_impact_kwh_m2_jaar > 0)
              .slice(0, 5)
              .map((i) => (
                <View key={i.code} style={{ marginBottom: 5 }}>
                  <Text style={{ fontWeight: "bold", color: kleuren.groen }}>
                    {simpeleLabel[i.code] ?? i.titel}
                  </Text>
                  <Text style={{ fontSize: 10, color: kleuren.grijs }}>
                    {i.toelichting}
                  </Text>
                </View>
              ))}
          </>
        ) : (
          <Text>
            Een gedetailleerd overzicht per ingreep volgt in de online simulator.
          </Text>
        )}

        <Text style={s.footer}>
          Enervia BV · simulatie.enervia.be · pagina 2
        </Text>
      </Page>

      {/* ============ PAGINA 3 — 10 JAAR VOORUITBLIK ============ */}
      <Page size="A4" style={s.page}>
        <Text style={s.h2}>10-jaar vooruitblik</Text>
        <Text style={{ marginBottom: 8 }}>
          Hoeveel je zal besparen over de komende 10 jaar (met{" "}
          {((besparing.jaarlijkse_prijsstijging ?? 0.03) * 100).toFixed(0)} %
          jaarlijkse energieprijsstijging):
        </Text>
        {besparing.projectie_10j.map((j) => (
          <View
            key={j.jaar}
            style={{
              flexDirection: "row",
              padding: 6,
              backgroundColor: j.jaar % 2 === 0 ? kleuren.groen50 : "white",
            }}
          >
            <Text style={{ flex: 1 }}>Jaar {j.jaar}</Text>
            <Text style={{ flex: 2 }}>Besparing: {f(j.besparing)}</Text>
            <Text style={{ flex: 2, color: kleuren.oranje }}>
              Cumulatief: {f(j.cumulatief)}
            </Text>
          </View>
        ))}

        {besparing.co2_reductie_kg_jaar !== undefined && (
          <View style={[s.bigBox, { marginTop: 20 }]}>
            <Text style={{ fontSize: 12, opacity: 0.8 }}>
              Ook goed voor het klimaat
            </Text>
            <Text style={s.statBig}>
              {(besparing.co2_reductie_kg_jaar / 1000).toFixed(1)} ton CO₂/jaar
            </Text>
            <Text style={{ fontSize: 11 }}>
              Dat is evenveel als {Math.round(besparing.co2_reductie_kg_jaar / 120)} bomen per jaar
              (elke boom absorbeert ± 120 kg CO₂/jaar).
            </Text>
          </View>
        )}

        <Text
          style={{
            fontSize: 9,
            color: kleuren.grijs,
            fontStyle: "italic",
            marginTop: 20,
          }}
        >
          Premies zijn indicatief en gebaseerd op VEKA-simulatie. EPC-impact is
          indicatief; definitieve waarde wordt bepaald door een EPB-deskundige.
          Energieprijzen op basis van officiële bronnen (VREG/CREG) op datum van
          opmaak. Finale bedragen worden bepaald bij aanvraag op loket.mijnverbouwpremie.be.
        </Text>

        <Text style={s.footer}>
          Enervia BV · jouw partner in duurzaam renoveren · pagina 3
        </Text>
      </Page>
    </Document>
  );
}

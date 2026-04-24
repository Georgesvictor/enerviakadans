/**
 * Klant-dossier PDF: klantvriendelijke variant met focus op comfort,
 * besparing en duurzaamheid. Minder financieel-technisch.
 */

import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type {
  OfferteExtractie,
  PremiesOverzicht,
  BesparingResultaat,
  LeningResultaat,
} from "@/lib/berekeningen/types";

const kleuren = {
  groen: "#1F4D3F",
  groen50: "#E8F0ED",
  oranje: "#E87722",
  grijs: "#6B7280",
};

const s = StyleSheet.create({
  page: { padding: 40, fontSize: 11, color: "#0D1F1A" },
  h1: { fontSize: 28, color: kleuren.groen, marginBottom: 8 },
  h2: { fontSize: 16, color: kleuren.groen, marginTop: 18, marginBottom: 8 },
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

  return (
    <Document>
      <Page size="A4" style={s.page}>
        <Text style={{ fontSize: 22, color: kleuren.groen, letterSpacing: 2 }}>ENERVIA</Text>
        <Text style={{ fontSize: 10, color: kleuren.grijs, marginBottom: 40 }}>
          simulatie.enervia.be
        </Text>
        <Text style={s.h1}>Jouw renovatieverhaal</Text>
        <Text style={{ fontSize: 14, color: kleuren.grijs, marginBottom: 20 }}>
          Persoonlijk voor {klant.voornaam} {klant.achternaam}
        </Text>

        <View style={s.bigBox}>
          <Text style={{ fontSize: 12, opacity: 0.8 }}>Wat kost deze renovatie jou écht?</Text>
          <Text style={s.statBig}>{f(netto)}</Text>
          <Text style={{ fontSize: 11 }}>
            Na aftrek van alle premies ({f(premies.totaal)})
          </Text>
        </View>

        <View style={s.accentBox}>
          <Text style={{ fontSize: 12, opacity: 0.9 }}>Jaarlijkse besparing op energiefacturen</Text>
          <Text style={s.statBig}>{f(besparing.totale_jaarlijkse_besparing)}</Text>
          <Text style={{ fontSize: 11 }}>
            Terugverdiend in {besparing.terugverdientijd_jaar?.toFixed(1)} jaar
          </Text>
        </View>

        <Text style={s.h2}>Jouw maandelijkse budget</Text>
        <View style={s.softBox}>
          <Text>
            Je betaalt {f(lening.maandelijkse_afbetaling)}/maand voor de lening — en
            bespaart gemiddeld {f(besparing.totale_jaarlijkse_besparing / 12)}/maand op
            je energiefactuur.
          </Text>
        </View>

        <Text style={s.footer}>
          Enervia BV · info@enervia.be · 03 808 8666
        </Text>
      </Page>

      <Page size="A4" style={s.page}>
        <Text style={s.h2}>10-jaar vooruitblik</Text>
        <Text style={{ marginBottom: 8 }}>
          Hoeveel je zal besparen over de komende 10 jaar (met 3% jaarlijkse prijsstijging):
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

        <Text style={{ ...s.h2, marginTop: 20 }}>Wat krijg je voor deze investering?</Text>
        <Text>
          • Duurzame warmtepomp installatie
          {"\n"}• {extractie.specifiek.pv_wp ? `${extractie.specifiek.pv_wp} Wp zonnepanelen` : "Geen PV voorzien"}
          {"\n"}• {extractie.specifiek.batterij_kwh ? `${extractie.specifiek.batterij_kwh} kWh thuisbatterij` : ""}
          {"\n"}• Verhoogde EPC-score, beter wooncomfort
          {"\n"}• Lagere energiefacturen voor de komende decennia
        </Text>

        <Text
          style={{
            fontSize: 9,
            color: kleuren.grijs,
            fontStyle: "italic",
            marginTop: 20,
          }}
        >
          Premies zijn indicatief en gebaseerd op VEKA-simulatie. Finale bedragen worden
          bepaald bij aanvraag.
        </Text>

        <Text style={s.footer}>Enervia BV · jouw partner in duurzaam renoveren</Text>
      </Page>
    </Document>
  );
}

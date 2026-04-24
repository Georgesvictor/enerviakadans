/**
 * Bank-dossier PDF: financiële details voor bankaanvraag.
 * Gebruikt @react-pdf/renderer.
 *
 * Structuur overeenkomstig het Waumans-voorbeelddossier:
 *  1. Cover met Enervia-branding + klantgegevens
 *  2. Projectoverzicht met totalen
 *  3. Premies-tabel gedetailleerd
 *  4. Leningsimulatie met maandafbetaling
 *  5. 10-jaar projectie
 *  6. Disclaimer + bijlagen-verwijzing
 */

import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image as PDFImage,
} from "@react-pdf/renderer";
import type { OfferteExtractie, PremiesOverzicht, LeningResultaat, BesparingResultaat } from "@/lib/berekeningen/types";

const kleuren = {
  groen: "#1F4D3F",
  groen50: "#E8F0ED",
  oranje: "#E87722",
  grijs: "#6B7280",
  rand: "#D1E1DB",
};

const s = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica", color: "#0D1F1A" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottom: `2pt solid ${kleuren.groen}`,
    paddingBottom: 12,
    marginBottom: 16,
  },
  logo: { fontSize: 20, color: kleuren.groen, fontWeight: "bold", letterSpacing: 2 },
  coverTitle: { fontSize: 24, color: kleuren.groen, marginTop: 80, marginBottom: 8 },
  coverSub: { fontSize: 14, color: kleuren.grijs, marginBottom: 40 },
  h1: { fontSize: 16, color: kleuren.groen, marginTop: 20, marginBottom: 8, fontWeight: "bold" },
  h2: { fontSize: 12, color: kleuren.groen, marginTop: 12, marginBottom: 6, fontWeight: "bold" },
  p: { marginBottom: 6 },
  table: { borderTop: `1pt solid ${kleuren.rand}`, marginTop: 6 },
  row: {
    flexDirection: "row",
    borderBottom: `1pt solid ${kleuren.rand}`,
    paddingVertical: 4,
  },
  rowHeader: { backgroundColor: kleuren.groen50, fontWeight: "bold" },
  col: { flex: 2, padding: 4 },
  colNum: { flex: 1, padding: 4, textAlign: "right" },
  total: { backgroundColor: kleuren.groen, color: "white", padding: 6, fontSize: 12, fontWeight: "bold" },
  accentBox: {
    backgroundColor: kleuren.oranje,
    color: "white",
    padding: 12,
    marginTop: 10,
    marginBottom: 10,
  },
  stat: { padding: 8, border: `1pt solid ${kleuren.rand}`, flex: 1, margin: 2 },
  footer: {
    position: "absolute",
    left: 40,
    right: 40,
    bottom: 20,
    fontSize: 7,
    color: kleuren.grijs,
    borderTop: `1pt solid ${kleuren.rand}`,
    paddingTop: 6,
    textAlign: "center",
  },
  disclaimer: { fontSize: 8, color: kleuren.grijs, fontStyle: "italic", marginTop: 10 },
});

export interface BankDossierProps {
  klant: { voornaam: string; achternaam: string; adres?: string; postcode?: string; gemeente?: string };
  dossier: { referentie?: string; datum?: string };
  extractie: OfferteExtractie;
  premies: PremiesOverzicht;
  lening: LeningResultaat & { type: string; eigen_inbreng: number };
  besparing: BesparingResultaat;
}

export function BankDossier({ klant, dossier, extractie, premies, lening, besparing }: BankDossierProps) {
  const netto = Math.max(0, extractie.totaal_incl_btw - premies.totaal);
  const f = (n: number) => `€ ${n.toLocaleString("nl-BE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const fWhole = (n: number) => `€ ${n.toLocaleString("nl-BE", { maximumFractionDigits: 0 })}`;

  return (
    <Document>
      {/* Cover */}
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <Text style={s.logo}>ENERVIA</Text>
          <Text style={{ fontSize: 9, color: kleuren.grijs }}>
            simulatie.enervia.be · 03 808 8666 · info@enervia.be
          </Text>
        </View>
        <Text style={s.coverTitle}>Financieel dossier renovatie</Text>
        <Text style={s.coverSub}>
          Voor: {klant.voornaam} {klant.achternaam}
          {klant.adres ? `\n${klant.adres}, ${klant.postcode} ${klant.gemeente}` : ""}
        </Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <View style={s.stat}>
            <Text style={{ fontSize: 8, color: kleuren.grijs }}>Totale investering</Text>
            <Text style={{ fontSize: 18, color: kleuren.groen }}>
              {fWhole(extractie.totaal_incl_btw)}
            </Text>
          </View>
          <View style={s.stat}>
            <Text style={{ fontSize: 8, color: kleuren.grijs }}>Premies</Text>
            <Text style={{ fontSize: 18, color: kleuren.oranje }}>{fWhole(premies.totaal)}</Text>
          </View>
          <View style={s.stat}>
            <Text style={{ fontSize: 8, color: kleuren.grijs }}>Netto investering</Text>
            <Text style={{ fontSize: 18, color: kleuren.groen }}>{fWhole(netto)}</Text>
          </View>
        </View>
        <View style={s.accentBox}>
          <Text style={{ fontSize: 11 }}>
            Maandaflossing: {f(lening.maandelijkse_afbetaling)} over {lening.looptijd_jaar} jaar
            aan {(lening.rentevoet_jaarlijks * 100).toFixed(2)}% rente ({lening.type})
          </Text>
        </View>
        <Text style={s.disclaimer}>
          Dossier {dossier.referentie ?? ""} · Opgemaakt op {dossier.datum ?? new Date().toLocaleDateString("nl-BE")}
        </Text>
        <Text style={s.footer}>
          Enervia BV · {dossier.referentie ?? ""} · Dit dossier is een simulatie op basis
          van VEKA/MijnVerbouw gegevens en geldige energieprijzen op datum van opmaak.
        </Text>
      </Page>

      {/* Premies detail */}
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <Text style={s.logo}>ENERVIA</Text>
          <Text style={{ fontSize: 9, color: kleuren.grijs }}>Premies &amp; tegemoetkomingen</Text>
        </View>
        <Text style={s.h1}>Premies per categorie</Text>
        <View style={s.table}>
          <View style={[s.row, s.rowHeader]}>
            <Text style={s.col}>Categorie</Text>
            <Text style={s.col}>Formule</Text>
            <Text style={s.colNum}>Bedrag</Text>
          </View>
          {Object.entries(premies)
            .filter(([k]) => k !== "totaal")
            .map(([k, v]: any) => (
              <View key={k} style={s.row}>
                <Text style={s.col}>{k.replace(/_/g, " ")}</Text>
                <Text style={s.col}>{v.formule}</Text>
                <Text style={s.colNum}>{f(v.bedrag)}</Text>
              </View>
            ))}
        </View>
        <View style={s.total}>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text>Totaal premies</Text>
            <Text>{f(premies.totaal)}</Text>
          </View>
        </View>

        <Text style={s.h1}>Leningsimulatie</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
          <StatBox label="Leenbedrag" value={f(lening.leenbedrag)} />
          <StatBox label="Eigen inbreng" value={f(lening.eigen_inbreng)} />
          <StatBox label="Rentevoet" value={`${(lening.rentevoet_jaarlijks * 100).toFixed(2)}%`} />
          <StatBox label="Looptijd" value={`${lening.looptijd_jaar} jaar`} />
          <StatBox label="Maandaflossing" value={f(lening.maandelijkse_afbetaling)} />
          <StatBox label="Totale rentekost" value={f(lening.totale_interestkost)} />
        </View>

        <Text style={s.disclaimer}>
          Premies zijn indicatief en gebaseerd op VEKA-simulatie. Finale bedragen
          worden bepaald bij aanvraag.
        </Text>
        <Text style={s.footer}>Enervia BV · Pagina 2</Text>
      </Page>

      {/* 10-jaar projectie */}
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <Text style={s.logo}>ENERVIA</Text>
          <Text style={{ fontSize: 9, color: kleuren.grijs }}>10-jaar besparingsprojectie</Text>
        </View>
        <Text style={s.h1}>Jaarlijkse energiebesparing</Text>
        <View style={{ flexDirection: "row" }}>
          <StatBox label="Warmtepomp" value={f(besparing.jaarlijkse_besparing_warmtepomp)} />
          <StatBox label="PV" value={f(besparing.jaarlijkse_besparing_pv)} />
          <StatBox label="Batterij" value={f(besparing.jaarlijkse_besparing_batterij)} />
          <StatBox label="Totaal" value={f(besparing.totale_jaarlijkse_besparing)} />
        </View>
        <Text style={{ marginTop: 10 }}>
          Terugverdientijd: <Text style={{ color: kleuren.oranje, fontWeight: "bold" }}>
            {besparing.terugverdientijd_jaar?.toFixed(1)} jaar
          </Text>
        </Text>

        <Text style={s.h2}>Projectie 10 jaar ({(besparing.jaarlijkse_prijsstijging * 100).toFixed(0)}% prijsstijging)</Text>
        <View style={s.table}>
          <View style={[s.row, s.rowHeader]}>
            <Text style={s.col}>Jaar</Text>
            <Text style={s.colNum}>Jaarlijkse besparing</Text>
            <Text style={s.colNum}>Cumulatief</Text>
            <Text style={s.colNum}>% terugverdiend</Text>
          </View>
          {besparing.projectie_10j.map((j) => (
            <View key={j.jaar} style={s.row}>
              <Text style={s.col}>Jaar {j.jaar}</Text>
              <Text style={s.colNum}>{f(j.besparing)}</Text>
              <Text style={s.colNum}>{f(j.cumulatief)}</Text>
              <Text style={s.colNum}>{(j.investering_terug * 100).toFixed(0)}%</Text>
            </View>
          ))}
        </View>

        <Text style={s.disclaimer}>
          Energieprijzen: elektriciteit {f(besparing.gebruikte_energieprijzen.elektriciteit_per_kwh)}/kWh
          (bron VREG), gas {f(besparing.gebruikte_energieprijzen.gas_per_kwh)}/kWh (bron CREG),
          stookolie {f(besparing.gebruikte_energieprijzen.stookolie_per_liter)}/l.
        </Text>
        <Text style={s.footer}>Enervia BV · Pagina 3</Text>
      </Page>
    </Document>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.stat}>
      <Text style={{ fontSize: 8, color: kleuren.grijs }}>{label}</Text>
      <Text style={{ fontSize: 12, color: kleuren.groen, fontWeight: "bold" }}>{value}</Text>
    </View>
  );
}

/**
 * Herbruikbare PDF-template voor offertes en facturen.
 *
 * Minimaal, proper, Kadans-branded. Werkt met de `document_templates` tabel
 * voor later per-tenant customisatie.
 */

import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

export interface DocumentPDFProps {
  type: "offerte" | "factuur" | "creditnota";
  tenant: {
    naam: string;
    logo_url?: string | null;
    btw_nummer?: string | null;
    adres?: string;
    postcode?: string;
    gemeente?: string;
    email_contact?: string | null;
    telefoon?: string | null;
    peppol_identifier?: string | null;
  };
  doc: {
    nummer?: string | null;
    onderwerp: string;
    datum: string;
    geldig_tot?: string | null;
    vervaldatum?: string | null;
    opmerkingen?: string | null;
    voorwaarden?: string | null;
    gestructureerde_mededeling?: string | null;
    begeleidende_tekst_html?: string | null;
    iban?: string | null;
    bic?: string | null;
    bank_naam?: string | null;
  };
  klant: {
    naam: string;
    btw_nummer?: string | null;
    adres?: string;
    postcode?: string;
    gemeente?: string;
  };
  regels: Array<{
    omschrijving: string;
    aantal: number;
    eenheid: string;
    prijs_excl_btw: number;
    btw_tarief: number;
    subtotaal_excl_btw: number;
    is_kop?: boolean;
  }>;
  totalen: {
    subtotaal_excl_btw: number;
    totaal_btw: number;
    totaal_incl_btw: number;
    btw_per_tarief?: Array<{ tarief: number; grondslag: number; btw: number }>;
  };
}

const kleuren = {
  groen: "#1F4D3F",
  groen50: "#E8F0ED",
  oranje: "#E87722",
  grijs: "#6B7280",
  rand: "#D1E1DB",
};

const s = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 9.5,
    fontFamily: "Helvetica",
    color: "#0D1F1A",
    paddingBottom: 70,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottom: `2pt solid ${kleuren.groen}`,
    paddingBottom: 12,
    marginBottom: 20,
  },
  brand: { fontSize: 18, fontWeight: "bold", color: kleuren.groen, letterSpacing: 1 },
  titel: { fontSize: 20, color: kleuren.groen, marginBottom: 4, fontWeight: "bold" },
  meta: { fontSize: 9, color: kleuren.grijs },
  twoCol: { flexDirection: "row", justifyContent: "space-between", marginBottom: 16 },
  col: { flex: 1 },
  label: { fontSize: 8, color: kleuren.grijs, textTransform: "uppercase", letterSpacing: 0.5 },
  table: { marginTop: 10 },
  row: {
    flexDirection: "row",
    borderBottom: `0.5pt solid ${kleuren.rand}`,
    paddingVertical: 4,
    alignItems: "flex-start",
  },
  rowHeader: { backgroundColor: kleuren.groen50, fontWeight: "bold", color: kleuren.groen },
  rowKop: { backgroundColor: kleuren.groen50, fontWeight: "bold" },
  rowTotaal: { backgroundColor: kleuren.groen, color: "white", fontWeight: "bold", paddingVertical: 6 },
  colDesc: { flex: 4, paddingHorizontal: 4 },
  colNum: { flex: 1, textAlign: "right", paddingHorizontal: 4 },
  totals: { marginTop: 10, alignItems: "flex-end" },
  totalRow: { flexDirection: "row", justifyContent: "flex-end", gap: 20, marginBottom: 2 },
  totalLabel: { width: 120, textAlign: "right", color: kleuren.grijs },
  totalVal: { width: 90, textAlign: "right" },
  callout: {
    backgroundColor: "#FEF3C7",
    border: "1pt solid #F59E0B",
    padding: 10,
    marginTop: 14,
    marginBottom: 10,
  },
  footer: {
    position: "absolute",
    bottom: 25,
    left: 40,
    right: 40,
    fontSize: 7,
    color: kleuren.grijs,
    borderTop: `0.5pt solid ${kleuren.rand}`,
    paddingTop: 6,
    textAlign: "center",
  },
});

export function DocumentPDF(props: DocumentPDFProps) {
  const { type, tenant, doc, klant, regels, totalen } = props;
  const titels = {
    offerte: "Offerte",
    factuur: "Factuur",
    creditnota: "Creditnota",
  };

  const f = (n: number) =>
    `€ ${Number(n).toLocaleString("nl-BE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const stripHtml = (html: string) =>
    html
      .replace(/<\/(p|div|h[1-6]|li|br)>/gi, "\n")
      .replace(/<br\s*\/?>(?!\n)/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, "\"")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

  return (
    <Document>
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <View>
            <Text style={s.brand}>{tenant.naam}</Text>
            <Text style={s.meta}>
              {tenant.adres ?? ""} {tenant.postcode ?? ""} {tenant.gemeente ?? ""}
            </Text>
            <Text style={s.meta}>
              {tenant.email_contact ?? ""}
              {tenant.telefoon ? ` · ${tenant.telefoon}` : ""}
            </Text>
            {tenant.btw_nummer && (
              <Text style={s.meta}>BTW {tenant.btw_nummer}</Text>
            )}
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={s.titel}>{titels[type]}</Text>
            {doc.nummer && (
              <Text style={s.meta}>Nr. {doc.nummer}</Text>
            )}
            <Text style={s.meta}>
              {new Date(doc.datum).toLocaleDateString("nl-BE")}
            </Text>
          </View>
        </View>

        <View style={s.twoCol}>
          <View style={s.col}>
            <Text style={s.label}>Aan</Text>
            <Text style={{ fontWeight: "bold", fontSize: 11 }}>
              {klant.naam}
            </Text>
            {klant.adres && (
              <Text style={s.meta}>
                {klant.adres} · {klant.postcode} {klant.gemeente}
              </Text>
            )}
            {klant.btw_nummer && (
              <Text style={s.meta}>BTW {klant.btw_nummer}</Text>
            )}
          </View>
          <View style={[s.col, { alignItems: "flex-end" }]}>
            <Text style={s.label}>Onderwerp</Text>
            <Text style={{ fontSize: 11 }}>{doc.onderwerp}</Text>
            {type === "factuur" && doc.vervaldatum && (
              <>
                <Text style={[s.label, { marginTop: 8 }]}>Vervaldatum</Text>
                <Text style={{ fontSize: 11 }}>
                  {new Date(doc.vervaldatum).toLocaleDateString("nl-BE")}
                </Text>
              </>
            )}
            {type === "offerte" && doc.geldig_tot && (
              <>
                <Text style={[s.label, { marginTop: 8 }]}>Geldig tot</Text>
                <Text style={{ fontSize: 11 }}>
                  {new Date(doc.geldig_tot).toLocaleDateString("nl-BE")}
                </Text>
              </>
            )}
          </View>
        </View>

        <View style={s.table}>
          <View style={[s.row, s.rowHeader]}>
            <Text style={s.colDesc}>Omschrijving</Text>
            <Text style={s.colNum}>Aantal</Text>
            <Text style={s.colNum}>Prijs</Text>
            <Text style={s.colNum}>BTW</Text>
            <Text style={s.colNum}>Subtotaal</Text>
          </View>
          {regels.map((r, i) => (
            <View key={i} style={[s.row, r.is_kop ? s.rowKop : {}]}>
              <Text style={s.colDesc}>{r.omschrijving}</Text>
              {!r.is_kop ? (
                <>
                  <Text style={s.colNum}>
                    {r.aantal} {r.eenheid}
                  </Text>
                  <Text style={s.colNum}>{f(r.prijs_excl_btw)}</Text>
                  <Text style={s.colNum}>
                    {(r.btw_tarief * 100).toFixed(0)} %
                  </Text>
                  <Text style={s.colNum}>{f(r.subtotaal_excl_btw)}</Text>
                </>
              ) : (
                <Text style={{ flex: 4 }}></Text>
              )}
            </View>
          ))}
        </View>

        <View style={s.totals}>
          <View style={s.totalRow}>
            <Text style={s.totalLabel}>Subtotaal excl. btw</Text>
            <Text style={s.totalVal}>{f(totalen.subtotaal_excl_btw)}</Text>
          </View>
          {totalen.btw_per_tarief?.map((t, i) => (
            <View key={i} style={s.totalRow}>
              <Text style={s.totalLabel}>
                BTW {(t.tarief * 100).toFixed(0)} % op {f(t.grondslag)}
              </Text>
              <Text style={s.totalVal}>{f(t.btw)}</Text>
            </View>
          ))}
          <View style={s.totalRow}>
            <Text style={s.totalLabel}>Totaal BTW</Text>
            <Text style={s.totalVal}>{f(totalen.totaal_btw)}</Text>
          </View>
          <View
            style={[
              s.totalRow,
              { backgroundColor: kleuren.groen, padding: 6, marginTop: 4 },
            ]}
          >
            <Text
              style={[s.totalLabel, { color: "white", fontWeight: "bold" }]}
            >
              Totaal incl. btw
            </Text>
            <Text style={[s.totalVal, { color: "white", fontWeight: "bold" }]}>
              {f(totalen.totaal_incl_btw)}
            </Text>
          </View>
        </View>

        {/* BETALING (factuur) of REKENING (offerte) */}
        {(doc.gestructureerde_mededeling || doc.iban) && (
          <View style={s.callout}>
            <Text style={{ fontSize: 9, fontWeight: "bold", marginBottom: 3 }}>
              {type === "factuur" ? "Betaling" : "Rekeninggegevens"}
            </Text>
            {doc.iban && (
              <Text style={{ fontSize: 9 }}>
                Rekening{doc.bank_naam ? ` (${doc.bank_naam})` : ""}:{" "}
                <Text style={{ fontFamily: "Courier", fontWeight: "bold" }}>
                  {doc.iban}
                </Text>
                {doc.bic && (
                  <Text style={{ fontSize: 9 }}> · BIC {doc.bic}</Text>
                )}
              </Text>
            )}
            {type === "factuur" && doc.gestructureerde_mededeling && (
              <>
                <Text style={{ fontSize: 9, marginTop: 3 }}>
                  Gelieve te storten met gestructureerde mededeling:
                </Text>
                <Text
                  style={{
                    fontFamily: "Courier",
                    fontSize: 11,
                    fontWeight: "bold",
                    marginTop: 2,
                  }}
                >
                  {doc.gestructureerde_mededeling}
                </Text>
              </>
            )}
          </View>
        )}

        {/* BEGELEIDENDE TEKST (offerte) — als HTML staat plain text gebruiken */}
        {doc.begeleidende_tekst_html && (
          <View style={{ marginTop: 12 }}>
            <Text style={s.label}>Begeleidende tekst</Text>
            <Text style={{ fontSize: 9 }}>
              {stripHtml(doc.begeleidende_tekst_html)}
            </Text>
          </View>
        )}

        {doc.opmerkingen && (
          <View style={{ marginTop: 12 }}>
            <Text style={s.label}>Opmerkingen</Text>
            <Text style={{ fontSize: 9 }}>{doc.opmerkingen}</Text>
          </View>
        )}

        {doc.voorwaarden && (
          <View style={{ marginTop: 10 }} break>
            <Text style={[s.label, { fontSize: 9, marginBottom: 4 }]}>
              Algemene voorwaarden
            </Text>
            <Text style={{ fontSize: 8, color: kleuren.grijs, lineHeight: 1.4 }}>
              {stripHtml(doc.voorwaarden)}
            </Text>
          </View>
        )}

        <Text style={s.footer}>
          {tenant.naam} · {tenant.email_contact ?? ""}{" "}
          {tenant.telefoon ? `· ${tenant.telefoon}` : ""}{" "}
          {tenant.btw_nummer ? `· BTW ${tenant.btw_nummer}` : ""}
        </Text>
      </Page>
    </Document>
  );
}

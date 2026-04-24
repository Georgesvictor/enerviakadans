import type Anthropic from "@anthropic-ai/sdk";
import { getAnthropic, MODELS } from "./client";
import type { OfferteExtractie } from "@/lib/berekeningen/types";

/**
 * JSON-schema voor de gestructureerde offerte-output.
 * Gebruikt als tool_use schema zodat Claude gedwongen wordt
 * gegarandeerd gestructureerde JSON terug te geven.
 */
const OFFERTE_SCHEMA: Anthropic.Tool = {
  name: "offerte_parsed",
  description:
    "Structureert een Enervia renovatie-offerte in categorieën en specifieke detail-velden.",
  input_schema: {
    type: "object",
    required: ["totaal_excl_btw", "totaal_incl_btw", "btw_tarief", "categorieen", "specifiek"],
    properties: {
      totaal_excl_btw: { type: "number" },
      totaal_incl_btw: { type: "number" },
      btw_tarief: { type: "number", description: "BTW tarief als decimaal, bv 0.06 voor 6%" },
      categorieen: {
        type: "object",
        description: "Elk type werken met totaal excl BTW en detail-items",
        properties: {
          werfinrichting: categorieSchema(),
          afbraak: categorieSchema(),
          dak: categorieSchema(),
          gevel: categorieSchema(),
          ramen_deuren: categorieSchema(),
          vloer: categorieSchema(),
          warmtepomp: categorieSchema(),
          warmtepompboiler: categorieSchema(),
          zonnepanelen: categorieSchema(),
          thuisbatterij: categorieSchema(),
          voorbereidingswerken: categorieSchema(),
          korting: categorieSchema(),
        },
      },
      specifiek: {
        type: "object",
        required: ["heeft_asbest", "asbest_kosten_excl"],
        properties: {
          heeft_asbest: { type: "boolean" },
          asbest_kosten_excl: { type: "number" },
          asbest_dak_m2: { type: "number" },
          dak_m2: { type: "number" },
          gevel_m2: { type: "number" },
          ramen_m2: { type: "number" },
          vloer_m2: { type: "number" },
          pv_wp: { type: "number", description: "Totaal Wp vermogen PV-installatie" },
          pv_aantal_panelen: { type: "number" },
          batterij_kwh: { type: "number" },
          warmtepomp_type: {
            type: "string",
            enum: ["lucht_water", "geothermisch", "lucht_lucht", "hybride"],
          },
          warmtepomp_merk: { type: "string" },
          vervangt_elektrische_verwarming: { type: "boolean" },
          in_zone_zonder_gasnet: { type: "boolean" },
        },
      },
    },
  },
};

function categorieSchema() {
  return {
    type: "object",
    properties: {
      excl_btw: { type: "number" },
      details: {
        type: "array",
        items: {
          type: "object",
          properties: {
            omschrijving: { type: "string" },
            bedrag: { type: "number" },
          },
          required: ["omschrijving", "bedrag"],
        },
      },
    },
    required: ["excl_btw"],
  };
}

const SYSTEM_PROMPT = `Je bent een gespecialiseerde extractor voor renovatie-offertes van Enervia BV.
Je doel: zet de ruwe PDF-tekst om naar gestructureerde JSON volgens het schema dat via de 'offerte_parsed' tool beschikbaar is.

Regels bij het parsen:
- Bedragen altijd in EUR, zonder valuta-symbool, met punt als decimaal scheider.
- Categorieën onderverdelen op basis van de werken; typische Enervia-labels zijn:
  werfinrichting, afbraak (ontmanteling), dak, gevel, ramen_deuren (schrijnwerk),
  vloer, warmtepomp, warmtepompboiler, zonnepanelen, thuisbatterij, voorbereidingswerken,
  korting. Bij twijfel kies je de meest toepasselijke categorie.
- 'korting' heeft een NEGATIEF bedrag (bv -4000).
- Bij asbest-werken in de dak-sectie: vul heeft_asbest=true en asbest_kosten_excl met het totaalbedrag.
- Herken altijd m² oppervlakken voor dak/gevel/vloer/ramen.
- Bij PV: haal zowel Wp (totaal) als aantal panelen op. Typisch: stuks × Wp/paneel.
- Bij warmtepomp: classificeer als lucht_water / geothermisch / lucht_lucht / hybride op basis van omschrijving en merk.
- Als een veld niet aanwezig is, laat het weg (geen nulwaarden verzinnen tenzij heeft_asbest = false).
- Antwoord ENKEL via de 'offerte_parsed' tool. Geen vrije tekst.`;

export async function extractOfferte(pdfText: string): Promise<{
  data: OfferteExtractie;
  usage: { input_tokens: number; output_tokens: number };
}> {
  const client = getAnthropic();
  const response = await client.messages.create({
    model: MODELS.sonnet,
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    tools: [OFFERTE_SCHEMA],
    tool_choice: { type: "tool", name: "offerte_parsed" },
    messages: [
      {
        role: "user",
        content: `Hieronder de ruwe tekst van de Enervia-offerte-PDF. Extract de data met de offerte_parsed tool.\n\n---\n${pdfText}\n---`,
      },
    ],
  });

  const toolUse = response.content.find((b) => b.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error("Claude gaf geen tool_use terug bij extractie");
  }

  return {
    data: toolUse.input as OfferteExtractie,
    usage: {
      input_tokens: response.usage.input_tokens,
      output_tokens: response.usage.output_tokens,
    },
  };
}

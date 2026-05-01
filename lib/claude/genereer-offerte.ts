/**
 * AI Offerte-generator.
 *
 * Geeft Claude een vrije omschrijving (en optioneel beschikbare producten
 * uit de catalogus) en krijgt een gestructureerde offerte met regels +
 * sectiekoppen terug.
 */

import { getAnthropic, MODELS } from "./client";

export interface GegenereerdRegel {
  omschrijving: string;
  beschrijving?: string;
  aantal: number;
  eenheid: string;
  prijs_excl_btw: number;
  btw_tarief: number;
  is_kop?: boolean;
  product_id?: string;
}

export interface GenereerInput {
  beschrijving: string; // vrije tekst
  catalogus?: Array<{
    id: string;
    code: string | null;
    naam: string;
    prijs_excl_btw: number;
    btw_tarief: number;
    eenheid: string;
  }>;
  context?: {
    klantNaam?: string;
    type?: "renovatie" | "installatie" | "diensten" | "algemeen";
    btw_voorkeur?: number; // 0.06 voor renovatie, 0.21 standaard
  };
}

export interface GenereerOutput {
  regels: GegenereerdRegel[];
  samenvatting: string;
  inschatting_marge_pct?: number;
  toelichting?: string;
}

export async function genereerOfferteRegels(
  input: GenereerInput,
): Promise<GenereerOutput> {
  const anthropic = getAnthropic();

  const catalogusBlock =
    input.catalogus && input.catalogus.length > 0
      ? `\n\nBESCHIKBARE PRODUCTEN UIT CATALOGUS (gebruik bij voorkeur):\n${input.catalogus
          .slice(0, 60)
          .map(
            (p) =>
              `- [${p.id}] ${p.code ? `(${p.code}) ` : ""}${p.naam} → € ${p.prijs_excl_btw}/${p.eenheid} btw ${(p.btw_tarief * 100).toFixed(0)}%`,
          )
          .join("\n")}`
      : "";

  const systemPrompt = `Je bent een expert offerte-opsteller voor Belgische KMO's, gespecialiseerd in renovatie en energiewerken.
Je krijgt een vrije beschrijving van een project en moet daaruit een gestructureerde offerte produceren met:
- Sectiekoppen (is_kop=true) per werkfase (vb. "Werfinrichting", "Dakwerken", "Gevelwerken")
- Detail-regels onder elke sectie met realistische aantallen en prijzen voor de Belgische markt
- BTW-tarief: 6% voor renovatie van woningen ouder dan 10 jaar, 21% voor andere
- Eenheden: m², m, stuk, dag, uur, forfait

Wees concreet en realistisch. Gebruik gegeven catalogus-producten waar zinvol (vermeld product_id).`;

  const userPrompt = `OPDRACHT:
${input.beschrijving}

CONTEXT:
- Klant: ${input.context?.klantNaam ?? "n.v.t."}
- Type: ${input.context?.type ?? "algemeen"}
- BTW voorkeur: ${input.context?.btw_voorkeur ?? 0.21}
${catalogusBlock}

Geef de regels terug via het tool 'genereer_offerte'.`;

  const response = await anthropic.messages.create({
    model: MODELS.sonnet,
    max_tokens: 4096,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
    tools: [
      {
        name: "genereer_offerte",
        description: "Genereer een gestructureerde offerte met sectiekoppen en regels.",
        input_schema: {
          type: "object",
          properties: {
            samenvatting: {
              type: "string",
              description: "Korte samenvatting in 1-2 zinnen.",
            },
            inschatting_marge_pct: {
              type: "number",
              description: "Geschatte brutomarge in procent (10-50%).",
            },
            toelichting: {
              type: "string",
              description: "Optionele opmerkingen voor de verkoper.",
            },
            regels: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  omschrijving: { type: "string" },
                  beschrijving: { type: "string" },
                  aantal: { type: "number" },
                  eenheid: { type: "string" },
                  prijs_excl_btw: { type: "number" },
                  btw_tarief: { type: "number" },
                  is_kop: { type: "boolean" },
                  product_id: {
                    type: "string",
                    description: "ID uit catalogus indien gebruikt.",
                  },
                },
                required: [
                  "omschrijving",
                  "aantal",
                  "eenheid",
                  "prijs_excl_btw",
                  "btw_tarief",
                ],
              },
            },
          },
          required: ["regels", "samenvatting"],
        },
      },
    ],
    tool_choice: { type: "tool", name: "genereer_offerte" },
  });

  const toolUse = response.content.find((c) => c.type === "tool_use") as any;
  if (!toolUse) {
    throw new Error("AI gaf geen gestructureerd antwoord");
  }
  return toolUse.input as GenereerOutput;
}

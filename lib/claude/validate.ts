import type Anthropic from "@anthropic-ai/sdk";
import { getAnthropic, MODELS } from "./client";
import type { OfferteExtractie } from "@/lib/berekeningen/types";

const VALIDATOR_SCHEMA: Anthropic.Tool = {
  name: "validation_report",
  description:
    "Geeft een score en lijst van bedenkingen over de kwaliteit van een offerte-extractie.",
  input_schema: {
    type: "object",
    required: ["score", "opmerkingen"],
    properties: {
      score: {
        type: "number",
        minimum: 0,
        maximum: 1,
        description: "0 = totaal verkeerd, 1 = perfect geëxtraheerd",
      },
      opmerkingen: {
        type: "array",
        items: { type: "string" },
        description: "Concrete bedenkingen over missende of foute velden",
      },
      totaal_klopt: {
        type: "boolean",
        description: "Som van categorieën ≈ totaal_excl_btw?",
      },
    },
  },
};

const VALIDATOR_PROMPT = `Je bent een kwaliteits-validator voor offerte-extracties.
Gegeven de ruwe PDF-tekst EN de gestructureerde output, beoordeel je:
1. Klopt de som van categorieën met totaal_excl_btw (tolerantie € 5)?
2. Zijn alle zichtbare categorieën in de PDF ook aanwezig in de output?
3. Klopt heeft_asbest en asbest_kosten_excl met wat in de PDF staat?
4. Zijn oppervlakten (m²) en PV-Wp correct overgenomen?

Rapporteer via de 'validation_report' tool. Score 0.0 = onbruikbaar, 1.0 = perfect.
Onder 0.8 betekent dat de verkoper moet reviewen.`;

export async function validateExtractie(
  pdfText: string,
  extractie: OfferteExtractie,
): Promise<{ score: number; opmerkingen: string[]; totaalKlopt: boolean }> {
  const client = getAnthropic();
  const response = await client.messages.create({
    model: MODELS.haiku,
    max_tokens: 1024,
    system: VALIDATOR_PROMPT,
    tools: [VALIDATOR_SCHEMA],
    tool_choice: { type: "tool", name: "validation_report" },
    messages: [
      {
        role: "user",
        content: `PDF-tekst:\n---\n${pdfText}\n---\n\nGestructureerde output:\n\`\`\`json\n${JSON.stringify(
          extractie,
          null,
          2,
        )}\n\`\`\``,
      },
    ],
  });

  const toolUse = response.content.find((b) => b.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    return { score: 0, opmerkingen: ["Validator gaf geen tool_use terug"], totaalKlopt: false };
  }

  const input = toolUse.input as {
    score: number;
    opmerkingen: string[];
    totaal_klopt?: boolean;
  };

  return {
    score: input.score,
    opmerkingen: input.opmerkingen,
    totaalKlopt: input.totaal_klopt ?? true,
  };
}

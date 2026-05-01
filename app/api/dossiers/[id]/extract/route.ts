import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
// pdf-parse v2: class-based API
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PDFParse } = require("pdf-parse") as {
  PDFParse: new (opts: { data: Uint8Array }) => {
    getText(): Promise<{ text: string }>;
    destroy(): Promise<void>;
  };
};
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { extractOfferte } from "@/lib/claude/extract-offerte";
import { validateExtractie } from "@/lib/claude/validate";

export const maxDuration = 60;

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const supabase = createAdminSupabaseClient();

  const { data: dossier } = await supabase
    .from("dossiers")
    .select("id, offerte_pdf_url, verkoper_id")
    .eq("id", params.id)
    .single();

  if (!dossier || (dossier.verkoper_id !== userId && !(await isAdmin(userId)))) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  if (!dossier.offerte_pdf_url) {
    return NextResponse.json({ error: "geen PDF" }, { status: 400 });
  }

  // Download PDF uit storage
  const { data: pdfBlob } = await supabase.storage
    .from("offertes")
    .download(dossier.offerte_pdf_url);
  if (!pdfBlob) {
    return NextResponse.json({ error: "PDF niet vindbaar" }, { status: 404 });
  }

  const buffer = new Uint8Array(await pdfBlob.arrayBuffer());
  const parser = new PDFParse({ data: buffer });
  let pdfText = "";
  try {
    const parsed = await parser.getText();
    pdfText = parsed.text;
  } finally {
    await parser.destroy();
  }

  // Extractie via Claude
  const { data: extractie } = await extractOfferte(pdfText);

  // Validator via Haiku (niet blokkerend — fire and forget)
  const validatie = await validateExtractie(pdfText, extractie).catch(() => ({
    score: 0,
    opmerkingen: ["Validator faalde"],
    totaalKlopt: false,
  }));

  await supabase
    .from("offerte_extracties")
    .upsert({
      dossier_id: dossier.id,
      raw_pdf_text: pdfText,
      gestructureerde_data: extractie,
      validatie_score: validatie.score,
      validatie_opmerkingen: validatie.opmerkingen.join(" · "),
      extractie_model: "claude-sonnet-4-6",
    });

  await supabase
    .from("dossiers")
    .update({ status: "extracted" })
    .eq("id", dossier.id);

  await supabase.from("audit_log").insert({
    dossier_id: dossier.id,
    user_id: userId,
    actie: "dossier_extracted",
    metadata: { validatie_score: validatie.score },
  });

  return NextResponse.json({ extractie, validatie });
}

async function isAdmin(userId: string): Promise<boolean> {
  const supabase = createAdminSupabaseClient();
  const { data } = await supabase.from("users").select("rol").eq("id", userId).single();
  return data?.rol === "admin";
}

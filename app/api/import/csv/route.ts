/**
 * CSV-import endpoint voor contacten + bedrijven.
 *
 * POST multipart/form-data met:
 *   - file (CSV)
 *   - type ('contacten' | 'bedrijven')
 *   - mapping (JSON-string: {csvKolomNaam: dbField})
 *
 * Of POST JSON:
 *   - rows: Array<Record<string, any>>
 *   - type: 'contacten' | 'bedrijven'
 */

import { NextRequest, NextResponse } from "next/server";
import { requireTenant } from "@/lib/tenancy/context";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

function parseCSV(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return { headers: [], rows: [] };
  const parseLine = (line: string): string[] => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else inQuotes = !inQuotes;
      } else if ((ch === "," || ch === ";") && !inQuotes) {
        result.push(current);
        current = "";
      } else current += ch;
    }
    result.push(current);
    return result;
  };
  const headers = parseLine(lines[0]).map((h) => h.trim());
  const rows = lines.slice(1).map(parseLine);
  return { headers, rows };
}

export async function POST(req: NextRequest) {
  const ctx = await requireTenant();
  const ct = req.headers.get("content-type") ?? "";
  let type: string;
  let rowsRaw: Record<string, string>[];

  if (ct.includes("multipart/form-data")) {
    const fd = await req.formData();
    type = String(fd.get("type") ?? "contacten");
    const file = fd.get("file");
    if (!(file instanceof File))
      return NextResponse.json({ error: "file ontbreekt" }, { status: 400 });
    const text = await file.text();
    const { headers, rows } = parseCSV(text);
    rowsRaw = rows.map((r) => {
      const obj: Record<string, string> = {};
      headers.forEach((h, i) => (obj[h.toLowerCase()] = r[i] ?? ""));
      return obj;
    });
  } else {
    const body = await req.json();
    type = body.type ?? "contacten";
    rowsRaw = body.rows ?? [];
  }

  const supabase = createAdminSupabaseClient();
  let imported = 0;
  let errors = 0;
  const errorDetails: string[] = [];

  if (type === "contacten") {
    for (const r of rowsRaw) {
      try {
        const voornaam =
          r["voornaam"] ?? r["first_name"] ?? r["fn"] ?? "";
        const achternaam =
          r["achternaam"] ?? r["last_name"] ?? r["ln"] ?? r["naam"] ?? "";
        if (!voornaam && !achternaam) {
          errors++;
          continue;
        }
        await supabase.from("contacts").insert({
          tenant_id: ctx.tenantId,
          voornaam,
          achternaam,
          email: r["email"] ?? r["e-mail"] ?? null,
          telefoon: r["telefoon"] ?? r["phone"] ?? r["tel"] ?? null,
          gsm: r["gsm"] ?? r["mobile"] ?? null,
          adres_straat: r["adres"] ?? r["straat"] ?? r["address"] ?? null,
          postcode: r["postcode"] ?? r["zip"] ?? null,
          gemeente: r["gemeente"] ?? r["stad"] ?? r["city"] ?? null,
          created_by: ctx.userId,
        });
        imported++;
      } catch (err) {
        errors++;
        if (errorDetails.length < 5)
          errorDetails.push(err instanceof Error ? err.message : String(err));
      }
    }
  } else if (type === "bedrijven") {
    for (const r of rowsRaw) {
      try {
        const naam = r["naam"] ?? r["name"] ?? r["company"] ?? "";
        if (!naam) {
          errors++;
          continue;
        }
        await supabase.from("companies").insert({
          tenant_id: ctx.tenantId,
          naam,
          btw_nummer: r["btw"] ?? r["btw_nummer"] ?? r["vat"] ?? null,
          email: r["email"] ?? null,
          telefoon: r["telefoon"] ?? r["phone"] ?? null,
          website: r["website"] ?? null,
          adres_straat: r["adres"] ?? r["straat"] ?? null,
          postcode: r["postcode"] ?? null,
          gemeente: r["gemeente"] ?? r["stad"] ?? null,
          created_by: ctx.userId,
        });
        imported++;
      } catch (err) {
        errors++;
        if (errorDetails.length < 5)
          errorDetails.push(err instanceof Error ? err.message : String(err));
      }
    }
  } else {
    return NextResponse.json({ error: "type ongeldig" }, { status: 400 });
  }

  await supabase.from("audit_log").insert({
    user_id: ctx.userId,
    actie: `csv_import_${type}`,
    metadata: { imported, errors },
  });

  return NextResponse.json({
    imported,
    errors,
    errorSamples: errorDetails,
    totaal: rowsRaw.length,
  });
}

/**
 * Globale zoek-API voor command palette + global search.
 *
 * Doorzoekt deals, contacten, bedrijven, offertes, facturen, projecten, taken.
 * Geeft top-N matches terug per type.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireTenant } from "@/lib/tenancy/context";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const ctx = await requireTenant();
  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim() ?? "";
  const limit = Math.min(20, Number(url.searchParams.get("limit") ?? 10));

  if (q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const supabase = createAdminSupabaseClient();
  const pattern = `%${q}%`;

  const [deals, contacten, bedrijven, offertes, facturen, projecten, taken] =
    await Promise.all([
      supabase
        .from("deals")
        .select("id, titel, waarde_excl_btw, status")
        .eq("tenant_id", ctx.tenantId)
        .ilike("titel", pattern)
        .limit(limit),
      supabase
        .from("contacts")
        .select("id, voornaam, achternaam, email")
        .eq("tenant_id", ctx.tenantId)
        .or(
          `voornaam.ilike.${pattern},achternaam.ilike.${pattern},email.ilike.${pattern}`,
        )
        .limit(limit),
      supabase
        .from("companies")
        .select("id, naam, btw_nummer")
        .eq("tenant_id", ctx.tenantId)
        .or(`naam.ilike.${pattern},btw_nummer.ilike.${pattern}`)
        .limit(limit),
      supabase
        .from("quotations")
        .select("id, nummer, onderwerp, totaal_incl_btw")
        .eq("tenant_id", ctx.tenantId)
        .or(`nummer.ilike.${pattern},onderwerp.ilike.${pattern}`)
        .limit(limit),
      supabase
        .from("invoices")
        .select("id, nummer, onderwerp, totaal_incl_btw")
        .eq("tenant_id", ctx.tenantId)
        .or(`nummer.ilike.${pattern},onderwerp.ilike.${pattern}`)
        .limit(limit),
      supabase
        .from("projects")
        .select("id, naam, code, status")
        .eq("tenant_id", ctx.tenantId)
        .or(`naam.ilike.${pattern},code.ilike.${pattern}`)
        .limit(limit),
      supabase
        .from("tasks")
        .select("id, titel, status")
        .eq("tenant_id", ctx.tenantId)
        .ilike("titel", pattern)
        .limit(limit),
    ]);

  const results: any[] = [];

  for (const d of deals.data ?? []) {
    results.push({
      type: "deal",
      id: d.id,
      label: d.titel,
      subtitle: d.waarde_excl_btw
        ? `€ ${Number(d.waarde_excl_btw).toLocaleString("nl-BE")}`
        : null,
      href: `/app/deals/${d.id}`,
    });
  }
  for (const c of contacten.data ?? []) {
    results.push({
      type: "contact",
      id: c.id,
      label: `${c.voornaam ?? ""} ${c.achternaam ?? ""}`.trim() || "(geen naam)",
      subtitle: c.email,
      href: `/app/contacten/${c.id}`,
    });
  }
  for (const b of bedrijven.data ?? []) {
    results.push({
      type: "company",
      id: b.id,
      label: b.naam,
      subtitle: b.btw_nummer,
      href: `/app/bedrijven/${b.id}`,
    });
  }
  for (const o of offertes.data ?? []) {
    results.push({
      type: "quotation",
      id: o.id,
      label: `${o.nummer ?? "OFF"} — ${o.onderwerp ?? ""}`,
      subtitle: o.totaal_incl_btw
        ? `€ ${Number(o.totaal_incl_btw).toLocaleString("nl-BE")}`
        : null,
      href: `/app/offertes/${o.id}`,
    });
  }
  for (const f of facturen.data ?? []) {
    results.push({
      type: "invoice",
      id: f.id,
      label: `${f.nummer ?? "FAC"} — ${f.onderwerp ?? ""}`,
      subtitle: f.totaal_incl_btw
        ? `€ ${Number(f.totaal_incl_btw).toLocaleString("nl-BE")}`
        : null,
      href: `/app/facturen/${f.id}`,
    });
  }
  for (const p of projecten.data ?? []) {
    results.push({
      type: "project",
      id: p.id,
      label: p.naam,
      subtitle: p.code ?? p.status,
      href: `/app/projecten/${p.id}`,
    });
  }
  for (const t of taken.data ?? []) {
    results.push({
      type: "task",
      id: t.id,
      label: t.titel,
      subtitle: t.status,
      href: `/app/taken/${t.id}`,
    });
  }

  return NextResponse.json({ results: results.slice(0, limit * 2) });
}

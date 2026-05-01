/**
 * Activity-feed voor deal-detail.
 *
 * Aggregreert events uit meerdere bronnen tot één chronologische tijdlijn:
 *   - deal_stage_history (fase-wissels)
 *   - deal_notes (notities + systeem-events)
 *   - quotations / invoices / purchase_orders (documenten aangemaakt)
 *   - tasks (taken aangemaakt op deal)
 *   - file_links (bestanden geüpload op deal)
 *   - email_links (emails verbonden aan deal)
 *
 * Gebruikt de Supabase admin client (server-only).
 */

import { createAdminSupabaseClient } from "@/lib/supabase/server";

export type ActivityKind =
  | "stage"
  | "note"
  | "system"
  | "quotation"
  | "invoice"
  | "purchase_order"
  | "task"
  | "file"
  | "email";

export interface ActivityEvent {
  kind: ActivityKind;
  at: string; // ISO
  titel: string;
  detail?: string | null;
  href?: string | null;
  user_email?: string | null;
}

export async function getDealActivity(
  tenantId: string,
  dealId: string,
  limit = 80,
): Promise<ActivityEvent[]> {
  const supabase = createAdminSupabaseClient();

  const [
    stageHistory,
    notes,
    quotations,
    invoices,
    purchaseOrders,
    tasks,
    fileLinks,
    emailLinks,
  ] = await Promise.all([
    supabase
      .from("deal_stage_history")
      .select(
        "id, gewijzigd_op, van_stage_id, naar_stage_id, reden, gewijzigd_door, van:pipeline_stages!deal_stage_history_van_stage_id_fkey(naam), naar:pipeline_stages!deal_stage_history_naar_stage_id_fkey(naam)",
      )
      .eq("deal_id", dealId)
      .order("gewijzigd_op", { ascending: false })
      .limit(limit),
    supabase
      .from("deal_notes")
      .select("id, inhoud, is_systeem, created_at, users(email)")
      .eq("deal_id", dealId)
      .order("created_at", { ascending: false })
      .limit(limit),
    supabase
      .from("quotations")
      .select("id, nummer, onderwerp, totaal_incl_btw, status, datum, created_at")
      .eq("deal_id", dealId)
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("invoices")
      .select("id, nummer, onderwerp, totaal_incl_btw, status, datum, created_at")
      .eq("deal_id", dealId)
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("purchase_orders")
      .select("id, nummer, onderwerp, totaal_incl_btw, status, created_at")
      .eq("deal_id", dealId)
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("tasks")
      .select("id, titel, status, created_at, deadline")
      .eq("deal_id", dealId)
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("file_links")
      .select("files(id, naam, grootte_bytes, mime_type, created_at)")
      .eq("entity_type", "deal")
      .eq("entity_id", dealId)
      .limit(40),
    supabase
      .from("email_links")
      .select(
        "gekoppeld_op, thread_id, email_threads(id, onderwerp, laatste_bericht_op)",
      )
      .eq("entity_type", "deal")
      .eq("entity_id", dealId)
      .order("gekoppeld_op", { ascending: false })
      .limit(20),
  ]);

  const events: ActivityEvent[] = [];

  for (const h of (stageHistory.data ?? []) as any[]) {
    const oude = h.van?.naam;
    const nieuw = h.naar?.naam;
    events.push({
      kind: "stage",
      at: h.gewijzigd_op,
      titel: oude
        ? `Verplaatst van "${oude}" naar "${nieuw}"`
        : `Geplaatst in "${nieuw ?? "?"}"`,
      detail: h.reden ?? null,
    });
  }

  for (const n of (notes.data ?? []) as any[]) {
    events.push({
      kind: n.is_systeem ? "system" : "note",
      at: n.created_at,
      titel: n.is_systeem ? n.inhoud : "Notitie toegevoegd",
      detail: n.is_systeem ? null : n.inhoud,
      user_email: n.users?.email ?? null,
    });
  }

  for (const q of (quotations.data ?? []) as any[]) {
    events.push({
      kind: "quotation",
      at: q.created_at,
      titel: `Offerte ${q.nummer ?? ""} aangemaakt — ${q.onderwerp ?? ""}`,
      detail:
        q.totaal_incl_btw != null
          ? `€ ${Number(q.totaal_incl_btw).toLocaleString("nl-BE", { minimumFractionDigits: 2 })} incl. btw`
          : null,
      href: `/app/offertes/${q.id}`,
    });
  }

  for (const i of (invoices.data ?? []) as any[]) {
    events.push({
      kind: "invoice",
      at: i.created_at,
      titel: `Factuur ${i.nummer ?? ""} aangemaakt — ${i.onderwerp ?? ""}`,
      detail:
        i.totaal_incl_btw != null
          ? `€ ${Number(i.totaal_incl_btw).toLocaleString("nl-BE", { minimumFractionDigits: 2 })} incl. btw`
          : null,
      href: `/app/facturen/${i.id}`,
    });
  }

  for (const p of (purchaseOrders.data ?? []) as any[]) {
    events.push({
      kind: "purchase_order",
      at: p.created_at,
      titel: `Bestelbon ${p.nummer ?? ""} aangemaakt — ${p.onderwerp ?? ""}`,
      detail:
        p.totaal_incl_btw != null
          ? `€ ${Number(p.totaal_incl_btw).toLocaleString("nl-BE", { minimumFractionDigits: 2 })}`
          : null,
      href: `/app/bestelbonnen/${p.id}`,
    });
  }

  for (const t of (tasks.data ?? []) as any[]) {
    events.push({
      kind: "task",
      at: t.created_at,
      titel: `Taak: ${t.titel}`,
      detail: t.deadline ? `Deadline ${t.deadline}` : null,
      href: `/app/taken/${t.id}`,
    });
  }

  for (const fl of (fileLinks.data ?? []) as any[]) {
    if (!fl.files) continue;
    const kb = Math.round(Number(fl.files.grootte_bytes ?? 0) / 1024);
    events.push({
      kind: "file",
      at: fl.files.created_at ?? new Date().toISOString(),
      titel: `Bestand toegevoegd: ${fl.files.naam}`,
      detail: kb ? `${kb} KB · ${fl.files.mime_type ?? ""}` : null,
    });
  }

  for (const el of (emailLinks.data ?? []) as any[]) {
    if (!el.email_threads) continue;
    events.push({
      kind: "email",
      at: el.email_threads.laatste_bericht_op ?? el.gekoppeld_op,
      titel: `E-mail: ${el.email_threads.onderwerp ?? "(geen onderwerp)"}`,
      detail: null,
    });
  }

  events.sort((a, b) => (a.at < b.at ? 1 : -1));
  return events.slice(0, limit);
}

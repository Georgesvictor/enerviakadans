/**
 * Recent-items tracker — bewaart laatste 10 bezochte deals/contacten/etc
 * per gebruiker. Eenvoudige opslag in een 'recent_items' kolom in users-tabel.
 *
 * Voor performance: clientside cookie + sync naar DB elke X klikken.
 */

import { createAdminSupabaseClient } from "@/lib/supabase/server";

export interface RecentItem {
  type: "deal" | "contact" | "company" | "quotation" | "invoice" | "project";
  id: string;
  label: string;
  href: string;
  at: string;
}

export async function getRecentItems(
  tenantId: string,
  userId: string,
  limit = 8,
): Promise<RecentItem[]> {
  const supabase = createAdminSupabaseClient();

  // Combinatie van laatst bewerkte deals/contacten/etc gemaakt of bewerkt door user
  const [deals, contacts, quotes, invoices, projects] = await Promise.all([
    supabase
      .from("deals")
      .select("id, titel, updated_at")
      .eq("tenant_id", tenantId)
      .eq("eigenaar_id", userId)
      .order("updated_at", { ascending: false })
      .limit(5),
    supabase
      .from("contacts")
      .select("id, voornaam, achternaam, updated_at")
      .eq("tenant_id", tenantId)
      .order("updated_at", { ascending: false })
      .limit(3),
    supabase
      .from("quotations")
      .select("id, nummer, onderwerp, updated_at")
      .eq("tenant_id", tenantId)
      .order("updated_at", { ascending: false })
      .limit(3),
    supabase
      .from("invoices")
      .select("id, nummer, onderwerp, updated_at")
      .eq("tenant_id", tenantId)
      .order("updated_at", { ascending: false })
      .limit(3),
    supabase
      .from("projects")
      .select("id, naam, updated_at")
      .eq("tenant_id", tenantId)
      .order("updated_at", { ascending: false })
      .limit(2),
  ]);

  const items: RecentItem[] = [];

  for (const d of deals.data ?? []) {
    items.push({
      type: "deal",
      id: d.id,
      label: d.titel,
      href: `/app/deals/${d.id}`,
      at: d.updated_at,
    });
  }
  for (const c of contacts.data ?? []) {
    items.push({
      type: "contact",
      id: c.id,
      label: `${c.voornaam ?? ""} ${c.achternaam ?? ""}`.trim() || "(geen naam)",
      href: `/app/contacten/${c.id}`,
      at: c.updated_at,
    });
  }
  for (const q of quotes.data ?? []) {
    items.push({
      type: "quotation",
      id: q.id,
      label: `${q.nummer ?? "OFF"} · ${q.onderwerp ?? ""}`.slice(0, 40),
      href: `/app/offertes/${q.id}`,
      at: q.updated_at,
    });
  }
  for (const i of invoices.data ?? []) {
    items.push({
      type: "invoice",
      id: i.id,
      label: `${i.nummer ?? "FAC"} · ${i.onderwerp ?? ""}`.slice(0, 40),
      href: `/app/facturen/${i.id}`,
      at: i.updated_at,
    });
  }
  for (const p of projects.data ?? []) {
    items.push({
      type: "project",
      id: p.id,
      label: p.naam,
      href: `/app/projecten/${p.id}`,
      at: p.updated_at,
    });
  }

  items.sort((a, b) => (a.at < b.at ? 1 : -1));
  return items.slice(0, limit);
}

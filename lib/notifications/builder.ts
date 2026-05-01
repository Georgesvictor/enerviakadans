/**
 * Notificatie-builder.
 *
 * Server-side aggregator die voor de huidige gebruiker een lijst van
 * actiepunten samenstelt: vervallen facturen, taken die deadline naderen,
 * stale deals zonder activiteit, ondertekende offertes wachten op factuur, ...
 *
 * Zonder echte tabel — runtime-gegenereerd. Voor persistente notificaties
 * kunnen we later een 'notifications' tabel toevoegen.
 */

import { createAdminSupabaseClient } from "@/lib/supabase/server";

export type Notif = {
  id: string;
  type:
    | "factuur_vervallen"
    | "taak_deadline"
    | "deal_stale"
    | "offerte_wacht"
    | "deal_won"
    | "lead_nieuw";
  titel: string;
  detail?: string;
  href: string;
  prioriteit: "info" | "warn" | "alert";
  at: string;
};

export async function buildNotifications(
  tenantId: string,
  userId: string,
): Promise<Notif[]> {
  const supabase = createAdminSupabaseClient();
  const today = new Date();
  const todayISO = today.toISOString().slice(0, 10);
  const morgenISO = new Date(today.getTime() + 86400000)
    .toISOString()
    .slice(0, 10);
  const dertigDgnGeleden = new Date(today.getTime() - 30 * 86400000)
    .toISOString();

  const [vervalFacturen, deadlineTaken, staleDeals, getekendeOffertes] =
    await Promise.all([
      supabase
        .from("invoices")
        .select("id, nummer, totaal_incl_btw, vervaldatum, reeds_betaald")
        .eq("tenant_id", tenantId)
        .eq("status", "verzonden")
        .lte("vervaldatum", todayISO)
        .limit(10),
      supabase
        .from("tasks")
        .select("id, titel, deadline, prioriteit")
        .eq("tenant_id", tenantId)
        .neq("status", "afgewerkt")
        .or(`toegewezen_aan.eq.${userId},toegewezen_aan.is.null`)
        .lte("deadline", morgenISO)
        .limit(10),
      supabase
        .from("deals")
        .select("id, titel, updated_at, waarde_excl_btw")
        .eq("tenant_id", tenantId)
        .eq("status", "open")
        .lte("updated_at", dertigDgnGeleden)
        .limit(10),
      supabase
        .from("quotations")
        .select("id, nummer, onderwerp")
        .eq("tenant_id", tenantId)
        .eq("status", "aanvaard")
        .limit(5),
    ]);

  const out: Notif[] = [];

  for (const f of (vervalFacturen.data ?? []) as any[]) {
    const open = Number(f.totaal_incl_btw ?? 0) - Number(f.reeds_betaald ?? 0);
    if (open <= 0) continue;
    out.push({
      id: `fact-${f.id}`,
      type: "factuur_vervallen",
      titel: `Factuur ${f.nummer ?? ""} vervallen`,
      detail: `€ ${open.toLocaleString("nl-BE", { maximumFractionDigits: 0 })} openstaand`,
      href: `/app/facturen/${f.id}`,
      prioriteit: "alert",
      at: f.vervaldatum,
    });
  }

  for (const t of (deadlineTaken.data ?? []) as any[]) {
    out.push({
      id: `taak-${t.id}`,
      type: "taak_deadline",
      titel: t.titel,
      detail: `Deadline ${t.deadline ?? "?"}`,
      href: `/app/taken`,
      prioriteit: t.prioriteit === "urgent" ? "alert" : "warn",
      at: t.deadline ?? new Date().toISOString(),
    });
  }

  for (const d of (staleDeals.data ?? []) as any[]) {
    out.push({
      id: `stale-${d.id}`,
      type: "deal_stale",
      titel: `${d.titel} — geen activiteit > 30 dagen`,
      detail: d.waarde_excl_btw
        ? `€ ${Number(d.waarde_excl_btw).toLocaleString("nl-BE", { maximumFractionDigits: 0 })}`
        : undefined,
      href: `/app/deals/${d.id}`,
      prioriteit: "warn",
      at: d.updated_at,
    });
  }

  for (const o of (getekendeOffertes.data ?? []) as any[]) {
    out.push({
      id: `offerte-${o.id}`,
      type: "offerte_wacht",
      titel: `Aanvaarde offerte ${o.nummer ?? ""}`,
      detail: "Tijd om factuur op te maken",
      href: `/app/offertes/${o.id}`,
      prioriteit: "info",
      at: new Date().toISOString(),
    });
  }

  // Sort by priority then date
  const prioOrder = { alert: 0, warn: 1, info: 2 };
  out.sort((a, b) => {
    const p = prioOrder[a.prioriteit] - prioOrder[b.prioriteit];
    if (p !== 0) return p;
    return a.at < b.at ? 1 : -1;
  });

  return out.slice(0, 30);
}

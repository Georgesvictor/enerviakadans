/**
 * "Vandaag" widget — server component, toont alles wat de gebruiker
 * vandaag moet zien: openstaande taken, vervallen facturen, oude deals,
 * verse leads.
 */

import Link from "next/link";
import {
  CheckSquare,
  AlertTriangle,
  Receipt,
  TrendingUp,
  Mail,
  Sparkles,
} from "lucide-react";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

export async function VandaagWidget({
  tenantId,
  userId,
}: {
  tenantId: string;
  userId: string;
}) {
  const supabase = createAdminSupabaseClient();
  const today = new Date();
  const todayISO = today.toISOString().slice(0, 10);
  const sevenDaysAgo = new Date(today.getTime() - 7 * 86400000)
    .toISOString()
    .slice(0, 10);
  const thirtyDaysAgo = new Date(today.getTime() - 30 * 86400000)
    .toISOString()
    .slice(0, 10);

  const [tasksToday, lateInvoices, staleDeals, recentLeads] = await Promise.all([
    supabase
      .from("tasks")
      .select("id, titel, deadline, prioriteit")
      .eq("tenant_id", tenantId)
      .neq("status", "afgewerkt")
      .or(`toegewezen_aan.eq.${userId},toegewezen_aan.is.null`)
      .lte("deadline", todayISO)
      .order("prioriteit", { ascending: false })
      .order("deadline")
      .limit(5),
    supabase
      .from("invoices")
      .select("id, nummer, onderwerp, totaal_incl_btw, vervaldatum, reeds_betaald")
      .eq("tenant_id", tenantId)
      .eq("status", "verzonden")
      .lte("vervaldatum", todayISO)
      .order("vervaldatum")
      .limit(5),
    supabase
      .from("deals")
      .select("id, titel, waarde_excl_btw, updated_at")
      .eq("tenant_id", tenantId)
      .eq("status", "open")
      .lte("updated_at", thirtyDaysAgo)
      .order("updated_at")
      .limit(5),
    supabase
      .from("deals")
      .select("id, titel, waarde_excl_btw, created_at, lead_bron")
      .eq("tenant_id", tenantId)
      .gte("created_at", sevenDaysAgo)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const taken = tasksToday.data ?? [];
  const lateFact = lateInvoices.data ?? [];
  const oudeDeals = staleDeals.data ?? [];
  const nieuweLeads = recentLeads.data ?? [];

  const totaalLate = lateFact.reduce(
    (s, f: any) =>
      s + (Number(f.totaal_incl_btw ?? 0) - Number(f.reeds_betaald ?? 0)),
    0,
  );

  const fmtEur = (n: number) =>
    `€ ${n.toLocaleString("nl-BE", { maximumFractionDigits: 0 })}`;

  const Sectie = ({
    titel,
    icon: Icon,
    color,
    count,
    children,
  }: {
    titel: string;
    icon: any;
    color: string;
    count: number;
    children: React.ReactNode;
  }) => (
    <div className="bg-white rounded-lg border p-4">
      <div className={`flex items-center gap-2 mb-3 ${color}`}>
        <Icon size={16} />
        <h3 className="font-semibold text-sm">{titel}</h3>
        <span className="text-xs bg-muted px-1.5 py-0.5 rounded ml-auto">
          {count}
        </span>
      </div>
      <div className="space-y-1.5 text-sm">{children}</div>
    </div>
  );

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Sparkles size={18} className="text-amber-500" />
        <h2 className="text-lg font-bold text-enervia-700">Vandaag</h2>
        <span className="text-xs text-muted-foreground">
          {today.toLocaleDateString("nl-BE", {
            weekday: "long",
            day: "2-digit",
            month: "long",
          })}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Sectie
          titel="Taken vandaag"
          icon={CheckSquare}
          color="text-violet-700"
          count={taken.length}
        >
          {taken.length === 0 ? (
            <p className="text-xs text-muted-foreground">Geen openstaande taken 🎉</p>
          ) : (
            taken.map((t: any) => (
              <Link
                key={t.id}
                href={`/app/taken`}
                className="flex justify-between items-center hover:bg-muted/50 -mx-2 px-2 py-1 rounded"
              >
                <span className="line-clamp-1 flex-1">{t.titel}</span>
                {t.prioriteit === "urgent" && (
                  <span className="text-xs text-red-600">●</span>
                )}
              </Link>
            ))
          )}
        </Sectie>

        <Sectie
          titel="Vervallen facturen"
          icon={AlertTriangle}
          color="text-amber-700"
          count={lateFact.length}
        >
          {lateFact.length === 0 ? (
            <p className="text-xs text-muted-foreground">Alles op tijd 👌</p>
          ) : (
            <>
              {lateFact.map((f: any) => (
                <Link
                  key={f.id}
                  href={`/app/facturen/${f.id}`}
                  className="flex justify-between items-center hover:bg-muted/50 -mx-2 px-2 py-1 rounded"
                >
                  <span className="line-clamp-1 flex-1">
                    {f.nummer ?? "FAC"}
                  </span>
                  <span className="text-xs font-mono text-amber-700">
                    {fmtEur(
                      Number(f.totaal_incl_btw ?? 0) -
                        Number(f.reeds_betaald ?? 0),
                    )}
                  </span>
                </Link>
              ))}
              <div className="pt-1.5 mt-1.5 border-t text-xs">
                Totaal: <strong>{fmtEur(totaalLate)}</strong>
              </div>
            </>
          )}
        </Sectie>

        <Sectie
          titel="Stale deals"
          icon={TrendingUp}
          color="text-orange-700"
          count={oudeDeals.length}
        >
          {oudeDeals.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Niemand is vergeten ✓
            </p>
          ) : (
            oudeDeals.map((d: any) => (
              <Link
                key={d.id}
                href={`/app/deals/${d.id}`}
                className="flex justify-between items-center hover:bg-muted/50 -mx-2 px-2 py-1 rounded"
              >
                <span className="line-clamp-1 flex-1">{d.titel}</span>
                {d.waarde_excl_btw && (
                  <span className="text-xs font-mono text-muted-foreground">
                    {fmtEur(Number(d.waarde_excl_btw))}
                  </span>
                )}
              </Link>
            ))
          )}
        </Sectie>

        <Sectie
          titel="Nieuwe leads (7d)"
          icon={Mail}
          color="text-emerald-700"
          count={nieuweLeads.length}
        >
          {nieuweLeads.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Nog geen verse leads
            </p>
          ) : (
            nieuweLeads.map((l: any) => (
              <Link
                key={l.id}
                href={`/app/deals/${l.id}`}
                className="flex justify-between items-center hover:bg-muted/50 -mx-2 px-2 py-1 rounded"
              >
                <span className="line-clamp-1 flex-1">{l.titel}</span>
                {l.lead_bron && (
                  <span className="text-[10px] bg-emerald-50 text-emerald-700 px-1 py-0.5 rounded">
                    {l.lead_bron}
                  </span>
                )}
              </Link>
            ))
          )}
        </Sectie>
      </div>
    </div>
  );
}

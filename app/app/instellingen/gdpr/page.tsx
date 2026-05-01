import Link from "next/link";
import { requireTenant } from "@/lib/tenancy/context";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { Shield } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function GDPRPage() {
  const ctx = await requireTenant();
  const supabase = createAdminSupabaseClient();

  const [verzoekenRes, retentieRes] = await Promise.all([
    supabase
      .from("data_subject_requests")
      .select("*")
      .eq("tenant_id", ctx.tenantId)
      .order("aangevraagd_op", { ascending: false })
      .limit(50),
    supabase
      .from("retention_policies")
      .select("*")
      .eq("tenant_id", ctx.tenantId),
  ]);

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <Link
          href="/app/instellingen"
          className="text-xs text-muted-foreground hover:underline"
        >
          ← Instellingen
        </Link>
        <h1 className="text-2xl font-bold text-enervia-700 mt-1">
          GDPR & privacy
        </h1>
        <p className="text-muted-foreground text-sm">
          Data Subject Rights (DSR), retentie-policies en privacy-documenten.
        </p>
      </div>

      <section className="bg-white rounded-lg border p-5">
        <h2 className="font-semibold text-enervia-700 mb-3">
          Data Subject Requests
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          Registreer GDPR-verzoeken van betrokkenen (inzage, rectificatie,
          verwijdering). Wettelijk te behandelen binnen 30 dagen.
        </p>
        {!verzoekenRes.data || verzoekenRes.data.length === 0 ? (
          <div className="text-sm text-muted-foreground py-4 text-center">
            Nog geen verzoeken ingediend.
          </div>
        ) : (
          <ul className="divide-y text-sm">
            {verzoekenRes.data.map((v: any) => (
              <li key={v.id} className="py-2 flex justify-between">
                <div>
                  <span className="font-medium capitalize">{v.type}</span>{" "}
                  — {new Date(v.aangevraagd_op).toLocaleDateString("nl-BE")}
                </div>
                <span className="text-xs">
                  {v.voltooid_op ? "Voltooid" : "In behandeling"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="bg-white rounded-lg border p-5">
        <h2 className="font-semibold text-enervia-700 mb-3">
          Retentie-policies
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          Automatische verwijdering na X dagen per categorie.
        </p>
        {!retentieRes.data || retentieRes.data.length === 0 ? (
          <div className="text-sm text-muted-foreground py-4 text-center">
            Geen policies geconfigureerd. Standaard: dossiers worden na 90 dagen
            automatisch verwijderd.
          </div>
        ) : (
          <ul className="divide-y text-sm">
            {retentieRes.data.map((r: any) => (
              <li key={r.id} className="py-2 flex justify-between">
                <span className="capitalize">{r.entity}</span>
                <span className="text-muted-foreground">
                  {r.retentie_dagen} dagen
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="bg-white rounded-lg border p-5">
        <h2 className="font-semibold text-enervia-700 mb-3">
          Privacy-documenten
        </h2>
        <ul className="text-sm space-y-2">
          <li>
            <Link href="/privacy" className="text-enervia-600 hover:underline">
              Privacy Policy (publiek)
            </Link>
          </li>
          <li>
            <Link
              href="/voorwaarden"
              className="text-enervia-600 hover:underline"
            >
              Algemene voorwaarden
            </Link>
          </li>
          <li>
            <a
              href="/docs/dpa-template.pdf"
              className="text-enervia-600 hover:underline"
            >
              DPA-template (download)
            </a>
          </li>
        </ul>
      </section>

      <div className="bg-enervia-50 border border-enervia-200 rounded-lg p-4 text-sm">
        <div className="flex items-start gap-3">
          <Shield size={20} className="text-enervia-700 shrink-0 mt-0.5" />
          <div className="text-enervia-700">
            <strong>Kadans is GDPR-compliant.</strong> Alle tenantdata is
            geïsoleerd per Supabase RLS. Audit-logs registreren kritieke acties.
            Bij breaches wordt de verantwoordelijke binnen 24 uur
            gecontacteerd conform AVG art. 33.
          </div>
        </div>
      </div>
    </div>
  );
}

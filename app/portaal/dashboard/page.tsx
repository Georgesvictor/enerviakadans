import { redirect } from "next/navigation";
import { getKlantSession } from "@/lib/klantportaal/auth";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function PortaalDashboard() {
  const session = await getKlantSession();
  if (!session) redirect("/portaal/login");

  const supabase = createAdminSupabaseClient();
  const cId = session.contact_id;
  const coId = session.company_id;
  const orFilter = (col: string) => {
    const parts: string[] = [];
    if (cId) parts.push(`${col}.eq.${cId}`);
    if (coId) parts.push(`company_id.eq.${coId}`);
    return parts.join(",") || "id.eq.00000000-0000-0000-0000-000000000000";
  };

  // Deals
  const { data: deals } = await supabase
    .from("deals")
    .select("id, title, value, status, created_at, stage_id")
    .or(orFilter("contact_id"))
    .eq("tenant_id", session.tenant_id)
    .order("created_at", { ascending: false });

  // Quotations
  const { data: offertes } = await supabase
    .from("quotations")
    .select(
      "id, nummer, titel, status, totaal_incl_btw, totaal_excl_btw, datum, geldig_tot",
    )
    .or(orFilter("contact_id"))
    .eq("tenant_id", session.tenant_id)
    .order("datum", { ascending: false });

  // Invoices
  const { data: facturen } = await supabase
    .from("invoices")
    .select(
      "id, nummer, titel, status, totaal_incl_btw, datum, vervaldatum, betaald_op",
    )
    .or(orFilter("contact_id"))
    .eq("tenant_id", session.tenant_id)
    .order("datum", { ascending: false });

  // Projecten
  const { data: projecten } = await supabase
    .from("projects")
    .select("id, naam, status, start_datum, einde_datum")
    .or(orFilter("contact_id"))
    .eq("tenant_id", session.tenant_id)
    .order("start_datum", { ascending: false });

  // Stats
  const openFacturen = (facturen ?? []).filter((f) => !f.betaald_op);
  const teBetalen = openFacturen.reduce(
    (s, f) => s + Number(f.totaal_incl_btw ?? 0),
    0,
  );
  const lopendeProjecten = (projecten ?? []).filter(
    (p) => p.status === "lopend" || p.status === "actief",
  ).length;

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1F4D3F]">Welkom terug</h1>
          <p className="text-sm text-slate-500">{session.email}</p>
        </div>
        <form action="/api/portaal/uitloggen" method="POST">
          <button className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50">
            Uitloggen
          </button>
        </form>
      </div>

      {/* Stats cards */}
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Stat
          label="Open te betalen"
          waarde={`€ ${teBetalen.toLocaleString("nl-BE", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}`}
          accent={teBetalen > 0 ? "#E87722" : "#1F4D3F"}
        />
        <Stat
          label="Lopende projecten"
          waarde={String(lopendeProjecten)}
          accent="#1F4D3F"
        />
        <Stat
          label="Open offertes"
          waarde={String(
            (offertes ?? []).filter(
              (o) => o.status === "verzonden" || o.status === "draft",
            ).length,
          )}
          accent="#1F4D3F"
        />
      </div>

      {/* Lopende projecten */}
      <Section titel="Mijn projecten">
        {(projecten ?? []).length === 0 ? (
          <Empty>Nog geen projecten gestart.</Empty>
        ) : (
          <div className="space-y-2">
            {(projecten ?? []).map((p) => (
              <Link
                key={p.id}
                href={`/portaal/project/${p.id}`}
                className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3 hover:border-[#1F4D3F]"
              >
                <div>
                  <div className="font-medium text-slate-900">{p.naam}</div>
                  <div className="text-xs text-slate-500">
                    {p.start_datum
                      ? `Gestart ${new Date(p.start_datum).toLocaleDateString("nl-BE")}`
                      : "Nog niet gestart"}
                  </div>
                </div>
                <Badge>{p.status}</Badge>
              </Link>
            ))}
          </div>
        )}
      </Section>

      {/* Offertes */}
      <Section titel="Mijn offertes">
        {(offertes ?? []).length === 0 ? (
          <Empty>Nog geen offertes ontvangen.</Empty>
        ) : (
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs text-slate-500">
                <tr>
                  <th className="px-4 py-2">Nr</th>
                  <th className="px-4 py-2">Titel</th>
                  <th className="px-4 py-2">Datum</th>
                  <th className="px-4 py-2">Bedrag</th>
                  <th className="px-4 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {(offertes ?? []).map((o) => (
                  <tr
                    key={o.id}
                    className="cursor-pointer border-t border-slate-100 hover:bg-slate-50"
                  >
                    <td className="px-4 py-2 font-mono text-xs">
                      <Link href={`/portaal/offerte/${o.id}`}>{o.nummer}</Link>
                    </td>
                    <td className="px-4 py-2">
                      <Link href={`/portaal/offerte/${o.id}`}>{o.titel}</Link>
                    </td>
                    <td className="px-4 py-2 text-slate-500">
                      {o.datum
                        ? new Date(o.datum).toLocaleDateString("nl-BE")
                        : "—"}
                    </td>
                    <td className="px-4 py-2 font-medium">
                      €{" "}
                      {Number(o.totaal_incl_btw ?? 0).toLocaleString("nl-BE", {
                        minimumFractionDigits: 2,
                      })}
                    </td>
                    <td className="px-4 py-2">
                      <Badge>{o.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      {/* Facturen */}
      <Section titel="Mijn facturen">
        {(facturen ?? []).length === 0 ? (
          <Empty>Nog geen facturen.</Empty>
        ) : (
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs text-slate-500">
                <tr>
                  <th className="px-4 py-2">Nr</th>
                  <th className="px-4 py-2">Datum</th>
                  <th className="px-4 py-2">Vervalt</th>
                  <th className="px-4 py-2">Bedrag</th>
                  <th className="px-4 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {(facturen ?? []).map((f) => {
                  const verlopen =
                    f.vervaldatum &&
                    !f.betaald_op &&
                    new Date(f.vervaldatum) < new Date();
                  return (
                    <tr
                      key={f.id}
                      className="cursor-pointer border-t border-slate-100 hover:bg-slate-50"
                    >
                      <td className="px-4 py-2 font-mono text-xs">
                        <Link href={`/portaal/factuur/${f.id}`}>
                          {f.nummer}
                        </Link>
                      </td>
                      <td className="px-4 py-2 text-slate-500">
                        {f.datum
                          ? new Date(f.datum).toLocaleDateString("nl-BE")
                          : "—"}
                      </td>
                      <td className={`px-4 py-2 ${verlopen ? "text-red-600 font-medium" : "text-slate-500"}`}>
                        {f.vervaldatum
                          ? new Date(f.vervaldatum).toLocaleDateString("nl-BE")
                          : "—"}
                      </td>
                      <td className="px-4 py-2 font-medium">
                        €{" "}
                        {Number(f.totaal_incl_btw ?? 0).toLocaleString("nl-BE", {
                          minimumFractionDigits: 2,
                        })}
                      </td>
                      <td className="px-4 py-2">
                        <Badge variant={f.betaald_op ? "green" : verlopen ? "red" : "neutral"}>
                          {f.betaald_op
                            ? "Betaald"
                            : verlopen
                              ? "Vervallen"
                              : "Open"}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </div>
  );
}

function Stat({
  label,
  waarde,
  accent,
}: {
  label: string;
  waarde: string;
  accent: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="text-xs text-slate-500">{label}</div>
      <div
        className="mt-1 text-2xl font-bold"
        style={{ color: accent }}
      >
        {waarde}
      </div>
    </div>
  );
}

function Section({
  titel,
  children,
}: {
  titel: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-10">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500">
        {titel}
      </h2>
      {children}
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
      {children}
    </div>
  );
}

function Badge({
  children,
  variant = "neutral",
}: {
  children: React.ReactNode;
  variant?: "neutral" | "green" | "red" | "amber";
}) {
  const colors: Record<typeof variant, string> = {
    neutral: "bg-slate-100 text-slate-700",
    green: "bg-green-100 text-green-700",
    red: "bg-red-100 text-red-700",
    amber: "bg-amber-100 text-amber-700",
  } as const;
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${colors[variant]}`}
    >
      {children}
    </span>
  );
}

import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getKlantSession } from "@/lib/klantportaal/auth";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function PortaalProject({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getKlantSession();
  if (!session) redirect("/portaal/login");
  const { id } = await params;

  const supabase = createAdminSupabaseClient();
  const { data: p } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .eq("tenant_id", session.tenant_id)
    .maybeSingle();
  if (
    !p ||
    (p.contact_id !== session.contact_id &&
      p.company_id !== session.company_id)
  )
    notFound();

  const [fasenRes, fotosRes] = await Promise.all([
    supabase
      .from("project_phases")
      .select("*")
      .eq("project_id", id)
      .order("volgorde"),
    supabase
      .from("werfvoortgang_fotos")
      .select("*")
      .eq("project_id", id)
      .eq("zichtbaar_voor_klant", true)
      .order("created_at", { ascending: false }),
  ]);

  const fasen = fasenRes.data ?? [];
  const fotos = fotosRes.data ?? [];

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <Link
        href="/portaal/dashboard"
        className="text-sm text-slate-500 hover:text-slate-900"
      >
        ← Dashboard
      </Link>
      <div className="mt-2">
        <h1 className="text-2xl font-bold text-[#1F4D3F]">{p.naam}</h1>
        <div className="text-sm text-slate-500">
          {p.start_datum
            ? `Gestart op ${new Date(p.start_datum).toLocaleDateString("nl-BE")}`
            : "Nog niet gestart"}{" "}
          ·{" "}
          {p.einde_datum
            ? `Verwacht einde ${new Date(p.einde_datum).toLocaleDateString("nl-BE")}`
            : "Geen einddatum"}
        </div>
      </div>

      {/* Fase tracker */}
      <section className="mt-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500">
          Voortgang
        </h2>
        {fasen.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
            Nog geen fases gepland.
          </div>
        ) : (
          <ol className="space-y-2">
            {fasen.map((f) => {
              const klaar = f.status === "afgewerkt" || f.status === "klaar";
              const lopend = f.status === "lopend" || f.status === "actief";
              return (
                <li
                  key={f.id}
                  className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-4"
                >
                  <div
                    className={`grid h-8 w-8 place-items-center rounded-full text-sm font-bold ${
                      klaar
                        ? "bg-green-100 text-green-700"
                        : lopend
                          ? "bg-amber-100 text-amber-700"
                          : "bg-slate-100 text-slate-400"
                    }`}
                  >
                    {klaar ? "✓" : lopend ? "•" : "·"}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-slate-900">{f.naam}</div>
                    {f.start_datum && (
                      <div className="text-xs text-slate-500">
                        {new Date(f.start_datum).toLocaleDateString("nl-BE")}
                        {f.einde_datum
                          ? ` → ${new Date(f.einde_datum).toLocaleDateString("nl-BE")}`
                          : ""}
                      </div>
                    )}
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      klaar
                        ? "bg-green-100 text-green-700"
                        : lopend
                          ? "bg-amber-100 text-amber-700"
                          : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {f.status ?? "gepland"}
                  </span>
                </li>
              );
            })}
          </ol>
        )}
      </section>

      {/* Werffoto's */}
      <section className="mt-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500">
          Werfvoortgang in beeld
        </h2>
        {fotos.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
            Nog geen foto&apos;s geüpload — we voegen ze toe naarmate de werken
            vorderen.
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
            {fotos.map((foto) => (
              <figure
                key={foto.id}
                className="overflow-hidden rounded-lg border border-slate-200 bg-white"
              >
                <img
                  src={foto.foto_pad}
                  alt={foto.bijschrift ?? "Werffoto"}
                  className="h-48 w-full object-cover"
                />
                {foto.bijschrift && (
                  <figcaption className="p-2 text-xs text-slate-600">
                    {foto.bijschrift}
                  </figcaption>
                )}
              </figure>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

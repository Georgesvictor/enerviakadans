import Link from "next/link";
import { Badge } from "@/components/ui/badge";

export function ProjectHeader({
  project,
  totaalPrijs,
  budget,
  gefactureerd,
}: {
  project: any;
  totaalPrijs: number;
  budget: number;
  gefactureerd: number;
}) {
  const f = (n: number) =>
    `€ ${Number(n).toLocaleString("nl-BE", { minimumFractionDigits: 2 })}`;

  const pctGefactureerd = totaalPrijs > 0 ? (gefactureerd / totaalPrijs) * 100 : 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Link
          href="/app/projecten"
          className="text-sm text-blue-600 hover:underline"
        >
          ← Projectoverzicht
        </Link>
      </div>
      <div className="flex items-center gap-3">
        <div className="bg-muted/40 text-muted-foreground rounded px-2 py-1 text-xs font-mono">
          {project.code ?? project.id.slice(0, 4).toUpperCase()}
        </div>
        <h1 className="text-2xl font-bold text-enervia-700">
          {project.naam}
        </h1>
        <Badge>{project.status}</Badge>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-4 bg-white rounded-lg border p-4 text-sm">
        <Field label="Verantwoordelijken">
          {project.eigenaar_id ? (
            <div className="flex items-center gap-1.5">
              <span className="w-6 h-6 rounded-full bg-orange-500 text-white text-xs font-bold flex items-center justify-center">
                GA
              </span>
              <span>Giljom Arts</span>
            </div>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </Field>
        <Field label="Klanten">
          {project.companies?.naam ? (
            <Link
              href={`/app/bedrijven/${project.companies.id}`}
              className="text-blue-600 hover:underline"
            >
              {project.companies.naam}
            </Link>
          ) : project.contacts ? (
            <Link
              href={`/app/contacten/${project.contacts.id}`}
              className="text-blue-600 hover:underline"
            >
              {project.contacts.voornaam} {project.contacts.achternaam}
            </Link>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </Field>
        <Field label="Deals">
          {project.deals ? (
            <Link
              href={`/app/deals/${project.deals.id}`}
              className="text-blue-600 hover:underline"
            >
              Deal: {project.deals.titel}
            </Link>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </Field>
        <Field label="Begindatum">
          {project.start_datum
            ? new Date(project.start_datum).toLocaleDateString("nl-BE")
            : <span className="text-muted-foreground">+ Begindatum</span>}
        </Field>
        <Field label="Einddatum">
          {project.deadline
            ? new Date(project.deadline).toLocaleDateString("nl-BE")
            : <span className="text-muted-foreground">+ Einddatum</span>}
        </Field>
        <Field label="Prijs">
          <span className="font-semibold">{f(totaalPrijs)}</span>
          {budget > 0 && totaalPrijs > 0 && (
            <span className="text-xs text-muted-foreground ml-1">
              ({((totaalPrijs / budget) * 100).toFixed(0)} %)
            </span>
          )}
        </Field>
      </div>
      {totaalPrijs > 0 && (
        <div className="bg-white border rounded-lg p-2 text-xs text-muted-foreground flex items-center gap-3">
          <span>
            Gefactureerd: <strong>{f(gefactureerd)}</strong> ({pctGefactureerd.toFixed(0)} %)
          </span>
          <div className="flex-1 bg-muted/30 h-2 rounded overflow-hidden">
            <div
              className="h-full bg-enervia-600"
              style={{ width: `${Math.min(100, pctGefactureerd)}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="text-xs text-muted-foreground uppercase">{label}</div>
      <div>{children}</div>
    </div>
  );
}

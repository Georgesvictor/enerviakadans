import Link from "next/link";
import { MigratieUI } from "@/components/crm/migratie-ui";

export const dynamic = "force-dynamic";

export default function MigratiePagina() {
  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <Link
          href="/app/instellingen"
          className="text-xs text-muted-foreground hover:underline"
        >
          ← Instellingen
        </Link>
        <h1 className="text-2xl font-bold text-enervia-700 mt-1">
          Data migratie uit Teamleader
        </h1>
        <p className="text-muted-foreground text-sm">
          Importeer al je bestaande contacten, bedrijven, deals, offertes,
          facturen, projecten en uren. Dry-run eerst om te zien wat er binnenkomt.
        </p>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm">
        <div className="font-semibold text-amber-800">Voor je start</div>
        <ul className="text-amber-700 mt-1 list-disc list-inside space-y-0.5">
          <li>
            Koppel eerst je Teamleader-account via{" "}
            <Link
              href="/app/instellingen/integraties"
              className="underline"
            >
              Integraties
            </Link>
          </li>
          <li>
            De migratie is herstartbaar — reeds gemigreerde records worden
            overgeslagen
          </li>
          <li>Teamleader-ID's worden bewaard voor cross-reference</li>
        </ul>
      </div>

      <MigratieUI />
    </div>
  );
}

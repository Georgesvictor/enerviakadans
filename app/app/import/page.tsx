import Link from "next/link";
import { CSVImporter } from "@/components/crm/csv-importer";

export const dynamic = "force-dynamic";

export default function ImportPage() {
  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <Link
          href="/app"
          className="text-xs text-muted-foreground hover:underline"
        >
          ← Dashboard
        </Link>
        <h1 className="text-2xl font-bold text-enervia-700 mt-1">
          Importeer uit CSV
        </h1>
        <p className="text-muted-foreground text-sm">
          Importeer contacten of bedrijven uit een CSV-bestand. Kolomnamen
          worden automatisch herkend (voornaam, achternaam, email, telefoon,
          adres, postcode, gemeente, btw, ...).
        </p>
      </div>

      <CSVImporter />

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-900">
        <strong>💡 Tip:</strong> Exporteer eerst uit Teamleader, Excel of CSV-tool.
        Wij herkennen automatisch deze kolomnamen:
        <ul className="mt-2 list-disc list-inside text-xs space-y-0.5">
          <li>
            <strong>Contacten:</strong> voornaam · achternaam · email · telefoon
            · gsm · adres · postcode · gemeente
          </li>
          <li>
            <strong>Bedrijven:</strong> naam · btw · email · telefoon · website
            · adres · postcode · gemeente
          </li>
        </ul>
      </div>
    </div>
  );
}

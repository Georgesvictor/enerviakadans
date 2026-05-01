import { NieuwBedrijfForm } from "@/components/crm/nieuw-bedrijf-form";

export const dynamic = "force-dynamic";

export default function NieuwBedrijfPage() {
  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-enervia-700">Nieuw bedrijf</h1>
        <p className="text-muted-foreground text-sm">
          B2B klant, leverancier of partner toevoegen.
        </p>
      </div>
      <NieuwBedrijfForm />
    </div>
  );
}

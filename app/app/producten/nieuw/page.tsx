import { NieuwProductForm } from "@/components/crm/nieuw-product-form";

export default function NieuwProductPage() {
  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-bold text-enervia-700 mb-1">Nieuw product</h1>
      <p className="text-muted-foreground text-sm mb-6">
        Voeg een product of dienst toe aan je catalogus.
      </p>
      <NieuwProductForm />
    </div>
  );
}

import { NieuwContactForm } from "@/components/crm/nieuw-contact-form";

export const dynamic = "force-dynamic";

export default function NieuwContactPage() {
  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-enervia-700">Nieuw contact</h1>
        <p className="text-muted-foreground text-sm">
          Voeg een nieuwe persoon toe aan je CRM.
        </p>
      </div>
      <NieuwContactForm />
    </div>
  );
}

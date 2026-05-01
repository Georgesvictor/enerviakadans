import Link from "next/link";

export const metadata = {
  title: "Privacybeleid · Kadans",
  description:
    "Hoe Kadans omgaat met jouw persoonsgegevens volgens de AVG / GDPR.",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto py-12 px-6">
        <Link
          href="/"
          className="text-sm text-muted-foreground hover:underline"
        >
          ← Terug naar Kadans
        </Link>
        <h1 className="text-3xl font-bold text-enervia-700 mt-4 mb-2">
          Privacybeleid
        </h1>
        <p className="text-sm text-muted-foreground mb-8">
          Laatst bijgewerkt: {new Date().toLocaleDateString("nl-BE")}
        </p>

        <div className="prose prose-sm max-w-none space-y-4">
          <p>
            Kadans verwerkt persoonsgegevens met de grootst mogelijke zorg. Dit
            privacybeleid beschrijft welke gegevens we verzamelen, waarom, en
            welke rechten je hebt onder de AVG (GDPR).
          </p>

          <h2 className="text-xl font-bold text-enervia-700 mt-8 mb-3">
            1. Verwerkingsverantwoordelijke
          </h2>
          <p>
            Kadans wordt geëxploiteerd door Enervia BV, Piersstraat 19, 2550
            Kontich, België. Voor vragen over dit privacybeleid: info@enervia.be.
          </p>

          <h2 className="text-xl font-bold text-enervia-700 mt-8 mb-3">
            2. Welke gegevens verwerken we?
          </h2>
          <ul className="list-disc list-inside space-y-1">
            <li>
              <strong>Account-gegevens:</strong> naam, e-mail, wachtwoord-hash,
              foto (via Clerk)
            </li>
            <li>
              <strong>Workspace-data:</strong> jouw contacten, bedrijven, deals,
              offertes, facturen en documenten
            </li>
            <li>
              <strong>Gebruiksdata:</strong> audit-log van kritieke acties
              (login, data-wijzigingen)
            </li>
            <li>
              <strong>E-mail & agenda:</strong> enkel indien je expliciet Gmail,
              Outlook of IMAP koppelt
            </li>
            <li>
              <strong>Banking:</strong> enkel indien je Ponto PSD2 koppelt
              (transactie-data voor reconciliatie)
            </li>
          </ul>

          <h2 className="text-xl font-bold text-enervia-700 mt-8 mb-3">
            3. Doel van verwerking
          </h2>
          <ul className="list-disc list-inside space-y-1">
            <li>Leveren van de CRM-dienstverlening</li>
            <li>Facturatie en communicatie van Kadans naar jou</li>
            <li>Verbetering van het product op basis van geaggregeerde data</li>
            <li>Voldoen aan wettelijke verplichtingen (bv. boekhouding)</li>
          </ul>

          <h2 className="text-xl font-bold text-enervia-700 mt-8 mb-3">
            4. Waar bewaren we jouw data?
          </h2>
          <p>
            Alle data wordt opgeslagen in een EU-datacenter via Supabase
            (PostgreSQL) en Vercel (Frankfurt). Geen data verlaat de EU.
          </p>

          <h2 className="text-xl font-bold text-enervia-700 mt-8 mb-3">
            5. Hoelang bewaren we jouw data?
          </h2>
          <p>
            Zolang je een Kadans-workspace hebt, bewaren we jouw data. Per
            entiteit kan je een retentie-policy instellen (bv. offertes 90
            dagen). Bij opzegging wordt alle data binnen 30 dagen permanent
            verwijderd, tenzij wettelijke bewaarplicht anders bepaalt.
          </p>

          <h2 className="text-xl font-bold text-enervia-700 mt-8 mb-3">
            6. Jouw rechten (AVG art. 15-22)
          </h2>
          <ul className="list-disc list-inside space-y-1">
            <li>
              <strong>Inzage:</strong> opvragen welke gegevens we van je
              bewaren
            </li>
            <li>
              <strong>Rectificatie:</strong> onjuiste data laten corrigeren
            </li>
            <li>
              <strong>Verwijdering:</strong> "recht om vergeten te worden"
            </li>
            <li>
              <strong>Dataportabiliteit:</strong> export in standaardformaat
            </li>
            <li>
              <strong>Bezwaar:</strong> tegen verdere verwerking
            </li>
          </ul>
          <p>
            Alle verzoeken worden binnen 30 dagen behandeld. Dien een verzoek in
            via info@enervia.be. Als klant in een Kadans-workspace kan je deze
            ook digitaal indienen via Instellingen → GDPR.
          </p>

          <h2 className="text-xl font-bold text-enervia-700 mt-8 mb-3">
            7. Cookies
          </h2>
          <p>
            Kadans gebruikt enkel essentiële cookies (sessie, CSRF-bescherming).
            Geen tracking-cookies, geen advertentie-cookies, geen
            derde-partij analytics.
          </p>

          <h2 className="text-xl font-bold text-enervia-700 mt-8 mb-3">
            8. Sub-verwerkers
          </h2>
          <ul className="list-disc list-inside space-y-1">
            <li>Vercel (hosting, EU)</li>
            <li>Supabase (database, EU)</li>
            <li>Clerk (authenticatie, EU)</li>
            <li>Upstash (queue, EU)</li>
            <li>Resend (transactionele e-mail)</li>
            <li>Anthropic (AI-assistentie, enkel op expliciete verzoeken)</li>
            <li>Billit (Peppol e-invoicing, enkel indien geactiveerd)</li>
            <li>Ponto (PSD2 banking, enkel indien geactiveerd)</li>
          </ul>
          <p>
            Met elk hebben we een Data Processing Agreement (DPA) afgesloten.
          </p>

          <h2 className="text-xl font-bold text-enervia-700 mt-8 mb-3">
            9. Klachtenrecht
          </h2>
          <p>
            Je hebt het recht een klacht in te dienen bij de Belgische
            Gegevensbeschermingsautoriteit (GBA):{" "}
            <a
              href="https://www.gegevensbeschermingsautoriteit.be"
              className="underline"
              target="_blank"
              rel="noreferrer"
            >
              gegevensbeschermingsautoriteit.be
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
}

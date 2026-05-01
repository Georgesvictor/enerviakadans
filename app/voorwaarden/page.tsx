import Link from "next/link";

export const metadata = {
  title: "Algemene voorwaarden · Kadans",
};

export default function VoorwaardenPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto py-12 px-6">
        <Link
          href="/"
          className="text-sm text-muted-foreground hover:underline"
        >
          ← Terug
        </Link>
        <h1 className="text-3xl font-bold text-enervia-700 mt-4 mb-2">
          Algemene voorwaarden
        </h1>
        <p className="text-sm text-muted-foreground mb-8">
          Laatst bijgewerkt: {new Date().toLocaleDateString("nl-BE")}
        </p>

        <div className="prose prose-sm max-w-none space-y-4">
          <h2 className="text-xl font-bold text-enervia-700">1. Dienst</h2>
          <p>
            Kadans is een Software-as-a-Service (SaaS) CRM-platform, geleverd
            door Enervia BV. De dienst is beschikbaar op kadans.be.
          </p>

          <h2 className="text-xl font-bold text-enervia-700 mt-6">
            2. Abonnement
          </h2>
          <p>
            Tijdens de closed beta-fase is Kadans gratis beschikbaar voor
            genodigde tenants. Na de beta worden commerciële tarieven
            gecommuniceerd met minstens 60 dagen opzegtermijn.
          </p>

          <h2 className="text-xl font-bold text-enervia-700 mt-6">
            3. Beschikbaarheid
          </h2>
          <p>
            Wij streven naar een uptime van 99,5 %. Gepland onderhoud wordt
            vooraf aangekondigd.
          </p>

          <h2 className="text-xl font-bold text-enervia-700 mt-6">
            4. Data-eigenaarschap
          </h2>
          <p>
            Alle data die jij invoert blijft jouw eigendom. Je kan op elk moment
            een export vragen via Instellingen → GDPR.
          </p>

          <h2 className="text-xl font-bold text-enervia-700 mt-6">
            5. Aansprakelijkheid
          </h2>
          <p>
            Kadans wordt geleverd "as is". Onze aansprakelijkheid is beperkt
            tot het bedrag dat je de voorbije 12 maanden hebt betaald.
          </p>

          <h2 className="text-xl font-bold text-enervia-700 mt-6">
            6. Toepasselijk recht
          </h2>
          <p>
            Deze voorwaarden worden beheerst door het Belgische recht.
            Geschillen worden voorgelegd aan de rechtbanken van Antwerpen.
          </p>

          <h2 className="text-xl font-bold text-enervia-700 mt-6">7. Contact</h2>
          <p>
            Enervia BV · Piersstraat 19, 2550 Kontich · info@enervia.be · 03 808
            8666 · BTW BE0XXX.XXX.XXX
          </p>
        </div>
      </div>
    </div>
  );
}

# Enervia Simulatie Portal

Professionele premie-, lening- en besparingssimulator voor
renovatieprojecten van **Enervia BV** — productie op
[`simulatie.enervia.be`](https://simulatie.enervia.be).

Verkopers uploaden (of halen uit Teamleader) een renovatie-offerte. De
app extraheert de posten met Claude, berekent premies
(MijnVerbouwPremie + asbest + EPC-labelpremie) en leningsimulatie
(MijnVerbouwLening of commercieel), en produceert een 10-jaar
besparingsprojectie. Output: professioneel dossier in PDF + tokenized
klantportal met live sliders.

## Stack

| Laag           | Technologie                                     |
| -------------- | ----------------------------------------------- |
| Framework      | Next.js 14 (App Router) + TypeScript            |
| Styling        | TailwindCSS + shadcn-style componenten          |
| Auth           | Clerk (Google SSO beperkt tot `@enervia.be`)    |
| DB             | Supabase (Postgres) met Row Level Security      |
| AI             | Anthropic Claude Sonnet 4.6 (extractie) + Haiku 4.5 (validator) |
| Teamleader     | Teamleader Focus v2 API (OAuth2)                |
| PDF generatie  | `@react-pdf/renderer`                           |
| VEKA verificatie | Playwright (headless)                         |
| Queue          | BullMQ + Upstash Redis                          |
| Charts         | Recharts                                        |
| Deploy         | Vercel (Cron + Background Functions)            |

## Lokale setup

```bash
# 1. Dependencies
npm install --legacy-peer-deps

# 2. Env variabelen
cp .env.example .env.local
# → vul Clerk, Supabase, Anthropic, Teamleader keys in

# 3. Supabase schema + storage buckets
# - Maak nieuw Supabase project
# - Run in SQL editor: supabase/migrations/0001_initial_schema.sql
# - Run in SQL editor: supabase/storage-policies.sql
# - Zet in Clerk een 'supabase' JWT template (zie Clerk docs)

# 4. Dev server
npm run dev

# 5. Tests (business-logic only, geen externe services nodig)
npm test
```

## Directory structuur

```
app/
  (auth)/                  # Clerk sign-in/up pages
  (dashboard)/             # Beveiligde medewerker-routes
    page.tsx               # Overzicht + recente dossiers
    nieuw/                 # Wizard stap 1: offerte kiezen
    dossiers/              # Lijst + detail (wizard stappen 2-6)
    teamleader/            # OAuth koppeling
    instellingen/          # Admin: prijzen, drempels, rente
  klant/[token]/           # Publieke, tokenized klantportal
  api/                     # Alle server routes
components/
  ui/                      # Herbruikbare primitieven
  wizard/                  # 6 stappen in het dossier-proces
  dashboard/               # Dashboard-specifiek
  klantportal/             # Klant-facing interactieve simulatie
lib/
  supabase/                # Client + admin + types
  claude/                  # Sonnet extractie + Haiku validator
  teamleader/              # OAuth2 + quotations API
  veka/                    # Premies + lening + scraper
  berekeningen/            # Besparingen, projectie, types
  energieprijzen/          # VREG/CREG integratie
  pdf/                     # Bank-dossier + klant-dossier
  queue/                   # BullMQ client
  utils/                   # cn, format
scripts/
  worker.ts                # BullMQ VEKA-verification worker
supabase/
  migrations/
  storage-policies.sql
tests/unit/                # Vitest business-logic tests (32 groen)
```

## Business logic highlights

**Premies (2026, sectie D.2 van blueprint):**

- MijnVerbouwPremie percentage per inkomenscategorie:
  cat.1 = 50%, cat.2 = 40%, cat.3 = 35%
- Maximumbedragen dak/ramen/gevel/vloer/voorbereiding per categorie in
  `lib/veka/premies.ts`
- Warmtepomp-basispremies: forfait + 35% factuurplafond + 50% bonus
  bij vervanging elektrische verwarming of zone zonder gasnet
- Asbest: 50% van factuur, max €50/m² + VEKA-bonus €8/m² dakisolatie
- EPC-labelpremie: forfait volgens categorie × label × ventilatie
- Zonnepanelen: geen premie in 2026 (wel terugleververgoeding)

**MijnVerbouwLening (sectie D.3):**

- Cat.1 = 0% rente, cat.2 = 1%, cat.3 niet geschikt
- Vereist: eigenaar + woning ≤2006 + geen andere woning + gedomicilieerd
- Max €60.000, looptijd tot 25 jaar
- Formule annuïtair: `M = P × r × (1+r)^n / ((1+r)^n − 1)`

**Besparingsberekening:**

- WP lucht-water COP 3.2, geothermisch 4.5, hybride 3.5
- PV: rendement × 920 kWh/kWp voor Vlaanderen
- Batterij: 3 kWh ~55% direct, 5 kWh ~70%, 10 kWh ~85%
- 10-jaar projectie met 3% jaarlijkse prijsstijging (aanpasbaar)

## Productie deployment

Zie [`docs/deployment.md`](docs/deployment.md) voor de volledige stappen.

Korte versie:

1. **Vercel**: connect repo, env vars toevoegen. Domain → Vercel.
2. **Supabase**: productie-project, run migraties + storage policies.
3. **Clerk**: productie-instance, Google OAuth, restrict `@enervia.be`.
4. **Teamleader**: OAuth app registreren, redirect URI instellen.
5. **Upstash Redis**: productie-instance voor BullMQ.
6. **Worker proces** (optioneel): deploy `scripts/worker.ts` apart
   voor VEKA-verificatie.

## Testing

```bash
npm test              # Vitest unit tests (32 groen)
npm run build         # Productie-build (bewezen werkend)
npx tsc --noEmit      # Type-check (clean)
```

Test fixture **Waumans 2026/1647** staat in `tests/unit/premies.test.ts`.

## Guardrails

- **Disclaimer** onderaan elk dossier.
- **GDPR auto-delete** 90 dagen na aanmaken (cron 03:00).
- **Audit log**: elke kritische actie getraceerd.
- **RLS policies**: verkopers zien eigen dossiers, admins alles, klantportal
  enkel via token (30 dagen geldig).

## Contact

Giljom Arts — info@enervia.be — 03 808 8666

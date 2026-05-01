-- =========================================================================
-- 0004 — Contacten, bedrijven, tags, custom fields
-- Fase 1 Kadans. Tenant-scoped met RLS.
-- =========================================================================

-- ---------- COMPANIES (bedrijven) ----------
CREATE TABLE IF NOT EXISTS companies (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  naam          TEXT NOT NULL,
  btw_nummer    TEXT,                -- BE0123456789
  kbo_nummer    TEXT,                -- KBO-nummer (zelfde als btw vaak)
  iban          TEXT,
  website       TEXT,
  sector        TEXT,
  aantal_werknemers INT,
  omzet_jaarlijks NUMERIC(14,2),
  logo_url      TEXT,
  adres_straat  TEXT,
  adres_nummer  TEXT,
  postcode      TEXT,
  gemeente      TEXT,
  land          TEXT DEFAULT 'BE',
  email         TEXT,
  telefoon      TEXT,
  beschrijving  TEXT,
  eigenaar_id   TEXT REFERENCES users(id), -- account owner binnen tenant
  bron          TEXT,                        -- import_teamleader | website | aanbeveling | ...
  tags_cache    TEXT[] DEFAULT '{}'::TEXT[], -- gedenormaliseerd voor snelle filter
  custom_fields JSONB DEFAULT '{}'::JSONB,
  is_klant      BOOLEAN DEFAULT false,
  is_leverancier BOOLEAN DEFAULT false,
  teamleader_id TEXT,                         -- voor migratie-referentie
  created_by    TEXT REFERENCES users(id),
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_companies_tenant ON companies(tenant_id);
CREATE INDEX IF NOT EXISTS idx_companies_naam   ON companies(tenant_id, naam);
CREATE INDEX IF NOT EXISTS idx_companies_btw    ON companies(tenant_id, btw_nummer) WHERE btw_nummer IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_companies_tl     ON companies(tenant_id, teamleader_id) WHERE teamleader_id IS NOT NULL;

-- ---------- CONTACTS (personen) ----------
CREATE TABLE IF NOT EXISTS contacts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  company_id    UUID REFERENCES companies(id) ON DELETE SET NULL,
  aanspreking   TEXT,                -- Mr. | Mevr. | Dhr. | Mevr.
  voornaam      TEXT NOT NULL,
  achternaam    TEXT NOT NULL,
  functie       TEXT,                -- bv. "Zaakvoerder"
  email         TEXT,
  email_secundair TEXT,
  telefoon      TEXT,
  gsm           TEXT,
  geboortedatum DATE,
  taal          TEXT DEFAULT 'nl',
  adres_straat  TEXT,
  adres_nummer  TEXT,
  postcode      TEXT,
  gemeente      TEXT,
  land          TEXT DEFAULT 'BE',
  linkedin_url  TEXT,
  beschrijving  TEXT,
  eigenaar_id   TEXT REFERENCES users(id),
  bron          TEXT,
  tags_cache    TEXT[] DEFAULT '{}'::TEXT[],
  custom_fields JSONB DEFAULT '{}'::JSONB,
  is_klant      BOOLEAN DEFAULT false,
  opted_in_marketing BOOLEAN DEFAULT false,
  opted_out_op  TIMESTAMPTZ,
  teamleader_id TEXT,
  klant_legacy_id UUID REFERENCES klanten(id), -- Koppeling met oude klanten-tabel
  created_by    TEXT REFERENCES users(id),
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contacts_tenant   ON contacts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_contacts_company  ON contacts(company_id);
CREATE INDEX IF NOT EXISTS idx_contacts_email    ON contacts(tenant_id, email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_contacts_naam     ON contacts(tenant_id, achternaam, voornaam);
CREATE INDEX IF NOT EXISTS idx_contacts_legacy   ON contacts(klant_legacy_id) WHERE klant_legacy_id IS NOT NULL;

-- ---------- TAGS ----------
CREATE TABLE IF NOT EXISTS tags (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  naam          TEXT NOT NULL,
  kleur         TEXT DEFAULT '#1F4D3F',      -- hex
  scope         TEXT NOT NULL DEFAULT 'all', -- contacten | bedrijven | deals | all
  created_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, naam, scope)
);

CREATE INDEX IF NOT EXISTS idx_tags_tenant ON tags(tenant_id);

-- Koppel-tabellen (many-to-many)
CREATE TABLE IF NOT EXISTS contact_tags (
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  tag_id     UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  tenant_id  TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  PRIMARY KEY (contact_id, tag_id)
);

CREATE TABLE IF NOT EXISTS company_tags (
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  tag_id     UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  tenant_id  TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  PRIMARY KEY (company_id, tag_id)
);

-- ---------- CUSTOM FIELDS (schema-definition per tenant) ----------
CREATE TABLE IF NOT EXISTS custom_field_definitions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  entity        TEXT NOT NULL, -- contacten | bedrijven | deals | offertes | facturen | projecten
  sleutel       TEXT NOT NULL, -- bv. "vakgebied" — interne kolomnaam (snake_case)
  label         TEXT NOT NULL, -- zichtbare naam in UI
  type          TEXT NOT NULL, -- string | number | date | boolean | select | multiselect | url
  opties        JSONB,          -- voor select: array van opties
  verplicht     BOOLEAN DEFAULT false,
  volgorde      INT DEFAULT 100,
  zichtbaar_in_lijst BOOLEAN DEFAULT false,
  created_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, entity, sleutel)
);

CREATE INDEX IF NOT EXISTS idx_cfd_tenant_entity ON custom_field_definitions(tenant_id, entity);

-- ---------- TRIGGERS voor updated_at ----------
DROP TRIGGER IF EXISTS companies_updated_at ON companies;
CREATE TRIGGER companies_updated_at BEFORE UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS contacts_updated_at ON contacts;
CREATE TRIGGER contacts_updated_at BEFORE UPDATE ON contacts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------- RLS ----------
SELECT add_tenant_rls('companies', 'companies');
SELECT add_tenant_rls('contacts', 'contacten');
SELECT add_tenant_rls('tags', 'contacten');
SELECT add_tenant_rls('contact_tags', 'contacten');
SELECT add_tenant_rls('company_tags', 'companies');
SELECT add_tenant_rls('custom_field_definitions', 'instellingen');

-- ---------- BACKFILL: klanten → contacts voor Enervia ----------
-- Bestaande klanten worden ook als contacts zichtbaar, met klant_legacy_id koppeling.
INSERT INTO contacts (
  tenant_id, voornaam, achternaam, email, telefoon,
  adres_straat, postcode, gemeente, geboortedatum,
  is_klant, klant_legacy_id, created_by, created_at
)
SELECT
  tenant_id, voornaam, achternaam, email, telefoon,
  adres, postcode, gemeente, geboortedatum,
  true, id, created_by, created_at
FROM klanten
WHERE NOT EXISTS (SELECT 1 FROM contacts c WHERE c.klant_legacy_id = klanten.id);

COMMENT ON TABLE contacts IS 'Personen (B2C klanten + contactpersonen van companies)';
COMMENT ON TABLE companies IS 'Bedrijven (B2B klanten, leveranciers, partners)';
COMMENT ON TABLE tags IS 'Kleuren-tags per tenant voor contact/company/deal categorisering';
COMMENT ON TABLE custom_field_definitions IS 'Schema-level custom fields per entity per tenant';

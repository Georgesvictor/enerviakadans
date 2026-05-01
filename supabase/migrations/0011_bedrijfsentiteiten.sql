-- =========================================================================
-- 0011 — Bedrijfsentiteiten (business entities) zoals Teamleader.
--
-- Een tenant (workspace) kan meerdere bedrijfsentiteiten hebben, elk met
-- eigen BTW, KBO, IBAN, adres, voorwaarden en Peppol-identifier.
--
-- Offertes/facturen verwijzen naar een bedrijfsentiteit zodat de PDF
-- correct gevuld wordt met de juiste juridische gegevens, bankrekening
-- en algemene voorwaarden.
-- =========================================================================

CREATE TABLE IF NOT EXISTS business_entities (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  -- Hoofdgegevens
  naam            TEXT NOT NULL,
  is_default      BOOLEAN DEFAULT false,
  is_actief       BOOLEAN DEFAULT true,
  logo_url        TEXT,
  korte_afkorting TEXT,                                  -- bv. "EBV"
  -- Juridisch
  btw_nummer      TEXT,                                  -- BE0123456789
  kbo_nummer      TEXT,                                  -- 0123.456.789
  rechtsvorm      TEXT,                                  -- BV / NV / VOF / ...
  -- Contact
  email           TEXT,
  email_facturatie TEXT,
  website         TEXT,
  telefoon        TEXT,
  fax             TEXT,
  -- Adres
  adres_straat    TEXT,
  adres_nummer    TEXT,
  adres_bus       TEXT,
  postcode        TEXT,
  gemeente        TEXT,
  land            TEXT DEFAULT 'BE',
  -- Bankgegevens
  bank_naam       TEXT,
  iban            TEXT,
  bic             TEXT,                                  -- swift/bic
  iban_2          TEXT,                                  -- tweede rekening (bv. NL)
  bic_2           TEXT,
  -- Algemene voorwaarden + boekhouding
  algemene_voorwaarden TEXT,                              -- HTML/markdown
  betalingstermijn_dagen INT DEFAULT 30,
  intrest_pct     NUMERIC(5,2) DEFAULT 5,                 -- intrestvoet bij vervallen facturen
  schadebeding_pct NUMERIC(5,2) DEFAULT 5,                -- forfaitaire schadebeding
  schadebeding_min NUMERIC(10,2) DEFAULT 150,             -- minimum bedrag
  schadebeding_begrenzen_op_btw BOOLEAN DEFAULT false,    -- schadebeding op excl. of incl. btw
  intrest_op_eerste_herinnering BOOLEAN DEFAULT false,
  -- Peppol
  peppol_actief   BOOLEAN DEFAULT false,
  peppol_identifier_type TEXT DEFAULT '0208',             -- 0208 = BE0123456789
  peppol_identifier TEXT,                                 -- = btw_nummer typisch
  alleen_via_peppol BOOLEAN DEFAULT false,                -- forceer Peppol verzending
  -- Document layout
  document_lay_out TEXT,                                  -- naam van layout-template
  munteenheid     TEXT NOT NULL DEFAULT 'EUR',
  datum_formaat   TEXT DEFAULT 'DD/MM/YYYY',
  -- Boekhouding
  boekhouding_systeem TEXT,                               -- billit | yuki | exact | ...
  boekhouding_klant_id TEXT,
  boekhouding_api_key TEXT,
  boekhouder_email TEXT,
  -- Meta
  beschrijving    TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, naam)
);

CREATE INDEX IF NOT EXISTS idx_be_tenant ON business_entities(tenant_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_be_default
  ON business_entities(tenant_id) WHERE is_default = true;

DROP TRIGGER IF EXISTS be_updated_at ON business_entities;
CREATE TRIGGER be_updated_at BEFORE UPDATE ON business_entities
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------- Bestaande quotations/invoices linken ----------
-- (kolom 'bedrijfsentiteit' bestond al als TEXT, voeg id-FK toe)
ALTER TABLE quotations
  ADD COLUMN IF NOT EXISTS business_entity_id UUID REFERENCES business_entities(id) ON DELETE SET NULL;
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS business_entity_id UUID REFERENCES business_entities(id) ON DELETE SET NULL;
ALTER TABLE purchase_orders
  ADD COLUMN IF NOT EXISTS business_entity_id UUID REFERENCES business_entities(id) ON DELETE SET NULL;
ALTER TABLE order_confirmations
  ADD COLUMN IF NOT EXISTS business_entity_id UUID REFERENCES business_entities(id) ON DELETE SET NULL;
ALTER TABLE delivery_notes
  ADD COLUMN IF NOT EXISTS business_entity_id UUID REFERENCES business_entities(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_quot_be ON quotations(business_entity_id);
CREATE INDEX IF NOT EXISTS idx_inv_be ON invoices(business_entity_id);

-- ---------- Default Enervia BV entity seeden uit tenant + screenshot ----------
INSERT INTO business_entities (
  tenant_id, naam, is_default, is_actief,
  btw_nummer, kbo_nummer, rechtsvorm,
  email, email_facturatie, website, telefoon,
  adres_straat, adres_nummer, postcode, gemeente, land,
  bank_naam, iban,
  intrest_pct, schadebeding_pct, schadebeding_min,
  peppol_actief, peppol_identifier_type, peppol_identifier,
  betalingstermijn_dagen,
  algemene_voorwaarden,
  munteenheid, datum_formaat
)
SELECT
  t.id, 'Enervia BV', true, true,
  COALESCE(t.btw_nummer, 'BE1030660236'),
  '1030660236',
  'BV',
  COALESCE(t.email_contact, 'info@enervia.be'),
  'admin@enervia.be',
  'www.enervia.be',
  COALESCE(t.telefoon, '03 808 8666'),
  'Mechelsesteenweg 472', NULL, '2650', 'Edegem', 'BE',
  'KBC', 'BE39 7380 5179 7719',
  5.0, 5.0, 150.0,
  true, '0208', 'BE1030660236',
  30,
  '<h3>Algemene voorwaarden</h3><p>1. Alle facturen zijn betaalbaar binnen 30 dagen na factuurdatum.</p><p>2. Bij niet-tijdige betaling is van rechtswege en zonder ingebrekestelling een nalatigheidsintrest verschuldigd van 5% per jaar, alsook een forfaitaire schadevergoeding van 5% met een minimum van € 150,00.</p><p>3. Geschillen vallen onder de bevoegdheid van de rechtbanken van Antwerpen.</p><p>4. Geleverde materialen blijven eigendom van Enervia BV tot volledige betaling.</p>',
  'EUR', 'DD/MM/YYYY'
FROM tenants t
WHERE t.id = 'org_enervia_default'
ON CONFLICT (tenant_id, naam) DO NOTHING;

-- ---------- RLS ----------
SELECT add_tenant_rls('business_entities', 'instellingen');

COMMENT ON TABLE business_entities IS
  'Bedrijfsentiteiten per tenant: BTW, KBO, IBAN, voorwaarden, Peppol, boekhouding';

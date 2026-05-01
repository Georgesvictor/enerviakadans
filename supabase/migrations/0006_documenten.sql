-- =========================================================================
-- 0006 — Offertes, facturen, creditnota's, betaalherinneringen, templates
-- Fase 2 Kadans.
-- =========================================================================

-- ---------- QUOTATIONS (offertes) ----------
CREATE TABLE IF NOT EXISTS quotations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  nummer          TEXT,                          -- bv. "2026/0123"
  referentie      TEXT,                          -- interne referentie
  onderwerp       TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'draft', -- draft | verzonden | bekeken | geaccepteerd | afgewezen | verlopen
  deal_id         UUID REFERENCES deals(id) ON DELETE SET NULL,
  contact_id      UUID REFERENCES contacts(id) ON DELETE SET NULL,
  company_id      UUID REFERENCES companies(id) ON DELETE SET NULL,
  datum           DATE DEFAULT CURRENT_DATE,
  geldig_tot      DATE,
  taal            TEXT DEFAULT 'nl',
  munt            TEXT DEFAULT 'EUR',
  subtotaal_excl_btw NUMERIC(14,2) DEFAULT 0,
  totaal_btw      NUMERIC(14,2) DEFAULT 0,
  totaal_incl_btw NUMERIC(14,2) DEFAULT 0,
  korting_pct     NUMERIC(5,2) DEFAULT 0,
  opmerkingen     TEXT,
  voorwaarden     TEXT,
  pdf_url         TEXT,                          -- Supabase Storage
  klant_token     UUID DEFAULT gen_random_uuid(), -- voor klant-goedkeuring link
  klant_token_expires_at TIMESTAMPTZ,
  geaccepteerd_op TIMESTAMPTZ,
  afgewezen_op    TIMESTAMPTZ,
  afwijzing_reden TEXT,
  versie          INT DEFAULT 1,
  vorige_versie_id UUID,                          -- chain via self-referencing
  teamleader_id   TEXT,
  eigenaar_id     TEXT REFERENCES users(id),
  created_by      TEXT REFERENCES users(id),
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, nummer)
);

CREATE INDEX IF NOT EXISTS idx_quotations_tenant  ON quotations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_quotations_status  ON quotations(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_quotations_deal    ON quotations(deal_id);
CREATE INDEX IF NOT EXISTS idx_quotations_token   ON quotations(klant_token);

CREATE TABLE IF NOT EXISTS quotation_lines (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  quotation_id    UUID NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
  product_id      UUID REFERENCES products(id) ON DELETE SET NULL,
  omschrijving    TEXT NOT NULL,
  aantal          NUMERIC(12,2) DEFAULT 1,
  eenheid         TEXT DEFAULT 'stuk',
  prijs_excl_btw  NUMERIC(14,4) NOT NULL DEFAULT 0,
  korting_pct     NUMERIC(5,2) DEFAULT 0,
  btw_tarief      NUMERIC(5,4) DEFAULT 0.21,
  subtotaal_excl_btw NUMERIC(14,2) DEFAULT 0,    -- generated via trigger of app
  subtotaal_incl_btw NUMERIC(14,2) DEFAULT 0,
  volgorde        INT DEFAULT 100,
  is_kop          BOOLEAN DEFAULT false,          -- sectiekopregel zonder bedrag
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_qlines_quotation ON quotation_lines(quotation_id);

-- ---------- INVOICES (facturen) ----------
CREATE TABLE IF NOT EXISTS invoices (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  nummer          TEXT,
  referentie      TEXT,
  type            TEXT NOT NULL DEFAULT 'factuur', -- factuur | proforma
  status          TEXT NOT NULL DEFAULT 'concept', -- concept | verzonden | deels_betaald | betaald | vervallen | geannuleerd
  onderwerp       TEXT NOT NULL,
  quotation_id    UUID REFERENCES quotations(id) ON DELETE SET NULL,
  deal_id         UUID REFERENCES deals(id) ON DELETE SET NULL,
  contact_id      UUID REFERENCES contacts(id) ON DELETE SET NULL,
  company_id      UUID REFERENCES companies(id) ON DELETE SET NULL,
  datum           DATE DEFAULT CURRENT_DATE,
  vervaldatum     DATE,
  betalingstermijn_dagen INT DEFAULT 30,
  taal            TEXT DEFAULT 'nl',
  munt            TEXT DEFAULT 'EUR',
  subtotaal_excl_btw NUMERIC(14,2) DEFAULT 0,
  totaal_btw      NUMERIC(14,2) DEFAULT 0,
  totaal_incl_btw NUMERIC(14,2) DEFAULT 0,
  korting_pct     NUMERIC(5,2) DEFAULT 0,
  reeds_betaald   NUMERIC(14,2) DEFAULT 0,
  gestructureerde_mededeling TEXT,                  -- BE-standaard voor overschrijving
  opmerkingen     TEXT,
  voorwaarden     TEXT,
  pdf_url         TEXT,
  ubl_url         TEXT,                             -- UBL e-invoice bestand
  peppol_submission_id UUID,                        -- FK naar peppol_submissions
  peppol_status   TEXT,                             -- niet_verzonden | in_behandeling | verzonden | fout
  teamleader_id   TEXT,
  eigenaar_id     TEXT REFERENCES users(id),
  created_by      TEXT REFERENCES users(id),
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, nummer)
);

CREATE INDEX IF NOT EXISTS idx_invoices_tenant     ON invoices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status     ON invoices(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_invoices_vervaldatum ON invoices(tenant_id, vervaldatum) WHERE status IN ('verzonden','deels_betaald','vervallen');
CREATE INDEX IF NOT EXISTS idx_invoices_struc_med  ON invoices(gestructureerde_mededeling);

CREATE TABLE IF NOT EXISTS invoice_lines (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  invoice_id      UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  product_id      UUID REFERENCES products(id) ON DELETE SET NULL,
  omschrijving    TEXT NOT NULL,
  aantal          NUMERIC(12,2) DEFAULT 1,
  eenheid         TEXT DEFAULT 'stuk',
  prijs_excl_btw  NUMERIC(14,4) NOT NULL DEFAULT 0,
  korting_pct     NUMERIC(5,2) DEFAULT 0,
  btw_tarief      NUMERIC(5,4) DEFAULT 0.21,
  subtotaal_excl_btw NUMERIC(14,2) DEFAULT 0,
  subtotaal_incl_btw NUMERIC(14,2) DEFAULT 0,
  volgorde        INT DEFAULT 100,
  is_kop          BOOLEAN DEFAULT false,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ilines_invoice ON invoice_lines(invoice_id);

-- ---------- CREDIT NOTES ----------
CREATE TABLE IF NOT EXISTS credit_notes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  nummer          TEXT,
  invoice_id      UUID REFERENCES invoices(id) ON DELETE SET NULL,
  reden           TEXT,
  datum           DATE DEFAULT CURRENT_DATE,
  subtotaal_excl_btw NUMERIC(14,2) DEFAULT 0,
  totaal_btw      NUMERIC(14,2) DEFAULT 0,
  totaal_incl_btw NUMERIC(14,2) DEFAULT 0,
  status          TEXT DEFAULT 'concept',   -- concept | verzonden
  pdf_url         TEXT,
  created_by      TEXT REFERENCES users(id),
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, nummer)
);

CREATE INDEX IF NOT EXISTS idx_creditnotes_tenant  ON credit_notes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_creditnotes_invoice ON credit_notes(invoice_id);

-- ---------- PAYMENT REMINDERS ----------
CREATE TABLE IF NOT EXISTS payment_reminders (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  invoice_id      UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  niveau          INT NOT NULL DEFAULT 1,     -- 1=vriendelijk, 2=tweede, 3=ingebrekestelling
  verzonden_op    TIMESTAMPTZ DEFAULT now(),
  verzonden_door  TEXT REFERENCES users(id),
  email_onderwerp TEXT,
  email_inhoud    TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reminders_invoice ON payment_reminders(invoice_id);

-- ---------- DOCUMENT TEMPLATES ----------
CREATE TABLE IF NOT EXISTS document_templates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  naam            TEXT NOT NULL,
  type            TEXT NOT NULL, -- offerte | factuur | herinnering | email | pdf_layout
  is_default      BOOLEAN DEFAULT false,
  inhoud_html     TEXT,
  inhoud_tekst    TEXT,
  variabelen      JSONB,         -- metadata over gebruikte placeholders
  stijl_jsonb     JSONB,         -- kleur, font, logo-positie
  created_by      TEXT REFERENCES users(id),
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, naam, type)
);

CREATE INDEX IF NOT EXISTS idx_templates_tenant_type ON document_templates(tenant_id, type);

-- ---------- NUMBERING (per tenant per type per jaar) ----------
CREATE TABLE IF NOT EXISTS document_nummering (
  tenant_id       TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  document_type   TEXT NOT NULL,           -- quotation | invoice | credit_note
  jaar            INT NOT NULL,
  laatste_nummer  INT NOT NULL DEFAULT 0,
  prefix          TEXT,                    -- bv. "F" voor factuur
  PRIMARY KEY (tenant_id, document_type, jaar)
);

-- Functie: geef volgend nummer
CREATE OR REPLACE FUNCTION volgend_nummer(t_id TEXT, doc_type TEXT) RETURNS TEXT
LANGUAGE PLPGSQL AS $$
DECLARE
  jaar_nu INT := EXTRACT(YEAR FROM CURRENT_DATE)::INT;
  nummer INT;
  prefix_val TEXT;
BEGIN
  INSERT INTO document_nummering (tenant_id, document_type, jaar, laatste_nummer)
  VALUES (t_id, doc_type, jaar_nu, 1)
  ON CONFLICT (tenant_id, document_type, jaar)
  DO UPDATE SET laatste_nummer = document_nummering.laatste_nummer + 1
  RETURNING laatste_nummer, prefix INTO nummer, prefix_val;

  RETURN COALESCE(prefix_val, '') || jaar_nu::TEXT || '/' || LPAD(nummer::TEXT, 4, '0');
END $$;

-- ---------- TRIGGERS ----------
DROP TRIGGER IF EXISTS quotations_updated_at ON quotations;
CREATE TRIGGER quotations_updated_at BEFORE UPDATE ON quotations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS invoices_updated_at ON invoices;
CREATE TRIGGER invoices_updated_at BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS templates_updated_at ON document_templates;
CREATE TRIGGER templates_updated_at BEFORE UPDATE ON document_templates
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------- RLS ----------
SELECT add_tenant_rls('quotations', 'offertes');
SELECT add_tenant_rls('quotation_lines', 'offertes');
SELECT add_tenant_rls('invoices', 'facturen');
SELECT add_tenant_rls('invoice_lines', 'facturen');
SELECT add_tenant_rls('credit_notes', 'facturen');
SELECT add_tenant_rls('payment_reminders', 'facturen');
SELECT add_tenant_rls('document_templates', 'instellingen');

ALTER TABLE document_nummering ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS numbering_select ON document_nummering;
CREATE POLICY numbering_select ON document_nummering FOR SELECT
  USING (tenant_id = current_tenant_id());
DROP POLICY IF EXISTS numbering_all ON document_nummering;
CREATE POLICY numbering_all ON document_nummering FOR ALL
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

COMMENT ON TABLE quotations IS 'Offertes met versioning en klant-goedkeuring via token';
COMMENT ON TABLE invoices IS 'Facturen met Peppol en status-tracking';
COMMENT ON TABLE document_templates IS 'Herbruikbare templates per tenant voor offerte/factuur/email';
COMMENT ON FUNCTION volgend_nummer IS 'Geeft volgend nummer in formaat JAAR/XXXX per tenant+type';

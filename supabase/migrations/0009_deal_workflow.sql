-- =========================================================================
-- 0009 — Deal-workflow uitbreiding (geïnspireerd op Teamleader Focus):
--   * Pipeline-stages krijgen categorie (pre_sales/in_sales/refused/won) + kleur
--   * Deals krijgen marge, lead_bron, lead_categorie
--   * Quotation/invoice lines krijgen aankoop_prijs (voor marge-berekening)
--   * Nieuwe document-types: bestelbonnen, orderbevestigingen, leveringsbonnen
--   * deal_notes tabel voor opmerkingen-stream
--   * signing_requests tabel voor e-handtekening (SignRequest)
-- =========================================================================

-- ---------- PIPELINE STAGES: categorie + kleur per categorie ----------
ALTER TABLE pipeline_stages
  ADD COLUMN IF NOT EXISTS categorie TEXT NOT NULL DEFAULT 'pre_sales';
  -- pre_sales | in_sales | refused | won

-- Update bestaande stages: gewonnen → 'won', verloren → 'refused', rest → 'in_sales'
UPDATE pipeline_stages SET categorie = 'won' WHERE is_won = true AND categorie = 'pre_sales';
UPDATE pipeline_stages SET categorie = 'refused' WHERE is_lost = true AND categorie = 'pre_sales';

CREATE INDEX IF NOT EXISTS idx_stages_categorie ON pipeline_stages(tenant_id, categorie);

-- ---------- DEALS: marge + lead-attributen ----------
ALTER TABLE deals
  ADD COLUMN IF NOT EXISTS marge_excl_btw NUMERIC(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS lead_bron TEXT,                  -- bv. "Zapier formulier", "Telefoon"
  ADD COLUMN IF NOT EXISTS lead_categorie TEXT,             -- bv. "Warmtepompen 2.0"
  ADD COLUMN IF NOT EXISTS slaagkans NUMERIC(5,2);          -- override van stage-default

-- ---------- QUOTATION & INVOICE LINES: aankoopprijs + marge ----------
ALTER TABLE quotation_lines
  ADD COLUMN IF NOT EXISTS aankoop_prijs_excl_btw NUMERIC(14,4) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS marge_excl_btw NUMERIC(14,2);

ALTER TABLE invoice_lines
  ADD COLUMN IF NOT EXISTS aankoop_prijs_excl_btw NUMERIC(14,4) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS marge_excl_btw NUMERIC(14,2);

-- Auto-bereken marge per regel als trigger
CREATE OR REPLACE FUNCTION calc_line_margin() RETURNS TRIGGER
LANGUAGE PLPGSQL AS $$
BEGIN
  NEW.marge_excl_btw = (NEW.subtotaal_excl_btw - (NEW.aankoop_prijs_excl_btw * NEW.aantal));
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS qlines_margin ON quotation_lines;
CREATE TRIGGER qlines_margin BEFORE INSERT OR UPDATE ON quotation_lines
  FOR EACH ROW EXECUTE FUNCTION calc_line_margin();

DROP TRIGGER IF EXISTS ilines_margin ON invoice_lines;
CREATE TRIGGER ilines_margin BEFORE INSERT OR UPDATE ON invoice_lines
  FOR EACH ROW EXECUTE FUNCTION calc_line_margin();

-- ---------- QUOTATIONS / INVOICES: marge totaal ----------
ALTER TABLE quotations  ADD COLUMN IF NOT EXISTS marge_excl_btw NUMERIC(14,2) DEFAULT 0;
ALTER TABLE invoices    ADD COLUMN IF NOT EXISTS marge_excl_btw NUMERIC(14,2) DEFAULT 0;

-- ---------- BESTELBONNEN (purchase orders → leverancier) ----------
CREATE TABLE IF NOT EXISTS purchase_orders (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  nummer          TEXT,
  onderwerp       TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'concept', -- concept | verzonden | bevestigd | geleverd | geannuleerd
  deal_id         UUID REFERENCES deals(id) ON DELETE SET NULL,
  project_id      UUID REFERENCES projects(id) ON DELETE SET NULL,
  leverancier_id  UUID REFERENCES companies(id) ON DELETE SET NULL,
  datum           DATE DEFAULT CURRENT_DATE,
  verwachte_levering DATE,
  subtotaal_excl_btw NUMERIC(14,2) DEFAULT 0,
  totaal_btw      NUMERIC(14,2) DEFAULT 0,
  totaal_incl_btw NUMERIC(14,2) DEFAULT 0,
  opmerkingen     TEXT,
  pdf_url         TEXT,
  eigenaar_id     TEXT REFERENCES users(id),
  created_by      TEXT REFERENCES users(id),
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, nummer)
);

CREATE TABLE IF NOT EXISTS purchase_order_lines (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  product_id      UUID REFERENCES products(id) ON DELETE SET NULL,
  omschrijving    TEXT NOT NULL,
  aantal          NUMERIC(12,2) DEFAULT 1,
  eenheid         TEXT DEFAULT 'stuk',
  prijs_excl_btw  NUMERIC(14,4) NOT NULL DEFAULT 0,
  btw_tarief      NUMERIC(5,4) DEFAULT 0.21,
  subtotaal_excl_btw NUMERIC(14,2) DEFAULT 0,
  volgorde        INT DEFAULT 100,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_po_tenant ON purchase_orders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_po_deal   ON purchase_orders(deal_id);
CREATE INDEX IF NOT EXISTS idx_pol_po    ON purchase_order_lines(purchase_order_id);

-- ---------- ORDERBEVESTIGINGEN (order confirmations) ----------
CREATE TABLE IF NOT EXISTS order_confirmations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  nummer          TEXT,
  onderwerp       TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'concept', -- concept | verzonden | bevestigd
  deal_id         UUID REFERENCES deals(id) ON DELETE SET NULL,
  quotation_id    UUID REFERENCES quotations(id) ON DELETE SET NULL,
  contact_id      UUID REFERENCES contacts(id) ON DELETE SET NULL,
  company_id      UUID REFERENCES companies(id) ON DELETE SET NULL,
  datum           DATE DEFAULT CURRENT_DATE,
  totaal_incl_btw NUMERIC(14,2) DEFAULT 0,
  opmerkingen     TEXT,
  pdf_url         TEXT,
  created_by      TEXT REFERENCES users(id),
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, nummer)
);

CREATE INDEX IF NOT EXISTS idx_oc_tenant ON order_confirmations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_oc_deal   ON order_confirmations(deal_id);

-- ---------- LEVERINGSBONNEN (delivery notes) ----------
CREATE TABLE IF NOT EXISTS delivery_notes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  nummer          TEXT,
  onderwerp       TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'concept', -- concept | gepland | geleverd | geannuleerd
  deal_id         UUID REFERENCES deals(id) ON DELETE SET NULL,
  project_id      UUID REFERENCES projects(id) ON DELETE SET NULL,
  contact_id      UUID REFERENCES contacts(id) ON DELETE SET NULL,
  company_id      UUID REFERENCES companies(id) ON DELETE SET NULL,
  datum           DATE DEFAULT CURRENT_DATE,
  geleverd_op     TIMESTAMPTZ,
  geleverd_door   TEXT REFERENCES users(id),
  ontvangen_door_naam TEXT,
  opmerkingen     TEXT,
  pdf_url         TEXT,
  created_by      TEXT REFERENCES users(id),
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, nummer)
);

CREATE TABLE IF NOT EXISTS delivery_note_lines (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  delivery_note_id UUID NOT NULL REFERENCES delivery_notes(id) ON DELETE CASCADE,
  product_id      UUID REFERENCES products(id) ON DELETE SET NULL,
  omschrijving    TEXT NOT NULL,
  aantal          NUMERIC(12,2) DEFAULT 1,
  eenheid         TEXT DEFAULT 'stuk',
  volgorde        INT DEFAULT 100,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dn_tenant ON delivery_notes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_dn_deal   ON delivery_notes(deal_id);
CREATE INDEX IF NOT EXISTS idx_dnl_dn    ON delivery_note_lines(delivery_note_id);

-- ---------- DEAL NOTES (opmerkingen-stream) ----------
CREATE TABLE IF NOT EXISTS deal_notes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  deal_id         UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  auteur_id       TEXT REFERENCES users(id),
  inhoud          TEXT NOT NULL,
  is_systeem      BOOLEAN DEFAULT false,        -- systeemnotities (stage gewijzigd, etc)
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_deal_notes_deal ON deal_notes(deal_id, created_at DESC);

-- ---------- SIGNING REQUESTS (SignRequest e-sign) ----------
CREATE TABLE IF NOT EXISTS signing_requests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  document_type   TEXT NOT NULL,        -- quotation | purchase_order | invoice | contract
  document_id     UUID NOT NULL,
  provider        TEXT NOT NULL DEFAULT 'signrequest',  -- signrequest | yousign | docusign
  externe_id      TEXT,                -- ID bij SignRequest
  signer_email    TEXT NOT NULL,
  signer_naam     TEXT,
  status          TEXT NOT NULL DEFAULT 'aangevraagd',
                  -- aangevraagd | verzonden | bekeken | ondertekend | geweigerd | verlopen
  ondertekend_op  TIMESTAMPTZ,
  signed_pdf_url  TEXT,
  audit_log_url   TEXT,
  aangevraagd_door TEXT REFERENCES users(id),
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_signing_doc ON signing_requests(document_type, document_id);
CREATE INDEX IF NOT EXISTS idx_signing_externe ON signing_requests(externe_id) WHERE externe_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_signing_tenant ON signing_requests(tenant_id, status);

-- ---------- TRIGGERS ----------
DROP TRIGGER IF EXISTS po_updated_at ON purchase_orders;
CREATE TRIGGER po_updated_at BEFORE UPDATE ON purchase_orders
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS oc_updated_at ON order_confirmations;
CREATE TRIGGER oc_updated_at BEFORE UPDATE ON order_confirmations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS dn_updated_at ON delivery_notes;
CREATE TRIGGER dn_updated_at BEFORE UPDATE ON delivery_notes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS sr_updated_at ON signing_requests;
CREATE TRIGGER sr_updated_at BEFORE UPDATE ON signing_requests
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Stage-change → automatische deal_note
CREATE OR REPLACE FUNCTION log_deal_stage_note() RETURNS TRIGGER
LANGUAGE PLPGSQL AS $$
DECLARE
  oude_naam TEXT;
  nieuwe_naam TEXT;
BEGIN
  IF NEW.stage_id IS DISTINCT FROM OLD.stage_id THEN
    SELECT naam INTO oude_naam FROM pipeline_stages WHERE id = OLD.stage_id;
    SELECT naam INTO nieuwe_naam FROM pipeline_stages WHERE id = NEW.stage_id;
    INSERT INTO deal_notes (tenant_id, deal_id, inhoud, is_systeem)
    VALUES (NEW.tenant_id, NEW.id,
            format('Fase gewijzigd van "%s" naar "%s"', COALESCE(oude_naam,'?'), COALESCE(nieuwe_naam,'?')),
            true);
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS deal_stage_note ON deals;
CREATE TRIGGER deal_stage_note AFTER UPDATE ON deals
  FOR EACH ROW EXECUTE FUNCTION log_deal_stage_note();

-- ---------- RLS ----------
SELECT add_tenant_rls('purchase_orders', 'facturen');
SELECT add_tenant_rls('purchase_order_lines', 'facturen');
SELECT add_tenant_rls('order_confirmations', 'facturen');
SELECT add_tenant_rls('delivery_notes', 'facturen');
SELECT add_tenant_rls('delivery_note_lines', 'facturen');
SELECT add_tenant_rls('deal_notes', 'deals');
SELECT add_tenant_rls('signing_requests', 'offertes');

COMMENT ON TABLE purchase_orders IS 'Bestelbonnen naar leveranciers';
COMMENT ON TABLE order_confirmations IS 'Orderbevestigingen van klanten';
COMMENT ON TABLE delivery_notes IS 'Leveringsbonnen bij installatie/oplevering';
COMMENT ON TABLE deal_notes IS 'Opmerkingen-stream per deal (manueel + systeem)';
COMMENT ON TABLE signing_requests IS 'E-handtekening aanvragen via SignRequest/Yousign';

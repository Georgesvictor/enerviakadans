-- =========================================================================
-- 0010 — Project-lijnen, facturatie-methodes per regel, mail-templates,
--        extra werken, deelfacturatie.
--
-- Geïnspireerd op Teamleader Focus screenshots:
--   - Offerte-regel = project-lijn (snapshot bij won-deal)
--   - Per lijn: facturatie-methode (stukprijs/uren/vast/termijnen)
--   - Project-lijnen hebben taken-status + medewerker + data
--   - Extra werken = nieuwe project-lijn die ter goedkeuring kan
--   - Deelfacturatie: factureer 50 van 100m² aangerekend
--   - Begeleidende tekst van offerte met merge-tags + meerdere templates
-- =========================================================================

-- ---------- QUOTATION_LINES uitbreiden ----------
ALTER TABLE quotation_lines
  ADD COLUMN IF NOT EXISTS beschrijving TEXT,
  ADD COLUMN IF NOT EXISTS facturatie_methode TEXT NOT NULL DEFAULT 'stukprijs';
-- stukprijs | tijd_materialen | vast_bedrag | termijnen

ALTER TABLE invoice_lines
  ADD COLUMN IF NOT EXISTS beschrijving TEXT,
  ADD COLUMN IF NOT EXISTS facturatie_methode TEXT NOT NULL DEFAULT 'stukprijs';

-- ---------- PROJECT_LINES (snapshot van quotation_lines) ----------
CREATE TABLE IF NOT EXISTS project_lines (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  groep           TEXT,                            -- "Werf inrichting", "Afbraakwerken"
  groep_volgorde  INT DEFAULT 100,
  is_kop          BOOLEAN DEFAULT false,           -- true = sectiekop, false = werkelijke lijn
  product_id      UUID REFERENCES products(id) ON DELETE SET NULL,
  quotation_line_id UUID REFERENCES quotation_lines(id) ON DELETE SET NULL,
  omschrijving    TEXT NOT NULL,
  beschrijving    TEXT,                            -- lange beschrijving (markdown)
  aantal          NUMERIC(12,2) DEFAULT 1,
  eenheid         TEXT DEFAULT 'stuk',
  prijs_excl_btw  NUMERIC(14,4) NOT NULL DEFAULT 0,
  aankoop_prijs_excl_btw NUMERIC(14,4) DEFAULT 0,
  korting_pct     NUMERIC(5,2) DEFAULT 0,
  btw_tarief      NUMERIC(5,4) DEFAULT 0.21,
  facturatie_methode TEXT NOT NULL DEFAULT 'stukprijs',
                  -- stukprijs | tijd_materialen | vast_bedrag | termijnen
  reeds_gefactureerd_aantal NUMERIC(12,2) DEFAULT 0, -- voor deelfacturatie
  reeds_gefactureerd_bedrag NUMERIC(14,2) DEFAULT 0,
  -- Taak-eigenschappen
  status          TEXT NOT NULL DEFAULT 'to_do',   -- to_do | lopend | on_hold | klaar
  toegewezen_aan  TEXT REFERENCES users(id) ON DELETE SET NULL,
  begin_datum     DATE,
  eind_datum      DATE,
  voltooid_op     TIMESTAMPTZ,
  -- Extra werken
  is_extra_werk   BOOLEAN DEFAULT false,
  extra_status    TEXT,                            -- concept | verstuurd | goedgekeurd | afgewezen
  extra_quotation_id UUID REFERENCES quotations(id) ON DELETE SET NULL, -- mini-offerte voor extra werken
  volgorde        INT DEFAULT 100,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pl_project ON project_lines(project_id, volgorde);
CREATE INDEX IF NOT EXISTS idx_pl_quotation ON project_lines(quotation_line_id) WHERE quotation_line_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pl_status ON project_lines(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_pl_extra ON project_lines(project_id, is_extra_werk) WHERE is_extra_werk = true;

DROP TRIGGER IF EXISTS pl_updated_at ON project_lines;
CREATE TRIGGER pl_updated_at BEFORE UPDATE ON project_lines
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------- INVOICE_LINES koppelen aan project_lines voor doorrolling ----------
ALTER TABLE invoice_lines
  ADD COLUMN IF NOT EXISTS project_line_id UUID REFERENCES project_lines(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_il_project_line
  ON invoice_lines(project_line_id) WHERE project_line_id IS NOT NULL;

-- ---------- MAIL_TEMPLATES (begeleidende teksten + andere templates) ----------
-- We breiden de bestaande document_templates uit ipv aparte tabel
ALTER TABLE document_templates
  ADD COLUMN IF NOT EXISTS scope TEXT NOT NULL DEFAULT 'workspace',
  -- workspace = beschikbaar voor hele tenant, pipeline = voor specifieke pipeline
  ADD COLUMN IF NOT EXISTS pipeline_id UUID REFERENCES pipelines(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS preview_html TEXT;

CREATE INDEX IF NOT EXISTS idx_tpl_type ON document_templates(tenant_id, type);

-- ---------- QUOTATIONS / INVOICES krijgen template-koppeling ----------
ALTER TABLE quotations
  ADD COLUMN IF NOT EXISTS begeleidende_tekst_html TEXT,
  ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES document_templates(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS bedrijfsentiteit TEXT,                  -- bv. 'Enervia BV' (voor multi-entity)
  ADD COLUMN IF NOT EXISTS layout TEXT,
  ADD COLUMN IF NOT EXISTS is_extra_werk BOOLEAN DEFAULT false,    -- mini-offerte voor extra werken op project
  ADD COLUMN IF NOT EXISTS parent_project_id UUID REFERENCES projects(id) ON DELETE SET NULL;

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS begeleidende_tekst_html TEXT,
  ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES document_templates(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS bedrijfsentiteit TEXT,
  ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS factuur_type TEXT NOT NULL DEFAULT 'standaard';
-- standaard | voorschot | termijn | eindafrekening

CREATE INDEX IF NOT EXISTS idx_invoices_project ON invoices(project_id) WHERE project_id IS NOT NULL;

-- ---------- DEFAULT TEMPLATES seeden voor Enervia tenant ----------
INSERT INTO document_templates (tenant_id, naam, type, is_default, scope, inhoud_html)
VALUES (
  'org_enervia_default',
  'Standaard offerte-tekst',
  'offerte',
  true,
  'workspace',
  '<p><strong>Geachte klant,</strong></p>
<p>Hartelijk dank voor uw interesse in onze diensten. In deze offerte vindt u een volledig en duidelijk overzicht van de voorgestelde werken, materialen en voorwaarden voor het project <strong>#DEAL_TITLE</strong>, opgenomen onder referentie <strong>#OFFER_NR</strong> en geldig tot <strong>#VALID_UNTIL_DATE</strong>.</p>
<p>De offerte werd opgesteld op <strong>#TODAY</strong> en is gericht aan:<br/><strong>#CUSTOMER_ADDRESS</strong></p>
<p>Wij streven ernaar om elke klant transparantie, duidelijke communicatie en hoogwaardige uitvoering te bieden. Daarom ontvangt u in deze offerte niet alleen de prijsraming (<strong>#PRICE_EXCL</strong> excl. btw), maar ook een overzicht van onze werkwijze, materialen en garantievoorwaarden.</p>
<p>Voor al uw vragen of bijkomende toelichting kunt u steeds terecht bij onze contactpersoon:<br/><strong>#SALE_CONTACT_PERSON</strong></p>
<p>Met vriendelijke groeten,<br/><strong>#MY_NAME</strong><br/><strong>#DEPARTMENT_NAME</strong></p>'
)
ON CONFLICT (tenant_id, naam, type) DO NOTHING;

INSERT INTO document_templates (tenant_id, naam, type, is_default, scope, inhoud_html)
VALUES (
  'org_enervia_default',
  'Korte offerte-tekst',
  'offerte',
  false,
  'workspace',
  '<p>Geachte klant,</p><p>In bijlage onze offerte voor <strong>#DEAL_TITLE</strong>. Deze is geldig tot <strong>#VALID_UNTIL_DATE</strong>.</p><p>Vragen? Bel ons op 03 808 8666.</p><p>Met vriendelijke groeten,<br/><strong>#MY_NAME</strong></p>'
)
ON CONFLICT (tenant_id, naam, type) DO NOTHING;

-- ---------- AUTO-SNAPSHOT TRIGGER: deal won → project + project_lines ----------
CREATE OR REPLACE FUNCTION auto_create_project_on_won_deal() RETURNS TRIGGER
LANGUAGE PLPGSQL AS $$
DECLARE
  v_project_id UUID;
  v_quote_id UUID;
BEGIN
  -- Alleen als deal status wijzigt naar 'won'
  IF NEW.status = 'won' AND (OLD.status IS NULL OR OLD.status <> 'won') THEN
    -- Check of er al een project bestaat voor deze deal
    IF NOT EXISTS (SELECT 1 FROM projects WHERE deal_id = NEW.id) THEN
      INSERT INTO projects (tenant_id, naam, deal_id, contact_id, company_id, status, eigenaar_id, created_by, budget_excl_btw)
      VALUES (NEW.tenant_id, NEW.titel, NEW.id, NEW.contact_id, NEW.company_id, 'lopend', NEW.eigenaar_id, NEW.created_by, NEW.waarde_excl_btw)
      RETURNING id INTO v_project_id;

      -- Vind laatste geaccepteerde offerte op deze deal
      SELECT id INTO v_quote_id
      FROM quotations
      WHERE deal_id = NEW.id
        AND tenant_id = NEW.tenant_id
        AND status IN ('geaccepteerd', 'verzonden')
      ORDER BY datum DESC, created_at DESC
      LIMIT 1;

      -- Kopieer quotation_lines naar project_lines
      IF v_quote_id IS NOT NULL THEN
        INSERT INTO project_lines (
          tenant_id, project_id, quotation_line_id, product_id,
          omschrijving, beschrijving, aantal, eenheid,
          prijs_excl_btw, aankoop_prijs_excl_btw, korting_pct, btw_tarief,
          facturatie_methode, is_kop, volgorde
        )
        SELECT
          tenant_id, v_project_id, id, product_id,
          omschrijving, beschrijving, aantal, eenheid,
          prijs_excl_btw, aankoop_prijs_excl_btw, korting_pct, btw_tarief,
          facturatie_methode, is_kop, volgorde
        FROM quotation_lines
        WHERE quotation_id = v_quote_id;
      END IF;

      INSERT INTO deal_notes (tenant_id, deal_id, inhoud, is_systeem)
      VALUES (NEW.tenant_id, NEW.id, format('Project automatisch aangemaakt: %s', v_project_id::TEXT), true);
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS deal_won_creates_project ON deals;
CREATE TRIGGER deal_won_creates_project AFTER UPDATE ON deals
  FOR EACH ROW EXECUTE FUNCTION auto_create_project_on_won_deal();

-- ---------- HELPER: factureerbaar bedrag per project_line ----------
CREATE OR REPLACE FUNCTION factureerbaar_bedrag(line_id UUID) RETURNS NUMERIC
LANGUAGE SQL STABLE AS $$
  SELECT
    GREATEST(0, (l.aantal - l.reeds_gefactureerd_aantal) * l.prijs_excl_btw)
  FROM project_lines l
  WHERE l.id = line_id
$$;

-- ---------- RLS ----------
SELECT add_tenant_rls('project_lines', 'projecten');

COMMENT ON TABLE project_lines IS
  'Project-lijnen: snapshot van quotation_lines bij won-deal + extra werken. Hebben taken-status én facturatie-tracking.';

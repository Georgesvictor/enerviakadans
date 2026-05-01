-- =========================================================================
-- 0005 — Pipelines, deals, producten (sales)
-- Fase 1 Kadans.
-- =========================================================================

-- ---------- PIPELINES ----------
CREATE TABLE IF NOT EXISTS pipelines (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  naam          TEXT NOT NULL,
  is_default    BOOLEAN DEFAULT false,
  gearchiveerd  BOOLEAN DEFAULT false,
  volgorde      INT DEFAULT 100,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, naam)
);

CREATE INDEX IF NOT EXISTS idx_pipelines_tenant ON pipelines(tenant_id);

-- ---------- PIPELINE_STAGES ----------
CREATE TABLE IF NOT EXISTS pipeline_stages (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  pipeline_id   UUID NOT NULL REFERENCES pipelines(id) ON DELETE CASCADE,
  naam          TEXT NOT NULL,
  volgorde      INT NOT NULL DEFAULT 100,
  waarschijnlijkheid NUMERIC(5,2) DEFAULT 0, -- 0-100 % voor weighted forecast
  kleur         TEXT DEFAULT '#94A3B8',
  is_won        BOOLEAN DEFAULT false,   -- "gewonnen" eindfase
  is_lost       BOOLEAN DEFAULT false,   -- "verloren" eindfase
  rotting_dagen INT DEFAULT 14,          -- na hoeveel dagen zonder activiteit = "rotting"
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stages_pipeline ON pipeline_stages(pipeline_id, volgorde);

-- ---------- DEALS ----------
CREATE TABLE IF NOT EXISTS deals (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  pipeline_id     UUID NOT NULL REFERENCES pipelines(id),
  stage_id        UUID NOT NULL REFERENCES pipeline_stages(id),
  titel           TEXT NOT NULL,
  beschrijving    TEXT,
  contact_id      UUID REFERENCES contacts(id) ON DELETE SET NULL,
  company_id      UUID REFERENCES companies(id) ON DELETE SET NULL,
  waarde_excl_btw NUMERIC(14,2) DEFAULT 0,
  btw_tarief      NUMERIC(5,4) DEFAULT 0.21,
  munt            TEXT DEFAULT 'EUR',
  verwacht_afgesloten DATE,
  eigenaar_id     TEXT REFERENCES users(id),
  bron            TEXT,
  tags_cache      TEXT[] DEFAULT '{}'::TEXT[],
  custom_fields   JSONB DEFAULT '{}'::JSONB,
  status          TEXT NOT NULL DEFAULT 'open', -- open | won | lost
  lost_reden      TEXT,
  afgesloten_op   TIMESTAMPTZ,
  laatste_activiteit TIMESTAMPTZ DEFAULT now(),
  teamleader_id   TEXT,
  created_by      TEXT REFERENCES users(id),
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_deals_tenant    ON deals(tenant_id);
CREATE INDEX IF NOT EXISTS idx_deals_stage     ON deals(stage_id);
CREATE INDEX IF NOT EXISTS idx_deals_pipeline  ON deals(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_deals_contact   ON deals(contact_id);
CREATE INDEX IF NOT EXISTS idx_deals_company   ON deals(company_id);
CREATE INDEX IF NOT EXISTS idx_deals_status    ON deals(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_deals_eigenaar  ON deals(eigenaar_id);

-- Deal stage-history voor forecast-analyse
CREATE TABLE IF NOT EXISTS deal_stage_history (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  deal_id       UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  van_stage_id  UUID REFERENCES pipeline_stages(id),
  naar_stage_id UUID NOT NULL REFERENCES pipeline_stages(id),
  gewijzigd_door TEXT REFERENCES users(id),
  gewijzigd_op  TIMESTAMPTZ DEFAULT now(),
  reden         TEXT
);

CREATE INDEX IF NOT EXISTS idx_stage_history_deal ON deal_stage_history(deal_id);

-- ---------- PRODUCTS (catalogus) ----------
CREATE TABLE IF NOT EXISTS products (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  code          TEXT,                   -- interne sku / artikelcode
  naam          TEXT NOT NULL,
  beschrijving  TEXT,
  type          TEXT NOT NULL DEFAULT 'product', -- product | dienst | uren
  eenheid       TEXT DEFAULT 'stuk',              -- stuk | uur | m² | m | kg | dag
  prijs_excl_btw NUMERIC(14,2) NOT NULL DEFAULT 0,
  btw_tarief    NUMERIC(5,4) NOT NULL DEFAULT 0.21,
  aankoop_prijs NUMERIC(14,2),
  categorie     TEXT,
  gearchiveerd  BOOLEAN DEFAULT false,
  teamleader_id TEXT,
  created_by    TEXT REFERENCES users(id),
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, code)
);

CREATE INDEX IF NOT EXISTS idx_products_tenant ON products(tenant_id);
CREATE INDEX IF NOT EXISTS idx_products_naam   ON products(tenant_id, naam);

-- ---------- TRIGGERS ----------
DROP TRIGGER IF EXISTS pipelines_updated_at ON pipelines;
CREATE TRIGGER pipelines_updated_at BEFORE UPDATE ON pipelines
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS deals_updated_at ON deals;
CREATE TRIGGER deals_updated_at BEFORE UPDATE ON deals
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS products_updated_at ON products;
CREATE TRIGGER products_updated_at BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Auto-log stage-changes
CREATE OR REPLACE FUNCTION log_deal_stage_change() RETURNS TRIGGER
LANGUAGE PLPGSQL AS $$
BEGIN
  IF NEW.stage_id IS DISTINCT FROM OLD.stage_id THEN
    INSERT INTO deal_stage_history (tenant_id, deal_id, van_stage_id, naar_stage_id)
    VALUES (NEW.tenant_id, NEW.id, OLD.stage_id, NEW.stage_id);
    NEW.laatste_activiteit = now();
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS deal_stage_log ON deals;
CREATE TRIGGER deal_stage_log BEFORE UPDATE ON deals
  FOR EACH ROW EXECUTE FUNCTION log_deal_stage_change();

-- ---------- RLS ----------
SELECT add_tenant_rls('pipelines', 'deals');
SELECT add_tenant_rls('pipeline_stages', 'deals');
SELECT add_tenant_rls('deals', 'deals');
SELECT add_tenant_rls('deal_stage_history', 'deals');
SELECT add_tenant_rls('products', 'producten');

-- ---------- SEED: default pipeline voor elke bestaande tenant ----------
DO $$
DECLARE
  t RECORD;
  pid UUID;
BEGIN
  FOR t IN SELECT id FROM tenants LOOP
    -- Maak default pipeline als die nog niet bestaat
    IF NOT EXISTS (SELECT 1 FROM pipelines WHERE tenant_id = t.id AND is_default = true) THEN
      INSERT INTO pipelines (tenant_id, naam, is_default, volgorde)
      VALUES (t.id, 'Verkoop', true, 1)
      RETURNING id INTO pid;

      INSERT INTO pipeline_stages (tenant_id, pipeline_id, naam, volgorde, waarschijnlijkheid, kleur) VALUES
        (t.id, pid, 'Nieuw',          10,  10, '#94A3B8'),
        (t.id, pid, 'Gekwalificeerd', 20,  25, '#64748B'),
        (t.id, pid, 'Offerte',        30,  50, '#F59E0B'),
        (t.id, pid, 'Onderhandeling', 40,  75, '#E87722'),
        (t.id, pid, 'Gewonnen',       50, 100, '#1F4D3F');
      -- Gewonnen-stage markeren
      UPDATE pipeline_stages SET is_won = true
      WHERE pipeline_id = pid AND naam = 'Gewonnen';

      INSERT INTO pipeline_stages (tenant_id, pipeline_id, naam, volgorde, waarschijnlijkheid, kleur, is_lost) VALUES
        (t.id, pid, 'Verloren',       99,   0, '#B91C1C', true);
    END IF;
  END LOOP;
END $$;

COMMENT ON TABLE pipelines IS 'Sales pipelines per tenant (default "Verkoop")';
COMMENT ON TABLE deals IS 'Opportunities/deals in pipeline, gekoppeld aan contact+company';
COMMENT ON TABLE products IS 'Herbruikbare producten/diensten catalogus';

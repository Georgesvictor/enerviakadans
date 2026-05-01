-- =========================================================================
-- 0012 — Workflow automation rules.
--
-- Eenvoudige regel-engine: bij een trigger-event (bv. deal-stage-change)
-- worden alle actieve regels gecheckt. Als de conditie matcht, worden de
-- acties uitgevoerd (taak aanmaken, project aanmaken, notitie toevoegen,
-- email queuen, etc).
-- =========================================================================

CREATE TABLE IF NOT EXISTS workflow_rules (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  naam            TEXT NOT NULL,
  beschrijving    TEXT,
  -- Trigger: deal_stage_change | deal_won | deal_lost | deal_created |
  --          invoice_created | invoice_paid | task_completed | quotation_accepted
  trigger         TEXT NOT NULL,
  -- Optionele filter (bv. enkel voor een specifieke pipeline of stage)
  filter_jsonb    JSONB DEFAULT '{}'::jsonb,
  -- Acties als array. Elke actie:
  --   {type: 'create_task', titel: '...', toegewezen_aan_eigenaar: true, dagen_offset: 0}
  --   {type: 'create_project', naam_template: '...'}
  --   {type: 'add_note', tekst: '...'}
  --   {type: 'change_stage', naar_stage_id: '...'}
  --   {type: 'set_status', status: 'won'}
  acties_jsonb    JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_actief       BOOLEAN DEFAULT true,
  uitgevoerd_count INT DEFAULT 0,
  laatst_uitgevoerd_op TIMESTAMPTZ,
  created_by      TEXT REFERENCES users(id),
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wfr_tenant_trigger
  ON workflow_rules(tenant_id, trigger) WHERE is_actief = true;

DROP TRIGGER IF EXISTS wfr_updated_at ON workflow_rules;
CREATE TRIGGER wfr_updated_at BEFORE UPDATE ON workflow_rules
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Audit-log van uitgevoerde regels
CREATE TABLE IF NOT EXISTS workflow_runs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  rule_id         UUID NOT NULL REFERENCES workflow_rules(id) ON DELETE CASCADE,
  trigger         TEXT NOT NULL,
  payload_jsonb   JSONB,
  resultaat       TEXT NOT NULL,                          -- success | partial | error
  resultaat_detail TEXT,
  acties_uitgevoerd INT DEFAULT 0,
  duurtijd_ms     INT,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wfrun_rule ON workflow_runs(rule_id, created_at DESC);

-- Default seed: handige regels voor Enervia
INSERT INTO workflow_rules (tenant_id, naam, beschrijving, trigger, filter_jsonb, acties_jsonb, created_by)
VALUES
  ('org_enervia_default',
   'Bij gewonnen deal → maak project',
   'Wanneer een deal status "gewonnen" krijgt, maak automatisch een project aan met dezelfde titel.',
   'deal_won',
   '{}'::jsonb,
   '[{"type":"create_project","naam_template":"#DEAL_TITLE","kopieer_offerte_lijnen":true}]'::jsonb,
   NULL),
  ('org_enervia_default',
   'Bij gewonnen deal → taak "Stuur orderbevestiging"',
   'Maakt een taak aan voor de eigenaar zodra de deal gewonnen is.',
   'deal_won',
   '{}'::jsonb,
   '[{"type":"create_task","titel":"Stuur orderbevestiging naar klant","toegewezen_aan_eigenaar":true,"dagen_offset":1,"prioriteit":"hoog"}]'::jsonb,
   NULL),
  ('org_enervia_default',
   'Bij geweigerde offerte → notitie toevoegen',
   'Logt een systeem-notitie wanneer een offerte als verloren gemarkeerd wordt.',
   'deal_lost',
   '{}'::jsonb,
   '[{"type":"add_note","tekst":"Deal werd verloren — review of opvolgactie nodig is.","is_systeem":true}]'::jsonb,
   NULL)
ON CONFLICT DO NOTHING;

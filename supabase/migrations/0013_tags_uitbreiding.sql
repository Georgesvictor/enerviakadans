-- =========================================================================
-- 0013 — Tags op deals en taken (al ondersteund op contacten/bedrijven).
-- =========================================================================

CREATE TABLE IF NOT EXISTS deal_tags (
  deal_id   UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  tag_id    UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  PRIMARY KEY (deal_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_deal_tags_tag ON deal_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_deal_tags_tenant ON deal_tags(tenant_id);

CREATE TABLE IF NOT EXISTS task_tags (
  task_id   UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  tag_id    UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  PRIMARY KEY (task_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_task_tags_tag ON task_tags(tag_id);

-- Aangepaste scope op tags zodat we onderscheid kunnen maken
ALTER TABLE tags
  ADD COLUMN IF NOT EXISTS gebruik_count INT DEFAULT 0;

-- Default seed: 3 handige tags
INSERT INTO tags (tenant_id, naam, kleur, scope)
VALUES
  ('org_enervia_default', 'Hoge prioriteit', '#dc2626', 'all'),
  ('org_enervia_default', 'Heroverwegen', '#f59e0b', 'all'),
  ('org_enervia_default', 'VIP klant', '#7c3aed', 'all'),
  ('org_enervia_default', 'Volgen op', '#2563eb', 'all'),
  ('org_enervia_default', 'Asbest', '#ea580c', 'all'),
  ('org_enervia_default', 'Renovatie', '#059669', 'all')
ON CONFLICT DO NOTHING;

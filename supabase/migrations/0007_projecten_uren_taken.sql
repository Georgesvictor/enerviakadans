-- =========================================================================
-- 0007 — Projecten, milestones, taken, tijdregistratie, agenda, bestanden
-- Fase 4 Kadans (vervroegd i.v.m. big-bang aanpak)
-- =========================================================================

-- ---------- PROJECTEN ----------
CREATE TABLE IF NOT EXISTS projects (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  naam            TEXT NOT NULL,
  code            TEXT,               -- bv. "PRJ-2026-0042"
  beschrijving    TEXT,
  contact_id      UUID REFERENCES contacts(id) ON DELETE SET NULL,
  company_id      UUID REFERENCES companies(id) ON DELETE SET NULL,
  deal_id         UUID REFERENCES deals(id) ON DELETE SET NULL,
  eigenaar_id     TEXT REFERENCES users(id),
  status          TEXT NOT NULL DEFAULT 'lopend', -- lopend | gepauzeerd | afgerond | geannuleerd
  start_datum     DATE,
  deadline        DATE,
  budget_excl_btw NUMERIC(14,2),
  tarief_per_uur  NUMERIC(10,2),
  is_factureerbaar BOOLEAN DEFAULT true,
  kleur           TEXT DEFAULT '#1F4D3F',
  tags_cache      TEXT[] DEFAULT '{}'::TEXT[],
  custom_fields   JSONB DEFAULT '{}'::JSONB,
  teamleader_id   TEXT,
  created_by      TEXT REFERENCES users(id),
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, code)
);

CREATE INDEX IF NOT EXISTS idx_projects_tenant ON projects(tenant_id);
CREATE INDEX IF NOT EXISTS idx_projects_company ON projects(company_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(tenant_id, status);

-- ---------- PROJECT MILESTONES / FASES ----------
CREATE TABLE IF NOT EXISTS project_phases (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  naam            TEXT NOT NULL,
  volgorde        INT DEFAULT 100,
  start_datum     DATE,
  deadline        DATE,
  status          TEXT DEFAULT 'open', -- open | bezig | afgerond
  budget_excl_btw NUMERIC(14,2),
  beschrijving    TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_phases_project ON project_phases(project_id);

-- ---------- PROJECT MEMBERS ----------
CREATE TABLE IF NOT EXISTS project_members (
  project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tenant_id       TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  rol             TEXT DEFAULT 'member',  -- owner | member | observer
  toegevoegd_op   TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (project_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_pmembers_user ON project_members(user_id);

-- ---------- TASKS (standalone of in een project) ----------
CREATE TABLE IF NOT EXISTS tasks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  titel           TEXT NOT NULL,
  beschrijving    TEXT,
  project_id      UUID REFERENCES projects(id) ON DELETE CASCADE,
  phase_id        UUID REFERENCES project_phases(id) ON DELETE SET NULL,
  contact_id      UUID REFERENCES contacts(id) ON DELETE SET NULL,
  company_id      UUID REFERENCES companies(id) ON DELETE SET NULL,
  deal_id         UUID REFERENCES deals(id) ON DELETE SET NULL,
  toegewezen_aan  TEXT REFERENCES users(id) ON DELETE SET NULL,
  status          TEXT NOT NULL DEFAULT 'open', -- open | bezig | afgerond | geannuleerd
  prioriteit      TEXT DEFAULT 'normaal', -- laag | normaal | hoog | dringend
  deadline        TIMESTAMPTZ,
  afgerond_op     TIMESTAMPTZ,
  volgorde        INT DEFAULT 100,
  tags_cache      TEXT[] DEFAULT '{}'::TEXT[],
  created_by      TEXT REFERENCES users(id),
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tasks_tenant     ON tasks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tasks_project    ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee   ON tasks(toegewezen_aan) WHERE toegewezen_aan IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_status     ON tasks(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_deadline   ON tasks(tenant_id, deadline) WHERE deadline IS NOT NULL AND status NOT IN ('afgerond','geannuleerd');

CREATE TABLE IF NOT EXISTS task_comments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  task_id         UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  auteur_id       TEXT REFERENCES users(id),
  inhoud          TEXT NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_task_comments_task ON task_comments(task_id);

-- ---------- TIME ENTRIES ----------
CREATE TABLE IF NOT EXISTS time_entries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  datum           DATE NOT NULL DEFAULT CURRENT_DATE,
  project_id      UUID REFERENCES projects(id) ON DELETE SET NULL,
  phase_id        UUID REFERENCES project_phases(id) ON DELETE SET NULL,
  task_id         UUID REFERENCES tasks(id) ON DELETE SET NULL,
  omschrijving    TEXT,
  minuten         INT NOT NULL,             -- minuten (gemakkelijker dan uren-decimaal)
  tarief_per_uur  NUMERIC(10,2),
  is_factureerbaar BOOLEAN DEFAULT true,
  gefactureerd    BOOLEAN DEFAULT false,
  invoice_line_id UUID REFERENCES invoice_lines(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_time_tenant     ON time_entries(tenant_id);
CREATE INDEX IF NOT EXISTS idx_time_user_datum ON time_entries(user_id, datum);
CREATE INDEX IF NOT EXISTS idx_time_project    ON time_entries(project_id);
CREATE INDEX IF NOT EXISTS idx_time_factureerbaar ON time_entries(tenant_id, is_factureerbaar, gefactureerd) WHERE is_factureerbaar = true AND gefactureerd = false;

-- ---------- AGENDA / CALENDAR ----------
CREATE TABLE IF NOT EXISTS calendar_accounts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider        TEXT NOT NULL,             -- google | microsoft | caldav | kadans
  externe_id      TEXT,                      -- Google calendar-id of M365 ID
  naam            TEXT,
  email           TEXT,
  access_token    TEXT,                      -- versleuteld in prod (later)
  refresh_token   TEXT,
  token_expires_at TIMESTAMPTZ,
  sync_token      TEXT,
  laatst_gesynct  TIMESTAMPTZ,
  is_primair      BOOLEAN DEFAULT false,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cal_accounts_user ON calendar_accounts(user_id);

CREATE TABLE IF NOT EXISTS calendar_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  calendar_account_id UUID REFERENCES calendar_accounts(id) ON DELETE CASCADE,
  externe_id      TEXT,
  titel           TEXT NOT NULL,
  beschrijving    TEXT,
  locatie         TEXT,
  begin_tijd      TIMESTAMPTZ NOT NULL,
  eind_tijd       TIMESTAMPTZ NOT NULL,
  hele_dag        BOOLEAN DEFAULT false,
  contact_id      UUID REFERENCES contacts(id) ON DELETE SET NULL,
  company_id      UUID REFERENCES companies(id) ON DELETE SET NULL,
  deal_id         UUID REFERENCES deals(id) ON DELETE SET NULL,
  project_id      UUID REFERENCES projects(id) ON DELETE SET NULL,
  eigenaar_id     TEXT REFERENCES users(id),
  status          TEXT DEFAULT 'bevestigd',  -- voorlopig | bevestigd | geannuleerd
  kleur           TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_events_tenant_tijd ON calendar_events(tenant_id, begin_tijd);
CREATE INDEX IF NOT EXISTS idx_events_externe ON calendar_events(calendar_account_id, externe_id) WHERE externe_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS event_attendees (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id        UUID NOT NULL REFERENCES calendar_events(id) ON DELETE CASCADE,
  tenant_id       TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id         TEXT REFERENCES users(id) ON DELETE CASCADE,
  contact_id      UUID REFERENCES contacts(id) ON DELETE CASCADE,
  email           TEXT,
  naam            TEXT,
  status          TEXT DEFAULT 'uitgenodigd' -- uitgenodigd | aanvaard | geweigerd | misschien
);
CREATE INDEX IF NOT EXISTS idx_event_attendees ON event_attendees(event_id);

-- ---------- FILES / BESTANDEN ----------
CREATE TABLE IF NOT EXISTS files (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  naam            TEXT NOT NULL,
  pad             TEXT NOT NULL,            -- pad in Supabase Storage bucket 'documenten' of 'bestanden'
  bucket          TEXT NOT NULL DEFAULT 'bestanden',
  mime            TEXT,
  grootte         BIGINT,
  geupload_door   TEXT REFERENCES users(id),
  gemaakt_op      TIMESTAMPTZ DEFAULT now(),
  beschrijving    TEXT,
  tags_cache      TEXT[] DEFAULT '{}'::TEXT[]
);

CREATE INDEX IF NOT EXISTS idx_files_tenant ON files(tenant_id);

-- Polymorfe koppeling: bestand kan aan contact/deal/project/offerte/factuur/task hangen
CREATE TABLE IF NOT EXISTS file_links (
  file_id         UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
  entity_type     TEXT NOT NULL,   -- contact | company | deal | project | quotation | invoice | task
  entity_id       UUID NOT NULL,
  tenant_id       TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  PRIMARY KEY (file_id, entity_type, entity_id)
);

CREATE INDEX IF NOT EXISTS idx_file_links_entity ON file_links(entity_type, entity_id);

-- ---------- TRIGGERS ----------
DROP TRIGGER IF EXISTS projects_updated_at ON projects;
CREATE TRIGGER projects_updated_at BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS tasks_updated_at ON tasks;
CREATE TRIGGER tasks_updated_at BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS time_entries_updated_at ON time_entries;
CREATE TRIGGER time_entries_updated_at BEFORE UPDATE ON time_entries
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS events_updated_at ON calendar_events;
CREATE TRIGGER events_updated_at BEFORE UPDATE ON calendar_events
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------- RLS ----------
SELECT add_tenant_rls('projects', 'projecten');
SELECT add_tenant_rls('project_phases', 'projecten');
SELECT add_tenant_rls('project_members', 'projecten');
SELECT add_tenant_rls('tasks', 'taken');
SELECT add_tenant_rls('task_comments', 'taken');
SELECT add_tenant_rls('time_entries', 'uren');
SELECT add_tenant_rls('calendar_accounts', 'agenda');
SELECT add_tenant_rls('calendar_events', 'agenda');
SELECT add_tenant_rls('event_attendees', 'agenda');
SELECT add_tenant_rls('files', 'bestanden');
SELECT add_tenant_rls('file_links', 'bestanden');

-- =========================================================================
-- 0003 — Multi-tenant foundation (Kadans fase 1)
--
-- Deze migratie:
--   1. Creëert core tenancy tabellen (tenants, tenant_members, roles,
--      role_permissions, user_roles)
--   2. Voegt `tenant_id TEXT NOT NULL` toe aan elke bestaande business-tabel
--   3. Backfillt bestaande Enervia data naar een default tenant 'org_enervia'
--   4. Herschrijft RLS policies: users zien enkel rijen van hun tenant
--
-- Na deze migratie moet de app via de nieuwe lib/tenancy/ helpers altijd
-- een tenant_id in context hebben.
--
-- Clerk Organizations zijn de bron van waarheid: organization.id (bv.
-- "org_xxx") = tenants.id.
-- =========================================================================

-- ---------- 1. TENANTS ----------
CREATE TABLE IF NOT EXISTS tenants (
  id              TEXT PRIMARY KEY,                  -- Clerk organization.id
  slug            TEXT UNIQUE NOT NULL,              -- "enervia", "kadans-demo"
  naam            TEXT NOT NULL,
  logo_url        TEXT,
  plan            TEXT NOT NULL DEFAULT 'beta',      -- beta | starter | business
  locale          TEXT NOT NULL DEFAULT 'nl-BE',
  branding        JSONB NOT NULL DEFAULT '{}'::jsonb, -- primary_color, font, etc
  features        JSONB NOT NULL DEFAULT '{}'::jsonb, -- { simulator: true, peppol: true }
  peppol_identifier TEXT,                              -- BE0123456789
  btw_nummer      TEXT,
  adres           TEXT,
  postcode        TEXT,
  gemeente        TEXT,
  land            TEXT DEFAULT 'BE',
  email_contact   TEXT,
  telefoon        TEXT,
  retention_dossiers_dagen INT DEFAULT 90,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tenants_slug ON tenants(slug);

-- Default Enervia tenant voor backfill bestaande data.
-- id wordt later overschreven door Clerk-org-sync (op te zetten in app).
INSERT INTO tenants (id, slug, naam, plan, features)
VALUES (
  'org_enervia_default',
  'enervia',
  'Enervia BV',
  'beta',
  '{"simulator": true, "peppol": true, "migratie_teamleader": true}'::jsonb
)
ON CONFLICT (id) DO NOTHING;

-- ---------- 2. TENANT_MEMBERS ----------
CREATE TABLE IF NOT EXISTS tenant_members (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rol_code    TEXT NOT NULL DEFAULT 'user',         -- verwijst naar roles.code
  is_owner    BOOLEAN DEFAULT false,
  uitgenodigd_op TIMESTAMPTZ,
  toegevoegd_op  TIMESTAMPTZ DEFAULT now(),
  laatst_actief  TIMESTAMPTZ,
  UNIQUE(tenant_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_tenant_members_tenant ON tenant_members(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_members_user   ON tenant_members(user_id);

-- Bestaande Enervia users als members toevoegen
INSERT INTO tenant_members (tenant_id, user_id, rol_code, is_owner)
SELECT 'org_enervia_default', id,
       CASE WHEN rol = 'admin' THEN 'owner' ELSE 'user' END,
       rol = 'admin'
FROM users
ON CONFLICT (tenant_id, user_id) DO NOTHING;

-- ---------- 3. ROLES + PERMISSIONS ----------
CREATE TABLE IF NOT EXISTS roles (
  code        TEXT PRIMARY KEY,        -- owner | admin | manager | user | guest
  naam        TEXT NOT NULL,
  beschrijving TEXT,
  is_systeem  BOOLEAN DEFAULT true,    -- systeemrol kan niet verwijderd worden
  created_at  TIMESTAMPTZ DEFAULT now()
);

INSERT INTO roles (code, naam, beschrijving, is_systeem) VALUES
  ('owner',   'Eigenaar',  'Volledige rechten, incl. workspace verwijderen', true),
  ('admin',   'Admin',     'Volledige rechten binnen de workspace',          true),
  ('manager', 'Manager',   'Kan teams en pipelines beheren, maar geen workspace-instellingen', true),
  ('user',    'Gebruiker', 'Standaard verkoper/medewerker',                  true),
  ('guest',   'Gast',      'Alleen-lezen of beperkte toegang',               true)
ON CONFLICT (code) DO NOTHING;

CREATE TABLE IF NOT EXISTS role_permissions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rol_code    TEXT NOT NULL REFERENCES roles(code) ON DELETE CASCADE,
  module      TEXT NOT NULL,   -- contacten | deals | offertes | facturen | projecten | uren | ...
  actie       TEXT NOT NULL,   -- view | create | update | delete | export | admin
  scope       TEXT DEFAULT 'tenant', -- tenant | own  (own = enkel eigen records)
  UNIQUE(rol_code, module, actie, scope)
);

-- Seed de default permissies voor de systeemrollen.
-- owner + admin krijgen alles, manager krijgt meeste, user krijgt eigen+tenant-lezen, guest enkel lezen.
DO $$
DECLARE
  modules TEXT[] := ARRAY[
    'contacten','companies','deals','offertes','facturen','producten',
    'projecten','uren','agenda','taken','bestanden','inbox','rapporten',
    'renovatie','instellingen','workspace','gebruikers','integraties'
  ];
  m TEXT;
BEGIN
  FOREACH m IN ARRAY modules LOOP
    -- owner en admin: alles
    INSERT INTO role_permissions (rol_code, module, actie, scope) VALUES
      ('owner', m, 'view',   'tenant'),
      ('owner', m, 'create', 'tenant'),
      ('owner', m, 'update', 'tenant'),
      ('owner', m, 'delete', 'tenant'),
      ('owner', m, 'admin',  'tenant'),
      ('admin', m, 'view',   'tenant'),
      ('admin', m, 'create', 'tenant'),
      ('admin', m, 'update', 'tenant'),
      ('admin', m, 'delete', 'tenant')
    ON CONFLICT DO NOTHING;

    -- manager: alles behalve workspace/gebruikers-admin
    IF m NOT IN ('workspace','gebruikers','integraties') THEN
      INSERT INTO role_permissions (rol_code, module, actie, scope) VALUES
        ('manager', m, 'view',   'tenant'),
        ('manager', m, 'create', 'tenant'),
        ('manager', m, 'update', 'tenant'),
        ('manager', m, 'delete', 'tenant')
      ON CONFLICT DO NOTHING;
    ELSE
      INSERT INTO role_permissions (rol_code, module, actie, scope) VALUES
        ('manager', m, 'view', 'tenant')
      ON CONFLICT DO NOTHING;
    END IF;

    -- user: eigen records volledig, andere records lezen
    IF m IN ('workspace','gebruikers','integraties','rapporten') THEN
      INSERT INTO role_permissions (rol_code, module, actie, scope) VALUES
        ('user', m, 'view', 'tenant')
      ON CONFLICT DO NOTHING;
    ELSE
      INSERT INTO role_permissions (rol_code, module, actie, scope) VALUES
        ('user', m, 'view',   'tenant'),
        ('user', m, 'create', 'tenant'),
        ('user', m, 'update', 'own'),
        ('user', m, 'delete', 'own')
      ON CONFLICT DO NOTHING;
    END IF;

    -- guest: enkel lezen
    INSERT INTO role_permissions (rol_code, module, actie, scope) VALUES
      ('guest', m, 'view', 'tenant')
    ON CONFLICT DO NOTHING;
  END LOOP;
END $$;

-- ---------- 4. HELPER FUNCTIES ----------
CREATE OR REPLACE FUNCTION current_tenant_id() RETURNS TEXT
LANGUAGE SQL STABLE AS $$
  SELECT COALESCE(
    current_setting('request.jwt.claim.org_id', true),
    (auth.jwt() ->> 'org_id')
  )
$$;

CREATE OR REPLACE FUNCTION current_user_id() RETURNS TEXT
LANGUAGE SQL STABLE AS $$
  SELECT COALESCE(
    current_setting('request.jwt.claim.sub', true),
    (auth.jwt() ->> 'sub')
  )
$$;

-- Check of huidige user lid is van gegeven tenant met rol uit lijst
CREATE OR REPLACE FUNCTION tenant_member_has_role(t_id TEXT, roles TEXT[]) RETURNS BOOLEAN
LANGUAGE SQL STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM tenant_members
    WHERE tenant_id = t_id
      AND user_id = current_user_id()
      AND rol_code = ANY(roles)
  )
$$;

-- Check of huidige user binnen de huidige tenant een actie mag op module
CREATE OR REPLACE FUNCTION can_do(mod TEXT, act TEXT) RETURNS BOOLEAN
LANGUAGE SQL STABLE AS $$
  SELECT EXISTS (
    SELECT 1
    FROM tenant_members tm
    JOIN role_permissions rp ON rp.rol_code = tm.rol_code
    WHERE tm.tenant_id = current_tenant_id()
      AND tm.user_id = current_user_id()
      AND rp.module = mod
      AND rp.actie  = act
  )
$$;

-- ---------- 5. TENANT_ID OP BESTAANDE TABELLEN ----------
-- Strategie: kolom toevoegen nullable → backfill → NOT NULL zetten → FK + index
DO $$
DECLARE
  tbls TEXT[] := ARRAY[
    'klanten','dossiers','offerte_extracties','klant_parameters',
    'premie_simulaties','lening_simulaties','besparing_simulaties',
    'gegenereerde_pdfs','audit_log','settings'
  ];
  t TEXT;
BEGIN
  FOREACH t IN ARRAY tbls LOOP
    EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS tenant_id TEXT', t);
    EXECUTE format('UPDATE %I SET tenant_id = ''org_enervia_default'' WHERE tenant_id IS NULL', t);
    EXECUTE format('ALTER TABLE %I ALTER COLUMN tenant_id SET NOT NULL', t);
    EXECUTE format('ALTER TABLE %I ADD CONSTRAINT %I FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE',
                   t, 'fk_'||t||'_tenant');
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON %I(tenant_id)',
                   'idx_'||t||'_tenant', t);
  END LOOP;
EXCEPTION WHEN duplicate_object THEN
  -- FK already exists, continue
  NULL;
END $$;

-- teamleader_tokens — per user, niet per tenant (OAuth is per user)
-- We voegen hier tenant_id toe als OPTIONAL kolom voor filtering in multi-tenant context
ALTER TABLE teamleader_tokens ADD COLUMN IF NOT EXISTS tenant_id TEXT;
UPDATE teamleader_tokens SET tenant_id = 'org_enervia_default' WHERE tenant_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_teamleader_tokens_tenant ON teamleader_tokens(tenant_id);

-- ---------- 6. RLS HERSCHRIJVEN ----------
-- Oude policies die enkel op user_id filterden, moeten vervangen worden door
-- tenant_id + rolcheck. Voor elke tabel:
--   SELECT: tenant_id = current_tenant_id() AND can_do(module, 'view')
--   INSERT/UPDATE/DELETE: idem + passende actie

ALTER TABLE tenants           ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_members    ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles             ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions  ENABLE ROW LEVEL SECURITY;

-- TENANTS: members kunnen eigen tenant zien, owners kunnen updaten
DROP POLICY IF EXISTS tenants_select ON tenants;
CREATE POLICY tenants_select ON tenants FOR SELECT
  USING (id = current_tenant_id() OR EXISTS (
    SELECT 1 FROM tenant_members tm
    WHERE tm.tenant_id = tenants.id AND tm.user_id = current_user_id()
  ));

DROP POLICY IF EXISTS tenants_update ON tenants;
CREATE POLICY tenants_update ON tenants FOR UPDATE
  USING (tenant_member_has_role(id, ARRAY['owner','admin']));

-- TENANT_MEMBERS: eigen tenant-members zichtbaar, owners/admins kunnen beheren
DROP POLICY IF EXISTS members_select ON tenant_members;
CREATE POLICY members_select ON tenant_members FOR SELECT
  USING (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS members_manage ON tenant_members;
CREATE POLICY members_manage ON tenant_members FOR ALL
  USING (tenant_member_has_role(tenant_id, ARRAY['owner','admin']))
  WITH CHECK (tenant_member_has_role(tenant_id, ARRAY['owner','admin']));

-- ROLES + PERMISSIONS zijn globaal leesbaar voor ingelogde users (seed-data)
DROP POLICY IF EXISTS roles_read ON roles;
CREATE POLICY roles_read ON roles FOR SELECT USING (true);

DROP POLICY IF EXISTS perms_read ON role_permissions;
CREATE POLICY perms_read ON role_permissions FOR SELECT USING (true);

-- Hulpprocedure om tenant-scoped RLS toe te voegen aan een tabel
CREATE OR REPLACE FUNCTION add_tenant_rls(tbl TEXT, mod TEXT)
RETURNS VOID LANGUAGE PLPGSQL AS $$
BEGIN
  EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
  EXECUTE format('DROP POLICY IF EXISTS tenant_select ON %I', tbl);
  EXECUTE format('CREATE POLICY tenant_select ON %I FOR SELECT USING (tenant_id = current_tenant_id() AND can_do(%L, %L))',
                 tbl, mod, 'view');
  EXECUTE format('DROP POLICY IF EXISTS tenant_insert ON %I', tbl);
  EXECUTE format('CREATE POLICY tenant_insert ON %I FOR INSERT WITH CHECK (tenant_id = current_tenant_id() AND can_do(%L, %L))',
                 tbl, mod, 'create');
  EXECUTE format('DROP POLICY IF EXISTS tenant_update ON %I', tbl);
  EXECUTE format('CREATE POLICY tenant_update ON %I FOR UPDATE USING (tenant_id = current_tenant_id() AND can_do(%L, %L))',
                 tbl, mod, 'update');
  EXECUTE format('DROP POLICY IF EXISTS tenant_delete ON %I', tbl);
  EXECUTE format('CREATE POLICY tenant_delete ON %I FOR DELETE USING (tenant_id = current_tenant_id() AND can_do(%L, %L))',
                 tbl, mod, 'delete');
END $$;

-- Pas toe op bestaande tabellen
SELECT add_tenant_rls('klanten', 'contacten');
SELECT add_tenant_rls('dossiers', 'renovatie');
SELECT add_tenant_rls('offerte_extracties', 'renovatie');
SELECT add_tenant_rls('klant_parameters', 'renovatie');
SELECT add_tenant_rls('premie_simulaties', 'renovatie');
SELECT add_tenant_rls('lening_simulaties', 'renovatie');
SELECT add_tenant_rls('besparing_simulaties', 'renovatie');
SELECT add_tenant_rls('gegenereerde_pdfs', 'renovatie');
SELECT add_tenant_rls('audit_log', 'workspace');

-- settings is singleton per tenant
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS settings_select ON settings;
CREATE POLICY settings_select ON settings FOR SELECT
  USING (tenant_id = current_tenant_id());
DROP POLICY IF EXISTS settings_modify ON settings;
CREATE POLICY settings_modify ON settings FOR ALL
  USING (tenant_id = current_tenant_id() AND tenant_member_has_role(tenant_id, ARRAY['owner','admin']))
  WITH CHECK (tenant_id = current_tenant_id());

-- ---------- 7. UPDATE_AT TRIGGER VOOR tenants ----------
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER
LANGUAGE PLPGSQL AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS tenants_updated_at ON tenants;
CREATE TRIGGER tenants_updated_at BEFORE UPDATE ON tenants
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE tenants IS 'Multi-tenant workspaces (Kadans). id = Clerk organization.id';
COMMENT ON TABLE tenant_members IS 'Membership tussen user en tenant met rol';
COMMENT ON TABLE roles IS 'Systeemrollen: owner, admin, manager, user, guest';
COMMENT ON TABLE role_permissions IS 'RBAC — welke rol mag welke actie op welke module';

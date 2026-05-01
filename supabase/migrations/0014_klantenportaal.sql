-- =========================================================================
-- 0014 — Klantenportaal (portaal.enervia.be)
--
-- Magic-link auth: klant geeft email → krijgt link met token → 30 dagen sessie.
-- Geen wachtwoorden. Token-tabellen los van clerk-auth (klanten hebben geen
-- workspace).
-- =========================================================================

CREATE TABLE IF NOT EXISTS klantportaal_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  contact_id      UUID REFERENCES contacts(id) ON DELETE CASCADE,
  company_id      UUID REFERENCES companies(id) ON DELETE CASCADE,
  email           TEXT NOT NULL,
  -- Magic-link token (eenmalig gebruikt om sessie aan te maken)
  magic_token     TEXT UNIQUE,
  magic_expires_at TIMESTAMPTZ,
  magic_used_at   TIMESTAMPTZ,
  -- Sessie-token (cookie/localStorage na succesvolle magic-link)
  session_token   TEXT UNIQUE,
  session_expires_at TIMESTAMPTZ,
  -- Metadata
  ip_address      TEXT,
  user_agent      TEXT,
  laatst_actief_op TIMESTAMPTZ DEFAULT now(),
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_kps_email ON klantportaal_sessions(email);
CREATE INDEX IF NOT EXISTS idx_kps_magic ON klantportaal_sessions(magic_token);
CREATE INDEX IF NOT EXISTS idx_kps_session ON klantportaal_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_kps_contact ON klantportaal_sessions(contact_id);

-- Documenten die de klant uploadt (EPC, identiteitskaart, foto woning, ...)
CREATE TABLE IF NOT EXISTS klantportaal_uploads (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  contact_id      UUID REFERENCES contacts(id) ON DELETE CASCADE,
  company_id      UUID REFERENCES companies(id) ON DELETE CASCADE,
  deal_id         UUID REFERENCES deals(id) ON DELETE SET NULL,
  project_id      UUID REFERENCES projects(id) ON DELETE SET NULL,
  type            TEXT NOT NULL,            -- epc | identiteit | foto_woning | overig
  bestandsnaam    TEXT NOT NULL,
  storage_pad     TEXT NOT NULL,
  grootte_bytes   BIGINT,
  mime_type       TEXT,
  beschrijving    TEXT,
  status          TEXT DEFAULT 'in_review', -- in_review | goedgekeurd | afgekeurd
  beoordeeld_door TEXT REFERENCES users(id),
  beoordeeld_op   TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_kpu_contact ON klantportaal_uploads(contact_id);
CREATE INDEX IF NOT EXISTS idx_kpu_deal ON klantportaal_uploads(deal_id);

-- Berichten tussen klant ↔ Enervia (chat)
CREATE TABLE IF NOT EXISTS klantportaal_berichten (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  contact_id      UUID REFERENCES contacts(id) ON DELETE CASCADE,
  deal_id         UUID REFERENCES deals(id) ON DELETE SET NULL,
  project_id      UUID REFERENCES projects(id) ON DELETE SET NULL,
  van             TEXT NOT NULL,            -- 'klant' | 'enervia'
  van_user_id     TEXT REFERENCES users(id),
  inhoud          TEXT NOT NULL,
  gelezen_door_klant_op TIMESTAMPTZ,
  gelezen_door_enervia_op TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_kpb_contact ON klantportaal_berichten(contact_id, created_at DESC);

-- Werfvoortgang foto's (door verkoper/installateur geüpload, klant kan zien)
CREATE TABLE IF NOT EXISTS werfvoortgang_fotos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  fase            TEXT,                     -- 'aankomst' | 'tijdens' | 'oplevering'
  foto_pad        TEXT NOT NULL,
  bijschrift      TEXT,
  geupload_door   TEXT REFERENCES users(id),
  zichtbaar_voor_klant BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wf_project ON werfvoortgang_fotos(project_id, created_at DESC);

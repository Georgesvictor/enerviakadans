-- =========================================================================
-- 0008 — Email inbox, banking (Ponto), Peppol, audit uitbreiding
-- =========================================================================

-- ---------- EMAIL INBOX ----------
CREATE TABLE IF NOT EXISTS email_accounts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider        TEXT NOT NULL,        -- gmail | microsoft | imap
  email           TEXT NOT NULL,
  display_naam    TEXT,
  access_token    TEXT,
  refresh_token   TEXT,
  token_expires_at TIMESTAMPTZ,
  imap_host       TEXT,
  imap_port       INT,
  imap_password_enc TEXT,                -- versleuteld
  smtp_host       TEXT,
  smtp_port       INT,
  laatst_gesynct  TIMESTAMPTZ,
  is_actief       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, email)
);

CREATE INDEX IF NOT EXISTS idx_email_accounts_user ON email_accounts(user_id);

CREATE TABLE IF NOT EXISTS email_threads (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  account_id      UUID NOT NULL REFERENCES email_accounts(id) ON DELETE CASCADE,
  externe_thread_id TEXT,
  onderwerp       TEXT,
  deelnemers      TEXT[] DEFAULT '{}'::TEXT[],
  laatst_bericht_op TIMESTAMPTZ,
  aantal_berichten INT DEFAULT 0,
  ongelezen       BOOLEAN DEFAULT true,
  gearchiveerd    BOOLEAN DEFAULT false,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ethreads_tenant ON email_threads(tenant_id, laatst_bericht_op DESC);
CREATE INDEX IF NOT EXISTS idx_ethreads_account ON email_threads(account_id);

CREATE TABLE IF NOT EXISTS email_messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  thread_id       UUID NOT NULL REFERENCES email_threads(id) ON DELETE CASCADE,
  externe_message_id TEXT,
  "van"           TEXT,
  "aan"           TEXT[],
  cc              TEXT[],
  bcc             TEXT[],
  onderwerp       TEXT,
  inhoud_tekst    TEXT,
  inhoud_html     TEXT,
  verzonden_op    TIMESTAMPTZ,
  is_uitgaand     BOOLEAN DEFAULT false,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_emsgs_thread ON email_messages(thread_id, verzonden_op);

CREATE TABLE IF NOT EXISTS email_attachments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  message_id      UUID NOT NULL REFERENCES email_messages(id) ON DELETE CASCADE,
  naam            TEXT,
  mime            TEXT,
  grootte         BIGINT,
  pad             TEXT
);

CREATE TABLE IF NOT EXISTS email_links (
  tenant_id       TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  thread_id       UUID NOT NULL REFERENCES email_threads(id) ON DELETE CASCADE,
  entity_type     TEXT NOT NULL, -- contact | deal | invoice | project
  entity_id       UUID NOT NULL,
  gekoppeld_door  TEXT REFERENCES users(id),
  gekoppeld_op    TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (thread_id, entity_type, entity_id)
);

CREATE INDEX IF NOT EXISTS idx_email_links_entity ON email_links(entity_type, entity_id);

-- ---------- BANKING (Ponto PSD2) ----------
CREATE TABLE IF NOT EXISTS banking_accounts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  iban            TEXT NOT NULL,
  bic             TEXT,
  bank_naam       TEXT,
  rekeninghouder  TEXT,
  munt            TEXT DEFAULT 'EUR',
  saldo           NUMERIC(14,2),
  saldo_datum     TIMESTAMPTZ,
  ponto_account_id TEXT,      -- externe ID bij Ponto
  ponto_resource_id TEXT,
  sync_actief     BOOLEAN DEFAULT true,
  laatst_gesynct  TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, iban)
);

CREATE INDEX IF NOT EXISTS idx_bank_accounts_tenant ON banking_accounts(tenant_id);

CREATE TABLE IF NOT EXISTS banking_transactions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  account_id      UUID NOT NULL REFERENCES banking_accounts(id) ON DELETE CASCADE,
  externe_id      TEXT,
  datum           DATE NOT NULL,
  waarde_datum    DATE,
  bedrag          NUMERIC(14,2) NOT NULL,  -- + = credit, - = debit
  munt            TEXT DEFAULT 'EUR',
  tegenpartij_naam TEXT,
  tegenpartij_iban TEXT,
  mededeling      TEXT,
  gestructureerde_mededeling TEXT,
  boekingsdatum   TIMESTAMPTZ,
  geimporteerd_op TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bank_trans_account ON banking_transactions(account_id, datum DESC);
CREATE INDEX IF NOT EXISTS idx_bank_trans_externe ON banking_transactions(externe_id) WHERE externe_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bank_trans_struc ON banking_transactions(gestructureerde_mededeling) WHERE gestructureerde_mededeling IS NOT NULL;

CREATE TABLE IF NOT EXISTS transaction_matches (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  transaction_id  UUID NOT NULL REFERENCES banking_transactions(id) ON DELETE CASCADE,
  invoice_id      UUID REFERENCES invoices(id) ON DELETE SET NULL,
  bedrag_gematcht NUMERIC(14,2) NOT NULL,
  match_type      TEXT NOT NULL, -- auto_mededeling | auto_bedrag_datum | handmatig
  vertrouwen      INT,           -- 0-100
  gematcht_door   TEXT REFERENCES users(id),
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tmatches_transaction ON transaction_matches(transaction_id);
CREATE INDEX IF NOT EXISTS idx_tmatches_invoice ON transaction_matches(invoice_id);

-- ---------- PEPPOL SUBMISSIONS ----------
CREATE TABLE IF NOT EXISTS peppol_submissions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  invoice_id      UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  provider        TEXT NOT NULL DEFAULT 'billit',  -- billit | codabox | ...
  externe_id      TEXT,                              -- Billit order ID
  status          TEXT NOT NULL DEFAULT 'in_voorbereiding',
                                                     -- in_voorbereiding | ingediend | verzonden | ontvangen | fout | afgewezen
  peppol_ontvangen_op TIMESTAMPTZ,
  foutmelding     TEXT,
  aantal_pogingen INT DEFAULT 0,
  laatste_poging  TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_peppol_invoice ON peppol_submissions(invoice_id);
CREATE INDEX IF NOT EXISTS idx_peppol_status ON peppol_submissions(tenant_id, status);

-- ---------- REPORTS (saved views) ----------
CREATE TABLE IF NOT EXISTS saved_views (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id         TEXT REFERENCES users(id) ON DELETE CASCADE, -- null = shared met tenant
  naam            TEXT NOT NULL,
  entity          TEXT NOT NULL, -- contacten | deals | offertes | facturen | projecten
  filters         JSONB NOT NULL,
  kolommen        JSONB,
  sortering       JSONB,
  is_default      BOOLEAN DEFAULT false,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_views_tenant_entity ON saved_views(tenant_id, entity);

-- ---------- GDPR ----------
CREATE TABLE IF NOT EXISTS data_subject_requests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  type            TEXT NOT NULL,   -- export | delete | rectify
  contact_id      UUID REFERENCES contacts(id) ON DELETE SET NULL,
  aangevraagd_op  TIMESTAMPTZ DEFAULT now(),
  aangevraagd_door TEXT REFERENCES users(id),
  voltooid_op     TIMESTAMPTZ,
  resultaat_url   TEXT,
  opmerkingen     TEXT
);

CREATE INDEX IF NOT EXISTS idx_gdpr_tenant ON data_subject_requests(tenant_id);

CREATE TABLE IF NOT EXISTS retention_policies (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  entity          TEXT NOT NULL, -- dossiers | facturen | email | bestanden
  retentie_dagen  INT NOT NULL,
  actief          BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, entity)
);

CREATE TABLE IF NOT EXISTS consent_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  contact_id      UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  doel            TEXT NOT NULL, -- marketing | nieuwsbrief | profiling
  actie           TEXT NOT NULL, -- opt_in | opt_out
  bron            TEXT,
  ip_adres        TEXT,
  gelogd_op       TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_consent_contact ON consent_log(contact_id);

-- ---------- TRIGGERS ----------
DROP TRIGGER IF EXISTS peppol_updated_at ON peppol_submissions;
CREATE TRIGGER peppol_updated_at BEFORE UPDATE ON peppol_submissions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------- RLS ----------
SELECT add_tenant_rls('email_accounts', 'inbox');
SELECT add_tenant_rls('email_threads', 'inbox');
SELECT add_tenant_rls('email_messages', 'inbox');
SELECT add_tenant_rls('email_attachments', 'inbox');
SELECT add_tenant_rls('email_links', 'inbox');
SELECT add_tenant_rls('banking_accounts', 'instellingen');
SELECT add_tenant_rls('banking_transactions', 'facturen');
SELECT add_tenant_rls('transaction_matches', 'facturen');
SELECT add_tenant_rls('peppol_submissions', 'facturen');
SELECT add_tenant_rls('saved_views', 'rapporten');
SELECT add_tenant_rls('data_subject_requests', 'instellingen');
SELECT add_tenant_rls('retention_policies', 'instellingen');
SELECT add_tenant_rls('consent_log', 'contacten');

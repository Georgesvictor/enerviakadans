-- Enervia Simulatie Portal — Initial schema (2026-04)
-- Sectie C van de projectblueprint.
--
-- Run dit bestand in Supabase SQL editor na aanmaken project.
-- Zet na uitvoer storage bucket 'offertes' + 'dossiers' handmatig aan
-- met RLS conform `supabase/storage-policies.sql`.

create extension if not exists "pgcrypto";

-- 1. USERS ------------------------------------------------------------
create table if not exists public.users (
  id uuid primary key,                    -- Clerk user id (string uuid)
  email text unique not null,
  rol text not null default 'verkoper' check (rol in ('verkoper', 'admin')),
  teamleader_user_id text,
  created_at timestamptz not null default now()
);

-- 2. KLANTEN ----------------------------------------------------------
create table if not exists public.klanten (
  id uuid primary key default gen_random_uuid(),
  teamleader_contact_id text,
  voornaam text not null,
  achternaam text not null,
  email text,
  telefoon text,
  adres text,
  postcode text,
  gemeente text,
  geboortedatum date,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists klanten_created_by_idx on public.klanten(created_by);

-- 3. DOSSIERS ---------------------------------------------------------
create table if not exists public.dossiers (
  id uuid primary key default gen_random_uuid(),
  klant_id uuid references public.klanten(id) on delete cascade,
  verkoper_id uuid references public.users(id) on delete set null,
  teamleader_quotation_id text,
  offerte_pdf_url text,
  offerte_referentie text,
  offerte_datum date,
  klant_token uuid unique default gen_random_uuid(),
  klant_token_expires_at timestamptz,
  status text not null default 'draft' check (status in ('draft', 'extracted', 'compleet', 'gedeeld')),
  auto_verwijder_op timestamptz not null default (now() + interval '90 days'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists dossiers_verkoper_idx on public.dossiers(verkoper_id);
create index if not exists dossiers_klant_token_idx on public.dossiers(klant_token);
create index if not exists dossiers_auto_verwijder_idx on public.dossiers(auto_verwijder_op);
create index if not exists dossiers_created_idx on public.dossiers(created_at desc);

-- 4. OFFERTE_EXTRACTIES -----------------------------------------------
create table if not exists public.offerte_extracties (
  id uuid primary key default gen_random_uuid(),
  dossier_id uuid references public.dossiers(id) on delete cascade,
  raw_pdf_text text,
  gestructureerde_data jsonb not null default '{}'::jsonb,
  extractie_model text not null default 'claude-sonnet-4-5',
  validatie_score numeric(3,2),
  validatie_opmerkingen text,
  goedgekeurd_door_verkoper boolean not null default false,
  manuele_correcties jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists extracties_dossier_idx on public.offerte_extracties(dossier_id);

-- 5. KLANT_PARAMETERS -------------------------------------------------
create table if not exists public.klant_parameters (
  id uuid primary key default gen_random_uuid(),
  dossier_id uuid unique references public.dossiers(id) on delete cascade,
  inkomenscategorie smallint not null check (inkomenscategorie in (1, 2, 3)),
  gezamenlijk_inkomen numeric(10,2) not null,
  burgerlijke_staat text not null check (burgerlijke_staat in ('alleenstaand', 'koppel')),
  personen_ten_laste smallint not null default 0,
  epc_label_voor text check (epc_label_voor in ('A', 'B', 'C', 'D', 'E', 'F')),
  epc_label_verwacht text check (epc_label_verwacht in ('A', 'B', 'C')),
  woning_ouderdom text check (woning_ouderdom in ('voor_2006', 'na_2006_min_5j')),
  is_eigenaar boolean not null default true,
  andere_woning_eigendom boolean not null default false,
  is_gedomicilieerd boolean not null default true,
  heeft_ventilatie boolean not null default false,
  jaarverbruik_gas_kwh numeric(10,2) default 0,
  jaarverbruik_elektriciteit_kwh numeric(10,2) default 0,
  jaarverbruik_stookolie_liter numeric(10,2) default 0,
  huidig_verwarmingstype text check (huidig_verwarmingstype in ('gas', 'stookolie', 'elektrisch', 'hout')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 6. PREMIE_SIMULATIES ------------------------------------------------
create table if not exists public.premie_simulaties (
  id uuid primary key default gen_random_uuid(),
  dossier_id uuid references public.dossiers(id) on delete cascade,
  premies_jsonb jsonb not null default '{}'::jsonb,
  totaal_premies numeric(10,2) not null default 0,
  berekend_op timestamptz not null default now(),
  veka_verificatie_status text default 'niet_uitgevoerd'
    check (veka_verificatie_status in ('niet_uitgevoerd', 'in_uitvoering', 'match', 'verschil', 'fout')),
  veka_verschil_notitie text,
  veka_resultaat jsonb,
  created_at timestamptz not null default now()
);
create index if not exists premies_dossier_idx on public.premie_simulaties(dossier_id);

-- 7. LENING_SIMULATIES ------------------------------------------------
create table if not exists public.lening_simulaties (
  id uuid primary key default gen_random_uuid(),
  dossier_id uuid references public.dossiers(id) on delete cascade,
  type_lening text not null check (type_lening in ('mijnverbouwlening', 'commercieel')),
  geschikt_voor_mijnverbouwlening boolean not null,
  geweigerd_reden text,
  rentevoet numeric(5,4) not null,
  looptijd_jaar smallint not null,
  leenbedrag numeric(10,2) not null,
  maandelijkse_afbetaling numeric(10,2) not null,
  totale_interestkost numeric(10,2) not null,
  eigen_inbreng numeric(10,2) not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists lening_dossier_idx on public.lening_simulaties(dossier_id);

-- 8. BESPARING_SIMULATIES ---------------------------------------------
create table if not exists public.besparing_simulaties (
  id uuid primary key default gen_random_uuid(),
  dossier_id uuid references public.dossiers(id) on delete cascade,
  jaarlijkse_besparing_warmtepomp numeric(10,2) not null default 0,
  jaarlijkse_besparing_pv numeric(10,2) not null default 0,
  jaarlijkse_besparing_batterij numeric(10,2) not null default 0,
  totale_jaarlijkse_besparing numeric(10,2) not null default 0,
  terugverdientijd_jaar numeric(5,2),
  projectie_10j_jsonb jsonb not null default '[]'::jsonb,
  gebruikte_energieprijzen_jsonb jsonb not null default '{}'::jsonb,
  jaarlijkse_prijsstijging numeric(4,3) not null default 0.03,
  created_at timestamptz not null default now()
);
create index if not exists besparing_dossier_idx on public.besparing_simulaties(dossier_id);

-- 9. ENERGIEPRIJZEN ---------------------------------------------------
create table if not exists public.energieprijzen (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('elektriciteit', 'gas', 'stookolie', 'teruglevering')),
  prijs_per_eenheid numeric(10,5) not null,
  eenheid text not null default 'kwh',
  bron text not null check (bron in ('VREG', 'CREG', 'manueel')),
  geldig_vanaf date not null default current_date,
  created_at timestamptz not null default now()
);
create index if not exists energieprijzen_type_idx on public.energieprijzen(type, geldig_vanaf desc);

-- 10. GEGENEREERDE_PDFS -----------------------------------------------
create table if not exists public.gegenereerde_pdfs (
  id uuid primary key default gen_random_uuid(),
  dossier_id uuid references public.dossiers(id) on delete cascade,
  type text not null check (type in ('bank', 'klant')),
  pdf_url text not null,
  gegenereerd_door uuid references public.users(id) on delete set null,
  parameters_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists pdfs_dossier_idx on public.gegenereerde_pdfs(dossier_id);

-- 11. AUDIT_LOG -------------------------------------------------------
create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  dossier_id uuid references public.dossiers(id) on delete set null,
  user_id uuid references public.users(id) on delete set null,
  actie text not null,
  metadata jsonb default '{}'::jsonb,
  ip_address text,
  created_at timestamptz not null default now()
);
create index if not exists audit_dossier_idx on public.audit_log(dossier_id);
create index if not exists audit_user_idx on public.audit_log(user_id);
create index if not exists audit_created_idx on public.audit_log(created_at desc);

-- 12. TEAMLEADER_TOKENS -----------------------------------------------
create table if not exists public.teamleader_tokens (
  user_id uuid primary key references public.users(id) on delete cascade,
  access_token text not null,
  refresh_token text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 13. SETTINGS (singleton voor admin-instellingen) --------------------
create table if not exists public.settings (
  id int primary key default 1 check (id = 1),
  inkomensdrempels jsonb not null default '{
    "alleenstaand": {"cat1": 27440, "cat2": 45550},
    "koppel": {"cat1": 38170, "cat2": 65080},
    "verhoging_per_persoon_ten_laste": 4290
  }'::jsonb,
  commerciele_rente numeric(4,3) not null default 0.035,
  wp_cop_default numeric(3,2) not null default 3.20,
  jaarlijkse_prijsstijging numeric(4,3) not null default 0.03,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.users(id) on delete set null
);
insert into public.settings (id) values (1) on conflict (id) do nothing;

-- TRIGGERS voor updated_at ---------------------------------------------
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

do $$
declare t text;
begin
  for t in
    select unnest(array['klanten', 'dossiers', 'klant_parameters', 'teamleader_tokens', 'settings'])
  loop
    execute format('drop trigger if exists %I_set_updated_at on public.%I', t, t);
    execute format('create trigger %I_set_updated_at before update on public.%I for each row execute function public.set_updated_at()', t, t);
  end loop;
end $$;

-- RLS ------------------------------------------------------------------
alter table public.users enable row level security;
alter table public.klanten enable row level security;
alter table public.dossiers enable row level security;
alter table public.offerte_extracties enable row level security;
alter table public.klant_parameters enable row level security;
alter table public.premie_simulaties enable row level security;
alter table public.lening_simulaties enable row level security;
alter table public.besparing_simulaties enable row level security;
alter table public.energieprijzen enable row level security;
alter table public.gegenereerde_pdfs enable row level security;
alter table public.audit_log enable row level security;
alter table public.teamleader_tokens enable row level security;
alter table public.settings enable row level security;

-- Helper: is admin?
create or replace function public.is_admin() returns boolean
  language sql stable as $$
    select exists (
      select 1 from public.users
      where id = auth.jwt() ->> 'sub'::uuid
        and rol = 'admin'
    );
  $$;

-- RLS policies - users zien hun eigen rij (via Clerk user id als auth.jwt.sub)
drop policy if exists users_self on public.users;
create policy users_self on public.users for all
  using (id::text = coalesce(auth.jwt() ->> 'sub', ''))
  with check (id::text = coalesce(auth.jwt() ->> 'sub', ''));

-- Klanten: eigen + admin
drop policy if exists klanten_own on public.klanten;
create policy klanten_own on public.klanten for all
  using (
    created_by::text = coalesce(auth.jwt() ->> 'sub', '')
    or public.is_admin()
  )
  with check (
    created_by::text = coalesce(auth.jwt() ->> 'sub', '')
    or public.is_admin()
  );

-- Dossiers: eigen + admin
drop policy if exists dossiers_own on public.dossiers;
create policy dossiers_own on public.dossiers for all
  using (
    verkoper_id::text = coalesce(auth.jwt() ->> 'sub', '')
    or public.is_admin()
  )
  with check (
    verkoper_id::text = coalesce(auth.jwt() ->> 'sub', '')
    or public.is_admin()
  );

-- Alle sub-entiteiten van dossier: via join
create or replace function public.can_access_dossier(d_id uuid) returns boolean
  language sql stable as $$
    select exists (
      select 1 from public.dossiers
      where id = d_id
        and (
          verkoper_id::text = coalesce(auth.jwt() ->> 'sub', '')
          or public.is_admin()
        )
    );
  $$;

drop policy if exists extracties_access on public.offerte_extracties;
create policy extracties_access on public.offerte_extracties for all
  using (public.can_access_dossier(dossier_id))
  with check (public.can_access_dossier(dossier_id));

drop policy if exists params_access on public.klant_parameters;
create policy params_access on public.klant_parameters for all
  using (public.can_access_dossier(dossier_id))
  with check (public.can_access_dossier(dossier_id));

drop policy if exists premies_access on public.premie_simulaties;
create policy premies_access on public.premie_simulaties for all
  using (public.can_access_dossier(dossier_id))
  with check (public.can_access_dossier(dossier_id));

drop policy if exists lening_access on public.lening_simulaties;
create policy lening_access on public.lening_simulaties for all
  using (public.can_access_dossier(dossier_id))
  with check (public.can_access_dossier(dossier_id));

drop policy if exists besparing_access on public.besparing_simulaties;
create policy besparing_access on public.besparing_simulaties for all
  using (public.can_access_dossier(dossier_id))
  with check (public.can_access_dossier(dossier_id));

drop policy if exists pdfs_access on public.gegenereerde_pdfs;
create policy pdfs_access on public.gegenereerde_pdfs for all
  using (public.can_access_dossier(dossier_id))
  with check (public.can_access_dossier(dossier_id));

-- Audit log: iedereen mag insert, lezen enkel eigen + admin
drop policy if exists audit_insert on public.audit_log;
create policy audit_insert on public.audit_log for insert with check (true);
drop policy if exists audit_select on public.audit_log;
create policy audit_select on public.audit_log for select
  using (
    user_id::text = coalesce(auth.jwt() ->> 'sub', '')
    or public.is_admin()
  );

-- Energieprijzen: iedereen lezen, enkel admin schrijven
drop policy if exists energieprijzen_read on public.energieprijzen;
create policy energieprijzen_read on public.energieprijzen for select using (true);
drop policy if exists energieprijzen_admin on public.energieprijzen;
create policy energieprijzen_admin on public.energieprijzen for all
  using (public.is_admin()) with check (public.is_admin());

-- Settings: iedereen lezen, enkel admin schrijven
drop policy if exists settings_read on public.settings;
create policy settings_read on public.settings for select using (true);
drop policy if exists settings_admin on public.settings;
create policy settings_admin on public.settings for all
  using (public.is_admin()) with check (public.is_admin());

-- Teamleader tokens: eigen
drop policy if exists teamleader_tokens_self on public.teamleader_tokens;
create policy teamleader_tokens_self on public.teamleader_tokens for all
  using (user_id::text = coalesce(auth.jwt() ->> 'sub', ''))
  with check (user_id::text = coalesce(auth.jwt() ->> 'sub', ''));

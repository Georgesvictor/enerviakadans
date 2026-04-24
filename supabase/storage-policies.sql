-- Storage buckets + policies
-- Run dit in Supabase SQL editor NADAT je handmatig de buckets hebt aangemaakt
-- (of via Management API):
--   - 'offertes' (private)
--   - 'dossiers' (private)
--   - 'klantportal' (public=false, signed URLs via token)

insert into storage.buckets (id, name, public)
  values ('offertes', 'offertes', false)
  on conflict (id) do nothing;
insert into storage.buckets (id, name, public)
  values ('dossiers', 'dossiers', false)
  on conflict (id) do nothing;

-- Alleen eigenaar of admin kan uploaden naar offertes
drop policy if exists offertes_upload on storage.objects;
create policy offertes_upload on storage.objects
  for insert to authenticated
  with check (bucket_id = 'offertes');

drop policy if exists offertes_read on storage.objects;
create policy offertes_read on storage.objects
  for select to authenticated
  using (bucket_id = 'offertes');

drop policy if exists dossiers_read on storage.objects;
create policy dossiers_read on storage.objects
  for select to authenticated
  using (bucket_id = 'dossiers');

drop policy if exists dossiers_write on storage.objects;
create policy dossiers_write on storage.objects
  for insert to authenticated
  with check (bucket_id = 'dossiers');

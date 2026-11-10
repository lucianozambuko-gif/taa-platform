-- Photos for courses and news posts, stored in a public "site-media" bucket.
-- The first set comes from the Academy's own gallery (trainingafricaacademy.co.za/gallery).

insert into storage.buckets (id, name, public)
values ('site-media', 'site-media', true)
on conflict (id) do update set public = true;

alter table public.courses add column if not exists image_url text;
alter table public.courses add column if not exists image_alt text;
alter table public.posts   add column if not exists image_url text;
alter table public.posts   add column if not exists image_alt text;

-- Anyone can view; only content editors and admins upload or replace.
drop policy if exists "site media read" on storage.objects;
create policy "site media read" on storage.objects for select
  using (bucket_id = 'site-media');

drop policy if exists "site media write" on storage.objects;
create policy "site media write" on storage.objects for insert to authenticated
  with check (bucket_id = 'site-media' and public.has_role('content', 'admin'));

drop policy if exists "site media update" on storage.objects;
create policy "site media update" on storage.objects for update to authenticated
  using (bucket_id = 'site-media' and public.has_role('content', 'admin'));

drop policy if exists "site media delete" on storage.objects;
create policy "site media delete" on storage.objects for delete to authenticated
  using (bucket_id = 'site-media' and public.has_role('content', 'admin'));

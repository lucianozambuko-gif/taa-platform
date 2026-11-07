-- Course building (modules, lessons, files), news/resources, notifications, employer reporting, POPIA retention.

-- ---------------------------------------------------------------------------
-- Course building by content editors
-- ---------------------------------------------------------------------------
create policy "content manages modules" on public.modules for all using (public.has_role('content')) with check (public.has_role('content'));
create policy "content manages lessons" on public.lessons for all using (public.has_role('content')) with check (public.has_role('content'));
create policy "content manages lesson content" on public.lesson_content for all using (public.has_role('content')) with check (public.has_role('content'));

-- Private bucket for lesson videos and PDFs, stored as <course_id>/<file>
insert into storage.buckets (id, name, public, file_size_limit)
values ('lesson-files', 'lesson-files', false, 52428800)
on conflict (id) do nothing;

create policy "content uploads lesson files" on storage.objects for insert to authenticated
  with check (bucket_id = 'lesson-files' and public.has_role('content'));
create policy "content changes lesson files" on storage.objects for update to authenticated
  using (bucket_id = 'lesson-files' and public.has_role('content'));
create policy "content deletes lesson files" on storage.objects for delete to authenticated
  using (bucket_id = 'lesson-files' and public.has_role('content'));
create policy "enrolled learners read lesson files" on storage.objects for select to authenticated using (
  bucket_id = 'lesson-files' and (
    public.has_role('content')
    or exists (
      select 1 from public.enrolments e
      where e.user_id = auth.uid() and e.course_id::text = (storage.foldername(name))[1]
    )
    or public.teaches(((storage.foldername(name))[1])::uuid)
  )
);

-- ---------------------------------------------------------------------------
-- News, insights and resources
-- ---------------------------------------------------------------------------
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  title text not null,
  summary text,
  body text not null default '',
  category text not null default 'News',
  meta_description text,
  cta_label text,
  cta_link text,
  published boolean not null default false,
  published_at timestamptz,
  author uuid references auth.users(id),
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
alter table public.posts enable row level security;
create policy "published posts public" on public.posts for select using (published or public.has_role('content'));
create policy "content manages posts" on public.posts for all using (public.has_role('content')) with check (public.has_role('content'));

-- ---------------------------------------------------------------------------
-- Notifications: one row per message (email when a provider is configured, always in-app)
-- ---------------------------------------------------------------------------
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  audience text not null check (audience in ('learner', 'staff', 'enquirer')),
  kind text not null,
  to_email text,
  subject text not null,
  body text not null,
  link text,
  status text not null default 'queued' check (status in ('queued', 'sent', 'failed', 'in_app')),
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user on public.notifications (user_id, created_at desc);
alter table public.notifications enable row level security;
create policy "own notifications" on public.notifications for select using (user_id = auth.uid() or public.has_role('sales'));
create policy "mark own read" on public.notifications for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "staff create notifications" on public.notifications for insert
  with check (public.has_role('sales', 'content', 'facilitator'));

-- Assessment results also tell the learner
create or replace function public.record_assessment(enrolment uuid, outcome text, note text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare c uuid; learner uuid; title text;
begin
  if outcome is not null and outcome not in ('competent', 'not_yet_competent') then
    raise exception 'invalid result';
  end if;
  select e.course_id, e.user_id, co.title into c, learner, title
    from public.enrolments e join public.courses co on co.id = e.course_id where e.id = enrolment;
  if c is null then raise exception 'enrolment not found'; end if;
  if not (public.teaches(c) or public.is_admin()) then raise exception 'not allowed'; end if;
  update public.enrolments
     set result = outcome, result_note = nullif(trim(note), ''), assessed_by = auth.uid(), assessed_at = case when outcome is null then null else now() end
   where id = enrolment;
  insert into public.audit_log (actor, action, entity, entity_id, detail)
  values (auth.uid(), 'assessment', 'enrolment', enrolment, jsonb_build_object('result', outcome));
  if outcome is not null then
    insert into public.notifications (user_id, audience, kind, subject, body, link)
    values (learner, 'learner', 'result', 'Your assessment result: ' || title,
      case when outcome = 'competent' then 'You were assessed as competent in ' || title || '. Your statement of results is ready in your dashboard.'
           else 'You were assessed as not yet competent in ' || title || '. Your facilitator will contact you about re-assessment.' end
      || coalesce(' Note from your facilitator: ' || nullif(trim(note), ''), ''),
      '/dashboard');
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Employer reporting
-- ---------------------------------------------------------------------------
alter table public.enrolments add column if not exists company text;

-- ---------------------------------------------------------------------------
-- POPIA: anonymise a person on request or at the end of the retention period.
-- Financial records (orders) are kept for tax purposes but no longer name the person.
-- ---------------------------------------------------------------------------
create or replace function public.anonymise_user(target uuid)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  if target = auth.uid() then raise exception 'you cannot anonymise yourself'; end if;
  update public.profiles set full_name = 'Removed (POPIA request)', phone = null, marketing_opt_in = false, role = 'learner' where id = target;
  update auth.users
     set email = 'removed-' || target || '@invalid.local',
         raw_user_meta_data = '{}'::jsonb,
         phone = null,
         banned_until = 'infinity'
   where id = target;
  delete from public.notifications where user_id = target;
  insert into public.audit_log (actor, action, entity, entity_id, detail)
  values (auth.uid(), 'popia_anonymise', 'profile', target, '{}'::jsonb);
end;
$$;
revoke execute on function public.anonymise_user(uuid) from public, anon;
grant execute on function public.anonymise_user(uuid) to authenticated;

create or replace function public.anonymise_lead(target uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  update public.leads set name = 'Removed (POPIA)', email = null, phone = null, company = null, details = '{}'::jsonb, notes = null where id = target;
  insert into public.audit_log (actor, action, entity, entity_id, detail) values (auth.uid(), 'popia_anonymise', 'lead', target, '{}'::jsonb);
end;
$$;
revoke execute on function public.anonymise_lead(uuid) from public, anon;
grant execute on function public.anonymise_lead(uuid) to authenticated;

-- Retention: closed enquiries older than N months lose their personal details
create or replace function public.purge_old_leads(months integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare n integer;
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  if months < 6 then raise exception 'minimum 6 months'; end if;
  update public.leads set name = 'Removed (retention)', email = null, phone = null, company = null, details = '{}'::jsonb, notes = null
   where status in ('won', 'lost') and created_at < now() - make_interval(months => months) and name not like 'Removed%';
  get diagnostics n = row_count;
  insert into public.audit_log (actor, action, entity, detail) values (auth.uid(), 'popia_retention', 'lead', jsonb_build_object('rows', n, 'months', months));
  return n;
end;
$$;
revoke execute on function public.purge_old_leads(integer) from public, anon;
grant execute on function public.purge_old_leads(integer) to authenticated;

-- Admin users list now includes marketing consent
drop function if exists public.admin_users();
create or replace function public.admin_users()
returns table (id uuid, email text, full_name text, phone text, role text, created_at timestamptz, last_sign_in_at timestamptz, enrolments bigint, marketing_opt_in boolean)
language sql
stable
security definer
set search_path = public, auth
as $$
  select p.id, u.email::text, p.full_name, p.phone, p.role, u.created_at, u.last_sign_in_at,
         (select count(*) from public.enrolments e where e.user_id = p.id), p.marketing_opt_in
  from public.profiles p join auth.users u on u.id = p.id
  where public.is_admin()
  order by u.created_at desc;
$$;
revoke execute on function public.admin_users() from public, anon;
grant execute on function public.admin_users() to authenticated;

-- Coupon codes can only be checked by signed-in learners (stops anonymous code guessing)
revoke execute on function public.coupon_percent(text, uuid) from public, anon;
grant execute on function public.coupon_percent(text, uuid) to authenticated;

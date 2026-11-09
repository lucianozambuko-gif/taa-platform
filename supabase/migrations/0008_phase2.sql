-- Phase 2: employer accounts, learner preferences, eligibility, instalments, verifiable certificates,
-- attendance, assessment evidence, translations and scheduled jobs.

-- ---------------------------------------------------------------------------
-- Profiles: employer role, company, WhatsApp opt-in, language
-- ---------------------------------------------------------------------------
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('learner', 'employer', 'facilitator', 'sales', 'content', 'admin'));
alter table public.profiles
  add column if not exists company text,
  add column if not exists whatsapp_opt_in boolean not null default false,
  add column if not exists language text not null default 'en' check (language in ('en', 'zu', 'st'));

-- Only admins may change someone's role or employer company (stops an employer pointing
-- their account at another company's learners).
create or replace function public.protect_profile_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Signed-in non-admins cannot change role or company; server-side jobs (no auth.uid()) can.
  if auth.uid() is not null and not public.is_admin() then
    new.role := old.role;
    new.company := old.company;
  end if;
  return new;
end;
$$;
drop trigger if exists protect_profile_fields on public.profiles;
create trigger protect_profile_fields before update on public.profiles
  for each row execute function public.protect_profile_fields();

-- The employer company of the signed-in user (null unless they have the employer role)
create or replace function public.employer_company()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select company from public.profiles where id = auth.uid() and role = 'employer' and company is not null;
$$;

create policy "employer reads own staff enrolments" on public.enrolments for select
  using (company is not null and company = public.employer_company());
create policy "employer reads own staff profiles" on public.profiles for select using (
  exists (select 1 from public.enrolments e where e.user_id = profiles.id and e.company = public.employer_company())
);
create policy "employer reads own staff progress" on public.lesson_progress for select using (
  exists (
    select 1 from public.enrolments e
    join public.modules m on m.course_id = e.course_id
    join public.lessons l on l.module_id = m.id
    where e.user_id = lesson_progress.user_id and l.id = lesson_progress.lesson_id and e.company = public.employer_company()
  )
);

-- ---------------------------------------------------------------------------
-- Courses: eligibility questions, instalments, translated summaries
-- ---------------------------------------------------------------------------
alter table public.courses
  add column if not exists eligibility jsonb not null default '[]'::jsonb,
  add column if not exists instalments integer not null default 1 check (instalments between 1 and 6),
  add column if not exists summary_zu text,
  add column if not exists summary_st text;

-- ---------------------------------------------------------------------------
-- Orders: instalment plans and automatic follow-up
-- ---------------------------------------------------------------------------
alter table public.orders
  add column if not exists plan_total_cents integer,
  add column if not exists instalments integer not null default 1,
  add column if not exists instalment_no integer not null default 1,
  add column if not exists plan_id uuid,
  add column if not exists auto_followed_at timestamptz;

create or replace function public.create_order(course uuid, coupon text default null, plan integer default 1)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  price integer;
  allowed integer;
  pct integer;
  code text := nullif(upper(trim(coalesce(coupon, ''))), '');
  discount integer := 0;
  total integer;
  first integer;
  new_id uuid := gen_random_uuid();
begin
  if auth.uid() is null then raise exception 'sign in first'; end if;
  select price_cents, instalments into price, allowed from public.courses
   where id = course and published and price_basis = 'fixed' and price_cents > 0;
  if price is null then raise exception 'course not available'; end if;
  if plan is null or plan < 1 or plan > allowed then raise exception 'plan not allowed'; end if;
  if code is not null then
    pct := public.coupon_percent(code, course);
    if pct is null then raise exception 'invalid coupon'; end if;
    discount := round(price * pct / 100.0);
  end if;
  total := price - discount;
  if total <= 0 then raise exception 'use admin enrolment for free access'; end if;
  first := ceil(total::numeric / plan);
  insert into public.orders (id, user_id, course_id, amount_cents, coupon_code, discount_cents, plan_total_cents, instalments, instalment_no, plan_id)
  values (new_id, auth.uid(), course, first, code, discount, case when plan > 1 then total end, plan, 1, case when plan > 1 then new_id end);
  return new_id;
end;
$$;
revoke execute on function public.create_order(uuid, text, integer) from public, anon;
grant execute on function public.create_order(uuid, text, integer) to authenticated;
drop function if exists public.create_order(uuid, text);

-- Next instalment of a plan: amount = what is left, split over the instalments left
create or replace function public.next_instalment(plan uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  head public.orders;
  paid_count integer;
  paid_sum integer;
  open_id uuid;
  remaining integer;
  left_count integer;
  new_id uuid;
begin
  select * into head from public.orders where id = plan;
  if head.id is null or head.user_id <> auth.uid() or head.instalments < 2 then raise exception 'no plan'; end if;
  select id into open_id from public.orders where plan_id = plan and status = 'pending' limit 1;
  if open_id is not null then return open_id; end if;
  select count(*), coalesce(sum(amount_cents), 0) into paid_count, paid_sum from public.orders where plan_id = plan and status = 'paid';
  if paid_count = 0 then raise exception 'pay the first instalment first'; end if;
  left_count := head.instalments - paid_count;
  if left_count <= 0 then raise exception 'plan fully paid'; end if;
  remaining := head.plan_total_cents - paid_sum;
  insert into public.orders (user_id, course_id, amount_cents, plan_total_cents, instalments, instalment_no, plan_id, coupon_code)
  values (head.user_id, head.course_id, ceil(remaining::numeric / left_count), head.plan_total_cents, head.instalments, paid_count + 1, plan, head.coupon_code)
  returning id into new_id;
  return new_id;
end;
$$;
revoke execute on function public.next_instalment(uuid) from public, anon;
grant execute on function public.next_instalment(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Verifiable certificates
-- ---------------------------------------------------------------------------
alter table public.enrolments
  add column if not exists cert_code text unique default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
update public.enrolments set cert_code = upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10)) where cert_code is null;

-- Public check: only returns a result for a certificate that has actually been earned
create or replace function public.verify_certificate(code text)
returns table (learner text, course text, course_code text, kind text, issued date, certificate_type text)
language sql
stable
security definer
set search_path = public
as $$
  with e as (
    select e.*, c.title, c.code as ccode, c.kind as ckind, c.certificate_auto,
      (select count(*) from public.lessons l join public.modules m on m.id = l.module_id where m.course_id = c.id) as total,
      (select count(*) from public.lesson_progress lp join public.lessons l on l.id = lp.lesson_id join public.modules m on m.id = l.module_id
        where m.course_id = c.id and lp.user_id = e.user_id) as done,
      (select max(lp.completed_at) from public.lesson_progress lp join public.lessons l on l.id = lp.lesson_id join public.modules m on m.id = l.module_id
        where m.course_id = c.id and lp.user_id = e.user_id) as last_done
    from public.enrolments e join public.courses c on c.id = e.course_id
    where e.cert_code = upper(trim(code))
  )
  select p.full_name, e.title, e.ccode, e.ckind,
         coalesce(e.assessed_at, e.last_done)::date,
         case when e.result = 'competent' then 'Statement of results' else 'Certificate of completion' end
  from e join public.profiles p on p.id = e.user_id
  where e.result = 'competent' or (e.certificate_auto and e.total > 0 and e.done >= e.total);
$$;
grant execute on function public.verify_certificate(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Attendance register
-- ---------------------------------------------------------------------------
create table if not exists public.class_sessions (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  date date not null,
  title text not null,
  location text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
create table if not exists public.attendance (
  session_id uuid not null references public.class_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  present boolean not null,
  marked_by uuid references auth.users(id),
  marked_at timestamptz not null default now(),
  primary key (session_id, user_id)
);
alter table public.class_sessions enable row level security;
alter table public.attendance enable row level security;
create policy "teaching staff manage sessions" on public.class_sessions for all
  using (public.teaches(course_id) or public.has_role('sales')) with check (public.teaches(course_id) or public.is_admin());
create policy "learners see their sessions" on public.class_sessions for select using (
  exists (select 1 from public.enrolments e where e.course_id = class_sessions.course_id and e.user_id = auth.uid())
);
create policy "teaching staff mark attendance" on public.attendance for all using (
  exists (select 1 from public.class_sessions s where s.id = attendance.session_id and (public.teaches(s.course_id) or public.has_role('sales')))
) with check (
  exists (select 1 from public.class_sessions s where s.id = attendance.session_id and (public.teaches(s.course_id) or public.is_admin()))
);
create policy "learners see own attendance" on public.attendance for select using (user_id = auth.uid());
create policy "employer sees staff attendance" on public.attendance for select using (
  exists (select 1 from public.class_sessions s join public.enrolments e on e.course_id = s.course_id and e.user_id = attendance.user_id
          where s.id = attendance.session_id and e.company = public.employer_company())
);

-- ---------------------------------------------------------------------------
-- Assessment evidence (moderation and audit)
-- ---------------------------------------------------------------------------
create table if not exists public.assessment_evidence (
  id uuid primary key default gen_random_uuid(),
  enrolment_id uuid not null references public.enrolments(id) on delete cascade,
  path text not null,
  name text not null,
  uploaded_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
alter table public.assessment_evidence enable row level security;
create policy "teaching staff manage evidence" on public.assessment_evidence for all using (
  exists (select 1 from public.enrolments e where e.id = assessment_evidence.enrolment_id and (public.teaches(e.course_id) or public.is_admin()))
) with check (
  exists (select 1 from public.enrolments e where e.id = assessment_evidence.enrolment_id and (public.teaches(e.course_id) or public.is_admin()))
);

insert into storage.buckets (id, name, public, file_size_limit)
values ('evidence', 'evidence', false, 20971520)
on conflict (id) do nothing;
-- Files are stored as <course_id>/<enrolment_id>/<file>
create policy "teaching staff upload evidence" on storage.objects for insert to authenticated
  with check (bucket_id = 'evidence' and (public.is_admin() or public.teaches(((storage.foldername(name))[1])::uuid)));
create policy "teaching staff read evidence" on storage.objects for select to authenticated
  using (bucket_id = 'evidence' and (public.is_admin() or public.teaches(((storage.foldername(name))[1])::uuid)));
create policy "teaching staff delete evidence" on storage.objects for delete to authenticated
  using (bucket_id = 'evidence' and (public.is_admin() or public.teaches(((storage.foldername(name))[1])::uuid)));

-- ---------------------------------------------------------------------------
-- Site events: WhatsApp chats routed to the person on duty
-- ---------------------------------------------------------------------------
alter table public.site_events drop constraint if exists site_events_kind_check;
alter table public.site_events add constraint site_events_kind_check
  check (kind in ('brochure_download', 'whatsapp_click', 'whatsapp_routed', 'search'));

create policy "employer sees staff sessions" on public.class_sessions for select using (
  exists (select 1 from public.enrolments e where e.course_id = class_sessions.course_id and e.company = public.employer_company())
);

drop function if exists public.admin_users();
create or replace function public.admin_users()
returns table (id uuid, email text, full_name text, phone text, role text, created_at timestamptz, last_sign_in_at timestamptz, enrolments bigint, marketing_opt_in boolean, company text)
language sql
stable
security definer
set search_path = public, auth
as $$
  select p.id, u.email::text, p.full_name, p.phone, p.role, u.created_at, u.last_sign_in_at,
         (select count(*) from public.enrolments e where e.user_id = p.id), p.marketing_opt_in, p.company
  from public.profiles p join auth.users u on u.id = p.id
  where public.is_admin()
  order by u.created_at desc;
$$;
revoke execute on function public.admin_users() from public, anon;
grant execute on function public.admin_users() to authenticated;

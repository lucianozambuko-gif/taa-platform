-- Facilitator (teacher) role, course assignments and assessment results.

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check check (role in ('learner', 'facilitator', 'admin'));

-- Which facilitator teaches which course
create table if not exists public.course_facilitators (
  course_id uuid not null references public.courses(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (course_id, user_id)
);
alter table public.course_facilitators enable row level security;
create policy "facilitator assignments read" on public.course_facilitators for select using (user_id = auth.uid() or public.is_admin());
create policy "admin manages assignments" on public.course_facilitators for all using (public.is_admin()) with check (public.is_admin());

-- Assessment result recorded by the facilitator (or an admin)
alter table public.enrolments
  add column if not exists result text check (result in ('competent', 'not_yet_competent')),
  add column if not exists result_note text,
  add column if not exists assessed_by uuid references auth.users(id),
  add column if not exists assessed_at timestamptz;

create or replace function public.teaches(course uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.course_facilitators where course_id = course and user_id = auth.uid());
$$;

-- Facilitators can see the enrolments, progress and names of learners on their own courses only
create policy "facilitator reads course enrolments" on public.enrolments for select using (public.teaches(course_id));
create policy "facilitator reads course progress" on public.lesson_progress for select using (
  exists (
    select 1 from public.lessons l join public.modules m on m.id = l.module_id
    where l.id = lesson_progress.lesson_id and public.teaches(m.course_id)
  )
);
create policy "facilitator reads course content" on public.lesson_content for select using (
  exists (
    select 1 from public.lessons l join public.modules m on m.id = l.module_id
    where l.id = lesson_content.lesson_id and public.teaches(m.course_id)
  )
);
create policy "facilitator reads learner profiles" on public.profiles for select using (
  exists (select 1 from public.enrolments e where e.user_id = profiles.id and public.teaches(e.course_id))
);

-- The only way to write a result: checks the caller teaches the course (or is admin) and logs it
create or replace function public.record_assessment(enrolment uuid, outcome text, note text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare c uuid;
begin
  if outcome is not null and outcome not in ('competent', 'not_yet_competent') then
    raise exception 'invalid result';
  end if;
  select course_id into c from public.enrolments where id = enrolment;
  if c is null then raise exception 'enrolment not found'; end if;
  if not (public.teaches(c) or public.is_admin()) then raise exception 'not allowed'; end if;
  update public.enrolments
     set result = outcome, result_note = nullif(trim(note), ''), assessed_by = auth.uid(), assessed_at = case when outcome is null then null else now() end
   where id = enrolment;
  insert into public.audit_log (actor, action, entity, entity_id, detail)
  values (auth.uid(), 'assessment', 'enrolment', enrolment, jsonb_build_object('result', outcome));
end;
$$;
revoke execute on function public.record_assessment(uuid, text, text) from public, anon;
grant execute on function public.record_assessment(uuid, text, text) to authenticated;

-- Staff management for admins (no service key needed)
create policy "admin updates profiles" on public.profiles for update using (public.is_admin()) with check (public.is_admin());

create or replace function public.admin_user_by_email(e text)
returns uuid
language sql
stable
security definer
set search_path = public, auth
as $$
  select u.id from auth.users u where public.is_admin() and lower(u.email) = lower(trim(e)) limit 1;
$$;

create or replace function public.admin_staff()
returns table (id uuid, email text, full_name text, role text)
language sql
stable
security definer
set search_path = public, auth
as $$
  select p.id, u.email::text, p.full_name, p.role
  from public.profiles p join auth.users u on u.id = p.id
  where public.is_admin() and p.role in ('admin', 'facilitator')
  order by p.role, p.full_name;
$$;
revoke execute on function public.admin_user_by_email(text) from public, anon;
revoke execute on function public.admin_staff() from public, anon;
grant execute on function public.admin_user_by_email(text) to authenticated;
grant execute on function public.admin_staff() to authenticated;

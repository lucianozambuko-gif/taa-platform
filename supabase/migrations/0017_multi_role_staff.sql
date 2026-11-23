-- Staff with more than one role (for example a facilitator who also works in sales).
--
-- How it works:
--   * staff_roles lists every staff role an admin has given a person.
--   * profiles.role stays the ACTIVE role: the workspace the person is working in right now.
--     Every existing permission (has_role, is_admin, row-level security) keeps reading it, so a
--     person only has the powers of the workspace they are in (least privilege). A facilitator
--     who switches to Sales sees sales data, not teaching data, and the other way round.
--   * switch_role() lets a person move between the roles they were given, and nothing else.
--   * Learner and employer accounts are not staff roles and are not switchable.

create table if not exists public.staff_roles (
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('facilitator', 'moderator', 'sales', 'content', 'admin')),
  granted_by uuid references auth.users(id) on delete set null,
  granted_at timestamptz not null default now(),
  primary key (user_id, role)
);
alter table public.staff_roles enable row level security;

-- People see their own roles (for the switcher); admins see and manage everyone's.
drop policy if exists "own staff roles" on public.staff_roles;
create policy "own staff roles" on public.staff_roles for select using (user_id = auth.uid() or public.is_admin());
drop policy if exists "admins manage staff roles" on public.staff_roles;
create policy "admins manage staff roles" on public.staff_roles for all using (public.is_admin()) with check (public.is_admin());

-- Everyone who is staff today keeps their current role as their first granted role.
insert into public.staff_roles (user_id, role)
select id, role from public.profiles where role in ('facilitator', 'moderator', 'sales', 'content', 'admin')
on conflict do nothing;

-- Role changes stay admin-only, with one exception: a person switching their own active role
-- to a role an admin has granted them, through switch_role() (which sets taa.role_switch).
create or replace function public.protect_profile_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    if not (
      current_setting('taa.role_switch', true) = 'on'
      and new.id = auth.uid()
      and new.role is distinct from old.role
      and exists (select 1 from public.staff_roles s where s.user_id = new.id and s.role = new.role)
    ) then
      new.role := old.role;
    end if;
    new.company := old.company;
  end if;
  return new;
end;
$$;

-- Moves the signed-in person into another workspace they have been given. Returns the new role.
create or replace function public.switch_role(target text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  cur text;
begin
  if me is null then raise exception 'not signed in'; end if;
  select role into cur from public.profiles where id = me;
  if cur = target then return target; end if;
  if not exists (select 1 from public.staff_roles where user_id = me and role = target) then
    raise exception 'role not granted';
  end if;
  perform set_config('taa.role_switch', 'on', true);
  update public.profiles set role = target where id = me;
  perform set_config('taa.role_switch', 'off', true);
  insert into public.audit_log (actor, action, entity, entity_id, detail)
  values (me, 'role_switch', 'profile', me, jsonb_build_object('from', cur, 'to', target));
  return target;
end;
$$;
revoke execute on function public.switch_role(text) from public, anon;
grant execute on function public.switch_role(text) to authenticated;

-- Independent moderation: someone who teaches a course, or who recorded the result, may not
-- moderate it, even when they also hold the moderator role.
create or replace function public.moderate_result(enrolment uuid, outcome text, note text)
returns void language plpgsql security definer set search_path = public as $$
declare c uuid; learner uuid; title text; res text; assessor uuid;
begin
  if not (public.has_role('moderator') or public.is_admin()) then raise exception 'not allowed'; end if;
  if outcome not in ('endorsed', 'referred') then raise exception 'invalid outcome'; end if;
  if outcome = 'referred' and coalesce(trim(note), '') = '' then raise exception 'a reason is required'; end if;
  select e.course_id, e.user_id, co.title, e.result, e.assessed_by into c, learner, title, res, assessor
    from public.enrolments e join public.courses co on co.id = e.course_id where e.id = enrolment;
  if c is null or res is null then raise exception 'nothing to moderate'; end if;
  if assessor = auth.uid() or exists (select 1 from public.course_facilitators cf where cf.course_id = c and cf.user_id = auth.uid()) then
    raise exception 'own assessment: another moderator must review this';
  end if;
  update public.enrolments set moderation = outcome, moderation_note = nullif(trim(note), ''),
         moderated_by = auth.uid(), moderated_at = now() where id = enrolment;
  insert into public.audit_log (actor, action, entity, entity_id, detail)
  values (auth.uid(), 'moderation', 'enrolment', enrolment, jsonb_build_object('outcome', outcome, 'title', title));
  insert into public.notifications (user_id, audience, kind, subject, body, link)
  select cf.user_id, 'staff', 'moderation',
         case when outcome = 'endorsed' then 'Result endorsed: ' else 'Result referred back: ' end || title,
         case when outcome = 'endorsed' then 'The moderator endorsed your assessment decision.'
              else 'The moderator referred your assessment decision back: ' || trim(note) end,
         '/poe/' || enrolment
    from public.course_facilitators cf where cf.course_id = c;
  if outcome = 'endorsed' and res = 'competent' then
    insert into public.notifications (user_id, audience, kind, subject, body, link)
    values (learner, 'learner', 'result', 'Result confirmed: ' || title,
      'Your competent result in ' || title || ' has been moderated and confirmed. Your statement of results is ready.', '/dashboard');
  end if;
end; $$;
revoke execute on function public.moderate_result(uuid, text, text) from anon;

-- Fix: "own profile update" checked the role with a query on profiles inside a profiles policy,
-- which Postgres reports as infinite recursion, so non-admins couldn't save My profile.
-- protect_profile_fields() already stops people changing their own role or company.
drop policy if exists "own profile update" on public.profiles;
create policy "own profile update" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());

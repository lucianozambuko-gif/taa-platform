-- Portfolio of evidence (PoE) with assessor and moderator sign-off, and the course advisor chat log.

-- ---------------------------------------------------------------------------
-- Moderator role
-- ---------------------------------------------------------------------------
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('learner', 'employer', 'facilitator', 'moderator', 'sales', 'content', 'admin'));

-- ---------------------------------------------------------------------------
-- PoE: learner evidence, learner declaration, moderation outcome
-- ---------------------------------------------------------------------------
alter table public.assessment_evidence
  add column if not exists section text not null default 'Practical',
  add column if not exists source text not null default 'assessor' check (source in ('assessor', 'learner'));

alter table public.enrolments
  add column if not exists poe_submitted_at timestamptz,
  add column if not exists moderation text check (moderation in ('pending', 'endorsed', 'referred')),
  add column if not exists moderation_note text,
  add column if not exists moderated_by uuid references auth.users(id),
  add column if not exists moderated_at timestamptz;

-- Moderators read what they moderate.
create policy "moderator reads enrolments" on public.enrolments for select using (public.has_role('moderator'));
create policy "moderator reads profiles" on public.profiles for select using (public.has_role('moderator'));
create policy "moderator reads progress" on public.lesson_progress for select using (public.has_role('moderator'));
create policy "moderator reads attendance" on public.attendance for select using (public.has_role('moderator'));
create policy "moderator reads sessions" on public.class_sessions for select using (public.has_role('moderator'));
create policy "moderator reads evidence" on public.assessment_evidence for select using (public.has_role('moderator'));
create policy "moderator reads assignments" on public.course_facilitators for select using (public.has_role('moderator'));
create policy "moderator reads evidence files" on storage.objects for select to authenticated
  using (bucket_id = 'evidence' and public.has_role('moderator'));

-- Learners add to and read their own portfolio (files under <course_id>/<enrolment_id>/...).
create policy "learner reads own evidence" on public.assessment_evidence for select using (
  exists (select 1 from public.enrolments e where e.id = assessment_evidence.enrolment_id and e.user_id = auth.uid())
);
create policy "learner adds own evidence" on public.assessment_evidence for insert with check (
  source = 'learner' and uploaded_by = auth.uid() and exists (
    select 1 from public.enrolments e where e.id = assessment_evidence.enrolment_id and e.user_id = auth.uid() and e.poe_submitted_at is null)
);
create policy "learner removes own unsubmitted evidence" on public.assessment_evidence for delete using (
  source = 'learner' and uploaded_by = auth.uid() and exists (
    select 1 from public.enrolments e where e.id = assessment_evidence.enrolment_id and e.user_id = auth.uid() and e.poe_submitted_at is null)
);
create policy "learner uploads own evidence files" on storage.objects for insert to authenticated with check (
  bucket_id = 'evidence' and exists (
    select 1 from public.enrolments e
    where e.id::text = (storage.foldername(name))[2] and e.course_id::text = (storage.foldername(name))[1] and e.user_id = auth.uid())
);
create policy "learner reads own evidence files" on storage.objects for select to authenticated using (
  bucket_id = 'evidence' and exists (
    select 1 from public.enrolments e where e.id::text = (storage.foldername(name))[2] and e.user_id = auth.uid())
);

-- Learner signs the declaration of authenticity and submits the portfolio.
create or replace function public.submit_poe(enrolment uuid)
returns void language plpgsql security definer set search_path = public as $$
declare c uuid; title text;
begin
  select e.course_id, co.title into c, title from public.enrolments e join public.courses co on co.id = e.course_id
   where e.id = enrolment and e.user_id = auth.uid();
  if c is null then raise exception 'not allowed'; end if;
  update public.enrolments set poe_submitted_at = now() where id = enrolment and poe_submitted_at is null;
  insert into public.audit_log (actor, action, entity, entity_id, detail)
  values (auth.uid(), 'poe_submitted', 'enrolment', enrolment, jsonb_build_object('title', title));
  insert into public.notifications (user_id, audience, kind, subject, body, link)
  select cf.user_id, 'staff', 'poe_submitted', 'Portfolio submitted: ' || title,
         'A learner has submitted their portfolio of evidence for assessment.', '/poe/' || enrolment
    from public.course_facilitators cf where cf.course_id = c;
end; $$;

-- Recording or changing a result sends the portfolio (back) to moderation.
create or replace function public.record_assessment(enrolment uuid, outcome text, note text)
returns void language plpgsql security definer set search_path = public as $$
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
     set result = outcome, result_note = nullif(trim(note), ''), assessed_by = auth.uid(),
         assessed_at = case when outcome is null then null else now() end,
         moderation = case when outcome is null then null else 'pending' end,
         moderation_note = null, moderated_by = null, moderated_at = null
   where id = enrolment;
  insert into public.audit_log (actor, action, entity, entity_id, detail)
  values (auth.uid(), 'assessment', 'enrolment', enrolment, jsonb_build_object('result', outcome));
  if outcome is not null then
    insert into public.notifications (user_id, audience, kind, subject, body, link)
    values (learner, 'learner', 'result', 'Your assessment result: ' || title,
      case when outcome = 'competent' then 'You were assessed as competent in ' || title || '. Your result is now with the Academy''s moderator; your statement of results follows once it is endorsed.'
           else 'You were assessed as not yet competent in ' || title || '. Your facilitator will contact you about re-assessment.' end
      || coalesce(' Note from your facilitator: ' || nullif(trim(note), ''), ''),
      '/dashboard');
  end if;
end; $$;

-- Moderator endorses the assessor's decision or refers it back.
create or replace function public.moderate_result(enrolment uuid, outcome text, note text)
returns void language plpgsql security definer set search_path = public as $$
declare c uuid; learner uuid; title text; res text;
begin
  if not (public.has_role('moderator') or public.is_admin()) then raise exception 'not allowed'; end if;
  if outcome not in ('endorsed', 'referred') then raise exception 'invalid outcome'; end if;
  if outcome = 'referred' and coalesce(trim(note), '') = '' then raise exception 'a reason is required'; end if;
  select e.course_id, e.user_id, co.title, e.result into c, learner, title, res
    from public.enrolments e join public.courses co on co.id = e.course_id where e.id = enrolment;
  if c is null or res is null then raise exception 'nothing to moderate'; end if;
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

revoke execute on function public.submit_poe(uuid) from anon;
revoke execute on function public.moderate_result(uuid, text, text) from anon;

-- ---------------------------------------------------------------------------
-- Course advisor chats (website widget and WhatsApp)
-- ---------------------------------------------------------------------------
create table if not exists public.advisor_chats (
  id uuid primary key default gen_random_uuid(),
  channel text not null check (channel in ('web', 'whatsapp')),
  contact text,
  state jsonb not null default '{}',
  transcript jsonb not null default '[]',
  handed_over boolean not null default false,
  unanswered integer not null default 0,
  lead_id uuid references public.leads(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists advisor_chats_contact on public.advisor_chats (channel, contact, updated_at desc);
alter table public.advisor_chats enable row level security;
-- Written by the server only; sales and admin read them.
create policy "sales read advisor chats" on public.advisor_chats for select using (public.has_role('sales') or public.is_admin());


-- ---------------------------------------------------------------------------
-- Statements of results need an endorsed moderation (earlier results count as endorsed)
-- ---------------------------------------------------------------------------
update public.enrolments set moderation = 'endorsed', moderated_at = coalesce(assessed_at, now()) where result is not null and moderation is null;

create or replace function public.verify_certificate(code text)
returns table (learner text, course text, course_code text, kind text, issued date, certificate_type text)
language sql stable security definer set search_path = public as $$
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
         coalesce(e.moderated_at, e.assessed_at, e.last_done)::date,
         case when e.result = 'competent' and e.moderation = 'endorsed' then 'Statement of results (moderated)' else 'Certificate of completion' end
  from e join public.profiles p on p.id = e.user_id
  where (e.result = 'competent' and e.moderation = 'endorsed') or (e.certificate_auto and e.total > 0 and e.done >= e.total);
$$;
grant execute on function public.verify_certificate(text) to anon, authenticated;

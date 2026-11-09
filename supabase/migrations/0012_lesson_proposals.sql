-- Facilitators suggest new lessons, quizzes and changes; an admin or content editor approves before learners see them.
create table if not exists public.lesson_proposals (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  action text not null check (action in ('new_lesson', 'edit_lesson')),
  lesson_id uuid references public.lessons(id) on delete cascade,
  module_id uuid references public.modules(id) on delete set null,
  new_module_title text,
  title text not null,
  kind text not null check (kind in ('video', 'quiz', 'download')),
  minutes integer not null default 5 check (minutes between 1 and 600),
  content jsonb not null default '{}',
  message text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'withdrawn')),
  review_note text,
  proposed_by uuid not null references auth.users(id),
  reviewed_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  constraint lesson_proposals_edit_has_lesson check (action <> 'edit_lesson' or lesson_id is not null)
);
create index if not exists lesson_proposals_status on public.lesson_proposals (status, created_at desc);
alter table public.lesson_proposals enable row level security;
create policy "facilitator proposes on own courses" on public.lesson_proposals for insert with check (
  proposed_by = auth.uid() and status = 'pending' and (public.teaches(course_id) or public.has_role('content'))
);
create policy "read own or review" on public.lesson_proposals for select using (proposed_by = auth.uid() or public.has_role('content'));
create policy "withdraw own pending" on public.lesson_proposals for update using (proposed_by = auth.uid() and status = 'pending')
  with check (proposed_by = auth.uid() and status = 'withdrawn');

create policy "facilitator uploads lesson files" on storage.objects for insert to authenticated
  with check (bucket_id = 'lesson-files' and public.teaches(((storage.foldername(name))[1])::uuid));
create policy "facilitator reads lesson files" on storage.objects for select to authenticated
  using (bucket_id = 'lesson-files' and public.teaches(((storage.foldername(name))[1])::uuid));

-- Quiz questions change directly only for content editors and admins; facilitators send them for approval.
create or replace function public.save_quiz(lesson uuid, questions jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare c uuid; k text; t text;
begin
  select m.course_id, l.kind, l.title into c, k, t from public.lessons l join public.modules m on m.id = l.module_id where l.id = lesson;
  if c is null or k <> 'quiz' then raise exception 'not a quiz'; end if;
  if not public.has_role('content') then raise exception 'not allowed'; end if;
  if jsonb_typeof(questions) <> 'array' or jsonb_array_length(questions) = 0 then raise exception 'no questions'; end if;
  insert into public.lesson_content (lesson_id, quiz) values (lesson, questions)
  on conflict (lesson_id) do update set quiz = excluded.quiz;
  insert into public.audit_log (actor, action, entity, entity_id, detail)
  values (auth.uid(), 'quiz_save', 'lesson', lesson, jsonb_build_object('title', t, 'questions', jsonb_array_length(questions)));
end; $$;

-- Approve: apply the suggestion to the course, then tell the facilitator.
create or replace function public.review_proposal(proposal uuid, decision text, note text)
returns uuid language plpgsql security definer set search_path = public as $$
declare p public.lesson_proposals; mod uuid; les uuid; pos integer; ctitle text;
begin
  if not public.has_role('content') then raise exception 'not allowed'; end if;
  if decision not in ('approved', 'rejected') then raise exception 'invalid decision'; end if;
  select * into p from public.lesson_proposals where id = proposal for update;
  if p.id is null or p.status <> 'pending' then raise exception 'not pending'; end if;
  if decision = 'rejected' and coalesce(trim(note), '') = '' then raise exception 'a reason is required'; end if;
  select title into ctitle from public.courses where id = p.course_id;
  if decision = 'approved' then
    if p.action = 'new_lesson' then
      mod := p.module_id;
      if mod is null then
        select coalesce(max(position), 0) + 1 into pos from public.modules where course_id = p.course_id;
        insert into public.modules (course_id, position, title) values (p.course_id, pos, coalesce(nullif(trim(p.new_module_title), ''), 'New module')) returning id into mod;
      end if;
      select coalesce(max(position), 0) + 1 into pos from public.lessons where module_id = mod;
      insert into public.lessons (module_id, position, title, kind, minutes) values (mod, pos, p.title, p.kind, p.minutes) returning id into les;
    else
      les := p.lesson_id;
      update public.lessons set title = p.title, minutes = p.minutes where id = les;
    end if;
    insert into public.lesson_content (lesson_id, video_url, captions_url, body, download_url, quiz)
    values (les, p.content->>'video_url', p.content->>'captions_url', p.content->>'body', p.content->>'download_url',
            case when p.kind = 'quiz' then p.content->'quiz' end)
    on conflict (lesson_id) do update set
      video_url = coalesce(excluded.video_url, lesson_content.video_url),
      captions_url = coalesce(excluded.captions_url, lesson_content.captions_url),
      body = coalesce(excluded.body, lesson_content.body),
      download_url = coalesce(excluded.download_url, lesson_content.download_url),
      quiz = coalesce(excluded.quiz, lesson_content.quiz);
    update public.lesson_proposals set lesson_id = les where id = p.id and lesson_id is null;
    update public.courses set has_lms = true where id = p.course_id and not has_lms;
  end if;
  update public.lesson_proposals set status = decision, review_note = nullif(trim(note), ''), reviewed_by = auth.uid(), reviewed_at = now() where id = p.id;
  insert into public.audit_log (actor, action, entity, entity_id, detail)
  values (auth.uid(), 'lesson_' || decision, 'lesson_proposal', p.id, jsonb_build_object('title', p.title, 'course', ctitle));
  insert into public.notifications (user_id, audience, kind, subject, body, link)
  values (p.proposed_by, 'staff', 'lesson_review',
    case when decision = 'approved' then 'Approved: ' else 'Not approved: ' end || p.title,
    case when decision = 'approved' then 'Your ' || case when p.action = 'new_lesson' then 'new lesson' else 'changes' end || ' for ' || ctitle || ' are now live for learners.'
         else 'Your suggestion for ' || ctitle || ' was not approved: ' || trim(note) end,
    '/facilitator/lessons');
  return les;
end; $$;
revoke execute on function public.review_proposal(uuid, text, text) from anon;
grant execute on function public.review_proposal(uuid, text, text) to authenticated;

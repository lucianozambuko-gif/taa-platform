-- Every quiz attempt (passed or not) so facilitators can see who is struggling and which questions are missed,
-- and quiz editing for facilitators on the courses they teach.
create table if not exists public.quiz_attempts (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  score integer not null,
  passed boolean not null,
  answers jsonb not null default '[]',
  created_at timestamptz not null default now()
);
create index if not exists quiz_attempts_lesson on public.quiz_attempts (lesson_id, created_at desc);
alter table public.quiz_attempts enable row level security;
create policy "own attempts read" on public.quiz_attempts for select using (user_id = auth.uid());
create policy "own attempts add" on public.quiz_attempts for insert with check (
  user_id = auth.uid() and exists (
    select 1 from public.lessons l join public.modules m on m.id = l.module_id
    join public.enrolments e on e.course_id = m.course_id and e.user_id = auth.uid()
    where l.id = quiz_attempts.lesson_id)
);
create policy "teaching staff read attempts" on public.quiz_attempts for select using (
  public.has_role('content', 'moderator') or exists (
    select 1 from public.lessons l join public.modules m on m.id = l.module_id
    where l.id = quiz_attempts.lesson_id and public.teaches(m.course_id))
);

create policy "facilitator reads lesson content" on public.lesson_content for select using (
  exists (select 1 from public.lessons l join public.modules m on m.id = l.module_id
          where l.id = lesson_content.lesson_id and public.teaches(m.course_id))
);

create or replace function public.save_quiz(lesson uuid, questions jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare c uuid; k text; t text;
begin
  select m.course_id, l.kind, l.title into c, k, t from public.lessons l join public.modules m on m.id = l.module_id where l.id = lesson;
  if c is null or k <> 'quiz' then raise exception 'not a quiz'; end if;
  if not (public.teaches(c) or public.has_role('content')) then raise exception 'not allowed'; end if;
  if jsonb_typeof(questions) <> 'array' or jsonb_array_length(questions) = 0 then raise exception 'no questions'; end if;
  insert into public.lesson_content (lesson_id, quiz) values (lesson, questions)
  on conflict (lesson_id) do update set quiz = excluded.quiz;
  insert into public.audit_log (actor, action, entity, entity_id, detail)
  values (auth.uid(), 'quiz_save', 'lesson', lesson, jsonb_build_object('title', t, 'questions', jsonb_array_length(questions)));
end; $$;
revoke execute on function public.save_quiz(uuid, jsonb) from anon;
grant execute on function public.save_quiz(uuid, jsonb) to authenticated;

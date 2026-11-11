-- Teachers choose what learners may see after a quiz:
--   off  = score only
--   mine = which of their answers were right or wrong
--   full = their answers plus the correct answers
alter table public.lesson_content
  add column if not exists quiz_review text not null default 'full'
  check (quiz_review in ('off', 'mine', 'full'));

create or replace function public.set_quiz_review(lesson uuid, mode text)
returns void language plpgsql security definer set search_path = public as $$
declare c uuid;
begin
  if mode not in ('off', 'mine', 'full') then raise exception 'Unknown review setting'; end if;
  select m.course_id into c from lessons l join modules m on m.id = l.module_id where l.id = lesson;
  if c is null then raise exception 'Lesson not found'; end if;
  if not (public.has_role('content', 'admin') or public.teaches(c)) then raise exception 'Not allowed'; end if;
  update lesson_content set quiz_review = mode where lesson_id = lesson;
  insert into public.audit_log (actor, action, entity, entity_id, detail) values (auth.uid(), 'quiz_review', 'lesson', lesson, jsonb_build_object('mode', mode));
end $$;
revoke all on function public.set_quiz_review(uuid, text) from public;
grant execute on function public.set_quiz_review(uuid, text) to authenticated;

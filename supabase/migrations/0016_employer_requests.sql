-- Employer portal: let an employer see the status of the requests their own company sent
-- (staff lists and group quotes), without opening the lead register to them.
--
-- Returns only: reference, type, status, course title, number of staff and dates. No notes,
-- no staff names, no other company's rows. A row is "theirs" when it was sent from the
-- employer portal for their company, or sent from their own sign-in email address.

create or replace function public.employer_requests()
returns table (ref text, type text, status text, course text, staff_count integer, created_at timestamptz, updated_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select l.ref, l.type, l.status, c.title, l.staff_count, l.created_at, l.updated_at
  from public.leads l
  left join public.courses c on c.id = l.course_id
  where public.employer_company() is not null
    and l.type in ('group_quote', 'multi_learner', 'course_enquiry')
    and (
      (l.source = 'employer_portal' and l.company = public.employer_company())
      or lower(l.email) = (select lower(u.email) from auth.users u where u.id = auth.uid())
    )
  order by l.created_at desc
  limit 100;
$$;

revoke execute on function public.employer_requests() from public, anon;
grant execute on function public.employer_requests() to authenticated;

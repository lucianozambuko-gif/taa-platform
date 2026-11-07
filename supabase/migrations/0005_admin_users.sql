-- Every account with its email, role and activity, for the admin Users tab.
create or replace function public.admin_users()
returns table (id uuid, email text, full_name text, phone text, role text, created_at timestamptz, last_sign_in_at timestamptz, enrolments bigint)
language sql
stable
security definer
set search_path = public, auth
as $$
  select p.id, u.email::text, p.full_name, p.phone, p.role, u.created_at, u.last_sign_in_at,
         (select count(*) from public.enrolments e where e.user_id = p.id)
  from public.profiles p join auth.users u on u.id = p.id
  where public.is_admin()
  order by u.created_at desc;
$$;
revoke execute on function public.admin_users() from public, anon;
grant execute on function public.admin_users() to authenticated;

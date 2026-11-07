-- The signup trigger function must not be callable through the API.
-- (is_admin() stays executable: row-level security policies call it, and it only reveals the caller's own role.)
revoke execute on function public.handle_new_user() from public, anon, authenticated;

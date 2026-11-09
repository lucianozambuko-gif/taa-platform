-- Moderators' own actions (such as downloading the verification pack) are written to the audit log too.
drop policy if exists "staff writes audit" on public.audit_log;
create policy "staff writes audit" on public.audit_log for insert
  with check (public.has_role('sales', 'content', 'facilitator', 'moderator') and actor = auth.uid());

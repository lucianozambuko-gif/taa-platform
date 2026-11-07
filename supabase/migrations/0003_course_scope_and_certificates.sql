-- Approved accreditation scope (shown only once signed off) and which programmes may issue certificates automatically.
alter table public.courses add column if not exists approved_scope text;
alter table public.courses add column if not exists certificate_auto boolean not null default false;
update public.courses set certificate_auto = true where has_lms and kind = 'short';

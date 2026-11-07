-- Training Africa Academy platform: core schema
-- Run in the Supabase SQL editor, or with `supabase db push`.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Profiles (one per auth user)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  role text not null default 'learner' check (role in ('learner', 'admin')),
  marketing_opt_in boolean not null default false,
  popia_consent_at timestamptz,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone, marketing_opt_in, popia_consent_at)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'phone',
    coalesce((new.raw_user_meta_data ->> 'marketing_opt_in')::boolean, false),
    case when (new.raw_user_meta_data ->> 'popia_consent') = 'true' then now() end
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Catalogue
-- ---------------------------------------------------------------------------
create table public.courses (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  code text not null unique,
  title text not null,
  subject text not null,
  kind text not null check (kind in ('short', 'accredited', 'qualification')),
  format text not null check (format in ('Online', 'Blended', 'Classroom', 'Workplace')),
  format_note text,
  location text not null,
  price_cents integer check (price_cents is null or price_cents >= 0),
  price_basis text not null default 'fixed' check (price_basis in ('fixed', 'quote', 'learnership')),
  duration text,
  summary text,
  outcomes text[] not null default '{}',
  entry_requirements text,
  assessment text,
  practical text,
  certificate text,
  audience text,
  learner_types text[] not null default '{individual,employer}',
  intakes text[] not null default '{}',
  -- Accreditation fields stay null until signed off against the current approval letter.
  accreditation_body text,
  saqa_id text,
  nqf_level text,
  credits text,
  accreditation_approved boolean not null default false,
  brochure_url text,
  has_lms boolean not null default false,
  featured boolean not null default false,
  published boolean not null default true,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table public.modules (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  position integer not null,
  title text not null,
  unique (course_id, position)
);

-- Lesson outline is public so the course page can list modules.
create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.modules(id) on delete cascade,
  position integer not null,
  title text not null,
  kind text not null check (kind in ('video', 'quiz', 'download')),
  minutes integer not null default 5,
  unique (module_id, position)
);

-- Lesson content is only readable by enrolled learners and admins.
create table public.lesson_content (
  lesson_id uuid primary key references public.lessons(id) on delete cascade,
  video_url text,
  captions_url text,
  body text,
  download_url text,
  quiz jsonb
);

-- ---------------------------------------------------------------------------
-- Orders, enrolments, progress
-- ---------------------------------------------------------------------------
create sequence public.invoice_seq start 1001;

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  invoice_no text not null unique default ('INV-' || to_char(now(), 'YYYY') || '-' || nextval('public.invoice_seq')),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid not null references public.courses(id),
  amount_cents integer not null check (amount_cents > 0),
  status text not null default 'pending' check (status in ('pending', 'paid', 'failed', 'cancelled')),
  gateway text not null default 'payfast',
  gateway_payment_id text,
  gateway_status text,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.enrolments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid not null references public.courses(id),
  order_id uuid references public.orders(id),
  source text not null default 'checkout' check (source in ('checkout', 'admin', 'employer')),
  created_at timestamptz not null default now(),
  unique (user_id, course_id)
);

create table public.lesson_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  score integer,
  completed_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

-- ---------------------------------------------------------------------------
-- Leads (course enquiries, group quotes, learnership applications, venue requests)
-- ---------------------------------------------------------------------------
create sequence public.lead_seq start 1001;

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  ref text not null unique default ('LD-' || nextval('public.lead_seq')),
  type text not null check (type in ('course_enquiry', 'group_quote', 'learnership', 'venue', 'multi_learner')),
  name text not null,
  email text,
  phone text,
  company text,
  course_id uuid references public.courses(id),
  staff_count integer,
  details jsonb not null default '{}',
  source text not null default 'website',
  routed_to text not null,
  status text not null default 'new' check (status in ('new', 'contacted', 'quoted', 'won', 'lost')),
  popia_consent boolean not null default false,
  created_at timestamptz not null default now()
);

-- Audit trail for admin changes (prices, lead status).
create table public.audit_log (
  id bigint generated always as identity primary key,
  actor uuid references auth.users(id),
  action text not null,
  entity text not null,
  entity_id uuid,
  detail jsonb not null default '{}',
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.courses enable row level security;
alter table public.modules enable row level security;
alter table public.lessons enable row level security;
alter table public.lesson_content enable row level security;
alter table public.orders enable row level security;
alter table public.enrolments enable row level security;
alter table public.lesson_progress enable row level security;
alter table public.leads enable row level security;
alter table public.audit_log enable row level security;

-- profiles
create policy "own profile read" on public.profiles for select using (id = auth.uid() or public.is_admin());
create policy "own profile update" on public.profiles for update using (id = auth.uid())
  with check (id = auth.uid() and role = (select p.role from public.profiles p where p.id = auth.uid()));

-- catalogue
create policy "published courses" on public.courses for select using (published or public.is_admin());
create policy "admin edits courses" on public.courses for update using (public.is_admin()) with check (public.is_admin());
create policy "admin adds courses" on public.courses for insert with check (public.is_admin());
create policy "modules readable" on public.modules for select using (true);
create policy "lessons readable" on public.lessons for select using (true);
create policy "content for enrolled" on public.lesson_content for select using (
  public.is_admin() or exists (
    select 1
    from public.lessons l
    join public.modules m on m.id = l.module_id
    join public.enrolments e on e.course_id = m.course_id
    where l.id = lesson_content.lesson_id and e.user_id = auth.uid()
  )
);

-- orders: learners create and read their own; only the server (service role) confirms payment
create policy "own orders read" on public.orders for select using (user_id = auth.uid() or public.is_admin());
create policy "own orders create" on public.orders for insert with check (user_id = auth.uid() and status = 'pending');

-- enrolments: read own; created by the server after payment, or by admins
create policy "own enrolments read" on public.enrolments for select using (user_id = auth.uid() or public.is_admin());
create policy "admin enrols" on public.enrolments for insert with check (public.is_admin());

-- progress: learners record their own progress on courses they are enrolled in
create policy "own progress read" on public.lesson_progress for select using (user_id = auth.uid() or public.is_admin());
create policy "own progress write" on public.lesson_progress for insert with check (
  user_id = auth.uid() and exists (
    select 1 from public.lessons l
    join public.modules m on m.id = l.module_id
    join public.enrolments e on e.course_id = m.course_id
    where l.id = lesson_progress.lesson_id and e.user_id = auth.uid()
  )
);
create policy "own progress update" on public.lesson_progress for update using (user_id = auth.uid());

-- leads: anyone can submit; only admins read and update
create policy "submit lead" on public.leads for insert with check (status = 'new');
create policy "admin reads leads" on public.leads for select using (public.is_admin());
create policy "admin updates leads" on public.leads for update using (public.is_admin());

-- audit
create policy "admin reads audit" on public.audit_log for select using (public.is_admin());
create policy "admin writes audit" on public.audit_log for insert with check (public.is_admin() and actor = auth.uid());

grant usage on sequence public.invoice_seq to authenticated;
grant usage on sequence public.lead_seq to anon, authenticated;

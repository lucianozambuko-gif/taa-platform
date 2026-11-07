-- Staff roles (sales, content), lead ownership, venue bookings, coupons, site content, redirects, refunds, event counts.

-- ---------------------------------------------------------------------------
-- Roles
-- ---------------------------------------------------------------------------
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('learner', 'facilitator', 'sales', 'content', 'admin'));

-- True when the caller is an admin or has one of the given roles.
create or replace function public.has_role(variadic roles text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and (role = 'admin' or role = any(roles)));
$$;

-- Sales & admissions: leads, orders, learner records, venue bookings
create policy "sales reads leads" on public.leads for select using (public.has_role('sales'));
create policy "sales updates leads" on public.leads for update using (public.has_role('sales'));
create policy "sales reads orders" on public.orders for select using (public.has_role('sales'));
create policy "sales reads enrolments" on public.enrolments for select using (public.has_role('sales'));
create policy "sales enrols" on public.enrolments for insert with check (public.has_role('sales'));
create policy "sales removes enrolments" on public.enrolments for delete using (public.has_role('sales'));
create policy "sales reads progress" on public.lesson_progress for select using (public.has_role('sales'));
create policy "sales reads profiles" on public.profiles for select using (public.has_role('sales'));

-- Content editors: courses
create policy "content reads all courses" on public.courses for select using (public.has_role('content'));
create policy "content edits courses" on public.courses for update using (public.has_role('content')) with check (public.has_role('content'));
create policy "content adds courses" on public.courses for insert with check (public.has_role('content'));

-- Any staff member can write their own audit entries; only admins read the log
create policy "staff writes audit" on public.audit_log for insert
  with check (public.has_role('sales', 'content', 'facilitator') and actor = auth.uid());

-- ---------------------------------------------------------------------------
-- Leads: owner and notes
-- ---------------------------------------------------------------------------
alter table public.leads
  add column if not exists assigned_to uuid references auth.users(id),
  add column if not exists notes text,
  add column if not exists updated_at timestamptz;

-- ---------------------------------------------------------------------------
-- Orders: refunds, coupons, follow-up
-- ---------------------------------------------------------------------------
alter table public.orders drop constraint if exists orders_status_check;
alter table public.orders add constraint orders_status_check
  check (status in ('pending', 'paid', 'failed', 'cancelled', 'refunded'));
alter table public.orders
  add column if not exists coupon_code text,
  add column if not exists discount_cents integer not null default 0,
  add column if not exists refunded_at timestamptz,
  add column if not exists staff_note text,
  add column if not exists followed_up_at timestamptz;
create policy "sales updates orders" on public.orders for update using (public.has_role('sales')) with check (public.has_role('sales'));

-- ---------------------------------------------------------------------------
-- Coupons: created by sales or admin, active only once an admin approves
-- ---------------------------------------------------------------------------
create table if not exists public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-Z0-9-]{3,30}$'),
  percent_off integer not null check (percent_off between 1 and 100),
  course_id uuid references public.courses(id) on delete cascade,
  max_uses integer check (max_uses is null or max_uses > 0),
  uses integer not null default 0,
  expires_on date,
  reason text,
  status text not null default 'pending' check (status in ('pending', 'active', 'disabled')),
  created_by uuid references auth.users(id),
  approved_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
alter table public.coupons enable row level security;
create policy "staff reads coupons" on public.coupons for select using (public.has_role('sales'));
create policy "staff requests coupons" on public.coupons for insert
  with check (public.has_role('sales') and created_by = auth.uid() and (status = 'pending' or public.is_admin()));
create policy "admin approves coupons" on public.coupons for update using (public.is_admin()) with check (public.is_admin());

-- Learners check a code without seeing the coupon table
create or replace function public.coupon_percent(c text, course uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select percent_off from public.coupons
  where code = upper(trim(c)) and status = 'active'
    and (course_id is null or course_id = course)
    and (expires_on is null or expires_on >= current_date)
    and (max_uses is null or uses < max_uses)
  limit 1;
$$;
grant execute on function public.coupon_percent(text, uuid) to authenticated;

-- Orders are created only through this function, which sets the price from the course
-- and the discount from an active coupon. Learners can no longer insert orders directly,
-- so nobody can create an order with a price of their own choosing.
drop policy if exists "own orders create" on public.orders;
create or replace function public.create_order(course uuid, coupon text default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  price integer;
  pct integer;
  code text := nullif(upper(trim(coalesce(coupon, ''))), '');
  discount integer := 0;
  new_id uuid;
begin
  if auth.uid() is null then raise exception 'sign in first'; end if;
  select price_cents into price from public.courses
   where id = course and published and price_basis = 'fixed' and price_cents > 0;
  if price is null then raise exception 'course not available'; end if;
  if code is not null then
    pct := public.coupon_percent(code, course);
    if pct is null then raise exception 'invalid coupon'; end if;
    discount := round(price * pct / 100.0);
  end if;
  if price - discount <= 0 then raise exception 'use admin enrolment for free access'; end if;
  insert into public.orders (user_id, course_id, amount_cents, coupon_code, discount_cents)
  values (auth.uid(), course, price - discount, code, discount)
  returning id into new_id;
  return new_id;
end;
$$;
revoke execute on function public.create_order(uuid, text) from public, anon;
grant execute on function public.create_order(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Venue bookings and availability
-- ---------------------------------------------------------------------------
create table if not exists public.venue_bookings (
  id uuid primary key default gen_random_uuid(),
  room text not null,
  date date not null,
  slot text not null default 'full' check (slot in ('full', 'morning', 'afternoon')),
  status text not null default 'confirmed' check (status in ('held', 'confirmed', 'blocked')),
  lead_id uuid references public.leads(id) on delete set null,
  client text,
  note text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
create index if not exists venue_bookings_date on public.venue_bookings (date);
alter table public.venue_bookings enable row level security;
create policy "sales manages venue" on public.venue_bookings for all using (public.has_role('sales')) with check (public.has_role('sales'));

-- Public availability: which room/day/slot is taken, nothing about who booked it
create or replace function public.venue_busy(from_date date, to_date date)
returns table (room text, date date, slot text)
language sql
stable
security definer
set search_path = public
as $$
  select room, date, slot from public.venue_bookings
  where date between from_date and to_date and status in ('held', 'confirmed', 'blocked');
$$;
grant execute on function public.venue_busy(date, date) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Editable site content (homepage figures, testimonials, announcement, FAQs)
-- ---------------------------------------------------------------------------
create table if not exists public.site_content (
  key text primary key,
  value jsonb not null,
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);
alter table public.site_content enable row level security;
create policy "site content public" on public.site_content for select using (true);
create policy "content edits site" on public.site_content for all using (public.has_role('content')) with check (public.has_role('content'));

-- ---------------------------------------------------------------------------
-- Redirects from old website URLs
-- ---------------------------------------------------------------------------
create table if not exists public.redirects (
  from_path text primary key check (from_path ~ '^/'),
  to_path text not null check (to_path ~ '^(/|https://)'),
  hits integer not null default 0,
  created_at timestamptz not null default now()
);
alter table public.redirects enable row level security;
create policy "redirects public" on public.redirects for select using (true);
create policy "content manages redirects" on public.redirects for all using (public.has_role('content')) with check (public.has_role('content'));

-- ---------------------------------------------------------------------------
-- Site events counted for the dashboard (brochure downloads, WhatsApp clicks)
-- ---------------------------------------------------------------------------
create table if not exists public.site_events (
  id bigint generated always as identity primary key,
  kind text not null check (kind in ('brochure_download', 'whatsapp_click')),
  label text,
  path text,
  created_at timestamptz not null default now()
);
alter table public.site_events enable row level security;
create policy "staff reads events" on public.site_events for select using (public.has_role('sales', 'content'));
create policy "anyone records events" on public.site_events for insert with check (true);

-- Staff directory for assigning leads (names only)
create or replace function public.staff_directory()
returns table (id uuid, full_name text, role text)
language sql
stable
security definer
set search_path = public
as $$
  select id, full_name, role from public.profiles
  where public.has_role('sales', 'content', 'facilitator') and role in ('admin', 'sales', 'content')
  order by full_name;
$$;
revoke execute on function public.staff_directory() from public, anon;
grant execute on function public.staff_directory() to authenticated;

-- Sales staff can look up a learner by email (for giving course access)
create or replace function public.admin_user_by_email(e text)
returns uuid
language sql
stable
security definer
set search_path = public, auth
as $$
  select u.id from auth.users u where public.has_role('sales') and lower(u.email) = lower(trim(e)) limit 1;
$$;

-- Counts redirect use from old links
create or replace function public.redirect_hit(p text)
returns void
language sql
security definer
set search_path = public
as $$
  update public.redirects set hits = hits + 1 where from_path = p;
$$;
grant execute on function public.redirect_hit(text) to anon, authenticated;

-- Counts coupon use when a discounted order is paid (server only)
create or replace function public.coupon_used(c text)
returns void
language sql
security definer
set search_path = public
as $$
  update public.coupons set uses = uses + 1 where code = c;
$$;
revoke execute on function public.coupon_used(text) from public, anon, authenticated;

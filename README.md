# Training Africa Academy platform (MVP)

Website, course catalogue, online checkout and learning platform for Training Africa Academy.
Built by S.I.C Growth (Pty) Ltd t/a Cloud Uko.

**Stack:** Next.js 15 (App Router) · Supabase (Postgres, Auth, row-level security) · PayFast hosted checkout · Vercel hosting.

## What works

| Area | Features |
| --- | --- |
| Public site | Home with "I want to study" / "Train my team", catalogue with filters (keyword, learner type, subject, accreditation, format, location, price), course pages with price and VAT, accreditation fields gated by sign-off, WhatsApp click-to-chat, brochure links |
| Enrolment | Learner sign-up with POPIA consent and separate marketing opt-in, order created server-side at the database price, PayFast hosted payment (card / Instant EFT), ITN verification, automatic enrolment |
| Learning | Dashboard with progress, resume at next lesson, video / download / quiz lessons, quizzes marked on the server (answers never sent to the browser), 70% pass mark |
| Leads | Group quotes, multi-learner registration, learnership applications, venue booking requests; each gets a reference, is tagged by type, course and source, and routed to a team |
| Admin | KPIs, leads with status updates, orders, price changes and publish/hide, audit log of every change |

Paid lesson content is protected by row-level security: only enrolled learners and admins can read it.

## Set up

1. **Install:** `npm install`
2. **Supabase:** create a project (EU region recommended for POPIA cross-border adequacy), then in the SQL editor run
   `supabase/migrations/0001_init.sql`, then `supabase/seed.sql`.
   For quick demos, turn off **Authentication → Sign In / Providers → Confirm email**.
3. **Environment:** copy `.env.example` to `.env.local` and fill in the Supabase URL, anon key, service-role key and PayFast sandbox details.
4. **Run:** `npm run dev` and open http://localhost:3000
5. **Make yourself admin:** sign up in the app, then run in the SQL editor:
   ```sql
   update public.profiles set role = 'admin'
   where id = (select id from auth.users where email = 'you@example.com');
   ```

## PayFast

- Create a free sandbox account at https://sandbox.payfast.co.za and copy its merchant ID, merchant key and passphrase into `.env.local`.
- PayFast confirms payments by calling `/api/payfast/notify` (ITN). It must be a public URL, so ITN only works on the deployed site (or through a tunnel such as ngrok).
- On localhost, `ALLOW_SANDBOX_SIMULATION=true` shows a **Simulate payment confirmation** button on the payment status page. **Set it to `false` in production.**
- Switch to live payments with `PAYFAST_MODE=live` and live merchant details.

ITN checks: signature, PayFast server validation, amount matches the order. Source-IP checking can be added before go-live.

## Deploy (Vercel)

Import the repo in Vercel, add the environment variables from `.env.example` (set `NEXT_PUBLIC_SITE_URL` to the Vercel URL), and deploy.

## Ownership

All code, the database and hosting accounts transfer to Training Africa Academy at handover. No proprietary components.

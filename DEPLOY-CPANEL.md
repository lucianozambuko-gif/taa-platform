# Deploying on cPanel

The platform runs on any cPanel hosting that offers **Setup Node.js App**. The database, logins and file storage stay on Supabase, so cPanel only runs the website itself.

You upload one ready-made folder: no building or `npm install` on the server.

## What you need

| | |
| --- | --- |
| cPanel with **Setup Node.js App** (Software section) | Node.js **20 or 22** (18.18 is the minimum) |
| Memory | At least 1 GB for the app; check **Resource Usage** in cPanel |
| The package | `taa-platform-cpanel.zip` (or build it: `npm run build:cpanel`) |
| Settings | Supabase keys, PayFast details, a `CRON_SECRET` (see `.env.example` in the package) |

### 0. Check the hosting supports Node.js

In cPanel, search for **Setup Node.js App**. If it isn't there, the plan is PHP-only. Ask the host to enable the Node.js selector (CloudLinux) or move to a plan or VPS that has it. xneelo, Afrihost and domains.co.za offer plans with it.

## First deployment, on a test subdomain

### 1. Create the subdomain

**Domains → Create a new domain**, for example `new.trainingafricaacademy.co.za`. Then run **SSL/TLS Status → Run AutoSSL** so it has HTTPS.

### 2. Create the Node.js app

**Setup Node.js App → Create Application**

| Field | Value |
| --- | --- |
| Node.js version | 20.x or 22.x |
| Application mode | Production |
| Application root | `taa-platform` |
| Application URL | the subdomain from step 1 |
| Application startup file | `app.js` |

Click **Create**, then **Stop App** for now.

### 3. Upload the package

1. **File Manager** → open your home folder → **Upload** `taa-platform-cpanel.zip`.
2. Right-click it → **Extract** into the home folder. This fills the `taa-platform` folder.
3. Turn on **Settings → Show hidden files** and check that `taa-platform` contains `app.js`, `server.js`, `.next`, `node_modules` and `public`. If they sit one level deeper (`taa-platform/taa-platform/...`), move them up.

**Do not click "Run NPM Install".** Everything the app needs is already in the package.

### 4. Enter the settings

Either:

- **File Manager:** copy `taa-platform/.env.example` to `taa-platform/.env` and fill it in, or
- **Setup Node.js App → Edit → Environment variables:** add the same names and values (these win over the file).

Required: `SITE_URL` (the https address from step 1), the three Supabase values, the PayFast values, `ALLOW_SANDBOX_SIMULATION=false` and `CRON_SECRET`.

The site address is read when the app starts, so moving to the main domain later only needs `SITE_URL` changed, not a new package.

### 5. Start it

**Setup Node.js App → Start App** (or **Restart** after any change), then open the subdomain. The first page can take a few seconds while the app wakes up.

### 6. Allow logins on the new address (Supabase)

Supabase dashboard → **Authentication → URL Configuration → Redirect URLs** → add `https://new.trainingafricaacademy.co.za/**`. Without this, sign-up and password emails point to the old address.

### 7. Payments (PayFast)

Nothing to change in PayFast. Every payment tells PayFast to confirm to `SITE_URL/api/payfast/notify`. Test with `PAYFAST_MODE=sandbox` first. Go live with `PAYFAST_MODE=live` and the live merchant ID, key and passphrase.

### 8. Scheduled jobs (reminders, unpaid checkouts, monthly report)

Choose **one** of these:

- **Supabase (recommended):** run `point-scheduled-jobs.sql` (in `deploy/cpanel/`) in the Supabase SQL editor, with your `SITE_URL` and `CRON_SECRET` filled in.
- **cPanel Cron Jobs:** add three jobs (cPanel uses the server's time zone, usually SAST):

  | When | Command |
  | --- | --- |
  | Hourly at :15 | `curl -s -H "x-cron-key: YOUR_CRON_SECRET" https://YOUR-SITE/api/cron/hourly > /dev/null` |
  | Daily 07:05 | `curl -s -H "x-cron-key: YOUR_CRON_SECRET" https://YOUR-SITE/api/cron/daily > /dev/null` |
  | 1st of the month 07:10 | `curl -s -H "x-cron-key: YOUR_CRON_SECRET" https://YOUR-SITE/api/cron/monthly > /dev/null` |

### 9. WhatsApp (only if the WhatsApp Cloud API is used)

Meta Developer dashboard → WhatsApp → Configuration → Callback URL: `https://YOUR-SITE/api/whatsapp/webhook`, with the same `WHATSAPP_VERIFY_TOKEN`.

### 10. Test before you share it

- [ ] Home, catalogue and a course page load on a phone
- [ ] Sign up, confirm the email, log in
- [ ] Sandbox payment → learner enrolled → first lesson opens
- [ ] A group-quote or contact form arrives in the admin leads list
- [ ] Staff logins (admin, sales, facilitator, moderator) open their workspaces
- [ ] `https://YOUR-SITE/robots.txt` shows the new address in the Sitemap line

## Moving to the main domain

1. Back up the current website (cPanel **Backup** or the host's backup tool).
2. In **Setup Node.js App → Edit**, set **Application URL** to the main domain, or create a second app for it with the same root folder.
3. Change `SITE_URL` to `https://trainingafricaacademy.co.za` and **Restart**.
4. Add the main domain to the Supabase **Redirect URLs** and set it as the **Site URL**.
5. Run `point-scheduled-jobs.sql` again with the new address (or update the cPanel cron commands).
6. Update the WhatsApp callback URL if used.

## Updating the site later

On a computer with Node.js 20+:

```bash
npm install
# .env.production.local needs NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
npm run build:cpanel
```

Upload the new `cpanel-build/taa-platform-cpanel.zip`, extract it over the old files (your `.env` is not in the zip, so it stays), and **Restart** the app.

## If something goes wrong

| Problem | Fix |
| --- | --- |
| "Incomplete response" or 503 | Open `taa-platform/stderr.log`. Usually a missing setting or the wrong Node.js version |
| `Cannot find module './server.js'` | The files were extracted one folder too deep (step 3) |
| Page loads without styling | `.next/static` is missing: re-extract with hidden files included |
| Logins send people to the old site | Add the address in Supabase Redirect URLs (step 6) and check `SITE_URL` |
| Payments stay "pending" | `SITE_URL` must be the public https address; PayFast can't reach a site behind a password or with an invalid certificate |
| App stops under load | The plan's memory or process limit is too low; ask the host to raise it |

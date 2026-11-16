import Link from "next/link";
import { redirect } from "next/navigation";
import { createAdminClient, getUserAndProfile } from "@/lib/supabase/server";
import { env, siteUrl } from "@/lib/env";
import { bunnyConfig } from "@/lib/bunny";

export const metadata = { title: "Go-live check" };
export const dynamic = "force-dynamic";

type Row = { name: string; need: "Required" | "Recommended" | "Optional"; ok: boolean | null; detail: string; fix?: string };
type Group = { title: string; rows: Row[] };

const has = (...names: string[]) => names.every((n) => !!env(n));

async function pingBunny(): Promise<{ ok: boolean; detail: string }> {
  const cfg = bunnyConfig();
  if (!cfg) return { ok: false, detail: "Not set" };
  try {
    const r = await fetch(`https://video.bunnycdn.com/library/${cfg.libraryId}/videos?page=1&itemsPerPage=1`, { headers: { AccessKey: cfg.apiKey, accept: "application/json" }, cache: "no-store" });
    if (!r.ok) return { ok: false, detail: `Bunny answered ${r.status}: check the library ID and API key` };
    const j = (await r.json()) as { totalItems?: number };
    return { ok: true, detail: `Connected to library ${cfg.libraryId} · ${j.totalItems ?? 0} videos` };
  } catch {
    return { ok: false, detail: "Couldn't reach Bunny Stream from this server" };
  }
}

async function pingSupabase(): Promise<{ ok: boolean; detail: string }> {
  try {
    const { count, error } = await createAdminClient().from("courses").select("id", { count: "exact", head: true });
    if (error) return { ok: false, detail: error.message };
    return { ok: true, detail: `Connected · ${count ?? 0} courses` };
  } catch (e) {
    return { ok: false, detail: e instanceof Error ? e.message : "Couldn't connect" };
  }
}

/** One page that shows whether every service the platform relies on is set up on this server. */
export default async function SetupPage() {
  const { user, profile } = await getUserAndProfile();
  if (!user) redirect("/login?next=/admin/setup");
  if (profile?.role !== "admin") redirect("/admin");

  const site = siteUrl();
  const [sb, bunny] = await Promise.all([pingSupabase(), pingBunny()]);
  const live = env("PAYFAST_MODE") === "live";
  const cfg = bunnyConfig();

  const groups: Group[] = [
    { title: "Website", rows: [
      { name: "Site address (SITE_URL)", need: "Required", ok: /^https:\/\//.test(site) && !/localhost|vercel\.app/.test(site), detail: site, fix: "Set SITE_URL to the https address learners use, then restart the app." },
      { name: "Database and logins (Supabase)", need: "Required", ok: sb.ok, detail: sb.detail, fix: "Check NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY." },
      { name: "Scheduled jobs secret (CRON_SECRET)", need: "Required", ok: has("CRON_SECRET"), detail: has("CRON_SECRET") ? "Set" : "Not set: reminders and reports won't run", fix: "Set CRON_SECRET, then point the jobs at this address (deploy/cpanel/point-scheduled-jobs.sql)." },
    ]},
    { title: "Payments (PayFast)", rows: [
      { name: "Merchant details", need: "Required", ok: has("PAYFAST_MERCHANT_ID", "PAYFAST_MERCHANT_KEY"), detail: has("PAYFAST_MERCHANT_ID", "PAYFAST_MERCHANT_KEY") ? `Set · ${live ? "LIVE payments" : "sandbox (test) payments"}` : "Not set" },
      { name: "Passphrase", need: live ? "Required" : "Recommended", ok: has("PAYFAST_PASSPHRASE"), detail: has("PAYFAST_PASSPHRASE") ? "Set" : "Not set", fix: "Use the same passphrase as in the PayFast dashboard (Settings → Developer settings)." },
      { name: "Test payment button switched off", need: "Required", ok: env("ALLOW_SANDBOX_SIMULATION") !== "true", detail: env("ALLOW_SANDBOX_SIMULATION") === "true" ? "ON: anyone could fake a payment" : "Off", fix: "Set ALLOW_SANDBOX_SIMULATION=false." },
      { name: "Live mode", need: "Recommended", ok: live, detail: live ? "Live" : "Sandbox: no real money moves yet", fix: "When testing is done: PAYFAST_MODE=live with the live merchant ID, key and passphrase." },
    ]},
    { title: "Lesson videos (Bunny Stream)", rows: [
      { name: "Video library and API key", need: "Required", ok: bunny.ok, detail: bunny.detail, fix: "Set BUNNY_STREAM_LIBRARY_ID and BUNNY_STREAM_API_KEY (Bunny → Stream → your library → API)." },
      { name: "Protected video links", need: "Recommended", ok: !!cfg?.tokenKey, detail: cfg?.tokenKey ? "Player links are signed and expire" : "Off: anyone with a video link can watch it", fix: "Turn on Embed view token authentication in the library's Security tab and set BUNNY_STREAM_TOKEN_KEY." },
      { name: "Offline copies and thumbnails (CDN host)", need: "Recommended", ok: !!cfg?.cdnHost, detail: cfg?.cdnHost ?? "Not set: 'Save video to this phone' is off", fix: "Set BUNNY_STREAM_CDN_HOST (e.g. vz-abc123.b-cdn.net) and turn on MP4 fallback in the library's Encoding tab." },
    ]},
    { title: "Messages", rows: [
      { name: "Email (Resend)", need: "Required", ok: has("RESEND_API_KEY", "NOTIFY_FROM"), detail: has("RESEND_API_KEY") ? `From: ${env("NOTIFY_FROM") ?? "not set"}` : "Not set: no enrolment, payment or staff alert emails", fix: "Set RESEND_API_KEY and NOTIFY_FROM, and verify the sending domain in Resend." },
      { name: "Staff alert inbox", need: "Recommended", ok: has("STAFF_NOTIFY_EMAIL"), detail: env("STAFF_NOTIFY_EMAIL") ?? "Not set" },
      { name: "WhatsApp click-to-chat number", need: "Recommended", ok: has("NEXT_PUBLIC_WHATSAPP_NUMBER"), detail: env("NEXT_PUBLIC_WHATSAPP_NUMBER") ?? "Not set" },
      { name: "Automated WhatsApp (Cloud API)", need: "Optional", ok: has("WHATSAPP_TOKEN", "WHATSAPP_PHONE_ID") ? true : null, detail: has("WHATSAPP_TOKEN", "WHATSAPP_PHONE_ID") ? "Set" : "Not used" },
    ]},
    { title: "Growth", rows: [
      { name: "Google Analytics", need: "Recommended", ok: has("NEXT_PUBLIC_GA_ID") ? true : null, detail: env("NEXT_PUBLIC_GA_ID") ?? "Not set" },
      { name: "Google Search Console", need: "Optional", ok: has("GOOGLE_SITE_VERIFICATION") ? true : null, detail: has("GOOGLE_SITE_VERIFICATION") ? "Set" : "Not set" },
      { name: "AI course advisor", need: "Optional", ok: has("ANTHROPIC_API_KEY") ? true : null, detail: has("ANTHROPIC_API_KEY") ? "On" : "Off: visitors are sent to WhatsApp instead" },
    ]},
  ];

  const missing = groups.flatMap((g) => g.rows).filter((r) => r.need === "Required" && r.ok === false);
  const icon = (r: Row) => (r.ok === true ? <span className="badge b-good">✓</span> : r.ok === false ? <span className={`badge ${r.need === "Required" ? "b-warn" : "b-short"}`}>{r.need === "Required" ? "Missing" : "Not set"}</span> : <span className="badge b-short">Optional</span>);

  return (
    <section className="block" style={{ paddingTop: 28 }}>
      <div className="wrap stack" style={{ gap: 18 }}>
        <div>
          <div className="eyebrow">Admin · Go-live check</div>
          <h1 style={{ fontSize: "1.6rem" }}>{missing.length ? `${missing.length} required ${missing.length === 1 ? "setting is" : "settings are"} missing` : "Everything required is set up"}</h1>
          <p className="muted">What this server is connected to. Settings live in cPanel (Setup Node.js App → Environment variables, or the .env file); restart the app after changing them. Secret values are never shown here.</p>
        </div>
        {groups.map((g) => (
          <div className="card" key={g.title} style={{ padding: 16 }}>
            <h2 style={{ fontSize: "1.1rem", marginBottom: 8 }}>{g.title}</h2>
            <table>
              <tbody>
                {g.rows.map((r) => (
                  <tr key={r.name}>
                    <td style={{ width: 110 }}>{icon(r)}</td>
                    <td><b>{r.name}</b> <span className="small muted">· {r.need}</span><div className="small">{r.detail}</div>{r.ok === false && r.fix && <div className="small muted">{r.fix}</div>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
        <p className="small muted">Full steps: DEPLOY-CPANEL.md in the code. <Link href="/admin">Back to the dashboard</Link></p>
      </div>
    </section>
  );
}

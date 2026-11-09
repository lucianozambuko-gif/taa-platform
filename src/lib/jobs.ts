// Server-only scheduled jobs. Called by /api/cron/<job>, which Supabase pg_cron hits on a schedule.
import { createAdminClient } from "@/lib/supabase/server";
import { notify } from "@/lib/notify";
import { rand } from "@/lib/format";

type Admin = ReturnType<typeof createAdminClient>;
const H = 3600e3;
const D = 24 * H;
const iso = (ms: number) => new Date(Date.now() - ms).toISOString();

/** Was a notification of this kind (and optional link) sent to this user since `sinceMs` ago? */
async function sentRecently(admin: Admin, userId: string | null, kind: string, sinceMs: number, link?: string) {
  let q = admin.from("notifications").select("id").eq("kind", kind).gte("created_at", iso(sinceMs)).limit(1);
  q = userId ? q.eq("user_id", userId) : q.is("user_id", null);
  if (link) q = q.eq("link", link);
  return !!(await q).data?.length;
}

/** Hourly: one automatic follow-up about an hour after an unpaid checkout. */
export async function abandonedCheckouts(admin: Admin) {
  const { data } = await admin
    .from("orders")
    .select("id, user_id, amount_cents, courses(title)")
    .eq("status", "pending")
    .is("auto_followed_at", null)
    .is("followed_up_at", null)
    .lte("created_at", iso(H))
    .gte("created_at", iso(2 * D));
  for (const o of data ?? []) {
    const title = (o.courses as unknown as { title: string } | null)?.title ?? "your course";
    await notify({
      userId: o.user_id, audience: "learner", kind: "checkout_follow_up",
      subject: `Finish enrolling in ${title}`,
      body: `Your payment of ${rand(o.amount_cents)} for ${title} wasn't completed. Your place is still open: you can pay by card or Instant EFT in a minute. Reply on WhatsApp if you need help.`,
      link: `/checkout/pay/${o.id}`,
    });
    await admin.from("orders").update({ auto_followed_at: new Date().toISOString() }).eq("id", o.id);
  }
  return { checkouts: data?.length ?? 0 };
}

/** Daily: "2 lessons left", "we miss you", intake reminders and instalments due. */
export async function learnerReminders(admin: Admin) {
  let progress = 0, intake = 0, instalments = 0;
  const { data: enrols } = await admin
    .from("enrolments")
    .select("user_id, created_at, course_id, courses(title, slug, has_lms, certificate_auto, intakes, modules(lessons(id)))");
  const { data: prog } = await admin.from("lesson_progress").select("user_id, lesson_id, completed_at");
  type E = { user_id: string; created_at: string; course_id: string; courses: { title: string; slug: string; has_lms: boolean; certificate_auto: boolean; intakes: string[]; modules: { lessons: { id: string }[] }[] } };
  for (const e of (enrols ?? []) as unknown as E[]) {
    const c = e.courses;
    if (c.has_lms) {
      const ids = c.modules.flatMap((m) => m.lessons.map((l) => l.id));
      const mine = (prog ?? []).filter((p) => p.user_id === e.user_id && ids.includes(p.lesson_id));
      const left = ids.length - mine.length;
      if (!ids.length || left <= 0) continue;
      const last = mine.map((p) => p.completed_at as string).sort().at(-1) ?? e.created_at;
      const idle = Date.now() - new Date(last).getTime();
      const link = `/learn/${c.slug}`;
      if (await sentRecently(admin, e.user_id, "reminder_progress", 6 * D, link)) continue;
      if (left <= 2 && idle > D) {
        await notify({ userId: e.user_id, audience: "learner", kind: "reminder_progress", subject: `You're ${left} lesson${left > 1 ? "s" : ""} from finishing ${c.title}`, body: `Pick up where you stopped${c.certificate_auto ? " and download your certificate when you're done" : ""}.`, link });
        progress++;
      } else if (idle > 7 * D) {
        await notify({ userId: e.user_id, audience: "learner", kind: "reminder_progress", subject: `Keep going with ${c.title}`, body: `You have ${left} lessons left. Ten minutes today keeps you on track, and your progress is saved.`, link });
        progress++;
      }
    } else {
      // Classroom intake within the next 7 days (intakes are written like "19 January 2027")
      const next = c.intakes.map((s) => ({ s, t: Date.parse(s.replace(/^(\w+day),?\s*/i, "")) })).find((x) => !isNaN(x.t) && x.t > Date.now());
      if (!next || next.t - Date.now() > 7 * D) continue;
      if (await sentRecently(admin, e.user_id, "reminder_intake", 30 * D, `/courses/${c.slug}`)) continue;
      await notify({ userId: e.user_id, audience: "learner", kind: "reminder_intake", subject: `${c.title} starts ${next.s}`, body: `Your class starts on ${next.s}. Bring your ID and arrive 15 minutes early. WhatsApp us if you can't make it.`, link: `/courses/${c.slug}` });
      intake++;
    }
  }
  // Instalments: next payment due 30 days after the last one
  const { data: plans } = await admin.from("orders").select("plan_id, user_id, status, paid_at, instalments, amount_cents, plan_total_cents, courses(title)").not("plan_id", "is", null);
  const byPlan = new Map<string, NonNullable<typeof plans>>();
  for (const o of plans ?? []) byPlan.set(o.plan_id!, [...(byPlan.get(o.plan_id!) ?? []), o]);
  for (const [planId, os] of byPlan) {
    const paid = os.filter((o) => o.status === "paid");
    if (!paid.length || paid.length >= os[0].instalments) continue;
    const lastPaid = paid.map((o) => o.paid_at as string).sort().at(-1)!;
    if (Date.now() - new Date(lastPaid).getTime() < 27 * D) continue;
    const userId = os[0].user_id;
    if (await sentRecently(admin, userId, "reminder_instalment", 6 * D, `/dashboard?plan=${planId}`)) continue;
    const left = (os[0].plan_total_cents ?? 0) - paid.reduce((a, o) => a + o.amount_cents, 0);
    await notify({ userId, audience: "learner", kind: "reminder_instalment", subject: `Instalment ${paid.length + 1} of ${os[0].instalments} is due`, body: `Your next payment for ${(os[0].courses as unknown as { title: string }).title} is due. ${rand(left)} is left on your plan. Pay from your dashboard in a minute.`, link: `/dashboard?plan=${planId}` });
    instalments++;
  }
  return { progress, intake, instalments };
}

/** Daily: remind lead owners about enquiries untouched for 3 days (one digest per owner). */
export async function staffTaskReminders(admin: Admin) {
  const { data: leads } = await admin.from("leads").select("ref, name, status, assigned_to, routed_to, created_at, updated_at").in("status", ["new", "contacted", "quoted"]);
  const stale = (leads ?? []).filter((l) => Date.now() - new Date(l.updated_at ?? l.created_at).getTime() > 3 * D);
  const byOwner = new Map<string | null, typeof stale>();
  for (const l of stale) byOwner.set(l.assigned_to, [...(byOwner.get(l.assigned_to) ?? []), l]);
  for (const [owner, ls] of byOwner) {
    if (await sentRecently(admin, owner, "task_reminder", 20 * H)) continue;
    await notify({
      userId: owner, audience: "staff", kind: "task_reminder", whatsapp: false,
      subject: `${ls.length} enquir${ls.length === 1 ? "y has" : "ies have"} had no update for 3+ days`,
      body: ls.slice(0, 10).map((l) => `${l.ref} ${l.name} (${l.status}${owner ? "" : `, ${l.routed_to}`})`).join("; ") + (ls.length > 10 ? `; and ${ls.length - 10} more` : ""),
      link: owner ? "/admin?tab=leads&view=mine" : "/admin?tab=leads&view=unassigned",
    });
  }
  return { staleLeads: stale.length };
}

/** Monthly (or on demand): management report by email. */
export async function managementReport(admin: Admin, days = 30) {
  const since = iso(days * D);
  const [{ data: leads }, { data: orders }, { data: enrols }, { data: events }, { data: results }] = await Promise.all([
    admin.from("leads").select("type, status").gte("created_at", since),
    admin.from("orders").select("status, amount_cents, courses(title)").gte("created_at", since),
    admin.from("enrolments").select("id, courses(title)").gte("created_at", since),
    admin.from("site_events").select("kind").gte("created_at", since),
    admin.from("enrolments").select("result").gte("assessed_at", since),
  ]);
  const paid = (orders ?? []).filter((o) => o.status === "paid");
  const sales = paid.reduce((a, o) => a + o.amount_cents, 0);
  const top = new Map<string, number>();
  for (const e of enrols ?? []) {
    const t = (e.courses as unknown as { title: string } | null)?.title ?? "Course";
    top.set(t, (top.get(t) ?? 0) + 1);
  }
  const topList = [...top.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([t, n]) => `${t} (${n})`).join(", ") || "none";
  const won = (leads ?? []).filter((l) => l.status === "won").length;
  const body = [
    `Last ${days} days at Training Africa Academy:`,
    `Enquiries: ${(leads ?? []).length} (${won} won).`,
    `Sales: ${rand(sales)} from ${paid.length} paid orders; ${(orders ?? []).filter((o) => o.status !== "paid").length} unpaid checkouts.`,
    `New enrolments: ${(enrols ?? []).length}. Top courses: ${topList}.`,
    `Assessment results recorded: ${(results ?? []).length} (${(results ?? []).filter((r) => r.result === "competent").length} competent).`,
    `Brochure downloads: ${(events ?? []).filter((e) => e.kind === "brochure_download").length}. WhatsApp chats started: ${(events ?? []).filter((e) => e.kind === "whatsapp_routed" || e.kind === "whatsapp_click").length}.`,
  ].join(" ");
  await notify({ audience: "staff", kind: "management_report", whatsapp: false, toEmail: process.env.MANAGEMENT_REPORT_EMAIL || process.env.STAFF_NOTIFY_EMAIL || null, subject: `Monthly report: ${new Date().toLocaleDateString("en-ZA", { month: "long", year: "numeric" })}`, body, link: "/admin" });
  return { sent: true };
}

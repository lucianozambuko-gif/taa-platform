import { NextResponse } from "next/server";
import { LEAD_LABEL } from "@/lib/format";
import { getUserAndProfile } from "@/lib/supabase/server";

const cell = (v: unknown) => {
  const s = v == null ? "" : String(v);
  const safe = /^[=+\-@]/.test(s) ? `'${s}` : s; // stop spreadsheet formula injection
  return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};
const csv = (rows: unknown[][]) => rows.map((r) => r.map(cell).join(",")).join("\r\n");

/** CSV exports for sales staff and admins: leads, orders and learner completion records. */
export async function GET(_: Request, { params }: { params: Promise<{ kind: string }> }) {
  const { kind } = await params;
  const { supabase, user, profile } = await getUserAndProfile();
  if (!user || !["admin", "sales"].includes(profile?.role ?? "")) return new NextResponse("Not allowed", { status: 403 });
  let rows: unknown[][] = [];

  if (kind === "leads") {
    const { data } = await supabase.from("leads").select("*, courses(title)").order("created_at", { ascending: false });
    rows = [["Ref", "Received", "Type", "Name", "Company", "Email", "Phone", "Course", "Staff count", "Source", "Routed to", "Status", "Notes"]];
    for (const l of data ?? []) rows.push([l.ref, l.created_at, LEAD_LABEL[l.type] ?? l.type, l.name, l.company, l.email, l.phone, (l.courses as { title: string } | null)?.title, l.staff_count, l.source, l.routed_to, l.status, l.notes]);
  } else if (kind === "orders") {
    const [{ data }, { data: profs }] = await Promise.all([
      supabase.from("orders").select("*, courses(title)").order("created_at", { ascending: false }),
      supabase.from("profiles").select("id, full_name, phone"),
    ]);
    const who = new Map((profs ?? []).map((p) => [p.id, p]));
    rows = [["Invoice", "Created", "Learner", "Phone", "Course", "Amount (R)", "Coupon", "Discount (R)", "Status", "Payment ref", "Paid at", "Refunded at", "Staff note"]];
    for (const o of data ?? []) rows.push([o.invoice_no, o.created_at, who.get(o.user_id)?.full_name, who.get(o.user_id)?.phone, (o.courses as { title: string } | null)?.title, (o.amount_cents / 100).toFixed(2), o.coupon_code, ((o.discount_cents ?? 0) / 100).toFixed(2), o.status, o.gateway_payment_id, o.paid_at, o.refunded_at, o.staff_note]);
  } else if (kind === "learners") {
    const [{ data: enrols }, { data: prog }, { data: profs }] = await Promise.all([
      supabase.from("enrolments").select("id, user_id, source, created_at, result, assessed_at, courses(title, code, modules(lessons(id)))"),
      supabase.from("lesson_progress").select("user_id, lesson_id, completed_at"),
      supabase.from("profiles").select("id, full_name, phone"),
    ]);
    const who = new Map((profs ?? []).map((p) => [p.id, p]));
    rows = [["Learner", "Phone", "Course", "Code", "Enrolled", "How", "Lessons done", "Lessons total", "Progress %", "Last activity", "Result", "Assessed"]];
    type E = { user_id: string; source: string; created_at: string; result: string | null; assessed_at: string | null; courses: { title: string; code: string; modules: { lessons: { id: string }[] }[] } };
    for (const e of (enrols ?? []) as unknown as E[]) {
      const ids = e.courses.modules.flatMap((m) => m.lessons.map((l) => l.id));
      const mine = (prog ?? []).filter((p) => p.user_id === e.user_id && ids.includes(p.lesson_id));
      rows.push([who.get(e.user_id)?.full_name, who.get(e.user_id)?.phone, e.courses.title, e.courses.code, e.created_at, e.source, mine.length, ids.length, ids.length ? Math.round((mine.length / ids.length) * 100) : "", mine.map((p) => p.completed_at).sort().at(-1) ?? "", e.result ?? "", e.assessed_at ?? ""]);
    }
  } else return new NextResponse("Unknown export", { status: 404 });

  await supabase.from("audit_log").insert({ actor: user.id, action: "export", entity: kind, detail: { rows: rows.length - 1 } });
  return new NextResponse("﻿" + csv(rows), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="taa-${kind}-${new Date().toISOString().slice(0, 10)}.csv"`,
      "cache-control": "no-store",
    },
  });
}

import { NextResponse } from "next/server";
import { employerStaff } from "@/lib/employer";
import { getUserAndProfile } from "@/lib/supabase/server";

const cell = (v: unknown) => {
  const s = v == null ? "" : String(v);
  const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
  return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};

/** CSV for the employer: staff progress, or the B-BBEE skills development layout for the verification agent. */
export async function GET(req: Request) {
  const { supabase, user, profile } = await getUserAndProfile();
  if (!user || profile?.role !== "employer") return new NextResponse("Not allowed", { status: 403 });
  const { data: me } = await supabase.from("profiles").select("company").eq("id", user.id).single();
  if (!me?.company) return new NextResponse("No company linked", { status: 403 });
  const rows = await employerStaff(supabase, me.company);
  const bbbee = new URL(req.url).searchParams.get("type") === "bbbee";
  const table: unknown[][] = bbbee
    ? [["Learner", "Course", "Course code", "Programme type", "Start date", "Status", "Cost (ZAR, list price incl. VAT)", "Race (verification agent)", "Gender (verification agent)", "Disability (verification agent)"],
       ...rows.map((r) => [r.learner, r.course, r.code, r.kind === "short" ? "Skills programme" : "Accredited", r.enrolled.slice(0, 10), r.status, ((r.price_cents ?? 0) / 100).toFixed(2), "", "", ""])]
    : [["Learner", "Course", "Code", "Enrolled", "Online progress %", "Days attended", "Last activity", "Status"],
       ...rows.map((r) => [r.learner, r.course, r.code, r.enrolled.slice(0, 10), r.pct ?? "", r.sessions ? `${r.attended}/${r.sessions}` : "", r.last?.slice(0, 10) ?? "", r.status])];
  return new NextResponse("﻿" + table.map((r) => r.map(cell).join(",")).join("\r\n"), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${me.company.replace(/\W+/g, "-")}-${bbbee ? "skills-development" : "staff-progress"}.csv"`,
      "cache-control": "no-store",
    },
  });
}

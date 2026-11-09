import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { abandonedCheckouts, learnerReminders, managementReport, staffTaskReminders } from "@/lib/jobs";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Scheduled jobs, called by Supabase pg_cron with the shared CRON_SECRET. */
export async function GET(req: Request, { params }: { params: Promise<{ job: string }> }) {
  const secret = process.env.CRON_SECRET;
  const given = req.headers.get("x-cron-key") ?? new URL(req.url).searchParams.get("key");
  if (!secret || given !== secret) return new NextResponse("Not allowed", { status: 401 });
  const { job } = await params;
  const admin = createAdminClient();
  const out: Record<string, unknown> = {};
  if (job === "hourly") Object.assign(out, await abandonedCheckouts(admin));
  else if (job === "daily") Object.assign(out, await learnerReminders(admin), await staffTaskReminders(admin));
  else if (job === "monthly") Object.assign(out, await managementReport(admin));
  else return new NextResponse("Unknown job", { status: 404 });
  return NextResponse.json({ ok: true, job, ...out });
}

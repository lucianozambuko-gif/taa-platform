import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCourse } from "@/lib/courses";
import { rand, vatIncluded } from "@/lib/format";
import { getUserAndProfile } from "@/lib/supabase/server";
import { startCheckout } from "../actions";

export const metadata = { title: "Enrol" };
export const dynamic = "force-dynamic";

export default async function CheckoutPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const course = await getCourse(slug);
  if (!course || course.price_basis !== "fixed" || course.price_cents == null) notFound();
  const { supabase, user, profile } = await getUserAndProfile();
  if (!user) redirect(`/login?next=/checkout/${slug}`);
  if (profile?.role === "admin" || profile?.role === "facilitator") redirect(`/courses/${slug}`);
  const { data: enrolled } = await supabase.from("enrolments").select("id").eq("course_id", course.id).eq("user_id", user.id).maybeSingle();
  if (enrolled) redirect(course.has_lms ? `/learn/${slug}` : "/dashboard");

  return (
    <section className="block" style={{ paddingTop: 32 }}>
      <div className="wrap">
        <div className="steps"><span className="on">1. Confirm</span><span>2. Secure payment</span><span>3. Start learning</span></div>
        <h1 style={{ fontSize: "clamp(1.7rem,3.4vw,2.3rem)", marginBottom: 20 }}>Enrol in {course.title}</h1>
        <div className="co">
          <form action={startCheckout} className="panel stack" style={{ gap: 14 }}>
            <input type="hidden" name="slug" value={course.slug} />
            <h2 style={{ fontSize: "1.25rem" }}>Your details</h2>
            <div className="card" style={{ padding: 14 }}>
              <div className="sumrow"><span className="muted">Name</span><span>{profile?.full_name ?? "—"}</span></div>
              <div className="sumrow"><span className="muted">Email</span><span>{user.email}</span></div>
              <div className="sumrow"><span className="muted">Mobile</span><span>{profile?.phone ?? "—"}</span></div>
            </div>
            <p className="small muted">
              You'll pay on PayFast's secure page by card or Instant EFT. As soon as payment is confirmed, the course appears in your dashboard.
            </p>
            <div><button className="btn btn-primary">Continue to secure payment</button></div>
            <p className="small muted"><Link href={`/courses/${course.slug}`}>Back to course details</Link></p>
          </form>
          <aside className="panel stack" style={{ gap: 6 }}>
            <div className="eyebrow">Order summary</div>
            <h3 style={{ margin: "4px 0 8px" }}>{course.title}</h3>
            <p className="small muted">{course.format_note} · {course.intakes[0]}</p>
            <div className="sumrow tnum" style={{ marginTop: 8 }}><span>Course fee</span><span>{rand(course.price_cents)}</span></div>
            <div className="sumrow tnum muted small"><span>VAT included (15%)</span><span>{rand(vatIncluded(course.price_cents))}</span></div>
            <div className="sumrow total tnum"><span>Total</span><span>{rand(course.price_cents)}</span></div>
            <p className="small muted" style={{ marginTop: 8 }}>This website never stores card details.</p>
          </aside>
        </div>
      </div>
    </section>
  );
}

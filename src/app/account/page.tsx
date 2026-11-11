import Link from "next/link";
import { redirect } from "next/navigation";
import { getUserAndProfile } from "@/lib/supabase/server";
import { loadStudent } from "@/lib/student";
import PortalShell from "@/components/PortalShell";
import { PortalHead } from "@/components/PortalBits";
import AccountForm from "./AccountForm";

export const metadata = { title: "My account" };
export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const { supabase, user, profile: me } = await getUserAndProfile();
  if (!user) redirect("/login?next=/account");
  const { data: profile } = await supabase.from("profiles").select("full_name, phone, whatsapp_opt_in, marketing_opt_in, language").eq("id", user.id).single();
  const body = (
    <div className="stack" style={{ maxWidth: 620, gap: 16 }}>
      <AccountForm profile={profile!} email={user.email ?? ""} />
      <p className="small muted">We use your details only to run your courses, as explained in our <Link href="/privacy">privacy notice</Link>. To delete your account, contact the Academy.</p>
    </div>
  );
  // Learners see their account inside the student portal; staff keep a plain page.
  if (!me?.role || me.role === "learner") {
    const s = await loadStudent("/account");
    return (
      <PortalShell s={s}>
        <PortalHead eyebrow="Student portal" title="Profile and reminders" />
        {body}
      </PortalShell>
    );
  }
  return (
    <section className="block" style={{ paddingTop: 28 }}>
      <div className="wrap stack" style={{ maxWidth: 620, gap: 16 }}>
        <h1 style={{ fontSize: "clamp(1.7rem,3.4vw,2.2rem)" }}>My account and reminders</h1>
        {body}
      </div>
    </section>
  );
}

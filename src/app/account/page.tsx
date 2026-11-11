import Link from "next/link";
import { redirect } from "next/navigation";
import { getUserAndProfile } from "@/lib/supabase/server";
import { loadStudent } from "@/lib/student";
import PortalShell from "@/components/PortalShell";
import { PortalHead } from "@/components/PortalBits";
import Workspace from "@/components/Workspace";
import { WorkHead } from "@/components/WorkBits";
import { WORKSPACE_LABEL, type Role } from "@/lib/roles";
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
  // Learners see their account inside the student portal.
  if (!me?.role || me.role === "learner") {
    const s = await loadStudent("/account");
    return (
      <PortalShell s={s}>
        <PortalHead eyebrow="Student portal" title="Profile and reminders" />
        {body}
      </PortalShell>
    );
  }
  // Staff and employers see it inside their own workspace.
  return (
    <Workspace>
      <WorkHead eyebrow={WORKSPACE_LABEL[me.role as Role] ?? "My account"} title="My profile and reminders" />
      {body}
    </Workspace>
  );
}

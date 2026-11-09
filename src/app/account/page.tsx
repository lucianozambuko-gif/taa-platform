import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AccountForm from "./AccountForm";

export const metadata = { title: "My account" };
export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/account");
  const { data: profile } = await supabase.from("profiles").select("full_name, phone, whatsapp_opt_in, marketing_opt_in, language").eq("id", user.id).single();
  return (
    <section className="block" style={{ paddingTop: 28 }}>
      <div className="wrap stack" style={{ maxWidth: 620, gap: 16 }}>
        <div className="crumbs"><Link href="/dashboard">My learning</Link><span>/</span><span>Account</span></div>
        <h1 style={{ fontSize: "clamp(1.7rem,3.4vw,2.2rem)" }}>My account and reminders</h1>
        <AccountForm profile={profile!} email={user.email ?? ""} />
        <p className="small muted">We use your details only to run your courses, as explained in our <Link href="/privacy">privacy notice</Link>. To delete your account, contact the Academy.</p>
      </div>
    </section>
  );
}

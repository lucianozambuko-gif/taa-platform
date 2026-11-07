import Link from "next/link";
import { getUserAndProfile } from "@/lib/supabase/server";
import { signOut } from "@/app/(auth)/actions";

export default async function SiteHeader() {
  const { user, profile } = await getUserAndProfile();
  return (
    <header className="site">
      <div className="wrap" style={{ position: "relative" }}>
        <Link href="/" className="brand" aria-label="Training Africa Academy home">
          <span className="mark">TA</span>
          <span className="name">
            Training Africa<small>Academy</small>
          </span>
        </Link>
        <input type="checkbox" id="navtoggle" className="navtoggle" aria-label="Show menu" />
        <label htmlFor="navtoggle" className="menu-btn">Menu</label>
        <nav className="navlinks" aria-label="Main">
          <Link href="/courses">Find a course</Link>
          <Link href="/online-learning">Online learning</Link>
          <Link href="/employers">For employers</Link>
          <Link href="/learnerships">Learnerships</Link>
          <Link href="/venue">Assessment centre</Link>
          {user ? (
            <>
              <Link href="/dashboard">My learning</Link>
              {profile?.role === "admin" && <Link href="/admin">Admin</Link>}
              <form action={signOut}>
                <button className="btn btn-ghost btn-sm" type="submit">Sign out</button>
              </form>
            </>
          ) : (
            <Link href="/login" className="btn btn-primary btn-sm" style={{ color: "var(--accent-ink)" }}>Log in</Link>
          )}
        </nav>
      </div>
    </header>
  );
}

import LogoMark from "@/components/LogoMark";
import Link from "next/link";
import { getUserAndProfile } from "@/lib/supabase/server";
import { signOut } from "@/app/(auth)/actions";
import { Suspense } from "react";
import DisplaySettings from "./DisplaySettings";
import NavAutoClose from "./NavAutoClose";
import { getT } from "@/lib/i18n";
import RoleNav from "./RoleNav";
import { menuFor } from "@/lib/menus";

export default async function SiteHeader() {
  const [{ supabase, user, profile }, { lang, t }] = await Promise.all([getUserAndProfile(), getT()]);
  // Staff and employers get a menu built around their work instead of the public website links.
  const roleMenu = user ? await menuFor(supabase, user.id, profile?.role) : null;
  return (
    <header className="site">
      <div className="wrap" style={{ position: "relative" }}>
        <Link href="/" className="brand" aria-label="Training Africa Academy home">
          <span className="mark" aria-hidden="true">
            <LogoMark size={40} />
          </span>
          <span className="name">
            Training <em>Africa</em><small>Academy</small>
          </span>
        </Link>
        <Suspense fallback={null}><NavAutoClose /></Suspense>
        <div className="header-tools">
          <DisplaySettings lang={lang} />
          <input type="checkbox" id="navtoggle" className="navtoggle" aria-label="Show menu" />
          <label htmlFor="navtoggle" className="menu-btn">Menu</label>
        </div>
        <nav className="navlinks" aria-label="Main">
          {roleMenu ? (
            <>
              <Suspense fallback={null}><RoleNav items={roleMenu} /></Suspense>
            </>
          ) : (
            <>
              <Link href="/courses">{t("nav.courses")}</Link>
              <Link href="/online-learning">{t("nav.online")}</Link>
              <Link href="/employers">{t("nav.employers")}</Link>
              <Link href="/learnerships">{t("nav.learnerships")}</Link>
              <Link href="/venue">{t("nav.centre")}</Link>
              <Link href="/search" aria-label={t("nav.search")} className="nav-search">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="6.5" /><path d="M20 20l-4.3-4.3" /></svg>
            <span className="nav-search-label">{t("nav.search")}</span>
              </Link>
            </>
          )}
          {user ? (
            <>
              {!roleMenu && <Link href="/dashboard">{t("nav.mylearning")}</Link>}
              <form action={signOut}>
                <button className="btn btn-ghost btn-sm" type="submit">{t("nav.signout")}</button>
              </form>
            </>
          ) : (
            <Link href="/login" className="btn btn-primary btn-sm" style={{ color: "var(--accent-ink)" }}>{t("nav.login")}</Link>
          )}
        </nav>
      </div>
    </header>
  );
}

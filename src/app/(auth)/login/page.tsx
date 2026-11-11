import AuthForm from "../AuthForm";

export const metadata = { title: "Log in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string; email?: string }> }) {
  const { next = "/dashboard", error, email } = await searchParams;
  // Demo links (e.g. from the presentation) can fill in the email address.
  const prefill = email && /^[^\s@]{1,64}@[^\s@]{1,190}$/.test(email) ? email : undefined;
  return (
    <section className="block">
      <div className="wrap auth stack" style={{ gap: 18 }}>
        <div>
          <div className="eyebrow">My learning</div>
          <h1 style={{ fontSize: "2rem", marginTop: 6 }}>Log in</h1>
        </div>
        {error === "link" && <p className="form-error">That confirmation link has expired or was already used. Log in, or sign up again for a new link.</p>}
        <AuthForm mode="login" next={next} email={prefill} />
      </div>
    </section>
  );
}

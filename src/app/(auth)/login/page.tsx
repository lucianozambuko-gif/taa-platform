import AuthForm from "../AuthForm";

export const metadata = { title: "Log in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next = "/dashboard", error } = await searchParams;
  return (
    <section className="block">
      <div className="wrap auth stack" style={{ gap: 18 }}>
        <div>
          <div className="eyebrow">My learning</div>
          <h1 style={{ fontSize: "2rem", marginTop: 6 }}>Log in</h1>
        </div>
        {error === "link" && <p className="form-error">That confirmation link has expired or was already used. Log in, or sign up again for a new link.</p>}
        <AuthForm mode="login" next={next} />
      </div>
    </section>
  );
}

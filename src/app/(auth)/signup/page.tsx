import AuthForm from "../AuthForm";

export const metadata = { title: "Create an account" };

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next = "/dashboard" } = await searchParams;
  return (
    <section className="block">
      <div className="wrap auth stack" style={{ gap: 18 }}>
        <div>
          <div className="eyebrow">Enrol online</div>
          <h1 style={{ fontSize: "2rem", marginTop: 6 }}>Create your learner account</h1>
          <p className="muted" style={{ marginTop: 8 }}>You'll use this account to pay, access your courses and track progress.</p>
        </div>
        <AuthForm mode="signup" next={next} />
      </div>
    </section>
  );
}

import AuthForm from "../AuthForm";

export const metadata = { title: "Log in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next = "/dashboard" } = await searchParams;
  return (
    <section className="block">
      <div className="wrap auth stack" style={{ gap: 18 }}>
        <div>
          <div className="eyebrow">My learning</div>
          <h1 style={{ fontSize: "2rem", marginTop: 6 }}>Log in</h1>
        </div>
        <AuthForm mode="login" next={next} />
      </div>
    </section>
  );
}

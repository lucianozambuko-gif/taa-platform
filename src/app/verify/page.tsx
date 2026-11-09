import { redirect } from "next/navigation";

export const metadata = { title: "Verify a certificate" };

export default async function VerifyForm({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  const { code } = await searchParams;
  if (code) redirect(`/verify/${encodeURIComponent(code.trim().toUpperCase())}`);
  return (
    <section className="block">
      <form className="wrap panel stack" style={{ maxWidth: 520, gap: 12 }} action="/verify">
        <h1 style={{ fontSize: "1.7rem" }}>Verify a certificate</h1>
        <p className="muted">Enter the certificate number printed at the bottom of a Training Africa Academy certificate.</p>
        <div className="field"><label htmlFor="code">Certificate number</label><input id="code" name="code" required style={{ textTransform: "uppercase" }} /></div>
        <div><button className="btn btn-primary">Check</button></div>
      </form>
    </section>
  );
}

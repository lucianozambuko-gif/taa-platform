export const metadata = { title: "Privacy notice" };

export default function PrivacyPage() {
  return (
    <section className="block" style={{ paddingTop: 36 }}>
      <div className="wrap stack" style={{ maxWidth: 760, gap: 16 }}>
        <div className="eyebrow">POPIA</div>
        <h1 style={{ fontSize: "clamp(1.8rem,3.8vw,2.5rem)" }}>Privacy notice</h1>
        <div className="notice"><b>Draft</b><span>Placeholder wording. Training Africa Academy's Information Officer must approve the final notice.</span></div>
        <h2 style={{ fontSize: "1.3rem" }}>What we collect</h2>
        <p>Your name, contact details and the information needed to enrol you, process payment and keep your learner record. For accredited programmes we may also need identity and education details required for reporting.</p>
        <h2 style={{ fontSize: "1.3rem" }}>Why we use it</h2>
        <p>To enrol you, give you access to your courses, issue results and certificates, answer your enquiries, and meet legal and accreditation requirements. We send marketing only if you opt in.</p>
        <h2 style={{ fontSize: "1.3rem" }}>Payments</h2>
        <p>Card details are entered on our payment provider's secure page. We never see or store your card number.</p>
        <h2 style={{ fontSize: "1.3rem" }}>Your rights</h2>
        <p>You may ask to see, correct or delete your personal information, or object to its use, by contacting our Information Officer.</p>
      </div>
    </section>
  );
}

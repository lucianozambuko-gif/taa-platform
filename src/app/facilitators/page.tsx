import PlaceholderNote from "@/components/PlaceholderNote";
import { seoFor } from "@/lib/seo";

export const generateMetadata = () => seoFor("/facilitators");

const PEOPLE: [string, string, string][] = [
  ["[Facilitator name]", "Cleaning and hygiene", "[Years of industry experience and qualifications, as supplied]"],
  ["[Facilitator name]", "Health and safety", "[Years of industry experience and qualifications, as supplied]"],
  ["[Facilitator name]", "Soft skills and supervision", "[Years of industry experience and qualifications, as supplied]"],
];
const STEPS: [string, string][] = [
  ["Learn the theory", "Short videos, notes and quizzes online or in class, at the learner's pace."],
  ["Practise for real", "Supervised practical sessions in the cleaning lab or at the workplace."],
  ["Show competence", "Assessments against the programme's requirements, including EISA for full qualifications."],
  ["Apply at work", "Workplace experience and follow-up, with progress shared with employers where learners agree."],
];

export default function FacilitatorsPage() {
  return (
    <section className="block" style={{ paddingTop: 36 }}>
      <div className="wrap stack" style={{ gap: 24 }}>
        <div>
          <div className="eyebrow">Facilitators and training approach</div>
          <h1 style={{ fontSize: "clamp(1.8rem,3.8vw,2.7rem)", margin: "8px 0 10px" }}>Learn from people who have done the work</h1>
        </div>
        <PlaceholderNote />
        <div className="stack">
          <h2 style={{ fontSize: "1.4rem" }}>How we train</h2>
          <ol className="grid g4" style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {STEPS.map(([t, d], i) => (
              <li key={t} className="panel stack" style={{ gap: 6 }}>
                <span className="eyebrow">Step {i + 1}</span>
                <h3>{t}</h3>
                <p className="muted small">{d}</p>
              </li>
            ))}
          </ol>
        </div>
        <div className="stack">
          <h2 style={{ fontSize: "1.4rem" }}>Our facilitators</h2>
          <div className="grid g3">
            {PEOPLE.map(([n, s, d], i) => (
              <div className="panel stack" key={i}>
                <span className="badge b-short" style={{ alignSelf: "flex-start" }}>{s}</span>
                <h3 className="tbc">{n}</h3>
                <p className="muted small">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

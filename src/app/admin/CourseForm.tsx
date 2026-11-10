"use client";

import { useActionState } from "react";
import { saveCourse, type CourseFormState } from "./actions";
import type { Course } from "@/lib/types";

const F = ({ label, name, value, type = "text", hint, wide }: { label: string; name: string; value?: string | number | null; type?: string; hint?: string; wide?: boolean }) => (
  <div className="field" style={wide ? { gridColumn: "1 / -1" } : undefined}>
    <label htmlFor={`cf-${name}`}>{label}</label>
    <input id={`cf-${name}`} name={name} type={type} defaultValue={value ?? ""} step={type === "number" ? 50 : undefined} />
    {hint && <span className="small muted">{hint}</span>}
  </div>
);
const T = ({ label, name, value, hint }: { label: string; name: string; value?: string | null; hint?: string }) => (
  <div className="field" style={{ gridColumn: "1 / -1" }}>
    <label htmlFor={`cf-${name}`}>{label}</label>
    <textarea id={`cf-${name}`} name={name} defaultValue={value ?? ""} />
    {hint && <span className="small muted">{hint}</span>}
  </div>
);
const S = ({ label, name, value, options }: { label: string; name: string; value?: string; options: [string, string][] }) => (
  <div className="field">
    <label htmlFor={`cf-${name}`}>{label}</label>
    <select id={`cf-${name}`} name={name} defaultValue={value}>{options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
  </div>
);
const C = ({ label, name, checked, hint }: { label: string; name: string; checked?: boolean; hint?: string }) => (
  <label className="check"><input type="checkbox" name={name} defaultChecked={checked} /><span>{label}{hint && <><br /><span className="small muted">{hint}</span></>}</span></label>
);

export default function CourseForm({ course }: { course?: Course }) {
  const [state, action, pending] = useActionState<CourseFormState, FormData>(saveCourse, {});
  const c = course;
  return (
    <form action={action} className="stack" style={{ gap: 18 }}>
      {c && <input type="hidden" name="id" value={c.id} />}
      <div className="panel stack">
        <h2 style={{ fontSize: "1.2rem" }}>Basics</h2>
        <div className="grid g2" style={{ gap: 12 }}>
          <F label="Course title" name="title" value={c?.title} wide />
          <F label="Course code" name="code" value={c?.code} />
          <F label="Web address (slug)" name="slug" value={c?.slug} hint="Leave blank to generate from the title." />
          <S label="Subject" name="subject" value={c?.subject ?? "Soft skills"} options={[["Cleaning & hygiene", "Cleaning & hygiene"], ["Health & safety", "Health & safety"], ["Soft skills", "Soft skills"], ["General", "General"]]} />
          <S label="Type" name="kind" value={c?.kind ?? "short"} options={[["short", "Skills course (non-accredited)"], ["accredited", "Accredited programme"], ["qualification", "Full qualification / learnership"]]} />
          <S label="Format" name="format" value={c?.format ?? "Online"} options={[["Online", "Online"], ["Blended", "Blended"], ["Classroom", "Classroom"], ["Workplace", "Workplace"]]} />
          <F label="Delivery note" name="format_note" value={c?.format_note} />
          <F label="Location" name="location" value={c?.location ?? "Online"} />
          <F label="Duration" name="duration" value={c?.duration} hint="e.g. 6 hours, 2 days, 12 months" />
        </div>
        <fieldset className="stack" style={{ border: 0, padding: 0, margin: 0, gap: 6 }}>
          <legend className="flabel" style={{ marginBottom: 6 }}>Shown to</legend>
          <div className="row">
            {[["individual", "Individual learners"], ["employer", "Employers"], ["learnership", "Learnership applicants"]].map(([v, l]) => (
              <label className="check" key={v}><input type="checkbox" name="learner_types" value={v} defaultChecked={(c?.learner_types ?? ["individual", "employer"]).includes(v)} /><span>{l}</span></label>
            ))}
          </div>
        </fieldset>
      </div>

      <div className="panel stack">
        <h2 style={{ fontSize: "1.2rem" }}>Price</h2>
        <div className="grid g2" style={{ gap: 12 }}>
          <S label="Price basis" name="price_basis" value={c?.price_basis ?? "fixed"} options={[["fixed", "Fixed public price"], ["quote", "Quote only"], ["learnership", "Learnership / funded"]]} />
          <F label="Price per learner (R, incl. VAT)" name="price" type="number" value={c?.price_cents != null ? c.price_cents / 100 : ""} />
          <S label="Pay in instalments" name="instalments" value={String(c?.instalments ?? 1)} options={[["1", "No, pay in full only"], ["2", "Up to 2 monthly instalments"], ["3", "Up to 3 monthly instalments"], ["4", "Up to 4 monthly instalments"], ["6", "Up to 6 monthly instalments"]]} />
        </div>
      </div>

      <div className="panel stack">
        <h2 style={{ fontSize: "1.2rem" }}>Course page content</h2>
        <div className="grid g2" style={{ gap: 12 }}>
          <T label="Summary" name="summary" value={c?.summary} />
          <T label="Outcomes (one per line)" name="outcomes" value={c?.outcomes.join("\n")} />
          <T label="Who it is for" name="audience" value={c?.audience} />
          <T label="Entry requirements" name="entry_requirements" value={c?.entry_requirements} />
          <T label="Assessment" name="assessment" value={c?.assessment} />
          <T label="Practical / workplace obligations" name="practical" value={c?.practical} hint="State clearly when practicals, workplace experience or EISA must happen in person." />
          <F label="Certificate type" name="certificate" value={c?.certificate} wide />
          <T label="Intake dates (one per line)" name="intakes" value={c?.intakes.join("\n")} />
          <F label="Brochure PDF link" name="brochure_url" value={c?.brochure_url} wide />
          <F label="Photo link (course card and page)" name="image_url" value={c?.image_url} wide />
          <F label="Photo description (for screen readers)" name="image_alt" value={c?.image_alt} wide />
          <T label="Eligibility check (one question per line)" name="eligibility" value={(c?.eligibility ?? []).map((e) => `${e.q} | ${e.ok} | ${e.fail}`).join("\n")} hint="Format: Question? | yes or no (the answer that meets the requirement) | Message if they don't meet it. Leave empty to hide the check." />
          <T label="Summary in isiZulu" name="summary_zu" value={c?.summary_zu} hint="Shown when a visitor chooses isiZulu. Have it checked by a first-language speaker." />
          <T label="Summary in Sesotho" name="summary_st" value={c?.summary_st} />
        </div>
      </div>

      <div className="panel stack">
        <h2 style={{ fontSize: "1.2rem" }}>Accreditation</h2>
        <p className="small muted">These details stay hidden from the public site until the box below is ticked by someone who has checked them against the current approval letter.</p>
        <div className="grid g2" style={{ gap: 12 }}>
          <F label="Accrediting body (QCTO / SETA)" name="accreditation_body" value={c?.accreditation_body} />
          <F label="SAQA ID" name="saqa_id" value={c?.saqa_id} />
          <F label="NQF level" name="nqf_level" value={c?.nqf_level} />
          <F label="Credits" name="credits" value={c?.credits} />
          <T label="Specific approved scope" name="approved_scope" value={c?.approved_scope} />
        </div>
        <C name="accreditation_approved" checked={c?.accreditation_approved} label="Accreditation details checked against the current approval letter" hint="Publishes the details above on the course page." />
      </div>

      <div className="panel stack">
        <h2 style={{ fontSize: "1.2rem" }}>Learning and visibility</h2>
        <C name="has_lms" checked={c?.has_lms} label="Has online lessons" />
        <C name="certificate_auto" checked={c?.certificate_auto} label="Approved for automatic certificates" hint="Only tick for programmes the Academy has approved to certify online on completion." />
        <C name="featured" checked={c?.featured} label="Feature on the homepage" />
        <C name="published" checked={c?.published ?? true} label="Published (visible on the website)" />
      </div>

      {state.error && <p className="form-error">{state.error}</p>}
      {state.saved && <p className="form-ok">Saved. The website is updated.</p>}
      <div className="row"><button className="btn btn-primary" disabled={pending}>{pending ? "Saving…" : c ? "Save changes" : "Create course"}</button></div>
    </form>
  );
}

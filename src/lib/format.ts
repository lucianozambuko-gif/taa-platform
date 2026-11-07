export function rand(cents: number | null | undefined) {
  if (cents == null) return "By application";
  return "R" + (cents / 100).toLocaleString("en-US", { maximumFractionDigits: 0 });
}

/** VAT included in a VAT-inclusive price (15%). Shown as an indication only. */
export function vatIncluded(cents: number) {
  return Math.round((cents * 15) / 115);
}

export function whatsappLink(message: string) {
  const number = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "";
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

export const KIND_LABEL: Record<string, string> = {
  short: "Skills course · non-accredited",
  accredited: "Accredited",
  qualification: "Full qualification",
};

export const ROUTING: Record<string, string> = {
  course_enquiry: "Course advisor",
  group_quote: "Corporate sales",
  learnership: "Admissions",
  venue: "Centre coordinator",
  multi_learner: "Admissions",
};

export const LEAD_LABEL: Record<string, string> = {
  course_enquiry: "Course enquiry",
  group_quote: "Group quote",
  learnership: "Learnership application",
  venue: "Venue booking",
  multi_learner: "Multi-learner registration",
};

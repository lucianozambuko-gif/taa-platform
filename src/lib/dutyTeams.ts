// Client-safe duty roster labels and types.
export type DutyTeam = "general" | "advisor" | "sales" | "admissions" | "centre" | "support";
export type Duty = Record<DutyTeam, { name: string; phone: string; on: boolean }>;
export const TEAM_LABEL: Record<DutyTeam, string> = {
  general: "General enquiries",
  advisor: "Course advisor",
  sales: "Corporate sales",
  admissions: "Admissions",
  centre: "Centre coordinator",
  support: "Learner support",
};


export type Role = "learner" | "employer" | "facilitator" | "moderator" | "sales" | "content" | "admin";

export const ROLE_LABEL: Record<Role, string> = {
  learner: "Learner",
  employer: "Employer (HR)",
  facilitator: "Facilitator",
  moderator: "Moderator",
  sales: "Sales & admissions",
  content: "Content editor",
  admin: "Admin",
};

export const ROLE_HELP: Record<Role, string> = {
  learner: "Buys and studies courses",
  employer: "Sees live progress, attendance and results for their own company's staff; registers staff; B-BBEE summary",
  facilitator: "Sees learners on assigned courses, records results, keeps attendance, builds portfolios, and suggests lessons and quizzes for approval",
  moderator: "Reviews portfolios of evidence and endorses or refers back assessment decisions; exports the verification pack",
  sales: "Leads, orders, refunds, learner access, venue bookings and coupon requests",
  content: "Courses, prices, lessons and quizzes, approving facilitators' lesson suggestions, homepage content, announcements and redirects",
  admin: "Everything, including users, coupon approval and the audit log",
};

/** Back-office sections and who may open them. Admin can open all of them. */
export const BACK_OFFICE: { key: string; label: string; roles: Role[] }[] = [
  { key: "overview", label: "Overview", roles: ["admin", "sales", "content"] },
  { key: "leads", label: "Leads", roles: ["admin", "sales"] },
  { key: "orders", label: "Orders", roles: ["admin", "sales"] },
  { key: "learners", label: "Learners & progress", roles: ["admin", "sales"] },
  { key: "venue", label: "Venue bookings", roles: ["admin", "sales"] },
  { key: "coupons", label: "Coupons", roles: ["admin", "sales"] },
  { key: "courses", label: "Courses", roles: ["admin", "content"] },
  { key: "approvals", label: "Approvals", roles: ["admin", "content"] },
  { key: "content", label: "Site content", roles: ["admin", "content"] },
  { key: "users", label: "Users", roles: ["admin"] },
  { key: "audit", label: "Audit log", roles: ["admin"] },
];

export const isBackOffice = (role?: string | null) => role === "admin" || role === "sales" || role === "content";
export const isStaff = (role?: string | null) => isBackOffice(role) || role === "facilitator" || role === "moderator";
export const canOpen = (role: string | null | undefined, tab: string) =>
  !!role && !!BACK_OFFICE.find((t) => t.key === tab)?.roles.includes(role as Role);

/** Where each role lands after signing in. */
export const homeFor = (role?: string | null) => (isBackOffice(role) ? "/admin" : role === "facilitator" ? "/facilitator" : role === "moderator" ? "/moderator" : role === "employer" ? "/employer" : "/dashboard");

export const ROOMS: [string, string, string][] = [
  ["Training room A", "30 seated", "Classroom training, workshops"],
  ["Training room B", "20 seated", "Classroom training, interviews"],
  ["Practical cleaning lab", "12 learners", "Practical sessions and assessments"],
  ["Computer room", "16 workstations", "Online assessments, digital skills"],
  ["Boardroom", "10 seated", "Meetings, moderation sessions"],
];

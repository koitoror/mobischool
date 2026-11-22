export const systemSettingPages = [
  "System Settings Overview",
  "Payment Methods",
  "Print Header Footer",
  "Backup Restore",
  "Users",
  "Custom Fields",
  "System Fields",
  "Student Profile Update",
  "Online Admission",
];
export const schoolConfigurationPages = [
  "School Identity",
  "Academic Sessions",
  "Academic Structure",
  "Curriculum & Subjects",
  "Grading & Assessment",
  "Attendance Configuration",
  "Finance Configuration",
  "Communication Defaults",
  "Module Configuration",
  "Configuration Audit History",
];
export const settingsPages = [...systemSettingPages, ...schoolConfigurationPages];
export type SettingAudit = {
  id: string;
  at: string;
  actor: string;
  category: string;
  record: string;
  before: string;
  after: string;
  reason: string;
};
export type SessionConfig = {
  id: string;
  name: string;
  start: string;
  end: string;
  status: string;
  terms: { name: string; start: string; end: string }[];
  holidays: string;
  history: string[];
};
export type ConfigUser = {
  id: string;
  person: string;
  name: string;
  role: string;
  status: string;
  history: string[];
};
export type CustomField = {
  id: string;
  name: string;
  key: string;
  entity: string;
  type: string;
  required: string;
  visibility: string;
  status: string;
  options: string;
  defaultValue: string;
  description: string;
};
export const roles = [
  "School Administrator",
  "Principal",
  "Bursar",
  "Teacher",
  "Librarian",
  "HR Officer",
  "Receptionist",
  "Parent/Guardian",
  "Student",
  "Auditor",
];
export const uid = (p: string) => p + "-" + crypto.randomUUID().slice(0, 8);
export const validDate = (v: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(v) &&
  !Number.isNaN(Date.parse(v)) &&
  new Date(v).toISOString().slice(0, 10) === v;
export function identityError(f: Record<string, string>) {
  if (!f.name?.trim() || !f.code?.trim() || !f.country?.trim())
    return "School name, code and country are required.";
  if (f.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email))
    return "Provide a valid official email.";
  if (!/^[A-Z]{3}$/.test(f.currency || ""))
    return "Currency must be a three-letter uppercase code.";
  try {
    new Intl.DateTimeFormat("en", { timeZone: f.timezone }).format();
  } catch {
    return "Use a valid IANA timezone.";
  }
  if (f.logo && !/^https:\/\/|^data:image\/(png|jpeg|webp);base64,/.test(f.logo))
    return "Use an HTTPS logo URL or PNG/JPEG/WebP data preview.";
  return "";
}
export function sessionError(v: SessionConfig, all: SessionConfig[]) {
  if (!v.name.trim()) return "Name the session.";
  if (!validDate(v.start) || !validDate(v.end) || v.end <= v.start)
    return "Session end must follow a valid start date.";
  if (all.some((s) => s.id !== v.id && s.name.toLowerCase() === v.name.toLowerCase()))
    return "Session name already exists.";
  const sorted = [...v.terms].sort((a, b) => a.start.localeCompare(b.start));
  for (let i = 0; i < sorted.length; i++) {
    const t = sorted[i];
    if (
      !t.name ||
      !validDate(t.start) ||
      !validDate(t.end) ||
      t.start < v.start ||
      t.end > v.end ||
      t.end < t.start
    )
      return "Terms must fit within session dates.";
    if (i && sorted[i - 1].end >= t.start) return "Term dates overlap.";
  }
  return "";
}
export function referenceError(name: string, values: string[], oldName = "") {
  if (!name.trim()) return "Name is required.";
  return values.some((v) => v !== oldName && v.toLowerCase() === name.trim().toLowerCase())
    ? "Duplicate name/code. Choose a unique value."
    : "";
}
export function userError(v: ConfigUser, users: ConfigUser[]) {
  if (!v.name.trim() || !roles.includes(v.role)) return "User name and valid role are required.";
  const prior = users.find((u) => u.id === v.id);
  if (
    prior?.role === "School Administrator" &&
    prior.status === "Active" &&
    (v.role !== "School Administrator" || v.status !== "Active") &&
    !users.some((u) => u.id !== v.id && u.role === "School Administrator" && u.status === "Active")
  )
    return "The final active administrator must be protected.";
  return "";
}
export function customFieldError(v: CustomField, all: CustomField[]) {
  if (!v.name.trim() || !/^[a-z][a-z0-9_]*$/.test(v.key))
    return "Name and lowercase internal key are required.";
  if (["id", "name", "status", "grade", "section", "admission"].includes(v.key))
    return "This internal key is reserved by a protected system field.";
  if (all.some((f) => f.id !== v.id && f.key === v.key && f.entity === v.entity))
    return "Duplicate custom field key.";
  const old = all.find((f) => f.id === v.id);
  if (old && (old.key !== v.key || old.type !== v.type || old.entity !== v.entity))
    return "Existing field keys, types and entity ownership are immutable; archive and add a new field.";
  if (["Dropdown", "Multi-select"].includes(v.type) && !v.options.trim())
    return "Choice fields need comma-separated options.";
  return "";
}
export const moduleDependencies: Record<string, string[]> = {
  Reports: ["Student Information"],
  Examinations: ["Academics", "Student Information"],
  Attendance: ["Student Information"],
  Transport: ["Human Resource"],
  Certificate: ["Student Information", "Human Resource"],
  Alumni: ["Student Information"],
  "Fees Collection": ["Student Information"],
  Homework: ["Academics", "Student Information"],
};
export function moduleDisableError(name: string, disabled: string[]) {
  const dependents = Object.entries(moduleDependencies)
    .filter(([module, deps]) => !disabled.includes(module) && deps.includes(name))
    .map(([module]) => module);
  return dependents.length ? "Enabled modules depend on this: " + dependents.join(", ") : "";
}

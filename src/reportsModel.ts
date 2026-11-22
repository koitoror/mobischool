export const reportNames = [
  "Student Information",
  "Finance",
  "Attendance",
  "Examinations",
  "Online Examinations",
  "Lesson Plan",
  "Human Resource",
  "Homework",
  "Library",
  "Inventory",
  "Transport",
  "Hostel",
  "Alumni",
  "User Log",
  "Audit Trail Report",
];
export const reportPages = ["Reports Overview", ...reportNames.map((n) => "Reports / " + n)];
export type ReportRow = {
  id: string;
  label: string;
  date: string;
  session: string;
  grade: string;
  section: string;
  category: string;
  status: string;
  actor: string;
  value: number | null;
  detail: string;
  route: string;
  entity?: string;
  quantity?: number;
};
export type Filters = {
  from: string;
  to: string;
  session: string;
  grade: string;
  section: string;
  category: string;
  status: string;
  actor: string;
  query: string;
};
export const defaultFilters = (session: string): Filters => ({
  from: "",
  to: "",
  session,
  grade: "All",
  section: "All",
  category: "All",
  status: "All",
  actor: "All",
  query: "",
});
export function filterError(f: Filters) {
  if ((f.from && !validDate(f.from)) || (f.to && !validDate(f.to)))
    return "Use valid calendar dates.";
  return f.from && f.to && f.from > f.to ? "Start date must be on or before end date." : "";
}
function validDate(v: string) {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(v) &&
    !Number.isNaN(Date.parse(v)) &&
    new Date(v).toISOString().slice(0, 10) === v
  );
}
export function filterRows(rows: ReportRow[], f: Filters) {
  const seen = new Set<string>();
  return rows.filter((r) => {
    if (seen.has(r.id)) return false;
    seen.add(r.id);
    return (
      (!f.from || (!!r.date && r.date.slice(0, 10) >= f.from)) &&
      (!f.to || (!!r.date && r.date.slice(0, 10) <= f.to)) &&
      (f.session === "All" || r.session === f.session) &&
      (f.grade === "All" || r.grade === f.grade) &&
      (f.section === "All" || r.section === f.section) &&
      (f.category === "All" || r.category === f.category) &&
      (f.status === "All" || r.status === f.status) &&
      (f.actor === "All" || r.actor === f.actor) &&
      `${r.label} ${r.id} ${r.detail}`.toLowerCase().includes(f.query.toLowerCase())
    );
  });
}
export function attendanceRate(rows: ReportRow[]) {
  const marked = rows.filter((r) => ["Present", "Late", "Absent", "Excused"].includes(r.status));
  return marked.length
    ? (100 * marked.filter((r) => ["Present", "Late"].includes(r.status)).length) / marked.length
    : null;
}
export const grouped = (rows: ReportRow[], key: "status" | "category" | "grade") =>
  Object.entries(
    rows.reduce<Record<string, number>>((a, r) => {
      const label = r[key] || "Not supplied";
      a[label] = (a[label] || 0) + 1;
      return a;
    }, {}),
  );
export function csvPreview(rows: ReportRow[], columns: (keyof ReportRow)[]) {
  const safe = (v: unknown) => {
    const s = String(v ?? "");
    return `"${(/^[=+\-@]/.test(s) ? "'" : "") + s.replace(/"/g, '""')}"`;
  };
  return [columns.join(","), ...rows.map((r) => columns.map((c) => safe(r[c])).join(","))].join(
    "\n",
  );
}
export const accessDefaults: Record<string, string[]> = {
  "School Administrator": ["*"],
  "Finance Officer": ["Finance"],
  Teacher: [
    "Student Information",
    "Attendance",
    "Examinations",
    "Online Examinations",
    "Lesson Plan",
    "Homework",
  ],
  "HR Officer": ["Human Resource"],
  Librarian: ["Library"],
  "Inventory Officer": ["Inventory"],
  "Transport Officer": ["Transport"],
  Auditor: reportNames.filter((n) => n !== "Human Resource"),
};
export function allowedReport(name: string, role: string, permissions = accessDefaults) {
  return name === "Reports Overview" || !!permissions[role]?.some((v) => v === "*" || v === name);
}
export type SavedReport = {
  id: string;
  name: string;
  description: string;
  route: string;
  filters: Filters;
  columns: (keyof ReportRow)[];
  favorite: boolean;
};
export const sourceNotes: Record<string, string> = {
  "Student Information":
    "Shared Student Registry. Enrollment snapshot uses the selected App session. Admission dates without a parseable source date are excluded when a date range is applied. Gender is unavailable; category appears only when recorded.",
  Finance:
    "Same shared fee ledger as Finance Operations. Fee obligation rows = amount − discount; receipt rows = payment amounts; due balances = net obligation − all recorded allocations. General income and expenses are separate. Period dates filter transaction activity / obligation due dates, not opening/closing balance accounting. No reversal/refund model is connected.",
  Attendance:
    "Shared marked student attendance. Rate = (Present + Late) ÷ marked student/date observations; Excused and Absent remain in the denominator. Unmarked observations are not silently treated as absent. This marked-only rate differs from the operational expected-roster rate. Leave requests are shown separately.",
  Examinations:
    "Shared scores joined to exam groups. Published percentage, grade and scale version are used as stored. Draft marks are never interpreted as historical published results. Pass/fail requires an explicit school rule captured with the result; see scoped examination analytics. Legacy snapshots without a captured classification rule remain unclassifiable.",
  "Online Examinations":
    "Shared attempt records. Submitted and Evaluated count as completed; In Progress is incomplete, not zero. Only evaluated attempts have score summaries. Question-level aggregates are not yet available.",
  "Lesson Plan":
    "Shared topics and lesson plans. Completion = completed topic records ÷ topic records, never an independent entered percentage. Historical progress snapshots are not stored.",
  "Human Resource":
    "Shared Workforce headcount, marked staff attendance, leave and finalized payroll records. Payroll details are omitted unless Administrator or HR Officer preview. No verified leave balance dataset is connected.",
  Homework:
    "Shared assignments and submissions. Missing submission differs from submitted-but-unmarked. Submission denominators use active matching class/section recipients for published assignments.",
  Library:
    "Shared catalog, physical copy counts, members and loans. Titles are not copies. Available copies subtract unavailable copies and currently unreturned loans. Period filtering applies to loan issue date.",
  Inventory:
    "Shared signed movement ledger including opening, receipts, issues, adjustments and returns. Current stock is an all-time snapshot; period movement totals are separate. Valuation is only an estimate from manually entered unit values, not an audited costing method.",
  Transport:
    "Shared routes, vehicles and assignments. Capacity is recorded seats, not assigned passengers; passenger allocation data is unavailable. No GPS, fuel, trip completion or telemetry is connected.",
  Hostel:
    "No authoritative Hostel source module is connected. Reporting requires buildings, rooms, beds, capacity, dated student allocations, occupancy status and governed financial links.",
  Alumni:
    "Shared reviewed alumni registry and event RSVP records only. Front CMS events are not merged. Engagement means simulated participation, not real communications or reach.",
  "User Log":
    "Session-local report views and saved/export-preview actions only. This is not an authentication, access or security log.",
  "Audit Trail Report":
    "Read-only projection of available source-module activity histories, plus report actions. Not an immutable server audit trail. Before/after values and timestamps are shown only where recorded.",
};

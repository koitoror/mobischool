export const hrPages = [
  "Human Resource",
  "Staff Directory",
  "Staff Attendance",
  "Payroll",
  "Approve Leave Request",
  "Apply Leave",
  "Leave Type",
  "Teachers Rating",
  "Department",
  "Designation",
  "Disabled Staff",
];
export const communicationPages = [
  "Communicate",
  "Notice Board",
  "Send Email",
  "Send SMS",
  "Email / SMS Log",
];
export const workforcePages = [...hrPages, ...communicationPages];
export const staffStatuses = ["Present", "Absent", "Late", "Half Day", "On Leave", "Holiday"];
export type Staff = {
  id: string;
  name: string;
  role: string;
  department: string;
  designation: string;
  status: "Active" | "Disabled";
  employment: string;
  phone: string;
  email: string;
  joined: string;
  source: string;
  details: Record<string, string>;
  history: Audit[];
};
export type Audit = { at: string; actor: string; from: string; to: string; reason: string };
export type StaffLeave = {
  id: string;
  staff: string;
  type: string;
  start: string;
  end: string;
  reason: string;
  status: string;
  history: Audit[];
  contact?: string;
  attachment?: string;
};
export type Salary = { basic: number; allowance: number; deduction: number };
export type PayrollBatch = {
  id: string;
  period: string;
  currency: string;
  rows: { staff: string; salary: Salary; gross: number; net: number }[];
  history: Audit[];
};
export type Notice = {
  id: string;
  title: string;
  body: string;
  category: string;
  audience: string;
  targets: string[];
  publish: string;
  expiry: string;
  priority: string;
  status: string;
  history: Audit[];
  attachments: string[];
};
export type Message = {
  id: string;
  channel: string;
  subject: string;
  body: string;
  recipients: string[];
  cc: string[];
  bcc: string[];
  audience: string;
  created: string;
  status: string;
  schedule: string;
  attachments: string[];
  history: Audit[];
};
export function workingDays(start: string, end: string) {
  if (!start || !end || start > end) return 0;
  const a = new Date(start + "T00:00:00Z"),
    b = new Date(end + "T00:00:00Z");
  if (isNaN(+a) || isNaN(+b)) return 0;
  if (a.toISOString().slice(0, 10) !== start || b.toISOString().slice(0, 10) !== end) return 0;
  const length = Math.round((+b - +a) / 86400000) + 1;
  let count = Math.floor(length / 7) * 5;
  for (let i = 0; i < length % 7; i++) {
    const day = (a.getUTCDay() + i) % 7;
    if (day !== 0 && day !== 6) count++;
  }
  return count;
}
export function leaveError(leaves: StaffLeave[], input: StaffLeave) {
  if (!input.staff || !input.type || !input.reason.trim())
    return "Staff member, leave type and reason are required.";
  if (!workingDays(input.start, input.end))
    return "Choose a valid date range including at least one estimated working day.";
  if (
    leaves.some(
      (l) =>
        l.id !== input.id &&
        l.staff === input.staff &&
        !["Rejected", "Withdrawn", "Draft"].includes(l.status) &&
        l.start <= input.end &&
        input.start <= l.end,
    )
  )
    return "This request overlaps an existing submitted or approved request.";
  return "";
}
export function payrollTotals(s: Salary) {
  if (
    ![s.basic, s.allowance, s.deduction].every((v) => Number.isSafeInteger(v) && v >= 0) ||
    s.basic <= 0
  )
    throw Error(
      "Enter a positive basic salary and non-negative allowance/deduction amounts in minor units.",
    );
  const gross = s.basic + s.allowance,
    net = gross - s.deduction;
  if (!Number.isSafeInteger(gross) || net < 0) throw Error("Deductions cannot exceed gross pay.");
  return { gross, net };
}
export function normalizedRecipients(value: string) {
  return [
    ...new Set(
      value
        .split(/[;,\n]+/)
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean),
    ),
  ];
}
export function messageError(channel: string, recipients: string[], subject: string, body: string) {
  if (!recipients.length) return "Select or enter at least one valid recipient.";
  if (!body.trim()) return "Message body is required.";
  if (channel === "Email") {
    if (!subject.trim()) return "Email subject is required.";
    if (recipients.some((r) => !/^\S+@[^\s@]+\.[^\s@]+$/.test(r)))
      return "Correct the invalid email addresses.";
  } else if (recipients.some((r) => !/^\+?\d{7,15}$/.test(r.replace(/[\s()-]/g, ""))))
    return "Correct the invalid phone numbers.";
  return "";
}
export function smsMetrics(body: string) {
  const unicode = /[^\x00-\x7F]/.test(body),
    single = unicode ? 70 : 160,
    concatenated = unicode ? 67 : 153;
  return {
    characters: body.length,
    segments: body.length ? (body.length <= single ? 1 : Math.ceil(body.length / concatenated)) : 0,
    encoding: unicode ? "Unicode (estimate)" : "Basic text (estimate)",
  };
}
export function effectiveStaffAttendance(
  staff: string,
  date: string,
  records: Record<string, string>,
  leaves: StaffLeave[],
) {
  if (
    leaves.some(
      (l) => l.staff === staff && l.status === "Approved" && l.start <= date && date <= l.end,
    )
  )
    return "On Leave";
  return records[date + "|" + staff] || "Unmarked";
}

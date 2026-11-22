import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { WorkforceProvider } from "../src/WorkforceContext";
import { AcademicProvider } from "../src/AcademicContext";
import { FinanceProvider } from "../src/FinanceContext";
import { ExaminationProvider } from "../src/ExaminationContext";
import { LearningProvider } from "../src/LearningContext";
import { OperationsProvider } from "../src/OperationsContext";
import { CredentialsProvider } from "../src/CredentialsContext";
import { CMSProvider } from "../src/CMSContext";
import { ReportsProvider } from "../src/ReportsContext";
import Reports from "../src/Reports";
import {
  reportNames,
  reportPages,
  filterRows,
  defaultFilters,
  filterError,
  attendanceRate,
  csvPreview,
  allowedReport,
  type ReportRow,
} from "../src/reportsModel";
import { seedLedger, financeSummary } from "../src/financeModel";
import { reconcileFinance, reconcileRows } from "../src/reportReconciliation";
const session = "2024 – 2025",
  f = defaultFilters(session);
const row: ReportRow = {
  id: "R",
  label: "Student",
  date: "2025-02-24",
  session,
  grade: "Grade 8",
  section: "A",
  category: "Marked attendance",
  status: "Present",
  actor: "Officer",
  value: null,
  detail: "",
  route: "Student Attendance",
};
test("15 exact original labels and 16 unique routes", () => {
  assert.equal(reportNames.length, 15);
  assert.equal(new Set(reportPages).size, 16);
  assert.ok(reportNames.includes("Hostel"));
});
test("date range reversal rejected", () =>
  assert.ok(filterError({ ...f, from: "2025-03-01", to: "2025-02-01" })));
test("invalid calendar date rejected", () => assert.ok(filterError({ ...f, from: "2025-02-30" })));
test("future ranges are honest empty", () =>
  assert.equal(filterRows([row], { ...f, from: "2099-01-01" }).length, 0));
test("duplicate source IDs not double counted", () =>
  assert.equal(filterRows([row, row], f).length, 1));
test("undated records excluded by period", () =>
  assert.equal(filterRows([{ ...row, date: "" }], { ...f, from: "2025-01-01" }).length, 0));
for (const key of ["grade", "section", "category", "status", "actor", "session"] as const)
  test(key + " filter applies", () =>
    assert.equal(filterRows([row], { ...f, [key]: "No match" }).length, 0),
  );
test("search finds record reference", () =>
  assert.equal(filterRows([row], { ...f, query: "R" }).length, 1));
test("marked-only attendance denominator", () =>
  assert.equal(
    attendanceRate([
      row,
      { ...row, id: "B", status: "Absent" },
      { ...row, id: "U", status: "Unmarked" },
    ]),
    50,
  ));
test("no attendance is unavailable", () => assert.equal(attendanceRate([]), null));
test("CSV respects selected columns and quotes", () => {
  const text = csvPreview([{ ...row, label: 'a,"b' }], ["id", "label"]);
  assert.equal(text, 'id,label\n"R","a,""b"');
});
test("CSV formula cells neutralized", () =>
  assert.ok(csvPreview([{ ...row, label: "=SUM(1)" }], ["label"]).includes("'=SUM")));
test("teacher finance access restricted", () =>
  assert.equal(allowedReport("Finance", "Teacher"), false));
test("HR payroll report allowed for HR", () =>
  assert.equal(allowedReport("Human Resource", "HR Officer"), true));
test("auditor HR defaults restricted", () =>
  assert.equal(allowedReport("Human Resource", "Auditor"), false));
test("fee ledger identity expected=paid+outstanding", () => {
  const summary = financeSummary(seedLedger(["S"], session), session);
  assert.equal(summary.expected, summary.paid + summary.outstanding);
});
test("reconciliation follows shared ledger, aging and fee allocations", () => {
  const ledger = seedLedger(["S"], session),
    source = [...ledger.obligations, ...ledger.payments, ...ledger.entries].map((v) => ({
      ...row,
      id: v.id,
    }));
  const v = reconcileFinance(source, ledger, "2025-02-24");
  assert.equal(v.expected, v.paidOnCohort + v.outstanding);
  assert.equal(
    v.aging.reduce((n, [, v]) => n + v, 0),
    v.outstanding,
  );
  assert.equal(
    v.methods.reduce((n, [, v]) => n + v, 0),
    v.collections,
  );
  assert.equal(
    v.feeTypes.reduce((n, [, v]) => n + v, 0),
    v.collections,
  );
  assert.notEqual(v.income, v.collections);
});
test("financial filters constrain method and cohort selectors", () => {
  const ledger = seedLedger(["S"], session),
    p = ledger.payments[0],
    v = reconcileFinance([{ ...row, id: p.id }], ledger, "2025-02-24");
  assert.equal(v.collections, p.amount);
  assert.equal(v.expected, 0);
  assert.equal(v.income, 0);
});
test("signed stock reconciliation includes opening adjustment and return", () => {
  const data = [
    ["Opening balance", 50],
    ["Receipt", 5],
    ["Issue", -3],
    ["Adjustment", -1],
    ["Return", 1],
  ].map(([category, value], i) => ({
    ...row,
    id: String(i),
    category: String(category),
    value: Number(value),
  }));
  assert.equal(
    reconcileRows(data, "Inventory").reduce((n, [, v]) => n + Number(v), 0),
    52,
  );
});
test("library returns and renewals are not catalog title counts", () => {
  const data = [
    { ...row, id: "BOOK", category: "Catalog", value: 5 },
    { ...row, id: "L1", category: "Loan", status: "Returned", value: 2 },
  ];
  assert.deepEqual(reconcileRows(data, "Library"), [
    ["Issued / overdue", "0"],
    ["Returned", "1"],
    ["Renewal actions", "2"],
  ]);
});
test("alumni participation excludes registry status from RSVP totals", () => {
  const v = reconcileRows(
    [
      { ...row, category: "Alumnus", status: "Registered" },
      { ...row, id: "R2", category: "Participation", status: "Waitlisted" },
    ],
    "Alumni",
  );
  assert.equal(v.find(([k]) => k === "Registered")?.[1], "0");
  assert.equal(v.find(([k]) => k === "Waitlisted")?.[1], "1");
});
test("transport capacity sums vehicles not route requirements", () => {
  const v = reconcileRows(
    [
      { ...row, category: "Vehicle", status: "Available", value: 24 },
      { ...row, id: "ROUTE", category: "Route", value: 12 },
    ],
    "Transport",
  );
  assert.equal(v.find(([k]) => k === "Recorded vehicle seats")?.[1], "24");
});
const students = [
  {
    id: "S",
    name: "Sample Student",
    grade: "Grade 8",
    section: "A",
    guardian: "",
    phone: "",
    date: "2025-02-24",
    status: "Active",
  },
];
for (const page of reportPages)
  test("SSR " + page, () => {
    let element = h(Reports, {
      page,
      active: true,
      session,
      school: "School",
      navigate: () => {},
      notify: () => {},
    });
    element = h(ReportsProvider, { children: element });
    element = h(CMSProvider, {
      school: "School",
      session,
      logo: "",
      motto: "Motto",
      children: element,
    });
    element = h(CredentialsProvider, { students, session, school: "School", children: element });
    element = h(OperationsProvider, { students, children: element });
    element = h(LearningProvider, { students, session, children: element });
    element = h(ExaminationProvider, { students, session, children: element });
    element = h(FinanceProvider, { ids: ["S"], session, children: element });
    element = h(AcademicProvider, { students, session, children: element });
    element = h(WorkforceProvider, { children: element });
    const html = renderToStaticMarkup(element);
    assert.ok(html.includes("Reports workspace"));
    assert.ok(!html.includes("NaN"));
  });

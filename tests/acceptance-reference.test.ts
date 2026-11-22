import { test } from "node:test";
import assert from "node:assert/strict";
import { referenceMetric, referenceExclusions } from "../src/reportReference";
import { calculationEvidence } from "../src/reportTraceability";
import { defaultFilters, type ReportRow } from "../src/reportsModel";
import type { Ledger } from "../src/financeModel";
const row: ReportRow = {
  id: "F",
  label: "Student",
  session: "Y",
  date: "2025-02-24",
  grade: "G",
  section: "A",
  category: "Fee obligation",
  status: "Recorded",
  actor: "Officer",
  value: 9500,
  quantity: 3,
  detail: "",
  route: "Search Due Fees",
};
const ledger: Ledger = {
  version: 1,
  obligations: [
    {
      id: "F",
      student: "S",
      session: "Y",
      item: "Tuition",
      amount: 10000,
      discount: 500,
      due: "2025-02-24",
    },
  ],
  payments: [
    {
      id: "P",
      student: "S",
      session: "Y",
      amount: 3000,
      date: "2025-02-24",
      method: "Cash",
      reference: "REF",
      actor: "Officer",
      allocations: [{ id: "F", amount: 2500 }],
    },
  ],
  entries: [
    {
      id: "I",
      kind: "Income",
      session: "Y",
      head: "Donation",
      amount: 2000,
      date: "2025-02-24",
      method: "Cash",
      reference: "I",
      party: "Example",
      description: "",
    },
    {
      id: "X",
      kind: "Expense",
      session: "Y",
      head: "Supplies",
      amount: 500,
      date: "2025-02-24",
      method: "Cash",
      reference: "X",
      party: "Example",
      description: "",
    },
  ],
};
const rows = [
  row,
  { ...row, id: "P", category: "Fee collection", value: 3000 },
  { ...row, id: "I", category: "Income", value: 2000 },
  { ...row, id: "X", category: "Expense", value: 500 },
];
for (const [metric, expected] of [
  ["Fees expected (due cohort)", 95],
  ["Fee collections (period)", 30],
  ["Outstanding (due cohort)", 70],
  ["General income", 20],
  ["Expenses", 5],
  ["Net general income", 15],
] as [string, number][])
  test("independent raw ledger " + metric, () =>
    assert.equal(referenceMetric(metric, rows, ledger).expected, expected),
  );
test("unallocated payment is not allocated fees", () =>
  assert.equal(referenceMetric("Outstanding (due cohort)", rows, ledger).expected, 70));
test("duplicate ledger IDs block QA reference", () =>
  assert.equal(
    referenceMetric("General income", rows, {
      ...ledger,
      entries: [...ledger.entries, ledger.entries[0]],
    }).expected,
    null,
  ));
test("raw reference matches independent displayed cohort balance", () =>
  assert.equal(
    referenceMetric("Outstanding (due cohort)", rows, ledger).expected! * 100,
    calculationEvidence("Outstanding (due cohort)", rows, ledger).numerator,
  ));
test("filter exclusion records date boundaries inclusively", () => {
  const f = { ...defaultFilters("Y"), from: "2025-02-24", to: "2025-02-24" };
  assert.equal(referenceExclusions(rows, f).filter((r) => r.reasons.length).length, 0);
});
test("combined filters give reasons not silent disappearance", () => {
  const f = { ...defaultFilters("Other"), grade: "Other", from: "2026-01-01" };
  assert.deepEqual(referenceExclusions([row], f)[0].reasons, [
    "session",
    "before period / undated",
    "grade",
  ]);
});
test("empty attendance percentage unavailable", () =>
  assert.equal(referenceMetric("Attendance rate", [], ledger).expected, null));
test("duplicate projected attendance not counted twice", () =>
  assert.equal(
    referenceMetric(
      "Marked observations",
      [
        { ...row, category: "Marked attendance" },
        { ...row, category: "Marked attendance" },
      ],
      ledger,
    ).expected,
    1,
  ));
test("zero values remain values, not missing", () =>
  assert.equal(
    referenceMetric("Missing numeric values", [{ ...row, value: 0 }], ledger).expected,
    0,
  ));
for (const [metric, expected] of [
  ["Physical copies", 5],
  ["Available copies", 3],
  ["Catalog titles", 1],
] as [string, number][])
  test("library " + metric, () =>
    assert.equal(
      referenceMetric(metric, [{ ...row, category: "Catalog", value: 5, quantity: 3 }], ledger)
        .expected,
      expected,
    ),
  );
test("signed negative inventory adjustment not converted to a positive", () =>
  assert.equal(
    referenceMetric("Issues (signed period)", [{ ...row, category: "Issue", value: -3 }], ledger)
      .expected,
    -3,
  ));
test("low stock records do not include low-stock-labelled movements", () =>
  assert.equal(
    referenceMetric(
      "Low stock items",
      [
        { ...row, category: "Stock snapshot", status: "Low stock" },
        { ...row, id: "M", category: "Issue", status: "Confirmed simulation" },
      ],
      ledger,
    ).expected,
    1,
  ));
test("incomplete grades never become pass/fail", () =>
  assert.equal(referenceMetric("Pass rate", rows, ledger).expected, null));
test("transport utilization unavailable without passenger data", () =>
  assert.equal(referenceMetric("Passenger utilization", rows, ledger).expected, null));

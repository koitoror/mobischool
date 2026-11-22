import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { WorkforceProvider } from "../src/WorkforceContext";
import { FinanceProvider } from "../src/FinanceContext";
import Workforce from "../src/Workforce";
import {
  workforcePages,
  workingDays,
  leaveError,
  payrollTotals,
  normalizedRecipients,
  messageError,
  smsMetrics,
  effectiveStaffAttendance,
  type StaffLeave,
} from "../src/workforceModel";
const leave: StaffLeave = {
  id: "L1",
  staff: "A",
  type: "Personal",
  start: "2025-02-24",
  end: "2025-02-25",
  reason: "Illustrative",
  status: "Approved",
  history: [],
};
test("working days exclude weekend and invalid range", () => {
  assert.equal(workingDays("2025-02-21", "2025-02-24"), 2);
  assert.equal(workingDays("2025-02-25", "2025-02-24"), 0);
});
test("overlapping leave rejected and withdrawn does not block", () => {
  assert.match(leaveError([leave], { ...leave, id: "L2" }), /overlaps/);
  assert.equal(leaveError([{ ...leave, status: "Withdrawn" }], { ...leave, id: "L2" }), "");
});
test("approved leave does not count as absence", () =>
  assert.equal(
    effectiveStaffAttendance("A", "2025-02-24", { "2025-02-24|A": "Absent" }, [leave]),
    "On Leave",
  ));
test("payroll gross and net reconcile", () =>
  assert.deepEqual(payrollTotals({ basic: 5000000, allowance: 500000, deduction: 250000 }), {
    gross: 5500000,
    net: 5250000,
  }));
for (const salary of [
  { basic: 0, allowance: 0, deduction: 0 },
  { basic: 100, allowance: 0, deduction: 101 },
  { basic: 1.1, allowance: 0, deduction: 0 },
  { basic: 100, allowance: -1, deduction: 0 },
])
  test("invalid payroll inputs rejected " + JSON.stringify(salary), () =>
    assert.throws(() => payrollTotals(salary)),
  );
test("recipient duplicates normalized case insensitively", () =>
  assert.deepEqual(normalizedRecipients(" A@EXAMPLE.TEST; a@example.test\nb@example.test"), [
    "a@example.test",
    "b@example.test",
  ]));
test("email validation requires recipient, subject and body", () => {
  assert.match(messageError("Email", [], "S", "B"), /recipient/);
  assert.match(messageError("Email", ["invalid"], "S", "B"), /invalid/);
  assert.match(messageError("Email", ["a@example.test"], "", "B"), /subject/);
  assert.match(messageError("Email", ["a@example.test"], "S", ""), /body/);
  assert.equal(messageError("Email", ["a@example.test"], "S", "B"), "");
});
test("SMS validation and segment estimates", () => {
  assert.match(messageError("SMS", ["not-phone"], "", "Hi"), /phone/);
  assert.equal(smsMetrics("a".repeat(161)).segments, 2);
  assert.equal(smsMetrics("あ".repeat(71)).segments, 2);
  assert.equal(smsMetrics("").segments, 0);
});
for (const page of workforcePages)
  test("renders workforce route " + page, () => {
    const html = renderToStaticMarkup(
      createElement(WorkforceProvider, {
        children: createElement(FinanceProvider, {
          ids: [],
          session: "2024 – 2025",
          children: createElement(Workforce, {
            page,
            session: "2024 – 2025",
            school: "Illustrative School",
            students: [],
            navigate: () => {},
            notify: () => {},
            onDirty: () => {},
            active: true,
          }),
        }),
      }),
    );
    assert.ok(html.includes("Workforce workspace"));
    assert.ok(html.includes("no backend persistence"));
    assert.ok(!html.includes("NaN"));
  });

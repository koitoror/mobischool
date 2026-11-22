import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  seedLedger,
  postPayment,
  totals,
  balanceFor,
  agingTotals,
  financeSummary,
  financePages,
  type PaymentInput,
} from "../src/financeModel";
import { FinanceProvider } from "../src/FinanceContext";
import Finance from "../src/Finance";
const session = "2024 – 2025";
const seed = () => seedLedger(["ST-1", "ST-2"], session);
const input = (patch: Partial<PaymentInput> = {}): PaymentInput => ({
  student: "ST-1",
  session,
  amount: 100000,
  date: "2025-02-24",
  method: "Bank transfer",
  reference: "NEW-REFERENCE",
  feeIds: ["FEE-1-1"],
  version: 1,
  ...patch,
});
test("seed reconciles expected, paid and outstanding; income is separate", () => {
  const l = seed(),
    t = totals(l);
  assert.equal(t.expected, 6600000);
  assert.equal(t.paid, 3200000);
  assert.equal(t.outstanding, 3400000);
  assert.equal(t.expected, t.paid + t.outstanding);
  assert.equal(l.entries.length, 4);
});
test("payment allocation reconciles; ledger input remains immutable", () => {
  const l = seed();
  const r = postPayment(l, input());
  assert.equal(l.payments.length, 2);
  assert.equal(r.ledger.payments.length, 3);
  assert.equal(
    r.payment.allocations.reduce((s, a) => s + a.amount, 0),
    r.payment.amount,
  );
  assert.equal(totals(r.ledger).outstanding, 3300000);
  assert.equal(r.ledger.entries, l.entries);
});
test("multiple fee lines allocate in displayed order and cap balances", () => {
  const r = postPayment(seed(), input({ amount: 1200000, feeIds: ["FEE-1-1", "FEE-1-2"] }));
  assert.deepEqual(r.payment.allocations, [
    { id: "FEE-1-1", amount: 1000000 },
    { id: "FEE-1-2", amount: 200000 },
  ]);
  assert.equal(balanceFor(r.ledger, r.ledger.obligations[0]), 0);
});
for (const [label, patch, match] of [
  ["zero", { amount: 0 }, /positive/],
  ["negative", { amount: -100 }, /positive/],
  ["fractional minor unit", { amount: 1.1 }, /decimal/],
  ["overpayment", { amount: 1000001 }, /exceeds/],
  ["missing allocation", { feeIds: [] }, /Select/],
  ["foreign allocation", { feeIds: ["FEE-2-1"] }, /Select/],
  ["disabled method", { method: "M-PESA" }, /enabled/],
  ["missing reference", { reference: "" }, /reference/],
  ["duplicate reference", { reference: "demo-1001" }, /already/],
  ["invalid session date", { date: "2026-01-01" }, /session/],
  ["malformed date", { date: "not-a-date" }, /valid/],
  ["stale balance", { version: 0 }, /changed/],
] as [string, Partial<PaymentInput>, RegExp][]) {
  test("rejects " + label, () => assert.throws(() => postPayment(seed(), input(patch)), match));
}
test("concurrent reviewed payment cannot reuse stale version", () => {
  const r = postPayment(seed(), input());
  assert.throws(() => postPayment(r.ledger, input({ reference: "OTHER" })), /changed/);
});
test("sequential receipts use unique identifiers", () => {
  const a = postPayment(seed(), input());
  const b = postPayment(a.ledger, input({ version: a.ledger.version, reference: "SECOND" }));
  assert.notEqual(a.payment.id, b.payment.id);
});
test("discount reduces expected and outstanding, never increases collected", () => {
  const l = seed();
  l.obligations[0].discount = 200000;
  const t = totals(l);
  assert.equal(t.expected, 6400000);
  assert.equal(t.paid, 3200000);
  assert.equal(t.outstanding, 3200000);
});
test("five aging buckets reconcile to outstanding balance", () => {
  const ledger = seed();
  const aging = agingTotals(ledger);
  assert.equal(aging.length, 5);
  assert.equal(
    aging.reduce((sum, amount) => sum + amount, 0),
    totals(ledger).outstanding,
  );
});
test("shared finance summary keeps fees, non-fee income and expenses distinct", () => {
  const ledger = seed();
  const summary = financeSummary(ledger, session);
  assert.equal(summary.expected, summary.paid + summary.outstanding);
  assert.equal(summary.income, 600000);
  assert.equal(summary.expenses, 210000);
  assert.equal(summary.studentsWithBalance, 2);
});
const students = [
  {
    id: "ST-1",
    name: "Olivia Rhye",
    guardian: "Michael Rhye",
    phone: "555-0101",
    grade: "Grade 8",
    section: "A",
    date: "12 Aug 2024",
    status: "Active",
  },
  {
    id: "ST-2",
    name: "Phoenix Baker",
    guardian: "Sarah Baker",
    phone: "555-0102",
    grade: "Grade 9",
    section: "B",
    date: "12 Aug 2024",
    status: "Active",
  },
];
for (const page of financePages) {
  test("renders finance route: " + page, () => {
    const html = renderToStaticMarkup(
      createElement(FinanceProvider, {
        ids: students.map((s) => s.id),
        session,
        children: createElement(Finance, {
          page,
          session,
          school: "Illustrative School",
          students,
          active: true,
          navigate: () => {},
          onStudent: () => {},
          notify: () => {},
          onDirty: () => {},
        }),
      }),
    );
    assert.ok(html.includes("Illustrative Data"));
    assert.ok(html.includes("Finance workspace"));
    assert.ok(!html.includes("NaN"));
  });
}

test("rejects non-existent calendar date", () =>
  assert.throws(() => postPayment(seed(), input({ date: "2025-02-30" })), /valid/));

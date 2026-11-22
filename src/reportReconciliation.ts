import type { Ledger } from "./financeModel";
import { agingLabels, agingTotals, balanceFor } from "./financeModel";
import type { ReportRow } from "./reportsModel";
export function reconcileFinance(rows: ReportRow[], ledger: Ledger, asOf: string) {
  const ids = new Set(rows.map((r) => r.id)),
    obligations = ledger.obligations.filter((o) => ids.has(o.id)),
    payments = ledger.payments.filter((p) => ids.has(p.id)),
    entries = ledger.entries.filter((e) => ids.has(e.id));
  const expected = obligations.reduce((n, o) => n + o.amount - o.discount, 0),
    paidOnCohort = obligations.reduce(
      (n, o) => n + o.amount - o.discount - balanceFor(ledger, o),
      0,
    ),
    outstanding = expected - paidOnCohort;
  const grouped = (values: { key: string; amount: number }[]) =>
    Object.entries(
      values.reduce<Record<string, number>>((a, v) => {
        a[v.key] = (a[v.key] || 0) + v.amount;
        return a;
      }, {}),
    );
  return {
    expected,
    paidOnCohort,
    outstanding,
    collectionRate: expected ? (paidOnCohort / expected) * 100 : null,
    collections: payments.reduce((n, p) => n + p.amount, 0),
    income: entries.filter((e) => e.kind === "Income").reduce((n, e) => n + e.amount, 0),
    expenses: entries.filter((e) => e.kind === "Expense").reduce((n, e) => n + e.amount, 0),
    aging: agingTotals(ledger, obligations, asOf).map(
      (v, i) => [agingLabels[i], v] as [string, number],
    ),
    methods: grouped(payments.map((p) => ({ key: p.method, amount: p.amount }))),
    feeTypes: grouped(
      payments.flatMap((p) =>
        p.allocations.map((a) => ({
          key: ledger.obligations.find((o) => o.id === a.id)?.item || "Missing fee reference",
          amount: a.amount,
        })),
      ),
    ),
    classes: grouped(
      obligations.map((o) => ({
        key: rows.find((r) => r.id === o.id)?.grade || "Unassigned",
        amount: balanceFor(ledger, o),
      })),
    ),
  };
}
export function reconcileRows(rows: ReportRow[], name: string) {
  const count = (status: string) => rows.filter((r) => r.status === status).length,
    category = (c: string) => rows.filter((r) => r.category === c),
    sum = (rs: ReportRow[]) => rs.reduce((n, r) => n + (r.value ?? 0), 0);
  if (name === "Attendance")
    return ["Present", "Absent", "Late", "Excused"].map(
      (s) =>
        [
          s,
          String(rows.filter((r) => r.category === "Marked attendance" && r.status === s).length),
        ] as [string, string],
    );
  if (name === "Examinations")
    return [
      [
        "Unique assessed students",
        String(
          new Set(rows.filter((r) => r.status === "Published").map((r) => r.id.split("|")[1])).size,
        ),
      ],
      ...Object.entries(
        rows
          .filter((r) => r.status === "Published")
          .reduce<Record<string, number>>((a, r) => {
            const grade =
              r.detail.split("snapshot ")[1]?.split(" / scale")[0] || "Snapshot unavailable";
            a[grade] = (a[grade] || 0) + 1;
            return a;
          }, {}),
      ).map(([g, n]) => ["Published grade " + g, String(n)]),
    ];
  if (name === "Inventory")
    return ["Opening balance", "Receipt", "Issue", "Adjustment", "Return"].map(
      (c) => [c + " (signed)", String(sum(category(c)))] as [string, string],
    );
  if (name === "Library")
    return [
      ["Issued / overdue", String(count("Issued") + count("Overdue"))],
      ["Returned", String(count("Returned"))],
      ["Renewal actions", String(sum(category("Loan")))],
    ];
  if (name === "Transport")
    return [
      [
        "Active vehicles",
        String(
          category("Vehicle").filter((r) => ["Available", "Assigned"].includes(r.status)).length,
        ),
      ],
      [
        "Inactive / maintenance vehicles",
        String(
          category("Vehicle").filter((r) => !["Available", "Assigned"].includes(r.status)).length,
        ),
      ],
      ["Recorded vehicle seats", String(sum(category("Vehicle")))],
    ];
  if (name === "Alumni")
    return [
      ["Reviewed alumni", String(category("Alumnus").length)],
      ...[
        "Registered",
        "Attending",
        "Attendance marked",
        "Waitlisted",
        "Declined",
        "Cancelled",
      ].map((s) => [s, String(category("Participation").filter((r) => r.status === s).length)]),
    ];
  return [];
}

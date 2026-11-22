// Deliberately independent of presentation selectors and reportTraceability/calculationEvidence.
// Row-based checks validate projection arithmetic, not the correctness of the source projection itself.
import type { ReportRow, Filters } from "./reportsModel";
import type { Ledger } from "./financeModel";
export function referenceMetric(title: string, records: ReportRow[], ledger: Ledger) {
  const unique = new Map<string, ReportRow>();
  for (const r of records) if (!unique.has(r.id)) unique.set(r.id, r);
  const rows = [...unique.values()],
    select = (category: string) => rows.filter((r) => r.category === category);
  const add = (data: ReportRow[], field: "value" | "quantity" = "value") => {
    let n = 0;
    for (const r of data) n += r[field] ?? 0;
    return n;
  };
  const financial = [
    "Fees expected (due cohort)",
    "Fee collections (period)",
    "General income",
    "Expenses",
    "Net general income",
    "Outstanding (due cohort)",
  ].includes(title);
  let expected: number | null = null,
    formula = "Unavailable: this metric has no independently implemented reference.";
  const counts: Record<string, ReportRow[]> = {
    "Matching source records": rows,
    "Undated records": rows.filter((r) => !r.date),
    "Missing numeric values": rows.filter((r) => r.value === null),
    "Marked observations": select("Marked attendance"),
    Absent: rows.filter((r) => r.category === "Marked attendance" && r.status === "Absent"),
    "Leave requests": select("Student leave"),
    "Published results": rows.filter((r) => r.status === "Published" && r.value !== null),
    "Draft / reviewed": rows.filter((r) => r.status !== "Published"),
    Topics: select("Topic"),
    Completed: rows.filter((r) => r.category === "Topic" && r.status === "Completed"),
    "Lesson plans": select("Lesson plan"),
    Attempts: rows,
    "Submitted / evaluated": rows.filter((r) => r.status !== "In Progress"),
    Incomplete: rows.filter((r) => r.status === "In Progress"),
    Evaluated: rows.filter((r) => r.status === "Evaluated"),
    "Published assignments": rows.filter(
      (r) => r.category === "Assignment" && r.status === "Published",
    ),
    "Catalog titles": select("Catalog"),
    "Overdue loans": rows.filter((r) => r.category === "Loan" && r.status === "Overdue"),
    "Low stock items": rows.filter(
      (r) => r.category === "Stock snapshot" && r.status === "Low stock",
    ),
    Routes: select("Route"),
    Vehicles: select("Vehicle"),
    "Active assignments": rows.filter((r) => r.category === "Assignment" && r.status === "Active"),
  };
  if (counts[title]) {
    expected = counts[title].length;
    formula = "Independent count of matching unique source-row identities";
  }
  if (title === "Distinct categories") {
    expected = new Set(rows.map((r) => r.category)).size;
    formula = "Unique category labels";
  }
  const sums: Record<string, [string, "value" | "quantity"]> = {
    "Physical copies": ["Catalog", "value"],
    "Available copies": ["Catalog", "quantity"],
    "Stock units (snapshot)": ["Stock snapshot", "value"],
    "Issues (signed period)": ["Issue", "value"],
    "Receipts (period)": ["Receipt", "value"],
  };
  if (sums[title]) {
    const [kind, field] = sums[title];
    expected = add(select(kind), field);
    formula = "Independent sum of " + field + " on " + kind;
  }
  if (financial) {
    if (
      [ledger.obligations, ledger.payments, ledger.entries].some(
        (records) => new Set(records.map((r) => r.id)).size !== records.length,
      )
    )
      return {
        expected: null,
        formula:
          "Unavailable: duplicate source ledger IDs require reconciliation before reference totals can be trusted.",
        unit: "currency major units",
        basis: "Raw shared ledger",
      };
    const ids = new Set(rows.map((r) => r.id)),
      fees = ledger.obligations.filter((o) => ids.has(o.id)),
      payments = ledger.payments.filter((p) => ids.has(p.id)),
      entries = ledger.entries.filter((e) => ids.has(e.id));
    let net = 0,
      allocated = 0,
      paid = 0,
      income = 0,
      expense = 0;
    for (const fee of fees) {
      net += fee.amount - fee.discount;
      for (const payment of ledger.payments)
        for (const allocation of payment.allocations)
          if (allocation.id === fee.id) allocated += allocation.amount;
    }
    for (const p of payments) paid += p.amount;
    for (const e of entries)
      if (e.kind === "Income") income += e.amount;
      else expense += e.amount;
    expected = title.startsWith("Fees expected")
      ? net
      : title.startsWith("Fee collections")
        ? paid
        : title === "General income"
          ? income
          : title === "Expenses"
            ? expense
            : title === "Net general income"
              ? income - expense
              : net - allocated;
    expected /= 100;
    formula =
      "Independent raw-ledger loop; amount/discount/allocation fields, not presentation totals. Display currency major units.";
  }
  const rate = (num: number, den: number) => (den ? (num / den) * 100 : null);
  if (title === "Attendance rate") {
    const observations = select("Marked attendance").filter((r) =>
      ["Present", "Late", "Absent", "Excused"].includes(r.status),
    );
    expected = rate(
      observations.filter((r) => r.status === "Present" || r.status === "Late").length,
      observations.length,
    );
    formula = "Present + Late / marked observations × 100";
  }
  if (title === "Topic completion") {
    expected = rate(
      select("Topic").filter((r) => r.status === "Completed").length,
      select("Topic").length,
    );
    formula = "Completed topics / selected topics × 100";
  }
  if (title === "Published average") {
    const p = rows.filter((r) => r.status === "Published" && r.value !== null);
    expected = p.length ? add(p) / p.length : null;
    formula = "Stored published percentage sum / published records";
  }
  const work = rows.filter((r) => r.category === "Assignment" && r.status === "Published");
  if (title === "Expected submissions") {
    expected = add(work, "quantity");
    formula = "Sum of eligible published assignment recipients";
  }
  if (title === "Missing submissions") {
    expected = Math.max(0, add(work, "quantity") - add(work));
    formula = "Expected minus submitted, clamped at zero";
  }
  if (title === "Submission rate") {
    expected = rate(add(work), add(work, "quantity"));
    formula = "Submitted / eligible expected × 100";
  }
  return {
    expected,
    formula,
    unit: financial
      ? "currency major units"
      : title.includes("rate") || title.includes("completion") || title === "Published average"
        ? "percent"
        : "source units",
    basis: financial
      ? "Raw shared ledger"
      : "Shared source-row projection; not independently verified source joins",
  };
}
export function referenceExclusions(records: ReportRow[], filters: Filters) {
  return records.map((r) => {
    const reasons: string[] = [];
    if (filters.session !== "All" && r.session !== filters.session) reasons.push("session");
    if (filters.from && (!r.date || r.date.slice(0, 10) < filters.from))
      reasons.push("before period / undated");
    if (filters.to && (!r.date || r.date.slice(0, 10) > filters.to))
      reasons.push("after period / undated");
    for (const field of ["grade", "section", "category", "status", "actor"] as const)
      if (filters[field] !== "All" && filters[field] !== r[field]) reasons.push(field);
    if (
      filters.query &&
      !`${r.label} ${r.id} ${r.detail}`.toLowerCase().includes(filters.query.toLowerCase())
    )
      reasons.push("search");
    return { id: r.id, reasons };
  });
}

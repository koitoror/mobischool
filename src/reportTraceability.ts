import type { ReportRow } from "./reportsModel";
import type { Ledger } from "./financeModel";
import { balanceFor } from "./financeModel";
export function metricContributors(title: string, rows: ReportRow[]) {
  const category = (c: string) => rows.filter((r) => r.category === c);
  if (title.includes("expected") || title.includes("Outstanding"))
    return category("Fee obligation");
  if (title.includes("collections")) return category("Fee collection");
  if (title === "General income") return category("Income");
  if (title === "Expenses") return category("Expense");
  if (title === "Net general income")
    return rows.filter((r) => ["Income", "Expense"].includes(r.category));
  if (title === "Marked observations" || title === "Attendance rate")
    return category("Marked attendance");
  if (title === "Absent")
    return rows.filter((r) => r.category === "Marked attendance" && r.status === "Absent");
  if (title === "Leave requests") return category("Student leave");
  if (title === "Published results" || title === "Published average")
    return rows.filter((r) => r.status === "Published" && r.value !== null);
  if (title === "Draft / reviewed") return rows.filter((r) => r.status !== "Published");
  if (title === "Pass rate" || title === "Passenger utilization") return [];
  if (title === "Topics" || title === "Topic completion") return category("Topic");
  if (title === "Completed")
    return rows.filter((r) => r.category === "Topic" && r.status === "Completed");
  if (title === "Lesson plans") return category("Lesson plan");
  if (title === "Submitted / evaluated") return rows.filter((r) => r.status !== "In Progress");
  if (title === "Incomplete") return rows.filter((r) => r.status === "In Progress");
  if (title === "Evaluated") return rows.filter((r) => r.status === "Evaluated");
  if (
    [
      "Published assignments",
      "Expected submissions",
      "Missing submissions",
      "Submission rate",
    ].includes(title)
  )
    return rows.filter((r) => r.category === "Assignment" && r.status === "Published");
  if (["Catalog titles", "Physical copies", "Available copies"].includes(title))
    return category("Catalog");
  if (title === "Overdue loans")
    return rows.filter((r) => r.category === "Loan" && r.status === "Overdue");
  if (title === "Stock units (snapshot)") return category("Stock snapshot");
  if (title === "Issues (signed period)") return category("Issue");
  if (title === "Receipts (period)") return category("Receipt");
  if (title === "Low stock items")
    return rows.filter((r) => r.category === "Stock snapshot" && r.status === "Low stock");
  if (title === "Routes") return category("Route");
  if (title === "Vehicles") return category("Vehicle");
  if (title === "Active assignments")
    return rows.filter((r) => r.category === "Assignment" && r.status === "Active");
  if (title === "Undated records") return rows.filter((r) => !r.date);
  if (title === "Missing numeric values") return rows.filter((r) => r.value === null);
  return rows;
}
export function calculationEvidence(title: string, rows: ReportRow[], ledger?: Ledger) {
  const included = metricContributors(title, rows),
    sum = included.reduce((n, r) => n + (r.value ?? 0), 0);
  if (title.includes("Outstanding") && ledger)
    return {
      formula:
        "Sum of selected obligations minus discounts and all recorded allocations (due cohort, not period cash flow)",
      numerator: ledger.obligations
        .filter((o) => included.some((r) => r.id === o.id))
        .reduce((n, o) => n + balanceFor(ledger, o), 0),
      denominator: null,
    };
  if (title === "Available copies")
    return {
      formula: "Sum of current available physical quantities from selected catalog records",
      numerator: included.reduce((n, r) => n + (r.quantity ?? 0), 0),
      denominator: null,
    };
  if (title === "Expected submissions")
    return {
      formula: "Sum of active eligible recipients of selected published assignments",
      numerator: included.reduce((n, r) => n + (r.quantity ?? 0), 0),
      denominator: null,
    };
  if (title === "Missing submissions")
    return {
      formula: "Expected recipients minus recorded submissions; never below zero",
      numerator: Math.max(
        0,
        included.reduce((n, r) => n + (r.quantity ?? 0) - (r.value ?? 0), 0),
      ),
      denominator: null,
    };
  if (title === "Distinct categories")
    return {
      formula: "Count of unique category labels in the filtered source rows",
      numerator: new Set(included.map((r) => r.category)).size,
      denominator: null,
    };
  if (
    [
      "Matching source records",
      "Undated records",
      "Missing numeric values",
      "Marked observations",
      "Absent",
      "Leave requests",
      "Published results",
      "Draft / reviewed",
      "Topics",
      "Completed",
      "Lesson plans",
      "Attempts",
      "Submitted / evaluated",
      "Incomplete",
      "Evaluated",
      "Published assignments",
      "Catalog titles",
      "Overdue loans",
      "Low stock items",
      "Routes",
      "Vehicles",
      "Active assignments",
    ].includes(title)
  )
    return {
      formula: "Count of the exact contributing source records shown below",
      numerator: included.length,
      denominator: null,
    };
  if (title === "Attendance rate")
    return {
      formula: "(Present + Late) / marked observations × 100",
      numerator: included.filter((r) => ["Present", "Late"].includes(r.status)).length,
      denominator: included.length,
    };
  if (title === "Topic completion")
    return {
      formula: "Completed topics / topic records × 100",
      numerator: included.filter((r) => r.status === "Completed").length,
      denominator: included.length,
    };
  if (title === "Published average")
    return {
      formula: "Sum of stored published percentages / published observations",
      numerator: sum,
      denominator: included.length,
    };
  if (title === "Submission rate")
    return {
      formula: "Submitted / expected eligible recipients × 100",
      numerator: sum,
      denominator: included.reduce((n, r) => n + (r.quantity || 0), 0),
    };
  if (title === "Net general income")
    return {
      formula: "General income − expenses; fee payments excluded",
      numerator: included.reduce(
        (n, r) => n + (r.category === "Expense" ? -1 : 1) * (r.value ?? 0),
        0,
      ),
      denominator: null,
    };
  if (title === "Pass rate" || title === "Passenger utilization")
    return {
      formula: "Unavailable: required source policy / passenger records are not connected",
      numerator: null,
      denominator: null,
    };
  return {
    formula:
      "Contributing source records; source numeric values and units are shown below. Counts, distinct categories, quantities and balances must not be mixed.",
    numerator: sum,
    denominator: included.length,
  };
}

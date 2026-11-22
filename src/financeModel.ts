export const feePages = [
  "Fees Collection",
  "Collect Fees",
  "Search Fees Payment",
  "Search Due Fees",
  "Fees Master",
  "Fees Group",
  "Fees Type",
  "Fees Discount",
  "Fees Reminder",
  "Bulk Fee Receipts",
];
export const incomePages = ["Income", "Add Income", "Search Income", "Income Head"];
export const expensePages = ["Expenses", "Add Expense", "Search Expense", "Expense Head"];
export const financePages = [...feePages, ...incomePages, ...expensePages];
export const AS_OF = "2025-02-24";
export type Obligation = {
  id: string;
  student: string;
  session: string;
  item: string;
  amount: number;
  discount: number;
  due: string;
};
export type Payment = {
  id: string;
  student: string;
  session: string;
  amount: number;
  date: string;
  method: string;
  reference: string;
  allocations: { id: string; amount: number }[];
  actor: string;
};
export type Entry = {
  id: string;
  kind: "Income" | "Expense";
  session: string;
  head: string;
  amount: number;
  date: string;
  method: string;
  reference: string;
  party: string;
  description: string;
};
export type Ledger = {
  obligations: Obligation[];
  payments: Payment[];
  entries: Entry[];
  version: number;
};
export const methods = ["Cash", "Bank transfer", "Card", "Mobile Money", "Cheque", "Other"];
export function seedLedger(ids: string[], session: string): Ledger {
  return {
    version: 1,
    obligations: ids.flatMap((student, i) =>
      ["Tuition", "Activity", "Transport"].map((item, j) => ({
        id: `FEE-${i + 1}-${j + 1}`,
        student,
        session,
        item,
        amount: [2500000, 300000, 500000][j],
        discount: 0,
        due: ["2025-01-10", "2025-02-10", "2025-03-10"][j],
      })),
    ),
    payments: ids.map((student, i) => ({
      id: `RCP-2025-${1001 + i}`,
      student,
      session,
      amount: 1600000,
      date: `2025-0${1 + (i % 2)}-${String(10 + i).padStart(2, "0")}`,
      method: methods[i % 3],
      reference: `DEMO-${1001 + i}`,
      allocations: [
        { id: `FEE-${i + 1}-1`, amount: 1500000 },
        { id: `FEE-${i + 1}-2`, amount: 100000 },
      ],
      actor: "Alex Morgan",
    })),
    entries: [
      {
        id: "INC-1001",
        kind: "Income",
        session,
        head: "Donations",
        amount: 420000,
        date: "2025-02-12",
        method: "Bank transfer",
        reference: "DON-001",
        party: "Community partners",
        description: "Library development donation",
      },
      {
        id: "INC-1002",
        kind: "Income",
        session,
        head: "Facility rental",
        amount: 180000,
        date: "2025-01-20",
        method: "Bank transfer",
        reference: "RENT-002",
        party: "Community association",
        description: "Sports hall rental",
      },
      {
        id: "EXP-1001",
        kind: "Expense",
        session,
        head: "Utilities",
        amount: 125000,
        date: "2025-02-14",
        method: "Bank transfer",
        reference: "UTIL-001",
        party: "Illustrative utility supplier",
        description: "February utilities",
      },
      {
        id: "EXP-1002",
        kind: "Expense",
        session,
        head: "Supplies",
        amount: 85000,
        date: "2025-01-18",
        method: "Card",
        reference: "SUP-002",
        party: "Learning supplies",
        description: "Classroom supplies",
      },
    ],
  };
}
export function paidFor(ledger: Ledger, id: string) {
  return ledger.payments.reduce(
    (s, p) => s + p.allocations.filter((a) => a.id === id).reduce((t, a) => t + a.amount, 0),
    0,
  );
}
export function balanceFor(ledger: Ledger, o: Obligation) {
  return o.amount - o.discount - paidFor(ledger, o.id);
}
export function totals(ledger: Ledger, obligations = ledger.obligations) {
  const gross = obligations.reduce((s, o) => s + o.amount, 0),
    discount = obligations.reduce((s, o) => s + o.discount, 0),
    paid = obligations.reduce((s, o) => s + paidFor(ledger, o.id), 0);
  return {
    gross,
    discount,
    expected: gross - discount,
    paid,
    outstanding: gross - discount - paid,
    rate: gross - discount ? (paid / (gross - discount)) * 100 : null,
  };
}
export const agingLabels = [
  "Current / not yet due",
  "1–30 days overdue",
  "31–60 days overdue",
  "61–90 days overdue",
  "Over 90 days overdue",
] as const;
export function agingTotals(ledger: Ledger, obligations = ledger.obligations, asOf = AS_OF) {
  const buckets = [0, 0, 0, 0, 0];
  obligations.forEach((obligation) => {
    const balance = balanceFor(ledger, obligation);
    if (balance <= 0) return;
    const days = Math.floor((Date.parse(asOf) - Date.parse(obligation.due)) / 86400000);
    buckets[days <= 0 ? 0 : days <= 30 ? 1 : days <= 60 ? 2 : days <= 90 ? 3 : 4] += balance;
  });
  return buckets;
}
export function financeSummary(ledger: Ledger, session: string, asOf = AS_OF) {
  const obligations = ledger.obligations.filter((o) => o.session === session);
  const feeTotals = totals(ledger, obligations);
  const entries = ledger.entries.filter((e) => e.session === session);
  return {
    ...feeTotals,
    aging: agingTotals(ledger, obligations, asOf),
    studentsWithBalance: new Set(
      obligations.filter((o) => balanceFor(ledger, o) > 0).map((o) => o.student),
    ).size,
    income: entries
      .filter((e) => e.kind === "Income")
      .reduce((sum, entry) => sum + entry.amount, 0),
    expenses: entries
      .filter((e) => e.kind === "Expense")
      .reduce((sum, entry) => sum + entry.amount, 0),
  };
}
export type PaymentInput = {
  student: string;
  session: string;
  amount: number;
  date: string;
  method: string;
  reference: string;
  feeIds: string[];
  version: number;
};
export function postPayment(
  ledger: Ledger,
  input: PaymentInput,
  enabledMethods: string[] = methods,
): { ledger: Ledger; payment: Payment } {
  if (input.version !== ledger.version)
    throw Error("Balances changed since review. Re-open the payment review.");
  if (!Number.isSafeInteger(input.amount) || input.amount <= 0)
    throw Error("Enter a positive amount with at most two decimal places.");
  if (!enabledMethods.includes(input.method)) throw Error("Choose an enabled payment method.");
  if (
    !input.date ||
    !/^\d{4}-\d{2}-\d{2}$/.test(input.date) ||
    isNaN(Date.parse(input.date)) ||
    new Date(input.date).toISOString().slice(0, 10) !== input.date
  )
    throw Error("Enter a valid payment date.");
  const year = Number(input.session.slice(0, 4));
  if (input.date < `${year}-08-01` || input.date > `${year + 1}-07-31`)
    throw Error("Payment date must fall within the illustrative August–July session.");
  if (input.method !== "Cash" && !input.reference.trim())
    throw Error("A transaction reference is required for this method.");
  if (
    input.reference.trim() &&
    ledger.payments.some((p) => p.reference.toLowerCase() === input.reference.trim().toLowerCase())
  )
    throw Error("That transaction reference is already recorded.");
  const obligations = ledger.obligations.filter(
    (o) =>
      o.student === input.student &&
      o.session === input.session &&
      input.feeIds.includes(o.id) &&
      balanceFor(ledger, o) > 0,
  );
  if (!obligations.length) throw Error("Select at least one outstanding fee line.");
  if (input.amount > obligations.reduce((s, o) => s + balanceFor(ledger, o), 0))
    throw Error(
      "Payment exceeds the selected outstanding balance. Advance credits are not supported in this preview.",
    );
  let remaining = input.amount;
  const allocations = obligations
    .map((o) => {
      const amount = Math.min(remaining, balanceFor(ledger, o));
      remaining -= amount;
      return { id: o.id, amount };
    })
    .filter((a) => a.amount > 0);
  let n = 1001 + ledger.payments.length;
  while (ledger.payments.some((p) => p.id === `RCP-2025-${n}`)) n++;
  const payment: Payment = {
    ...input,
    reference: input.reference.trim(),
    id: `RCP-2025-${n}`,
    allocations,
    actor: "Alex Morgan",
  };
  return {
    ledger: { ...ledger, version: ledger.version + 1, payments: [payment, ...ledger.payments] },
    payment,
  };
}

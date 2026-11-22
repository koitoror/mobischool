import { useEffect, useState } from "react";
import Icon from "./components/Icon";
import { Button, Badge, Card, Field } from "./components/OperationsUI";
import { useFinance } from "./FinanceContext";
import {
  feePages,
  incomePages,
  expensePages,
  AS_OF,
  balanceFor,
  paidFor,
  totals,
  agingLabels,
  agingTotals,
  type Payment,
  type PaymentInput,
  type Entry,
} from "./financeModel";
import type { Student } from "./Lifecycle";
import "./finance.css";
const configSeed: Record<
  string,
  {
    name: string;
    code: string;
    description: string;
    active: boolean;
    amount?: number;
    due?: string;
    group?: string;
    kind?: string;
    value?: number;
  }[]
> = {
  "Fees Master": [
    {
      name: "Term 2 tuition",
      code: "TUI-T2",
      description: "Illustrative schedule · existing obligations are not rewritten",
      active: true,
      amount: 2500000,
      due: "2025-01-10",
      group: "Tuition",
    },
    {
      name: "Term 2 activity",
      code: "ACT-T2",
      description: "Co-curricular activities",
      active: true,
      amount: 300000,
      due: "2025-02-10",
      group: "Activity",
    },
  ],
  "Fees Group": ["Tuition", "Activity", "Transport", "Boarding", "Examination"].map((name, i) => ({
    name,
    code: `GRP-${i + 1}`,
    description: "Institution-defined fee grouping",
    active: true,
  })),
  "Fees Type": ["Termly", "Annual", "One-time", "Installment"].map((name, i) => ({
    name,
    code: `TYP-${i + 1}`,
    description: "Classification only · does not trigger billing frequency",
    active: true,
  })),
  "Fees Discount": [
    {
      name: "Sibling concession",
      code: "DISC-01",
      description: "Illustrative eligibility; approval and stacking policy not connected",
      active: true,
      kind: "Percentage",
      value: 10,
      group: "Tuition",
    },
  ],
  "Income Head": ["Donations", "Facility rental", "Event income", "Other receipts"].map(
    (name, i) => ({ name, code: `INC-${i + 1}`, description: "Non-fee income only", active: true }),
  ),
  "Expense Head": ["Utilities", "Maintenance", "Supplies", "Transport", "Salaries"].map(
    (name, i) => ({
      name,
      code: `EXP-${i + 1}`,
      description: "Manual expense classification",
      active: true,
    }),
  ),
};
function MiniChart({
  labels,
  series,
  names,
  money,
  onClick,
}: {
  labels: string[];
  series: number[][];
  names: string[];
  money: (n: number) => string;
  onClick: (i: number) => void;
}) {
  const max = Math.max(...series.flat(), 1);
  return (
    <div className="fn-chart">
      <div className="fn-chart-legend">
        {names.map((n, i) => (
          <span key={n}>
            <i style={{ background: ["#6798bb", "#d5e3ed"][i] }} />
            {n}
          </span>
        ))}
      </div>
      <div className="fn-chart-grid">
        {labels.map((l, i) => (
          <button
            key={l}
            onClick={() => onClick(i)}
            title={names.map((n, j) => `${n}: ${money(series[j][i] || 0)}`).join(" · ")}
            aria-label={l + " financial details"}
          >
            <span className="fn-bar-pair">
              {series.map((s, j) => (
                <i
                  key={j}
                  style={{
                    height: ((s[i] || 0) / max) * 140 + "px",
                    background: ["#6798bb", "#d5e3ed"][j],
                  }}
                />
              ))}
            </span>
            <small>{l}</small>
          </button>
        ))}
      </div>
      <p>Amounts in configured currency · hover for exact values</p>
    </div>
  );
}
function Trend({
  values,
  labels,
  money,
  onClick,
}: {
  values: number[];
  labels: string[];
  money: (n: number) => string;
  onClick: () => void;
}) {
  const max = Math.max(...values, 1);
  return (
    <div className="fn-trend">
      <svg viewBox="0 0 500 180" role="img" aria-label="Confirmed fee receipts by month">
        <line x1="24" x2="475" y1="150" y2="150" stroke="#e5ecf2" />
        {[40, 80, 120].map((y) => (
          <line key={y} x1="24" x2="475" y1={y} y2={y} stroke="#eef2f5" strokeDasharray="3 4" />
        ))}
        <polyline
          points={values
            .map((v, i) => `${30 + (i * 440) / (values.length - 1 || 1)},${150 - (v / max) * 120}`)
            .join(" ")}
          fill="none"
          stroke="#6798bb"
          strokeWidth="2.5"
        />
        {values.map((v, i) => (
          <g
            key={i}
            role="button"
            tabIndex={0}
            onClick={onClick}
            onKeyDown={(e) => e.key === "Enter" && onClick()}
            aria-label={labels[i] + " " + money(v)}
          >
            <circle
              cx={30 + (i * 440) / (values.length - 1 || 1)}
              cy={150 - (v / max) * 120}
              r="5"
              fill="white"
              stroke="#6798bb"
              strokeWidth="2"
            />
            <title>{`${labels[i]}: ${money(v)}`}</title>
          </g>
        ))}
      </svg>
      <div>
        {labels.map((l) => (
          <span key={l}>{l}</span>
        ))}
      </div>
    </div>
  );
}
export default function Finance({
  page,
  session,
  school,
  students,
  navigate,
  onStudent,
  active,
  notify,
  onDirty,
}: {
  page: string;
  session: string;
  school: string;
  students: Student[];
  navigate: (p: string) => void;
  onStudent: (s: Student) => void;
  active: boolean;
  notify: (s: string) => void;
  onDirty: (b: boolean) => void;
}) {
  const {
    ledger,
    update,
    commit,
    money,
    currency,
    setCurrency,
    selectedStudent,
    setSelectedStudent,
    paymentMethods,
  } = useFinance();
  const methods = paymentMethods
    .filter((m) => m.active)
    .sort((a, b) => a.order - b.order)
    .map((m) => m.name);
  const [q, setQ] = useState("");
  const [cls, setCls] = useState("All classes");
  const [method, setMethod] = useState("All methods");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [index, setIndex] = useState(1);
  const [size, setSize] = useState(10);
  const [drawer, setDrawer] = useState<{
    type: string;
    title: string;
    payment?: Payment;
    entry?: Entry;
    name?: string;
  } | null>(null);
  const [config, setConfig] = useState(configSeed);
  const [form, setForm] = useState<Record<string, string>>({});
  const [amount, setAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(AS_OF);
  const [paymentMethod, setPaymentMethod] = useState("Bank transfer");
  const [reference, setReference] = useState("");
  const [allocation, setAllocation] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [review, setReview] = useState<PaymentInput | null>(null);
  const [dirty, setDirty] = useState(false);
  const [role, setRole] = useState("Finance administrator");
  const [state, setState] = useState("Ready");
  const [discountStudent, setDiscountStudent] = useState("");
  const [draftSaved, setDraftSaved] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, Record<string, string>>>({});
  const [reminders, setReminders] = useState<{ student: string; status: string; date: string }[]>(
    [],
  );
  const [message, setMessage] = useState(
    "Dear Parent/Guardian, the school fee balance for [Student Name] is [Balance], due [Due Date]. Please contact the school office for payment details. Thank you.",
  );
  const [channel, setChannel] = useState("Email (simulation)");
  const [corrections, setCorrections] = useState<string[]>([]);
  const canEdit = role === "Finance administrator";
  const person = (id: string) => students.find((s) => s.id === id);
  const classes = [...new Set(students.map((s) => s.grade).filter(Boolean))];
  const student = person(selectedStudent);
  const obligations = ledger.obligations.filter(
    (o) =>
      o.session === session &&
      (!cls || cls === "All classes" || person(o.student)?.grade === cls) &&
      (!from || o.due >= from) &&
      (!to || o.due <= to),
  );
  const allStudentFees = ledger.obligations.filter(
    (o) => o.student === selectedStudent && o.session === session,
  );
  const studentTotals = totals(ledger, allStudentFees);
  const scopedTotals = totals(ledger, obligations);
  const paymentRows = ledger.payments.filter(
    (p) =>
      p.session === session &&
      (cls === "All classes" || person(p.student)?.grade === cls) &&
      (method === "All methods" || p.method === method) &&
      (!from || p.date >= from) &&
      (!to || p.date <= to) &&
      [p.id, p.reference, person(p.student)?.name || "", p.student].some((v) =>
        v.toLowerCase().includes(q.toLowerCase()),
      ),
  );
  const dueRows = students
    .filter(
      (s) =>
        (cls === "All classes" || s.grade === cls) &&
        [s.name, s.id, s.guardian].some((v) => v.toLowerCase().includes(q.toLowerCase())),
    )
    .map((s) => ({
      s,
      fees: obligations.filter((o) => o.student === s.id),
      t: totals(
        ledger,
        obligations.filter((o) => o.student === s.id),
      ),
    }))
    .filter((r) => r.t.outstanding > 0);
  const kind = incomePages.includes(page) ? "Income" : "Expense";
  const entries = ledger.entries.filter(
    (e) =>
      e.kind === kind &&
      e.session === session &&
      (method === "All methods" || e.method === method) &&
      (!from || e.date >= from) &&
      (!to || e.date <= to) &&
      [e.head, e.reference, e.party, e.id].some((v) => v.toLowerCase().includes(q.toLowerCase())),
  );
  const entryTotal = entries.reduce((s, e) => s + e.amount, 0);
  useEffect(() => {
    if (!active) {
      setDrawer(null);
      return;
    }
    setQ("");
    setIndex(1);
    setSelected([]);
    setDrawer(null);
    setError("");
    setDirty(false);
    setState("Ready");
    if (page === "Add Income" || page === "Add Expense") {
      setForm(drafts[page] || {});
      setDraftSaved(!!drafts[page]);
    }
  }, [page, active]);
  useEffect(() => {
    if (active) onDirty(dirty);
    const fn = (e: BeforeUnloadEvent) => {
      if (active && dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", fn);
    return () => window.removeEventListener("beforeunload", fn);
  }, [dirty, active, onDirty]);
  useEffect(() => {
    setAllocation([]);
    setAmount("");
    setReference("");
    setError("");
    setReview(null);
  }, [selectedStudent, session]);
  const go = (p: string) => {
    if (dirty && !window.confirm("Discard unsaved finance input?")) return;
    setDirty(false);
    setDrawer(null);
    navigate(p);
  };
  const collect = (id: string) => {
    setSelectedStudent(id);
    go("Collect Fees");
  };
  const show = (type: string, title: string, extra: Partial<NonNullable<typeof drawer>> = {}) => {
    setError("");
    setDrawer({ type, title, ...extra });
  };
  const reset = () => {
    setQ("");
    setCls("All classes");
    setMethod("All methods");
    setFrom("");
    setTo("");
    setIndex(1);
  };
  const csv = (records: Record<string, unknown>[], name: string) => {
    if (!records.length) {
      notify("No matching records to export");
      return;
    }
    const keys = Object.keys(records[0]);
    const data = [
      keys,
      ...records.map((r) =>
        keys.map((k) => (typeof r[k] === "object" ? JSON.stringify(r[k]) : String(r[k] ?? ""))),
      ),
    ]
      .map((r) => r.map((v) => '"' + v.replace(/"/g, '""') + '"').join(","))
      .join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([data], { type: "text/csv" }));
    a.download = name + ".csv";
    a.click();
    URL.revokeObjectURL(a.href);
    notify("Illustrative finance records exported");
  };
  const set = (key: string, v: string) => {
    setForm((f) => ({ ...f, [key]: v }));
    setDirty(true);
    setDraftSaved(false);
  };
  const tick = (id: string) =>
    setSelected(selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id]);
  const stats = (items: [string, string, string?][]) => (
    <div className="op-stats fn-stats">
      {items.map(([label, value, dest]) => (
        <button key={label} onClick={() => dest && go(dest)} disabled={!dest}>
          <span>
            {label}
            {dest && <Icon name="arrow" size={14} />}
          </span>
          <strong title={value}>{value}</strong>
          <small>Illustrative Data · {session}</small>
        </button>
      ))}
    </div>
  );
  const toolbar = (payment = false) => (
    <div className="op-toolbar">
      <label className="op-search">
        <Icon name="search" size={16} />
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setIndex(1);
          }}
          placeholder={payment ? "Search receipt, student or reference..." : "Search records..."}
        />
      </label>
      {feePages.includes(page) && (
        <select
          aria-label="Class"
          value={cls}
          onChange={(e) => {
            setCls(e.target.value);
            setIndex(1);
          }}
        >
          <option>All classes</option>
          {classes.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      )}
      {payment || incomePages.includes(page) || expensePages.includes(page) ? (
        <select
          aria-label="Payment method"
          value={method}
          onChange={(e) => {
            setMethod(e.target.value);
            setIndex(1);
          }}
        >
          <option>All methods</option>
          {methods.map((m) => (
            <option key={m}>{m}</option>
          ))}
        </select>
      ) : null}
      <Button icon="filter" onClick={() => show("filters", "Financial filters")}>
        Filters
      </Button>
      {(q || from || to || cls !== "All classes" || method !== "All methods") && (
        <Button onClick={reset}>Reset</Button>
      )}
    </div>
  );
  const table = (headers: React.ReactNode[], data: React.ReactNode[], count: number) => (
    <>
      <div className="op-table-wrap">
        <table>
          <thead>
            <tr>
              {headers.map((h, i) => (
                <th key={i}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>{data}</tbody>
        </table>
        {!count && (
          <div className="op-empty">
            <Icon name="wallet" size={26} />
            <h3>No matching financial records</h3>
            <p>No zero-value transactions or receipts are fabricated.</p>
            <Button onClick={reset}>Clear filters</Button>
          </div>
        )}
      </div>
      <div className="op-pagination">
        <span>
          {count} records · values in {currency}
        </span>
        <div>
          <select
            aria-label="Rows per page"
            value={size}
            onChange={(e) => {
              setSize(Number(e.target.value));
              setIndex(1);
            }}
          >
            {[10, 25, 50].map((n) => (
              <option key={n}>{n}</option>
            ))}
          </select>
          <button disabled={index <= 1} onClick={() => setIndex(index - 1)}>
            ← Previous
          </button>
          <span>{Math.min(index, Math.max(1, Math.ceil(count / size)))}</span>
          <button disabled={index * size >= count} onClick={() => setIndex(index + 1)}>
            Next →
          </button>
        </div>
      </div>
    </>
  );
  const slice = <T,>(data: T[]) =>
    data.slice(
      (Math.min(index, Math.max(1, Math.ceil(data.length / size))) - 1) * size,
      Math.min(index, Math.max(1, Math.ceil(data.length / size))) * size,
    );
  const paymentTable = (batch = false, limit?: number) =>
    table(
      [
        ...(batch
          ? [
              <input
                type="checkbox"
                aria-label="Select matching payments"
                checked={
                  paymentRows.length > 0 && paymentRows.every((p) => selected.includes(p.id))
                }
                onChange={(e) => setSelected(e.target.checked ? paymentRows.map((p) => p.id) : [])}
              />,
            ]
          : []),
        "Receipt",
        "Student",
        "Class",
        "Amount",
        "Method",
        "Reference",
        "Date",
        "Status",
        "",
      ],
      (limit ? paymentRows.slice(0, limit) : slice(paymentRows)).map((p) => (
        <tr key={p.id}>
          {batch && (
            <td>
              <input
                type="checkbox"
                aria-label={"Select " + p.id}
                checked={selected.includes(p.id)}
                onChange={() => tick(p.id)}
              />
            </td>
          )}
          <td>
            <button
              className="op-row-link"
              onClick={() => show("receipt", "Receipt preview", { payment: p })}
            >
              {p.id}
            </button>
          </td>
          <td>
            <button
              className="op-person"
              onClick={() => person(p.student) && onStudent(person(p.student)!)}
            >
              <span className="op-avatar">
                {person(p.student)
                  ?.name.split(" ")
                  .map((n) => n[0])
                  .join("")}
              </span>
              <span>
                {person(p.student)?.name || p.student}
                <small>{p.student}</small>
              </span>
            </button>
          </td>
          <td>{person(p.student)?.grade}</td>
          <td className="fn-amount">{money(p.amount)}</td>
          <td>
            <Badge>{p.method}</Badge>
          </td>
          <td>{p.reference || "Cash · no external reference"}</td>
          <td>{p.date}</td>
          <td>
            <Badge>Confirmed (simulation)</Badge>
          </td>
          <td>
            <button
              className="op-row-link"
              onClick={() => show("receipt", "Receipt preview", { payment: p })}
            >
              Receipt <Icon name="arrow" size={13} />
            </button>
          </td>
        </tr>
      )),
      limit ? Math.min(limit, paymentRows.length) : paymentRows.length,
    );
  const dueTable = (limit?: number) =>
    table(
      ["Student", "Class", "Expected", "Paid", "Balance", "Due date", "Aging", ""],
      (limit ? dueRows.slice(0, limit) : slice(dueRows)).map(({ s, fees, t }) => {
        const overdue = fees
          .filter((o) => balanceFor(ledger, o) > 0)
          .sort((a, b) => a.due.localeCompare(b.due))[0]?.due;
        const days = overdue
          ? Math.max(0, Math.floor((Date.parse(AS_OF) - Date.parse(overdue)) / 86400000))
          : 0;
        return (
          <tr key={s.id}>
            <td>
              <button className="op-person" onClick={() => onStudent(s)}>
                <span className="op-avatar">
                  {s.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </span>
                <span>
                  {s.name}
                  <small>{s.id}</small>
                </span>
              </button>
            </td>
            <td>
              {s.grade} · {s.section}
            </td>
            <td>{money(t.expected)}</td>
            <td>{money(t.paid)}</td>
            <td className="fn-amount">{money(t.outstanding)}</td>
            <td>{overdue}</td>
            <td>
              <Badge>{days ? `${days} days overdue` : "Current"}</Badge>
            </td>
            <td>
              <div className="op-inline">
                <Button disabled={!canEdit} onClick={() => collect(s.id)}>
                  Collect
                </Button>
                <Button
                  onClick={() => {
                    setSelectedStudent(s.id);
                    go("Fees Reminder");
                    setTimeout(() => setSelected([s.id]), 0);
                  }}
                >
                  Remind
                </Button>
              </div>
            </td>
          </tr>
        );
      }),
      limit ? Math.min(limit, dueRows.length) : dueRows.length,
    );
  const paymentInput: PaymentInput = {
    student: selectedStudent,
    session,
    amount: Math.round(Number(amount) * 100),
    date: paymentDate,
    method: paymentMethod,
    reference,
    feeIds: allocation,
    version: ledger.version,
  };
  const reviewPayment = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      if (student?.status !== "Active")
        throw Error("This student is inactive. Review the record before collecting fees.");
      if (!/^\d+(\.\d{1,2})?$/.test(amount))
        throw Error("Enter a valid amount with at most two decimal places."); // Validate without changing the shared ledger.
      const input = paymentInput;
      import("./financeModel").then(({ postPayment }) => {
        try {
          postPayment(ledger, input);
          setReview(input);
          show("payment-review", "Review payment");
        } catch (e) {
          setError((e as Error).message);
        }
      });
    } catch (e) {
      setError((e as Error).message);
    }
  };
  const confirm = () => {
    if (!review || !canEdit) return;
    try {
      if (person(review.student)?.status !== "Active")
        throw Error("Student status changed. Review the student record.");
      const p = commit(review);
      setDirty(false);
      setAmount("");
      setReference("");
      setReview(null);
      show("receipt", "Payment simulated · receipt preview", { payment: p });
      notify("Payment simulated only · no money moved");
    } catch (e) {
      setError((e as Error).message);
    }
  };
  const head = incomePages.includes(page) ? "IN" : expensePages.includes(page) ? "EX" : "FN";
  const frame =
    head +
    "-" +
    String(
      (head === "IN" ? incomePages : head === "EX" ? expensePages : feePages).indexOf(page) + 1,
    ).padStart(2, "0");
  const title =
    page === "Fees Collection"
      ? "Fees & finance"
      : page === "Income"
        ? "Income overview"
        : page === "Expenses"
          ? "Expense overview"
          : page;
  const entryForm = page === "Add Income" || page === "Add Expense";
  const configPage = Object.keys(configSeed).includes(page);
  const saveEntryReview = (e: React.FormEvent) => {
    e.preventDefault();
    const v = Number(form.amount);
    if (
      !form.head ||
      !config[kind === "Income" ? "Income Head" : "Expense Head"].some(
        (c) => c.name === form.head && c.active,
      )
    ) {
      setError("Choose an active head.");
      return;
    }
    if (
      !/^\d+(\.\d{1,2})?$/.test(form.amount || "") ||
      v <= 0 ||
      !Number.isSafeInteger(Math.round(v * 100))
    ) {
      setError("Enter a positive amount with at most two decimal places.");
      return;
    }
    if (!form.date) {
      setError("Choose a record date.");
      return;
    }
    if (
      ledger.entries.some(
        (r) => form.reference && r.reference.toLowerCase() === form.reference.trim().toLowerCase(),
      )
    ) {
      setError("This reference already exists. Review the original entry.");
      return;
    }
    show("entry-review", kind + " review");
  };
  const receipt = (p: Payment) => (
    <article className="fn-receipt">
      <header>
        <Icon name="book" size={28} />
        <div>
          <h2>{school}</h2>
          <p>Fee payment receipt · PREVIEW</p>
        </div>
        <Badge>Simulation</Badge>
      </header>
      <div className="fn-receipt-total">
        <small>AMOUNT RECEIVED (SIMULATED)</small>
        <strong>{money(p.amount)}</strong>
        <span>
          {p.id} · {p.date}
        </span>
      </div>
      <dl className="op-dl">
        <div>
          <dt>Student</dt>
          <dd>{person(p.student)?.name || p.student}</dd>
        </div>
        <div>
          <dt>Admission / student ID</dt>
          <dd>{p.student}</dd>
        </div>
        <div>
          <dt>Payment method</dt>
          <dd>{p.method}</dd>
        </div>
        <div>
          <dt>Reference</dt>
          <dd>{p.reference || "Not applicable"}</dd>
        </div>
        <div>
          <dt>Academic session</dt>
          <dd>{p.session}</dd>
        </div>
        <div>
          <dt>Class / section</dt>
          <dd>
            {person(p.student)?.grade || "—"} · {person(p.student)?.section || "—"}
          </dd>
        </div>
        <div>
          <dt>Received by (sample actor)</dt>
          <dd>{p.actor}</dd>
        </div>
        <div>
          <dt>Remaining student balance</dt>
          <dd>
            {money(
              totals(
                ledger,
                ledger.obligations.filter(
                  (obligation) =>
                    obligation.student === p.student && obligation.session === p.session,
                ),
              ).outstanding,
            )}
          </dd>
        </div>
      </dl>
      <table>
        <thead>
          <tr>
            <th>Allocation</th>
            <th>Paid</th>
          </tr>
        </thead>
        <tbody>
          {p.allocations.map((a) => (
            <tr key={a.id}>
              <td>{ledger.obligations.find((o) => o.id === a.id)?.item || a.id}</td>
              <td>{money(a.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <footer>
        Illustrative receipt only. Not proof of payment, a gateway confirmation, or a live ledger
        posting.
      </footer>
    </article>
  );
  const monthlyLabels = [
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
  ];
  const monthNos = ["08", "09", "10", "11", "12", "01", "02", "03", "04", "05", "06", "07"];
  const chartPaid = monthNos.map((m) =>
    obligations
      .filter((o) => o.due.slice(5, 7) === m)
      .reduce((s, o) => s + paidFor(ledger, o.id), 0),
  );
  const chartDue = monthNos.map((m) =>
    obligations
      .filter((o) => o.due.slice(5, 7) === m)
      .reduce((s, o) => s + balanceFor(ledger, o), 0),
  );
  const cashSeries = monthNos.map((m) =>
    paymentRows.filter((p) => p.date.slice(5, 7) === m).reduce((s, p) => s + p.amount, 0),
  );
  const aging = agingTotals(ledger, obligations);
  return (
    <div className="op fn" hidden={!active}>
      <div className="op-heading">
        <div>
          <div className="op-eyebrow">
            OPERATIONS <span>/</span> FINANCE <em>{frame}</em>
          </div>
          <h1>{title}</h1>
          <p>
            {head === "FN"
              ? "Clear obligations. Confident collections. Every amount accounted for."
              : `Manage ${kind.toLowerCase()} independently from student fee collections.`}
          </p>
        </div>
        <div className="op-heading-actions">
          <Button
            icon="download"
            disabled={!canEdit}
            onClick={() =>
              csv(
                (head === "FN" ? paymentRows : entries) as unknown as Record<string, unknown>[],
                "schoolos-finance",
              )
            }
          >
            Export
          </Button>
          <Button
            primary
            icon="plus"
            disabled={!canEdit}
            onClick={() => (head === "FN" ? go("Collect Fees") : go("Add " + kind))}
          >
            {head === "FN" ? "Collect fees" : "Add " + kind.toLowerCase()}
          </Button>
        </div>
      </div>
      <div className="op-context">
        <select aria-label="Finance workspace" value={page} onChange={(e) => go(e.target.value)}>
          <optgroup label="Fees Collection">
            {feePages.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </optgroup>
          <optgroup label="Income">
            {incomePages.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </optgroup>
          <optgroup label="Expenses">
            {expensePages.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </optgroup>
        </select>
        <span>
          <Icon name="calendar" size={14} />
          {session}
        </span>
        <span>
          <i />
          Illustrative Data
        </span>
        <span>Simulation · resets on reload</span>
        <button onClick={() => show("settings", "Finance preview controls")}>
          <Icon name="settings" size={14} />
          Preview controls
        </button>
      </div>
      <div className="fn-tabs">
        {(head === "FN" ? feePages : head === "IN" ? incomePages : expensePages).map((p) => (
          <button key={p} className={page === p ? "active" : ""} onClick={() => go(p)}>
            {p === "Fees Collection" || p === "Income" || p === "Expenses"
              ? "Overview"
              : p.replace("Search ", "")}
          </button>
        ))}
      </div>
      {!canEdit && (
        <div className="op-notice">
          <Icon name="shield" />
          Read-only finance preview. Recording, discounts and configuration changes are disabled.
        </div>
      )}
      {state !== "Ready" ? (
        <Card title={state} sub="Finance exception preview">
          <div className="op-empty">
            {state === "Loading" ? (
              <>
                <div className="op-skeleton" />
                <div className="op-skeleton" />
              </>
            ) : (
              <>
                <Icon name={state === "Restricted" ? "shield" : "wallet"} size={28} />
                <h3>
                  {state === "Error"
                    ? "Financial records could not be loaded"
                    : state === "Restricted"
                      ? "Financial access restricted"
                      : "No financial records for this selection"}
                </h3>
                <p>
                  Existing records and form input are preserved. No synthetic zero transactions are
                  shown.
                </p>
                <Button onClick={() => setState("Ready")}>Return to sample records</Button>
              </>
            )}
          </div>
        </Card>
      ) : page === "Fees Collection" ? (
        <>
          {stats([
            ["Expected fees", money(scopedTotals.expected), "Fees Master"],
            ["Collected (simulated)", money(scopedTotals.paid), "Search Fees Payment"],
            ["Outstanding", money(scopedTotals.outstanding), "Search Due Fees"],
            [
              "Collection rate",
              scopedTotals.rate === null ? "—" : scopedTotals.rate.toFixed(1) + "%",
              "Search Fees Payment",
            ],
          ])}
          <div className="fn-scope">
            <span>
              <Icon name="shield" size={15} />
              Expected = charges − discounts. Outstanding = expected − allocated payments. Refunds /
              reversals: not modeled.
            </span>
            <Button onClick={() => show("filters", "Dashboard scope")}>
              Session / class / due-period filters
            </Button>
          </div>
          <div className="fn-overview-grid">
            <Card
              title="Collected vs outstanding"
              sub={`Fee obligations by due month · ${currency} · totals reconcile to the KPIs`}
              action={<Button onClick={() => go("Search Due Fees")}>Explore balances</Button>}
            >
              <MiniChart
                labels={monthlyLabels}
                series={[chartPaid, chartDue]}
                names={["Allocated payments", "Outstanding"]}
                money={money}
                onClick={(i) => {
                  const year = Number(session.slice(0, 4)) + (Number(monthNos[i]) < 8 ? 1 : 0);
                  go("Search Due Fees");
                  setFrom(`${year}-${monthNos[i]}-01`);
                  setTo(
                    new Date(Date.UTC(year, Number(monthNos[i]), 0)).toISOString().slice(0, 10),
                  );
                }}
              />
            </Card>
            <Card
              title="Collection trend"
              sub={`Cash receipts by payment month · ${currency} · excludes other income`}
              action={<Button onClick={() => go("Search Fees Payment")}>Payment records</Button>}
            >
              <div className="fn-chart-value">
                <strong>{money(paymentRows.reduce((s, p) => s + p.amount, 0))}</strong>
                <span>Confirmed preview receipts</span>
              </div>
              <Trend
                values={cashSeries}
                labels={monthlyLabels}
                money={money}
                onClick={() => go("Search Fees Payment")}
              />
            </Card>
            <Card title="Arrears aging" sub={"Outstanding as of " + AS_OF + " · due-date based"}>
              {agingLabels.map((b, i) => (
                <button className="fn-aging-row" key={b} onClick={() => go("Search Due Fees")}>
                  <span>
                    <i className={"fn-age-dot age" + i} />
                    {b}
                  </span>
                  <div>
                    <i
                      style={{
                        width:
                          (scopedTotals.outstanding
                            ? (aging[i] / scopedTotals.outstanding) * 100
                            : 0) + "%",
                      }}
                    />
                  </div>
                  <b>{money(aging[i])}</b>
                  <Icon name="arrow" size={13} />
                </button>
              ))}
            </Card>
            <Card title="Collection by class" sub="Allocated payments against expected class fees">
              {classes.map((c) => {
                const f = obligations.filter((o) => person(o.student)?.grade === c),
                  t = totals(ledger, f);
                return (
                  <button
                    className="fn-aging-row"
                    key={c}
                    onClick={() => {
                      go("Search Fees Payment");
                      setCls(c);
                    }}
                  >
                    <span>{c}</span>
                    <div>
                      <i style={{ width: (t.rate || 0) + "%" }} />
                    </div>
                    <b>{money(t.paid)}</b>
                    <small>{t.rate?.toFixed(0) || 0}%</small>
                  </button>
                );
              })}
            </Card>
            <div className="fn-wide">
              <Card
                title="Recent payments"
                sub="Only confirmed simulation records can generate a receipt"
                action={
                  <Button onClick={() => go("Search Fees Payment")}>View all payments</Button>
                }
              >
                {paymentTable(false, 5)}
              </Card>
            </div>
            <div className="fn-wide">
              <Card
                title="Due fees watchlist"
                sub="Accounts that need follow-up"
                action={<Button onClick={() => go("Search Due Fees")}>View due fees</Button>}
              >
                {dueTable(5)}
              </Card>
            </div>
            <Card title="Discounts & concessions" sub="Reductions are distinct from payments">
              <div className="fn-discount-summary">
                <span>Total applied in this scope</span>
                <strong>{money(scopedTotals.discount)}</strong>
                <Button onClick={() => go("Fees Discount")}>Manage discounts</Button>
              </div>
            </Card>
            <Card title="Reminder activity" sub="No messaging provider is connected">
              <div className="fn-discount-summary">
                <span>{reminders.length} simulated reminder records</span>
                <strong>No live messages sent</strong>
                <Button onClick={() => go("Fees Reminder")}>Open reminder workspace</Button>
              </div>
            </Card>
          </div>
        </>
      ) : page === "Collect Fees" ? (
        <>
          <div className="fn-cashier-steps">
            {["Select student", "Review obligations", "Enter payment", "Confirm & receipt"].map(
              (s, i) => (
                <span key={s}>
                  <i>{i + 1}</i>
                  {s}
                </span>
              ),
            )}
          </div>
          <div className="fn-cashier-grid">
            <div>
              <Card title="Student account" sub="Search by name, admission number or guardian">
                <div className="op-toolbar">
                  <label className="op-search">
                    <Icon name="search" size={16} />
                    <input
                      aria-label="Student search"
                      value={q}
                      onChange={(e) => setQ(e.target.value)}
                      placeholder="Find a student..."
                    />
                  </label>
                </div>
                <div className="fn-student-picker">
                  {students
                    .filter((s) =>
                      [s.name, s.id, s.guardian].some((v) =>
                        v.toLowerCase().includes(q.toLowerCase()),
                      ),
                    )
                    .map((s) => (
                      <button
                        key={s.id}
                        className={s.id === selectedStudent ? "active" : ""}
                        onClick={() => {
                          if (dirty && !window.confirm("Discard the current payment input?"))
                            return;
                          setSelectedStudent(s.id);
                          setDirty(false);
                        }}
                      >
                        <span className="op-avatar">
                          {s.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </span>
                        <span>
                          <b>{s.name}</b>
                          <small>
                            {s.id} · {s.grade} · {s.section}
                          </small>
                        </span>
                        <Icon name="chevron" size={13} />
                      </button>
                    ))}
                </div>
              </Card>
              {student && (
                <Card title="Account details">
                  <dl className="op-dl">
                    <div>
                      <dt>Guardian</dt>
                      <dd>{student.guardian}</dd>
                    </div>
                    <div>
                      <dt>Contact</dt>
                      <dd>{student.phone}</dd>
                    </div>
                    <div>
                      <dt>Academic session</dt>
                      <dd>{session}</dd>
                    </div>
                    <div>
                      <dt>Student status</dt>
                      <dd>
                        <Badge>{student.status}</Badge>
                      </dd>
                    </div>
                  </dl>
                  <div className="fn-inline-actions">
                    <Button onClick={() => onStudent(student)}>Open Student 360</Button>
                  </div>
                </Card>
              )}
            </div>
            <div>
              <Card
                title={student ? student.name + " · fee obligations" : "Select a student"}
                sub="Charges, discounts, previous payments and balance are separate values"
              >
                <div className="fn-account-summary">
                  <div>
                    <small>Expected</small>
                    <b>{money(studentTotals.expected)}</b>
                  </div>
                  <div>
                    <small>Paid</small>
                    <b>{money(studentTotals.paid)}</b>
                  </div>
                  <div>
                    <small>Balance</small>
                    <b>{money(studentTotals.outstanding)}</b>
                  </div>
                </div>
                <div className="op-table-wrap">
                  <table>
                    <thead>
                      <tr>
                        {["", "Fee obligation", "Due", "Charge", "Discount", "Paid", "Balance"].map(
                          (h, i) => (
                            <th key={i}>{h}</th>
                          ),
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {allStudentFees.map((o) => (
                        <tr key={o.id}>
                          <td>
                            <input
                              aria-label={"Allocate " + o.item}
                              type="checkbox"
                              disabled={balanceFor(ledger, o) <= 0 || !canEdit}
                              checked={allocation.includes(o.id)}
                              onChange={() => {
                                setAllocation(
                                  allocation.includes(o.id)
                                    ? allocation.filter((id) => id !== o.id)
                                    : [...allocation, o.id],
                                );
                                setDirty(true);
                              }}
                            />
                          </td>
                          <td>{o.item}</td>
                          <td>{o.due}</td>
                          <td>{money(o.amount)}</td>
                          <td>{money(o.discount)}</td>
                          <td>{money(paidFor(ledger, o.id))}</td>
                          <td className="fn-amount">{money(balanceFor(ledger, o))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {!allStudentFees.length && (
                    <div className="op-empty">
                      <h3>No fee obligations assigned</h3>
                      <p>Creating a fee schedule does not silently bill students.</p>
                      <Button onClick={() => go("Fees Master")}>View fee schedules</Button>
                    </div>
                  )}
                </div>
              </Card>
              <form onSubmit={reviewPayment}>
                <Card
                  title="Record a payment"
                  sub="Simulation only · no payment gateway or bank connection"
                >
                  <div className="op-form-grid fn-form-pad">
                    <Field
                      label="Payment amount"
                      required
                      value={amount}
                      onChange={(v) => {
                        setAmount(v);
                        setDirty(true);
                      }}
                      hint={`Selected balance: ${money(allStudentFees.filter((o) => allocation.includes(o.id)).reduce((s, o) => s + balanceFor(ledger, o), 0))}`}
                    />
                    <Field
                      label="Payment method"
                      required
                      value={paymentMethod}
                      options={methods}
                      onChange={(v) => {
                        setPaymentMethod(v);
                        setDirty(true);
                      }}
                    />
                    <Field
                      label="Payment date"
                      type="date"
                      required
                      value={paymentDate}
                      onChange={(v) => {
                        setPaymentDate(v);
                        setDirty(true);
                      }}
                    />
                    <Field
                      label="Transaction reference"
                      required={paymentMethod !== "Cash"}
                      value={reference}
                      onChange={(v) => {
                        setReference(v);
                        setDirty(true);
                      }}
                    />
                  </div>
                  {error && (
                    <div className="op-form-error" role="alert">
                      {error}
                    </div>
                  )}
                  <div className="fn-payment-footer">
                    <span>
                      <Icon name="shield" size={14} />
                      No money will move.
                    </span>
                    <Button
                      primary
                      type="submit"
                      disabled={
                        !canEdit ||
                        !student ||
                        !allStudentFees.length ||
                        student.status !== "Active"
                      }
                    >
                      Review payment <Icon name="chevron" size={14} />
                    </Button>
                  </div>
                </Card>
              </form>
            </div>
          </div>
        </>
      ) : page === "Search Fees Payment" || page === "Bulk Fee Receipts" ? (
        <>
          <Card
            title={page === "Bulk Fee Receipts" ? "Receipt batch selection" : "Payment records"}
            sub="Confirmed simulation payments · immutable history · no real settlement"
          >
            {toolbar(true)}
            {page === "Bulk Fee Receipts" && (
              <div className="op-selection">
                <b>{selected.length} receipts selected</b>
                <Button onClick={() => setSelected(paymentRows.map((p) => p.id))}>
                  Select filtered
                </Button>
                <Button
                  disabled={!selected.length}
                  primary
                  onClick={() => show("batch", "Receipt batch preview")}
                >
                  Preview batch
                </Button>
                <Button
                  disabled={!selected.length}
                  onClick={() =>
                    csv(
                      paymentRows.filter((p) => selected.includes(p.id)) as unknown as Record<
                        string,
                        unknown
                      >[],
                      "selected-receipts",
                    )
                  }
                >
                  Export selected
                </Button>
                <Button onClick={() => setSelected([])}>Clear</Button>
              </div>
            )}
            {paymentTable(page === "Bulk Fee Receipts")}
          </Card>
        </>
      ) : page === "Search Due Fees" ? (
        <>
          {stats([
            ["Outstanding", money(scopedTotals.outstanding)],
            ["Students with balance", String(dueRows.length)],
            ["Overdue balance", money(aging.slice(1).reduce((a, b) => a + b, 0))],
            ["Current balance", money(aging[0])],
          ])}
          <Card
            title="Student balances"
            sub="Expected after discounts · paid allocations · remaining due"
          >
            {toolbar()}
            {dueTable()}
          </Card>
        </>
      ) : page === "Fees Reminder" ? (
        <Card
          title="Fee reminder workspace"
          sub="Draft → Previewed → Queued (simulation) · no SMS or email integration"
        >
          {toolbar()}
          <div className="op-selection">
            <b>{selected.length} recipients selected</b>
            <Button onClick={() => setSelected(dueRows.map((r) => r.s.id))}>
              Select filtered students
            </Button>
            <Button
              primary
              disabled={!canEdit || !selected.length}
              onClick={() => show("reminder", "Reminder composer")}
            >
              Compose preview
            </Button>
            <Button onClick={() => setSelected([])}>Clear</Button>
          </div>
          {table(
            [
              "",
              "Student",
              "Guardian contact",
              "Balance",
              "Due date",
              "Last reminder",
              "Status",
              "",
            ],
            slice(dueRows).map(({ s, fees, t }) => (
              <tr key={s.id}>
                <td>
                  <input
                    type="checkbox"
                    checked={selected.includes(s.id)}
                    onChange={() => tick(s.id)}
                    aria-label={"Remind " + s.name}
                  />
                </td>
                <td>{s.name}</td>
                <td>{s.phone}</td>
                <td className="fn-amount">{money(t.outstanding)}</td>
                <td>{fees[0]?.due}</td>
                <td>{reminders.find((r) => r.student === s.id)?.date || "Not sent"}</td>
                <td>
                  <Badge>{reminders.find((r) => r.student === s.id)?.status || "Draft"}</Badge>
                </td>
                <td>
                  <Button
                    onClick={() => {
                      setSelected([s.id]);
                      show("reminder", "Reminder composer");
                    }}
                  >
                    Preview
                  </Button>
                </td>
              </tr>
            )),
            dueRows.length,
          )}
        </Card>
      ) : configPage ? (
        <Card
          title={page}
          sub={
            page === "Fees Master"
              ? "Charge schedules only · existing assigned obligations remain unchanged"
              : page === "Fees Discount"
                ? "Concessions reduce expected fees, never count as received money"
                : "Institution-configured reference values · historical records are retained"
          }
          action={
            <Button
              primary
              icon="plus"
              disabled={!canEdit}
              onClick={() => {
                setForm({
                  name: "",
                  code: "",
                  description: "",
                  active: "Active",
                  group: "Tuition",
                  kind: "Percentage",
                  value: "10",
                  date: "2025-03-10",
                  amount: "0",
                });
                show("config", "New " + page.toLowerCase());
              }}
            >
              Add new
            </Button>
          }
        >
          {page === "Fees Discount" && (
            <div className="op-notice fn-config-note">
              <Icon name="shield" size={16} />
              Stacking, approval and rounding are not live policies. This preview permits one capped
              concession per fee line.
            </div>
          )}
          {table(
            [
              "Name / code",
              "Description",
              ...(page === "Fees Master"
                ? ["Amount", "Due date"]
                : page === "Fees Discount"
                  ? ["Type / value"]
                  : []),
              "Status",
              "",
            ],
            config[page].map((c) => (
              <tr key={c.code}>
                <td>
                  <b>{c.name}</b>
                  <small className="fn-block">{c.code}</small>
                </td>
                <td className="fn-description">{c.description}</td>
                {page === "Fees Master" && (
                  <>
                    <td>{money(c.amount || 0)}</td>
                    <td>{c.due}</td>
                  </>
                )}
                {page === "Fees Discount" && (
                  <td>
                    {c.kind} ·{" "}
                    {c.kind === "Percentage"
                      ? c.value + "%"
                      : money(Math.round((c.value || 0) * 100))}
                  </td>
                )}
                <td>
                  <Badge>{c.active ? "Active" : "Inactive"}</Badge>
                </td>
                <td>
                  <div className="op-inline">
                    <Button
                      disabled={!canEdit}
                      onClick={() => {
                        setForm({
                          name: c.name,
                          code: c.code,
                          description: c.description,
                          active: c.active ? "Active" : "Inactive",
                          amount: String((c.amount || 0) / 100),
                          date: c.due || "2025-03-10",
                          group: c.group || "Tuition",
                          kind: c.kind || "Percentage",
                          value: String(c.value || 10),
                        });
                        show("config", "Edit " + page.toLowerCase(), { name: c.code });
                      }}
                    >
                      Edit
                    </Button>
                    {page === "Fees Discount" && (
                      <Button
                        disabled={!canEdit || !c.active}
                        onClick={() => {
                          setForm({ discount: c.code });
                          setDiscountStudent(selectedStudent);
                          show("discount", "Apply concession preview");
                        }}
                      >
                        Apply preview
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            )),
            config[page].length,
          )}
        </Card>
      ) : entryForm ? (
        <form className="fn-entry-form" onSubmit={saveEntryReview}>
          <Card
            title={"New " + kind.toLowerCase()}
            sub="Manual, non-fee record · review before confirming in preview"
          >
            <div className="op-form-grid fn-form-pad">
              <Field
                label={kind + " head"}
                required
                value={form.head || ""}
                options={config[kind === "Income" ? "Income Head" : "Expense Head"]
                  .filter((c) => c.active)
                  .map((c) => c.name)}
                onChange={(v) => set("head", v)}
              />
              <Field
                label={"Amount (" + currency + ")"}
                required
                value={form.amount || ""}
                onChange={(v) => set("amount", v)}
              />
              <Field
                label="Date"
                type="date"
                required
                value={form.date || ""}
                onChange={(v) => set("date", v)}
              />
              <Field
                label="Payment method"
                required
                value={form.method || "Bank transfer"}
                options={methods}
                onChange={(v) => set("method", v)}
              />
              <Field
                label={kind === "Income" ? "Received from" : "Payee / vendor"}
                value={form.party || ""}
                onChange={(v) => set("party", v)}
              />
              <Field
                label="Reference"
                value={form.reference || ""}
                onChange={(v) => set("reference", v)}
              />
              <Field
                label="Description"
                type="textarea"
                value={form.description || ""}
                onChange={(v) => set("description", v)}
              />
              <label className="op-field">
                <span>Attachment (local selection only)</span>
                <input
                  type="file"
                  onChange={(e) => {
                    set("attachment", e.target.files?.[0]?.name || "");
                  }}
                />
                <small>{form.attachment || "No file selected · no upload service connected"}</small>
              </label>
            </div>
            {error && (
              <div className="op-form-error" role="alert">
                {error}
              </div>
            )}
            <div className="fn-payment-footer">
              <span>
                {draftSaved
                  ? "Draft kept in preview memory"
                  : dirty
                    ? "Unsaved changes"
                    : "No server-backed financial posting"}
              </span>
              <Button
                onClick={() => {
                  setDrafts((d) => ({ ...d, [page]: { ...form } }));
                  setDraftSaved(true);
                  setDirty(false);
                  notify("Draft kept in preview until reload");
                }}
              >
                Save draft
              </Button>
              <Button primary type="submit" disabled={!canEdit}>
                Review {kind.toLowerCase()}
              </Button>
            </div>
          </Card>
        </form>
      ) : (
        <>
          {stats([
            [
              kind + " this month",
              money(
                entries
                  .filter((e) => e.date.slice(0, 7) === AS_OF.slice(0, 7))
                  .reduce((s, e) => s + e.amount, 0),
              ),
            ],
            [
              kind + " this term",
              money(
                entries.filter((e) => e.date >= "2025-01-01").reduce((s, e) => s + e.amount, 0),
              ),
            ],
            [kind + " this session", money(entryTotal)],
            [kind + " entries", String(entries.length)],
          ])}
          {(page === "Income" || page === "Expenses") && (
            <div className="fn-overview-grid fn-ledger-charts">
              <Card title={kind + " trend"} sub={`Manual ${kind.toLowerCase()} only · ${currency}`}>
                <Trend
                  values={monthNos.map((m) =>
                    entries
                      .filter((e) => e.date.slice(5, 7) === m)
                      .reduce((s, e) => s + e.amount, 0),
                  )}
                  labels={monthlyLabels}
                  money={money}
                  onClick={() => go(kind === "Income" ? "Search Income" : "Search Expense")}
                />
              </Card>
              <Card title={kind + " by head"} sub="Separate from the student fee ledger">
                {config[kind === "Income" ? "Income Head" : "Expense Head"].map((c) => (
                  <button
                    className="fn-aging-row"
                    key={c.code}
                    onClick={() => {
                      go(kind === "Income" ? "Search Income" : "Search Expense");
                      setTimeout(() => setQ(c.name), 0);
                    }}
                  >
                    <span>{c.name}</span>
                    <b>
                      {money(
                        entries.filter((e) => e.head === c.name).reduce((s, e) => s + e.amount, 0),
                      )}
                    </b>
                    <Icon name="arrow" size={14} />
                  </button>
                ))}
              </Card>
            </div>
          )}
          <Card
            title={kind === "Income" ? "Income register" : "Expense register"}
            sub="Confirmed preview entries · corrections are requested, not silent edits"
          >
            {toolbar(true)}
            {table(
              [
                "Date",
                "Reference",
                kind + " head",
                kind === "Income" ? "Received from" : "Payee",
                "Amount",
                "Method",
                "Recorded by",
                "",
              ],
              slice(entries).map((e) => (
                <tr key={e.id}>
                  <td>{e.date}</td>
                  <td>
                    <button
                      className="op-row-link"
                      onClick={() => show("entry", "Financial entry detail", { entry: e })}
                    >
                      {e.reference || e.id}
                    </button>
                  </td>
                  <td>{e.head}</td>
                  <td>{e.party || "—"}</td>
                  <td className="fn-amount">{money(e.amount)}</td>
                  <td>{e.method}</td>
                  <td>Alex Morgan (sample)</td>
                  <td>
                    <Button onClick={() => show("entry", "Financial entry detail", { entry: e })}>
                      View
                    </Button>
                  </td>
                </tr>
              )),
              entries.length,
            )}
          </Card>
        </>
      )}
      <div className="op-footnote">
        <span>
          <Icon name="shield" size={13} />
          Illustrative Data · no money moved or financial posting performed
        </span>
        <span>
          {school} · {currency}
        </span>
      </div>
      {drawer && (
        <div className="op-overlay fn-overlay" onClick={() => setDrawer(null)}>
          <aside
            className={"op-drawer " + (drawer.type === "batch" ? "fn-batch-drawer" : "")}
            role="dialog"
            aria-modal="true"
            aria-label={drawer.title}
            onClick={(e) => e.stopPropagation()}
          >
            <header>
              <div>
                <small>FINANCE / PREVIEW ONLY</small>
                <h2>{drawer.title}</h2>
              </div>
              <button aria-label="Close finance drawer" onClick={() => setDrawer(null)}>
                <Icon name="close" size={21} />
              </button>
            </header>
            <div className="op-drawer-body">
              {drawer.type === "settings" ? (
                <>
                  <div className="op-notice">
                    <Icon name="shield" />
                    <span>
                      No gateway, bank feed, messaging provider, live ledger or production
                      authorization is connected.
                    </span>
                  </div>
                  <Field
                    label="Display currency"
                    value={currency}
                    options={["USD", "KES", "GBP", "EUR", "INR"]}
                    onChange={setCurrency}
                    hint="Changes display denomination only. No currency conversion is performed."
                  />
                  <Field
                    label="Preview role"
                    value={role}
                    options={["Finance administrator", "Read-only finance"]}
                    onChange={setRole}
                  />
                  <Field
                    label="Data state"
                    value={state}
                    options={["Ready", "Loading", "Empty", "Error", "Restricted"]}
                    onChange={setState}
                  />
                  <h3>Accounting decisions to confirm</h3>
                  <ul className="op-assumptions">
                    {[
                      "Refunds, reversals, overpayments and cancelled obligations",
                      "Discount eligibility, approval, stacking and rounding",
                      "Session boundaries and payment date rules",
                      "Fee assignment, installments and effective schedule edits",
                      "Cash/accrual reporting, receipt numbering and locking",
                      "Approval thresholds, audit retention and real roles",
                    ].map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ul>
                </>
              ) : drawer.type === "filters" ? (
                <>
                  <Field
                    label="Class"
                    value={cls}
                    options={["All classes", ...classes]}
                    onChange={(v) => {
                      setCls(v);
                      setIndex(1);
                    }}
                  />
                  <Field
                    label="Method"
                    value={method}
                    options={["All methods", ...methods]}
                    onChange={(v) => {
                      setMethod(v);
                      setIndex(1);
                    }}
                  />
                  <Field
                    label="From date"
                    type="date"
                    value={from}
                    onChange={(v) => {
                      setFrom(v);
                      setIndex(1);
                    }}
                  />
                  <Field
                    label="To date"
                    type="date"
                    value={to}
                    onChange={(v) => {
                      setTo(v);
                      setIndex(1);
                    }}
                  />
                  <p className="op-description">
                    Date filters apply to obligation due dates on fee balance views, and transaction
                    dates on payment/income/expense records.
                  </p>
                  <Button
                    primary
                    disabled={!!from && !!to && from > to}
                    onClick={() => setDrawer(null)}
                  >
                    Apply filters
                  </Button>
                  <Button onClick={reset}>Reset</Button>
                  {from && to && from > to && (
                    <p className="op-form-error">End date must follow start date.</p>
                  )}
                </>
              ) : drawer.type === "payment-review" && review ? (
                <>
                  <div className="op-notice">
                    <Icon name="shield" />
                    This is a simulated receipt, not a bank or mobile-money confirmation.
                  </div>
                  <div className="fn-review-value">{money(review.amount)}</div>
                  <dl className="op-dl">
                    <div>
                      <dt>Student</dt>
                      <dd>{person(review.student)?.name}</dd>
                    </div>
                    <div>
                      <dt>Student ID</dt>
                      <dd>{review.student}</dd>
                    </div>
                    <div>
                      <dt>Method</dt>
                      <dd>{review.method}</dd>
                    </div>
                    <div>
                      <dt>Reference</dt>
                      <dd>{review.reference || "Cash"}</dd>
                    </div>
                    <div>
                      <dt>Payment date</dt>
                      <dd>{review.date}</dd>
                    </div>
                    <div>
                      <dt>Balance after payment</dt>
                      <dd>{money(studentTotals.outstanding - review.amount)}</dd>
                    </div>
                    <div>
                      <dt>Allocation policy</dt>
                      <dd>Selected obligations first · displayed due-line order</dd>
                    </div>
                  </dl>
                  <h3>Allocation preview</h3>
                  {(() => {
                    let left = review.amount;
                    return allStudentFees
                      .filter((o) => review.feeIds.includes(o.id))
                      .map((o) => {
                        const value = Math.min(left, balanceFor(ledger, o));
                        left -= value;
                        return (
                          <div className="fn-aging-row" key={o.id}>
                            <span>
                              {o.item}
                              <small>{money(balanceFor(ledger, o))} before</small>
                            </span>
                            <b>{money(value)} allocated</b>
                            <small>{money(balanceFor(ledger, o) - value)} after</small>
                          </div>
                        );
                      });
                  })()}
                  <p className="op-description">
                    Allocated in the displayed fee-line order. A unique preview receipt is created
                    only after confirmation.
                  </p>
                  {error && (
                    <div role="alert" className="op-form-error">
                      {error}
                    </div>
                  )}
                  <div className="op-drawer-actions">
                    <Button onClick={() => setDrawer(null)}>Back to payment</Button>
                    <Button primary disabled={!canEdit} onClick={confirm}>
                      Confirm payment (simulation)
                    </Button>
                  </div>
                </>
              ) : drawer.type === "receipt" && drawer.payment ? (
                <>
                  {receipt(drawer.payment)}
                  <div className="op-drawer-actions">
                    <Button onClick={() => window.print()}>Print receipt preview</Button>
                    <Button
                      onClick={() =>
                        person(drawer.payment!.student) &&
                        onStudent(person(drawer.payment!.student)!)
                      }
                    >
                      Open Student 360
                    </Button>
                    <Button
                      onClick={() => {
                        setSelectedStudent(drawer.payment!.student);
                        go("Collect Fees");
                      }}
                    >
                      New payment
                    </Button>
                  </div>
                  <h3>Corrections</h3>
                  <p className="op-description">
                    Confirmed history is not silently editable. Refunds and reversals require
                    product/backend rules.
                  </p>
                  <h3>Audit timeline</h3>
                  <div className="op-timeline">
                    <div>
                      <i />
                      <p>
                        Payment confirmed in local simulation · {drawer.payment.date} ·{" "}
                        {drawer.payment.actor}
                      </p>
                    </div>
                    <div>
                      <i />
                      <p>
                        Receipt preview generated · {drawer.payment.id} · no provider verification
                      </p>
                    </div>
                  </div>
                  <Button
                    disabled={!canEdit}
                    onClick={() => {
                      setCorrections([...corrections, drawer.payment!.id]);
                      notify("Correction request noted in preview; no balance changed");
                    }}
                  >
                    Request correction
                  </Button>
                  {corrections.includes(drawer.payment.id) && (
                    <Badge>Correction requested · preview only</Badge>
                  )}
                </>
              ) : drawer.type === "batch" ? (
                <>
                  <div className="fn-batch-summary">
                    <b>
                      {paymentRows.filter((p) => selected.includes(p.id)).length} confirmed receipts
                    </b>
                    <span>
                      {money(
                        paymentRows
                          .filter((p) => selected.includes(p.id))
                          .reduce((s, p) => s + p.amount, 0),
                      )}
                    </span>
                  </div>
                  <p className="op-description">
                    Batch printing does not create payments. Only the selected confirmed records in
                    the current filter scope are included.
                  </p>
                  <Field
                    label="Page size"
                    value={form.paper || "A4"}
                    options={["A4", "Letter"]}
                    onChange={(v) => setForm({ ...form, paper: v })}
                  />
                  <Button
                    disabled={!paymentRows.some((p) => selected.includes(p.id))}
                    primary
                    onClick={() => window.print()}
                  >
                    Print selected previews
                  </Button>
                  <div className="fn-receipt-batch">
                    {paymentRows
                      .filter((p) => selected.includes(p.id))
                      .map((p) => (
                        <div key={p.id}>{receipt(p)}</div>
                      ))}
                  </div>
                </>
              ) : drawer.type === "reminder" ? (
                <>
                  <Badge>Draft · simulation</Badge>
                  <p className="op-description">
                    {selected.length} selected students. No real messages will be sent.
                  </p>
                  <Field
                    label="Channel preview"
                    value={channel}
                    options={["Email (simulation)", "SMS (simulation)"]}
                    onChange={setChannel}
                  />
                  <Field
                    label="Message template"
                    type="textarea"
                    value={message}
                    onChange={setMessage}
                  />
                  <h3>Recipient previews</h3>
                  {dueRows
                    .filter((r) => selected.includes(r.s.id))
                    .map(({ s, t, fees }) => (
                      <div className="fn-message-preview" key={s.id}>
                        <b>
                          {s.name} · {s.phone}
                        </b>
                        <p>
                          {message
                            .split("[Student Name]")
                            .join(s.name)
                            .split("[Balance]")
                            .join(money(t.outstanding))
                            .split("[Due Date]")
                            .join(fees[0]?.due || "—")}
                        </p>
                      </div>
                    ))}
                  <Button
                    primary
                    disabled={
                      !canEdit ||
                      !message.trim() ||
                      !selected.some((id) => dueRows.some((r) => r.s.id === id))
                    }
                    onClick={() => {
                      setReminders([
                        ...dueRows
                          .filter((r) => selected.includes(r.s.id))
                          .map((r) => ({
                            student: r.s.id,
                            status: "Queued (simulation)",
                            date: AS_OF,
                          })),
                        ...reminders,
                      ]);
                      setDrawer(null);
                      notify("Reminder queue simulated · no messages sent");
                    }}
                  >
                    Queue preview only
                  </Button>
                </>
              ) : drawer.type === "entry-review" ? (
                <>
                  <div className="fn-review-value">
                    {money(Math.round(Number(form.amount) * 100))}
                  </div>
                  <dl className="op-dl">
                    {[
                      ["Head", form.head],
                      ["Date", form.date],
                      ["Method", form.method || "Bank transfer"],
                      ["Reference", form.reference || "—"],
                      ["Counterparty", form.party || "—"],
                      ["Created by", "Alex Morgan (sample actor)"],
                    ].map(([k, v]) => (
                      <div key={k}>
                        <dt>{k}</dt>
                        <dd>{v}</dd>
                      </div>
                    ))}
                  </dl>
                  <div className="op-notice">
                    This records non-fee {kind.toLowerCase()} in preview state only.
                  </div>
                  <Button
                    primary
                    disabled={!canEdit}
                    onClick={() => {
                      const entry: Entry = {
                        id: `${kind === "Income" ? "INC" : "EXP"}-${1001 + ledger.entries.length}`,
                        kind,
                        session,
                        head: form.head,
                        amount: Math.round(Number(form.amount) * 100),
                        date: form.date,
                        method: form.method || "Bank transfer",
                        reference: form.reference?.trim() || "",
                        party: form.party || "",
                        description: form.description || "",
                      };
                      try {
                        update((l) => {
                          if (
                            entry.reference &&
                            l.entries.some(
                              (e) => e.reference.toLowerCase() === entry.reference.toLowerCase(),
                            )
                          )
                            throw Error("Duplicate entry reference. Review the existing record.");
                          return { ...l, entries: [entry, ...l.entries], version: l.version + 1 };
                        });
                        setDirty(false);
                        setForm({});
                        setDrawer(null);
                        navigate(kind === "Income" ? "Search Income" : "Search Expense");
                        notify(kind + " recorded in preview only");
                      } catch (e) {
                        setError((e as Error).message);
                      }
                    }}
                  >
                    Confirm {kind.toLowerCase()} (preview)
                  </Button>
                  {error && <div className="op-form-error">{error}</div>}
                </>
              ) : drawer.type === "entry" && drawer.entry ? (
                <>
                  <div className="fn-review-value">{money(drawer.entry.amount)}</div>
                  <dl className="op-dl">
                    {Object.entries(drawer.entry)
                      .filter(([k]) => k !== "amount")
                      .map(([k, v]) => (
                        <div key={k}>
                          <dt>{k}</dt>
                          <dd>{v}</dd>
                        </div>
                      ))}
                  </dl>
                  <p className="op-description">
                    Confirmed illustrative entries are immutable here. Corrections never silently
                    overwrite historical amounts.
                  </p>
                  <Button
                    disabled={!canEdit}
                    onClick={() => {
                      setCorrections([...corrections, drawer.entry!.id]);
                      notify("Correction request noted; no financial value changed");
                    }}
                  >
                    Request correction
                  </Button>
                  {corrections.includes(drawer.entry.id) && <Badge>Correction requested</Badge>}
                </>
              ) : drawer.type === "config" ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const list = config[page];
                    if (
                      list.some(
                        (c) =>
                          c.code !== drawer.name &&
                          (c.code.toLowerCase() === form.code?.trim().toLowerCase() ||
                            c.name.toLowerCase() === form.name?.trim().toLowerCase()),
                      )
                    ) {
                      setError("This name or code already exists.");
                      return;
                    }
                    if (
                      page === "Fees Master" &&
                      (!Number.isFinite(Number(form.amount)) || Number(form.amount) <= 0)
                    ) {
                      setError("Schedule amount must be positive.");
                      return;
                    }
                    if (
                      page === "Fees Discount" &&
                      (!Number.isFinite(Number(form.value)) ||
                        Number(form.value) <= 0 ||
                        (form.kind === "Percentage" && Number(form.value) > 100))
                    ) {
                      setError("Enter a valid discount value (percentage up to 100).");
                      return;
                    }
                    const c = {
                      name: form.name.trim(),
                      code: form.code.trim(),
                      description: form.description || "",
                      active: form.active !== "Inactive",
                      amount: Math.round(Number(form.amount || 0) * 100),
                      due: form.date,
                      group: form.group,
                      kind: form.kind,
                      value: Number(form.value),
                    };
                    setConfig({
                      ...config,
                      [page]: drawer.name
                        ? list.map((x) => (x.code === drawer.name ? c : x))
                        : [...list, c],
                    });
                    setDrawer(null);
                    setDirty(false);
                    notify("Configuration saved in preview; existing fee obligations unchanged");
                  }}
                >
                  <Field
                    label="Name"
                    required
                    value={form.name || ""}
                    onChange={(v) => set("name", v)}
                  />
                  <Field
                    label="Code"
                    required
                    value={form.code || ""}
                    onChange={(v) => set("code", v)}
                  />
                  <Field
                    label="Description / eligibility"
                    type="textarea"
                    value={form.description || ""}
                    onChange={(v) => set("description", v)}
                  />
                  {page === "Fees Master" && (
                    <>
                      <Field
                        label="Fee group"
                        value={form.group || "Tuition"}
                        options={config["Fees Group"].filter((c) => c.active).map((c) => c.name)}
                        onChange={(v) => set("group", v)}
                      />
                      <Field
                        label="Amount"
                        required
                        value={form.amount || ""}
                        onChange={(v) => set("amount", v)}
                      />
                      <Field
                        label="Due date"
                        type="date"
                        required
                        value={form.date || ""}
                        onChange={(v) => set("date", v)}
                      />
                      <p className="op-description">
                        Session: {session}. This schedule is not automatically assigned to students.
                        Changes do not alter historical charges or allocations.
                      </p>
                    </>
                  )}
                  {page === "Fees Discount" && (
                    <>
                      <Field
                        label="Discount type"
                        value={form.kind || "Percentage"}
                        options={["Percentage", "Fixed amount"]}
                        onChange={(v) => set("kind", v)}
                      />
                      <Field
                        label="Discount value"
                        required
                        value={form.value || ""}
                        onChange={(v) => set("value", v)}
                      />
                      <div className="fn-account-summary">
                        <div>
                          <small>Example original</small>
                          <b>{money(2000000)}</b>
                        </div>
                        <div>
                          <small>Reduction</small>
                          <b>
                            {money(
                              Math.min(
                                2000000,
                                Math.round(
                                  form.kind === "Fixed amount"
                                    ? Number(form.value || 0) * 100
                                    : (2000000 * Number(form.value || 0)) / 100,
                                ),
                              ),
                            )}
                          </b>
                        </div>
                      </div>
                    </>
                  )}
                  <Field
                    label="Status"
                    value={form.active || "Active"}
                    options={["Active", "Inactive"]}
                    onChange={(v) => set("active", v)}
                  />
                  {error && <div className="op-form-error">{error}</div>}
                  <div className="op-drawer-actions">
                    <Button disabled={!canEdit} primary type="submit">
                      Save preview
                    </Button>
                  </div>
                </form>
              ) : drawer.type === "discount" ? (
                <>
                  <Field
                    label="Student"
                    value={discountStudent}
                    options={students.map((s) => s.id)}
                    onChange={setDiscountStudent}
                  />
                  <p className="op-description">
                    {person(discountStudent)?.name} · {session}. Discount applies to the first
                    outstanding, undiscounted Tuition obligation only. This is an explicit
                    illustrative policy.
                  </p>
                  <Button
                    primary
                    disabled={!canEdit}
                    onClick={() => {
                      try {
                        const c = config["Fees Discount"].find((c) => c.code === form.discount);
                        if (!c) throw Error("Choose a concession.");
                        update((l) => {
                          const o = l.obligations.find(
                            (o) =>
                              o.student === discountStudent &&
                              o.session === session &&
                              o.item === "Tuition" &&
                              o.discount === 0 &&
                              balanceFor(l, o) > 0,
                          );
                          if (!o) throw Error("No eligible undiscounted tuition obligation.");
                          const reduction = Math.min(
                            balanceFor(l, o),
                            Math.round(
                              c.kind === "Percentage"
                                ? (o.amount * (c.value || 0)) / 100
                                : (c.value || 0) * 100,
                            ),
                          );
                          return {
                            ...l,
                            version: l.version + 1,
                            obligations: l.obligations.map((f) =>
                              f.id === o.id ? { ...f, discount: reduction } : f,
                            ),
                          };
                        });
                        setDrawer(null);
                        notify("Concession applied to the preview obligation; no money received");
                      } catch (e) {
                        setError((e as Error).message);
                      }
                    }}
                  >
                    Apply concession (preview)
                  </Button>
                  {error && <div className="op-form-error">{error}</div>}
                </>
              ) : null}
            </div>
            <footer>
              <Icon name="shield" size={13} />
              No real funds, messages or financial postings
            </footer>
          </aside>
        </div>
      )}
    </div>
  );
}

import { useState } from "react";
import { useWorkforce } from "./WorkforceContext";
import { useAcademic } from "./AcademicContext";
import { useExaminationOptional } from "./ExaminationContext";
import { useLearningOptional } from "./LearningContext";
import { useOperationsOptional } from "./OperationsContext";
import { useCredentialsOptional } from "./CredentialsContext";
import { useCMSOptional } from "./CMSContext";
import { isPublic } from "./cmsModel";
import { Button as ExamButton, Card as ExamCard } from "./components/OperationsUI";
import { useFinance } from "./FinanceContext";
import { balanceFor } from "./financeModel";
import "./pulse.css";
const paths: Record<string, string> = {
  users:
    "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M20 21v-2a4 4 0 0 0-3-4 M17 3a4 4 0 0 1 0 8",
  arrow: "M7 17 17 7 M7 7h10v10",
  down: "m6 9 6 6 6-6",
  calendar: "M4 5h16v16H4z M8 2v6 M16 2v6 M4 11h16",
  settings: "M4 7h16 M4 17h16 M8 4v6 M16 14v6",
  download: "M12 3v12 m-5-5 5 5 5-5 M4 16v5h16v-5",
  check: "m5 12 4 4L19 6",
  book: "M4 3h6a3 3 0 0 1 3 3v15a4 4 0 0 0-4-3H4z M13 6a3 3 0 0 1 3-3h5v15h-4a4 4 0 0 0-4 3",
  wallet: "M3 5h16v15H3z M3 8h18v9h-6V8",
  flag: "M5 22V3h14l-3 5 3 5H5",
  close: "m6 6 12 12 M6 18 18 6",
  search: "M21 21l-5-5 M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0",
  clock: "M12 8v5l3 2 M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0",
  plus: "M12 5v14 M5 12h14",
  pulse: "M3 12h4l3-8 4 16 3-8h4",
  shield: "m12 2 9 4v6c0 6-9 10-9 10S3 18 3 12V6z M8 12l3 3 5-6",
};
function I({ n, size = 17 }: { n: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[n] || paths.pulse} />
    </svg>
  );
}
const months = ["Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb"];
const library = [
  "Enrollment growth",
  "Attendance trend",
  "Fees collected vs outstanding",
  "Income vs expenses",
  "Class population",
  "Academic performance",
  "Attention center",
  "Recent activity",
  "School calendar",
  "Financial watchlist",
  "Syllabus progress",
];
const initialAlerts = [
  {
    id: "ALT-1042",
    severity: "Critical",
    module: "Attendance",
    title: "Repeated absences need follow-up",
    description: "8 students have missed 3 or more consecutive school days.",
    entity: "Grades 7–10 · 8 students",
    time: "18 min ago",
    action: "Review attendance",
    source: "Attendance",
  },
  {
    id: "ALT-1041",
    severity: "Critical",
    module: "Finance",
    title: "Fee arrears exceed follow-up threshold",
    description: "23 student accounts have balances overdue by more than 30 days.",
    entity: "23 accounts · $12,450 overdue",
    time: "42 min ago",
    action: "Review due fees",
    source: "Fees Collection",
  },
  {
    id: "ALT-1040",
    severity: "Warning",
    module: "Academics",
    title: "Examination marks are incomplete",
    description: "Mathematics marks are missing for 12 students ahead of result processing.",
    entity: "Grade 10 · Mid-term assessment",
    time: "1 hour ago",
    action: "Complete marks entry",
    source: "Examinations",
  },
  {
    id: "ALT-1039",
    severity: "Warning",
    module: "Admissions",
    title: "Applications awaiting a decision",
    description: "12 applications are complete and ready for admission review.",
    entity: "2024–25 intake · 12 applications",
    time: "2 hours ago",
    action: "Review applications",
    source: "Student Admission",
  },
  {
    id: "ALT-1038",
    severity: "Information",
    module: "HR",
    title: "Staff leave approvals pending",
    description: "4 leave requests need approval before next week.",
    entity: "Human resource · 4 requests",
    time: "3 hours ago",
    action: "Review leave",
    source: "Staff Directory",
  },
  {
    id: "ALT-1037",
    severity: "Warning",
    module: "Inventory",
    title: "Science supplies below minimum stock",
    description: "3 laboratory consumables are below their reorder level.",
    entity: "Science laboratory · 3 items",
    time: "3 hours ago",
    action: "Review inventory",
    source: "Inventory",
  },
  {
    id: "ALT-1036",
    severity: "Information",
    module: "Transport",
    title: "Route 4 delay reported",
    description: "A 15-minute delay was reported on the afternoon route.",
    entity: "Route 4 · Vehicle BUS-004",
    time: "4 hours ago",
    action: "View route",
    source: "Transport",
  },
  {
    id: "ALT-1035",
    severity: "Warning",
    module: "Front Office",
    title: "Parent enquiry awaiting a response",
    description: "A parent complaint has passed the 24-hour response target.",
    entity: "Complaint CMP-028",
    time: "4 hours ago",
    action: "Review complaint",
    source: "Front Office",
  },
];
const events = [
  [
    "Finance",
    "Olivia Rhye",
    "Tuition payment received",
    "RCP-02481",
    "Alex Morgan",
    "5 min ago",
    "wallet",
  ],
  [
    "Admissions",
    "James Brooks",
    "Registered a new admission",
    "ADM-01864",
    "Sarah Chen",
    "18 min ago",
    "users",
  ],
  [
    "Attendance",
    "Grade 9 · Section A",
    "Daily attendance submitted",
    "ATT-00912",
    "Daniel Kim",
    "32 min ago",
    "check",
  ],
  [
    "Academics",
    "Grade 10 · Mid-term",
    "Examination results published",
    "EXM-00048",
    "Amelia Clarke",
    "48 min ago",
    "book",
  ],
  ["HR", "Sarah Chen", "Staff leave requested", "LVE-00216", "Sarah Chen", "1 hour ago", "users"],
  [
    "System",
    "Institution settings",
    "Academic session updated",
    "CFG-00072",
    "Alex Morgan",
    "2 hours ago",
    "settings",
  ],
];
const people = [
  "Olivia Rhye",
  "Phoenix Baker",
  "Lana Steiner",
  "Demi Wilkinson",
  "Drew Cano",
  "Natali Craig",
  "Orlando Diggs",
  "Andi Lane",
];
const schedule = [
  ["26", "FEB", "Mid-term examinations", "Examination", "In 2 days", "Examination hall"],
  ["27", "FEB", "Leadership team meeting", "Meeting", "In 3 days", "Conference room A"],
  ["28", "FEB", "Parent–teacher consultations", "School event", "In 4 days", "Main building"],
  ["07", "MAR", "Admission application deadline", "Admissions", "In 11 days", "Front office"],
  ["21", "MAR", "End of second term", "Term date", "In 25 days", "All campuses"],
];
function Button({
  children,
  onClick,
  primary = false,
  icon,
}: {
  children: React.ReactNode;
  onClick: () => void;
  primary?: boolean;
  icon?: string;
}) {
  return (
    <button className={"sp-btn " + (primary ? "sp-primary" : "")} onClick={onClick}>
      {icon && <I n={icon} size={15} />} {children}
    </button>
  );
}
function Panel({
  title,
  subtitle,
  children,
  action,
  wide = false,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <section className={"sp-panel " + (wide ? "sp-wide" : "")}>
      <div className="sp-panel-heading">
        <div>
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
function Chart({
  kind = "line",
  names = ["Students"],
  series = [[2040, 2090, 2110, 2170, 2200, 2250, 2290, 2330, 2380, 2410, 2460, 2486]],
  labels = months,
  colors = ["#347cb5", "#b4cbdc"],
  onOpen,
  percent = false,
  money = false,
  currencySymbol = "$",
}: {
  kind?: string;
  names?: string[];
  series?: number[][];
  labels?: string[];
  colors?: string[];
  onOpen: (label: string) => void;
  percent?: boolean;
  money?: boolean;
  currencySymbol?: string;
}) {
  const [hover, setHover] = useState(-1);
  const all = series.flat(),
    max = Math.max(...all) * 1.15;
  const baseline =
    names[0] === "Active students" ? Math.floor((Math.min(...all) * 0.9) / 100) * 100 : 0;
  const x = (i: number) => 45 + (i * 510) / (labels.length - 1 || 1);
  const y = (v: number) => 175 - ((v - baseline) / (max - baseline)) * 145;
  return (
    <div className="sp-chart">
      <div className="sp-chart-legend">
        {names.map((n, i) => (
          <span key={n}>
            <i style={{ background: colors[i] }} />
            {n}
          </span>
        ))}
      </div>
      <svg
        viewBox="0 0 580 220"
        preserveAspectRatio="none"
        role="img"
        aria-label={names.join(" versus ") + " chart"}
        onMouseLeave={() => setHover(-1)}
      >
        {[0, 1, 2, 3].map((i) => (
          <g key={i}>
            <line
              x1="44"
              x2="566"
              y1={30 + i * 48}
              y2={30 + i * 48}
              stroke="#e9edf1"
              strokeDasharray="3 4"
            />
            <text x="35" y={34 + i * 48} textAnchor="end">
              {money ? currencySymbol : ""}
              {((baseline + (max - baseline) * (1 - i / 3)) / (money ? 1000 : 1)).toFixed(0)}
              {money ? "k" : percent ? "%" : ""}
            </text>
          </g>
        ))}
        {series.map((data, s) =>
          kind === "bar" ? (
            <g key={s}>
              {data.map((v, i) => (
                <rect
                  key={i}
                  x={45 + (i * 510) / labels.length + s * 15}
                  y={y(v)}
                  width="12"
                  height={175 - y(v)}
                  rx="2"
                  fill={colors[s]}
                />
              ))}
            </g>
          ) : (
            <g key={s}>
              {s === 0 && (
                <path
                  d={`M${x(0)},175 ${data.map((v, i) => `L${x(i)},${y(v)}`).join(" ")} L${x(data.length - 1)},175Z`}
                  fill={colors[s]}
                  opacity=".06"
                />
              )}
              <polyline
                points={data.map((v, i) => `${x(i)},${y(v)}`).join(" ")}
                stroke={colors[s]}
                strokeWidth="2.5"
                strokeLinejoin="round"
                fill="none"
              />
              {data.map((v, i) => (
                <circle
                  key={i}
                  cx={x(i)}
                  cy={y(v)}
                  r={hover === i ? 4 : 2.5}
                  fill="white"
                  stroke={colors[s]}
                  strokeWidth="2"
                />
              ))}
            </g>
          ),
        )}
        {labels.map((l, i) => (
          <g key={i}>
            <text
              x={kind === "bar" ? 55 + (i * 510) / labels.length : x(i)}
              y="202"
              textAnchor="middle"
            >
              {l}
            </text>
            <rect
              x={x(i) - 20}
              y="15"
              width={510 / labels.length}
              height="170"
              fill="transparent"
              onMouseEnter={() => setHover(i)}
              onFocus={() => setHover(i)}
              onClick={() => onOpen(l)}
              onKeyDown={(e) => e.key === "Enter" && onOpen(l)}
              tabIndex={0}
              role="button"
              aria-label={`Open ${l} details`}
            >
              <title>{`${l}: ${names.map((n, s) => `${n} ${series[s][i]}${percent ? "%" : ""}`).join(", ")}`}</title>
            </rect>
          </g>
        ))}
      </svg>
      {hover >= 0 && (
        <div className="sp-chart-tooltip">
          <strong>{labels[hover]}</strong>
          {names.map((n, i) => (
            <span key={n}>
              {n}: {money ? currencySymbol : ""}
              {series[i][hover].toLocaleString()}
              {percent ? "%" : ""}
            </span>
          ))}
          <small>Click to investigate →</small>
        </div>
      )}
    </div>
  );
}
export default function Pulse({
  school,
  session,
  page,
  onNavigate,
  onPage,
  notify,
}: {
  school: string;
  session: string;
  page: string;
  onNavigate: (p: string) => void;
  onPage: (p: string) => void;
  notify: (s: string) => void;
}) {
  const workforce = useWorkforce();
  const hrSummary = workforce.summary();
  const academic = useAcademic();
  const learning = useLearningOptional();
  const learningMetrics = learning?.metrics();
  const operations = useOperationsOptional();
  const operationsMetrics = operations?.metrics();
  const credentials = useCredentialsOptional();
  const cms = useCMSOptional();
  const examination = useExaminationOptional();
  const examinationMetrics = examination?.metrics();
  const finance = useFinance();
  const financeSummary = finance.summary();
  const daily = academic.summary(session);
  const attendanceDates = [
    ...new Set(
      Object.keys(academic.records)
        .filter((k) => k.startsWith(session + "|"))
        .map((k) => k.split("|")[1]),
    ),
  ]
    .filter((d) => d <= academic.day)
    .sort()
    .slice(-7);
  const [period, setPeriod] = useState("This academic year");
  const [cls, setCls] = useState("All classes");
  const [section, setSection] = useState("All sections");
  const [role, setRole] = useState("Leadership");
  const [dataState, setDataState] = useState("Live sample data");
  const [drawer, setDrawer] = useState<{ type: string; title: string; id?: string } | null>(null);
  const [widgets, setWidgets] = useState(library);
  const [saved, setSaved] = useState(library);
  const [sizes, setSizes] = useState<Record<string, boolean>>({});
  const [editing, setEditing] = useState(false);
  const [alertFilter, setAlertFilter] = useState("All");
  const [statuses, setStatuses] = useState<Record<string, string>>({});
  const [history, setHistory] = useState<Record<string, string[]>>({});
  const [assignee, setAssignee] = useState("Alex Morgan");
  const [activityFilter, setActivityFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [balanceSort, setBalanceSort] = useState(false);
  const [exam, setExam] = useState("Mid-term assessment");
  const [grading, setGrading] = useState("Letter grades");
  const currency = finance.currency;
  const setCurrency = finance.setCurrency;
  const [eventList, setEventList] = useState(schedule);
  const [newEvent, setNewEvent] = useState("");
  const money = (n: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(n);
  const financeMoney = finance.money;
  const isFinance = role !== "Teacher";
  const filteredScale =
    (cls === "All classes" ? 1 : 0.13) *
    (period === "This month" ? 0.085 : period === "Last 30 days" ? 0.09 : 1) *
    (session === "2024 – 2025" ? 1 : 0.92);
  const count = (n: number) => Math.round(n * filteredScale).toLocaleString();
  const exportData = () => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(
      new Blob(
        [
          `School,Session,Class,Period,Metric,Value\n${[
            ["Students", count(2486)],
            ["Collected", financeMoney(financeSummary.paid)],
            ["Outstanding", financeMoney(financeSummary.outstanding)],
          ]
            .filter((r) => isFinance || r[0] === "Students")
            .map((r) =>
              [school, session, cls, period, ...r]
                .map((v) => `"${String(v).replace(/"/g, '""')}"`)
                .join(","),
            )
            .join("\n")}`,
        ],
        { type: "text/csv" },
      ),
    );
    a.download = "school-pulse-report.csv";
    a.click();
    URL.revokeObjectURL(a.href);
    notify("Filtered intelligence report exported");
  };
  const open = (title: string, type = "record") => setDrawer({ title, type });
  const resolve = (status: string) => {
    if (!drawer?.id) return;
    setStatuses({ ...statuses, [drawer.id]: status });
    setHistory({
      ...history,
      [drawer.id]: [...(history[drawer.id] || []), `${status} by ${assignee} · just now`],
    });
    notify("Alert " + status.toLowerCase());
  };
  const activeAlerts = initialAlerts.filter(
    (a) =>
      !["Resolved", "Dismissed", "Snoozed"].includes(statuses[a.id]) &&
      (isFinance || a.module !== "Finance"),
  );
  const alerts = initialAlerts.filter(
    (a) =>
      (isFinance || a.module !== "Finance") &&
      (alertFilter === "All" || a.severity === alertFilter || a.module === alertFilter),
  );
  const grades =
    grading === "Letter grades"
      ? ["A", "B", "C", "D", "E"]
      : ["Distinction", "Merit", "Pass", "Developing", "Support"];
  const studentsFiltered = people.filter(
    (n, i) =>
      n.toLowerCase().includes(search.toLowerCase()) &&
      (cls === "All classes" || `Grade ${7 + (i % 5)}` === cls),
  );
  const kpis = [
    ["Total students", count(2486), "+8.2%", "vs. previous session", "users", "Student Directory"],
    [
      "Active staff",
      String(hrSummary.active),
      `${hrSummary.disabled} disabled`,
      "shared staff records · preview status",
      "users",
      "Staff Directory",
    ],
    [
      "Attendance today",
      daily.rate === null ? "—" : daily.rate.toFixed(1) + "%",
      `${daily.Present + daily.Late} / ${daily.expected}`,
      "present incl. late · preview day",
      "check",
      "Attendance insights",
    ],
    [
      "Absent today",
      String(daily.Absent),
      `${daily.Unmarked} unmarked`,
      "shared attendance records",
      "users",
      "Attendance insights",
    ],
    [
      "Fees collected",
      financeMoney(financeSummary.paid),
      financeSummary.rate === null ? "—" : financeSummary.rate.toFixed(1) + "%",
      "of expected fees · shared ledger",
      "wallet",
      "Search Fees Payment",
    ],
    [
      "Outstanding fees",
      financeMoney(financeSummary.outstanding),
      `${financeSummary.studentsWithBalance} student accounts`,
      "shared fee obligations",
      "wallet",
      "Search Due Fees",
    ],
    [
      "Admissions",
      count(186),
      "32 enquiries",
      "12 awaiting a decision",
      "flag",
      "Admission Enquiry",
    ],
    [
      "Active classes",
      String(academic.classes.length),
      `${academic.sections.length} sections`,
      "configured academic structure",
      "book",
      "Academics",
    ],
  ];
  const openModule = (p: string) => {
    onNavigate(p);
    setDrawer(null);
  };
  function Stats({ items = kpis }: { items?: string[][] }) {
    return (
      <div className="sp-kpis">
        {items
          .filter((k) => isFinance || !["Fees collected", "Outstanding fees"].includes(k[0]))
          .map((k, i) => (
            <button
              className="sp-kpi"
              key={k[0]}
              onClick={() =>
                [
                  "Staff Directory",
                  "Academics",
                  "Student Directory",
                  "Admission Enquiry",
                  "Search Fees Payment",
                  "Search Due Fees",
                  "Fees Collection",
                  "Search Income",
                  "Search Expense",
                ].includes(k[5])
                  ? openModule(k[5])
                  : onPage(k[5])
              }
            >
              <span className="sp-kpi-label">
                {k[0]}
                <i>
                  <I n={k[4]} />
                </i>
              </span>
              <strong>{k[1]}</strong>
              <div>
                <span className={i === 5 ? "sp-warning" : "sp-success"}>
                  {i !== 5 && <span>↗ </span>}
                  {k[2]}
                </span>
                <small>{k[3]}</small>
                <I n="arrow" size={14} />
              </div>
            </button>
          ))}
      </div>
    );
  }
  const action = (text: string, p: string) => (
    <button className="sp-text-btn" onClick={() => onPage(p)}>
      {text}
      <I n="arrow" size={14} />
    </button>
  );
  function ChartPanel({ name }: { name: string }) {
    const isEnrollment = name === "Enrollment growth",
      isAtt = name === "Attendance trend",
      isFee = name === "Fees collected vs outstanding",
      isIncome = name === "Income vs expenses";
    if (isAtt && !attendanceDates.length)
      return (
        <Panel title="Attendance trend" subtitle="Shared attendance records">
          <div className="sp-empty">
            <h3>No attendance recorded in this session</h3>
            <button onClick={() => openModule("Student Attendance")}>
              Open attendance register
            </button>
          </div>
        </Panel>
      );
    const destination = isEnrollment
      ? "Enrollment"
      : isAtt
        ? "Attendance insights"
        : isFee || isIncome
          ? "Financial insights"
          : "Academic performance";
    const names = isEnrollment
      ? ["Active students"]
      : isAtt
        ? ["Present", "Absent"]
        : isFee
          ? ["Collected", "Outstanding"]
          : ["Other income", "Expenses"];
    const series = isEnrollment
      ? [
          [2040, 2090, 2110, 2170, 2200, 2250, 2290, 2330, 2380, 2410, 2460, 2486].map((n) =>
            Math.round(n * (cls === "All classes" ? 1 : 0.13)),
          ),
        ]
      : isAtt
        ? [
            attendanceDates.map((d) => academic.summary(session, d).rate || 0),
            attendanceDates.map((d) => {
              const s = academic.summary(session, d);
              return s.expected ? (s.Absent / s.expected) * 100 : 0;
            }),
          ]
        : isFee
          ? [
              months.map((label) =>
                finance.ledger.payments
                  .filter(
                    (payment) =>
                      new Date(payment.date + "T00:00:00Z").toLocaleString("en", {
                        month: "short",
                        timeZone: "UTC",
                      }) === label,
                  )
                  .reduce((sum, payment) => sum + payment.amount / 100, 0),
              ),
              months.map((label) =>
                finance.ledger.obligations
                  .filter(
                    (obligation) =>
                      obligation.session === session &&
                      new Date(obligation.due + "T00:00:00Z").toLocaleString("en", {
                        month: "short",
                        timeZone: "UTC",
                      }) === label,
                  )
                  .reduce(
                    (sum, obligation) => sum + balanceFor(finance.ledger, obligation) / 100,
                    0,
                  ),
              ),
            ]
          : [
              months.map((label) =>
                finance.ledger.entries
                  .filter(
                    (entry) =>
                      entry.kind === "Income" &&
                      entry.session === session &&
                      new Date(entry.date + "T00:00:00Z").toLocaleString("en", {
                        month: "short",
                        timeZone: "UTC",
                      }) === label,
                  )
                  .reduce((sum, entry) => sum + entry.amount / 100, 0),
              ),
              months.map((label) =>
                finance.ledger.entries
                  .filter(
                    (entry) =>
                      entry.kind === "Expense" &&
                      entry.session === session &&
                      new Date(entry.date + "T00:00:00Z").toLocaleString("en", {
                        month: "short",
                        timeZone: "UTC",
                      }) === label,
                  )
                  .reduce((sum, entry) => sum + entry.amount / 100, 0),
              ),
            ];
    return (
      <Panel
        title={name}
        subtitle={
          isEnrollment
            ? "Student population · monthly overview"
            : isAtt
              ? "Present and absent students · last 7 school days"
              : isFee
                ? "Fee collections only · excludes other institutional income"
                : "Non-fee operating income and expenses"
        }
        action={
          <button
            className="sp-icon"
            title="Explore intelligence"
            onClick={() => onPage(destination)}
          >
            <I n="arrow" />
          </button>
        }
      >
        <div className="sp-chart-summary">
          <strong>
            {isEnrollment
              ? count(2486)
              : isAtt
                ? daily.rate === null
                  ? "—"
                  : daily.rate.toFixed(1) + "%"
                : isFee
                  ? money(284650 * filteredScale)
                  : money(5000)}
          </strong>
          <span className="sp-success">
            ↗ {isEnrollment ? "8.2%" : isAtt ? "1.6%" : isFee ? "12.4%" : "Net position"}
          </span>
          <small>
            {isEnrollment
              ? "186 admissions · 24 withdrawals"
              : isAtt
                ? "vs. last school week"
                : isFee
                  ? "87.0% collection rate"
                  : "Other income less expenses · February"}
          </small>
        </div>
        <Chart
          kind={isFee ? "bar" : "line"}
          names={names}
          series={series}
          labels={
            isEnrollment
              ? months
              : isAtt
                ? attendanceDates.map((d) => d.slice(5))
                : ["Sep", "Oct", "Nov", "Dec", "Jan", "Feb"]
          }
          colors={
            isAtt
              ? ["#33916b", "#dba7a2"]
              : isIncome
                ? ["#347cb5", "#d6ad6b"]
                : ["#347cb5", "#c6d7e3"]
          }
          percent={isAtt}
          money={isFee || isIncome}
          currencySymbol={
            new Intl.NumberFormat("en", { style: "currency", currency })
              .formatToParts(0)
              .find((p) => p.type === "currency")?.value
          }
          onOpen={(label) => open(`${name} · ${label}`, "chart")}
        />
      </Panel>
    );
  }
  function Population() {
    return (
      <Panel
        title="Class population"
        subtitle="Enrollment and capacity by school level"
        action={action("View students", "Enrollment")}
      >
        <div className="sp-horizontal-bars">
          {["Grade 7", "Grade 8", "Grade 9", "Grade 10", "Grade 11", "Grade 12"].map((g, i) => (
            <button
              key={g}
              onClick={() => {
                setCls(g);
                onPage("Enrollment");
              }}
            >
              <span>{g}</span>
              <div>
                <i style={{ width: 92 - i * 7 + "%" }} />
              </div>
              <b>{[286, 272, 254, 248, 236, 218][i]}</b>
              <small>/ 300</small>
            </button>
          ))}
        </div>
        <p className="sp-card-note">
          <i /> Enrolled students <span>Capacity shown where configured</span>
        </p>
      </Panel>
    );
  }
  function Academic() {
    return (
      <Panel
        title="Academic performance"
        subtitle={`Grade distribution · ${exam}`}
        action={
          <select
            aria-label="Grading scale"
            value={grading}
            onChange={(e) => setGrading(e.target.value)}
          >
            <option>Letter grades</option>
            <option>Competency scale</option>
          </select>
        }
      >
        <div className="sp-chart-summary">
          <strong>
            86.4<span>%</span>
          </strong>
          <span className="sp-academic">Average score</span>
          <small>1,842 students assessed</small>
        </div>
        <Chart
          kind="bar"
          names={["Students assessed"]}
          series={[[442, 682, 436, 204, 78]]}
          labels={grades}
          colors={["#8e73b6"]}
          onOpen={(g) => open(`${g} · student examination results`, "results")}
        />
      </Panel>
    );
  }
  function Attention({ full = false }: { full?: boolean }) {
    return (
      <Panel
        title="Attention center"
        subtitle="Prioritized signals that need a human decision"
        action={
          full ? (
            <span className="sp-tag sp-critical">{activeAlerts.length} active</span>
          ) : (
            action("View all alerts", "Attention center")
          )
        }
        wide
      >
        {full && (
          <div className="sp-filter-tabs">
            {[
              "All",
              "Critical",
              "Warning",
              "Information",
              "Attendance",
              "Finance",
              "Academics",
              "Admissions",
              "HR",
              "Inventory",
              "Transport",
              "Front Office",
            ].map((f) => (
              <button
                key={f}
                className={alertFilter === f ? "active" : ""}
                onClick={() => setAlertFilter(f)}
              >
                {f}
              </button>
            ))}
          </div>
        )}
        <div className="sp-alerts">
          {(full ? alerts : activeAlerts.slice(0, 4)).map((a) => (
            <button
              className="sp-alert-row"
              key={a.id}
              onClick={() => setDrawer({ type: "alert", title: a.title, id: a.id })}
            >
              <span className={"sp-alert-symbol " + a.severity.toLowerCase()}>
                <I
                  n={a.module === "Finance" ? "wallet" : a.module === "Academics" ? "book" : "flag"}
                />
              </span>
              <span className="sp-alert-main">
                <b>{a.title}</b>
                <small>{a.entity}</small>
              </span>
              <span className={"sp-tag sp-" + a.severity.toLowerCase()}>{a.severity}</span>
              <span className="sp-alert-time">{full ? statuses[a.id] || "Open" : a.time}</span>
              <span className="sp-alert-action">
                {a.action} <I n="arrow" size={14} />
              </span>
            </button>
          ))}
        </div>
        {!activeAlerts.length && !full && (
          <div className="sp-empty">
            <I n="check" />
            <h3>Nothing needs your attention</h3>
            <p>All active alerts have been addressed.</p>
          </div>
        )}
      </Panel>
    );
  }
  function Activity({ full = false }: { full?: boolean }) {
    return (
      <Panel
        title="Recent activity"
        subtitle="Operational updates · separate from your formal audit log"
        action={full ? undefined : action("View timeline", "Activity timeline")}
      >
        <div className="sp-filter-tabs">
          {["All", "Admissions", "Finance", "Attendance", "Academics", "HR", "System"].map((f) => (
            <button
              key={f}
              className={activityFilter === f ? "active" : ""}
              onClick={() => setActivityFilter(f)}
            >
              {f}
            </button>
          ))}
        </div>
        {events
          .filter((e) => activityFilter === "All" || e[0] === activityFilter)
          .map((e) => (
            <button
              className="sp-activity-row"
              key={e[3]}
              onClick={() => open(e[2] + " · " + e[1], "activity")}
            >
              <span className="sp-event-icon">
                <I n={e[6]} />
              </span>
              <span>
                <b>{e[2]}</b>
                <p>
                  {e[1]} <span>· {e[3]}</span>
                </p>
                <small>
                  {e[4]} · {e[0]}
                </small>
              </span>
              <time>{e[5]}</time>
              <I n="arrow" size={14} />
            </button>
          ))}
      </Panel>
    );
  }
  function Calendar() {
    return (
      <Panel
        title="School calendar"
        subtitle="Coming up across your institution"
        action={
          <button
            className="sp-icon"
            title="Add event"
            onClick={() => open("Add calendar event", "add-event")}
          >
            <I n="plus" />
          </button>
        }
      >
        {eventList.slice(0, 5).map((e, i) => (
          <button className="sp-calendar-row" key={e[2]} onClick={() => open(e[2], "event")}>
            <span className="sp-date-block">
              <b>{e[0]}</b>
              <small>{e[1]}</small>
            </span>
            <span>
              <b>{e[2]}</b>
              <small>
                {e[3]} · {e[5]}
              </small>
            </span>
            <em>{e[4]}</em>
          </button>
        ))}
        <button className="sp-full-link" onClick={() => open("School calendar", "calendar")}>
          View full calendar <I n="arrow" size={14} />
        </button>
      </Panel>
    );
  }
  function Watchlist() {
    let list = studentsFiltered.map((n) => ({ name: n, i: people.indexOf(n) }));
    if (balanceSort) list = list.sort((a, b) => b.i - a.i);
    return (
      <Panel
        title="Financial watchlist"
        subtitle="Overdue student accounts · restricted financial information"
        action={
          <button
            className="sp-text-btn"
            onClick={() => open("Due fees · overdue accounts", "dues")}
          >
            Open due fees <I n="arrow" size={14} />
          </button>
        }
        wide
      >
        {!isFinance ? (
          <div className="sp-empty">
            <I n="shield" />
            <h3>Financial access restricted</h3>
            <p>Your current role cannot view student balances.</p>
          </div>
        ) : (
          <>
            <div className="sp-table-tools">
              <label>
                <I n="search" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search student..."
                />
              </label>
              <select
                aria-label="Watchlist class"
                value={cls}
                onChange={(e) => setCls(e.target.value)}
              >
                {["All classes", "Grade 7", "Grade 8", "Grade 9", "Grade 10", "Grade 11"].map(
                  (g) => (
                    <option key={g}>{g}</option>
                  ),
                )}
              </select>
              <button className="sp-text-btn" onClick={() => setBalanceSort(!balanceSort)}>
                Balance {balanceSort ? "↓" : "↑"}
              </button>
            </div>
            <div className="sp-table-wrap">
              <table>
                <thead>
                  <tr>
                    {[
                      "Student",
                      "Admission no.",
                      "Class",
                      "Outstanding",
                      "Days overdue",
                      "Last payment",
                      "",
                    ].map((h, i) => (
                      <th key={i}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {list.slice(0, 5).map(({ name, i }) => (
                    <tr key={name}>
                      <td>
                        <button className="sp-student" onClick={() => open(name, "student")}>
                          <span>
                            {name
                              .split(" ")
                              .map((s) => s[0])
                              .join("")}
                          </span>
                          {name}
                        </button>
                      </td>
                      <td>ADM-2024-{102 + i}</td>
                      <td>Grade {7 + (i % 5)}</td>
                      <td>
                        <b>{money(850 + i * 125)}</b>
                      </td>
                      <td>
                        <span className="sp-tag sp-warning">{32 + i * 5} days</span>
                      </td>
                      <td>12 Jan 2025</td>
                      <td>
                        <button
                          className="sp-text-btn"
                          onClick={() => open(name + " · fee account", "account")}
                        >
                          View account <I n="arrow" size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!list.length && (
                <div className="sp-empty">No overdue accounts match your filters.</div>
              )}
            </div>
          </>
        )}
      </Panel>
    );
  }
  function Syllabus() {
    const topics = academic.topics.filter((t) => t.session === session);
    return (
      <Panel
        title="Syllabus progress"
        subtitle="Shared topic completion · explicit teacher-entered flags"
        action={
          <button className="sp-text-btn" onClick={() => openModule("Manage Syllabus Status")}>
            View syllabus <I n="arrow" size={14} />
          </button>
        }
      >
        {academic.subjects.map((subject) => {
          const list = topics.filter((t) => t.subject === subject),
            complete = list.filter((t) => t.completed).length,
            percent = list.length ? Math.round((complete / list.length) * 100) : null;
          return (
            <button
              className="sp-syllabus-row"
              key={subject}
              onClick={() => openModule("Manage Syllabus Status")}
            >
              <span>
                <b>{subject}</b>
                <small>
                  {complete} of {list.length} topics
                </small>
              </span>
              <span>
                <b>{percent === null ? "—" : percent + "%"}</b>
                <small>
                  {list.some((t) => !t.completed && t.due < academic.day)
                    ? "Needs review"
                    : list.length
                      ? "On track"
                      : "Not configured"}
                </small>
              </span>
              <div>
                <i style={{ width: (percent || 0) + "%", background: "#33916b" }} />
              </div>
            </button>
          );
        })}
      </Panel>
    );
  }
  function StudentTable() {
    return (
      <Panel
        title="Student records"
        subtitle={`${cls} · ${section} · ${session}`}
        action={
          <Button icon="download" onClick={exportData}>
            Export records
          </Button>
        }
        wide
      >
        <div className="sp-table-wrap">
          <table>
            <thead>
              <tr>
                {["Student", "Admission number", "Class", "Section", "Status", ""].map((c, i) => (
                  <th key={i}>{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {people
                .filter((_, i) => cls === "All classes" || `Grade ${7 + (i % 5)}` === cls)
                .map((n, i) => (
                  <tr key={n}>
                    <td>
                      <button className="sp-student" onClick={() => open(n, "student")}>
                        {n}
                      </button>
                    </td>
                    <td>ADM-2024-{102 + i}</td>
                    <td>Grade {7 + (i % 5)}</td>
                    <td>{section === "All sections" ? "A" : section}</td>
                    <td>
                      <span className="sp-tag sp-success">Active</span>
                    </td>
                    <td>
                      <button className="sp-text-btn" onClick={() => open(n, "student")}>
                        Student 360 <I n="arrow" size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </Panel>
    );
  }
  const title =
    page === "Overview"
      ? "School Pulse"
      : page === "Enrollment"
        ? "Enrollment intelligence"
        : page === "Attendance insights"
          ? "Attendance intelligence"
          : page === "Financial insights"
            ? "Financial intelligence"
            : page === "Academic performance"
              ? "Academic intelligence"
              : page;
  const renderWidget = (name: string) => {
    if (name === "Financial watchlist") return Watchlist();
    if (name === "Syllabus progress") return <Syllabus />;
    if (name === "Recent activity") return <Activity />;
    if (name === "School calendar") return <Calendar />;
    if (name === "Attention center") return <Attention />;
    if (name === "Class population") return <Population />;
    if (name === "Academic performance") return <Academic />;
    return <ChartPanel name={name} />;
  };
  const alert = initialAlerts.find((a) => a.id === drawer?.id);
  return (
    <div className="sp">
      <div className="sp-page-heading">
        <div>
          <div className="sp-eyebrow">
            <i /> INSTITUTIONAL INTELLIGENCE
          </div>
          <h1>{title}</h1>
          <p>
            {page === "Overview"
              ? "Your institution at a glance. The signals that matter, connected."
              : `${school} · ${session} · Explore the story behind the numbers.`}
          </p>
        </div>
        <div>
          <Button
            icon="settings"
            onClick={() => {
              setEditing(!editing);
              setDrawer({ title: "Customize dashboard", type: "customize" });
            }}
          >
            Customize dashboard
          </Button>
          <Button icon="download" onClick={exportData}>
            Export
          </Button>
        </div>
      </div>
      <div className="sp-context-bar">
        <span>
          <I n="calendar" size={15} /> Monday, 24 February 2025
        </span>
        <span className="sp-session">{session}</span>
        <div className="sp-context-filters">
          <select
            aria-label="Dashboard date range"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
          >
            {["This academic year", "This month", "Last 30 days"].map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
          <select aria-label="Dashboard class" value={cls} onChange={(e) => setCls(e.target.value)}>
            {[
              "All classes",
              "Grade 7",
              "Grade 8",
              "Grade 9",
              "Grade 10",
              "Grade 11",
              "Grade 12",
            ].map((g) => (
              <option key={g}>{g}</option>
            ))}
          </select>
          {page !== "Overview" && (
            <select
              aria-label="Section"
              value={section}
              onChange={(e) => setSection(e.target.value)}
            >
              <option>All sections</option>
              <option>A</option>
              <option>B</option>
              <option>C</option>
            </select>
          )}
          <button
            className="sp-icon"
            title="Preview roles, currency, grading and data states"
            onClick={() => open("Preview controls", "states")}
          >
            <I n="settings" size={16} />
          </button>
        </div>
      </div>
      {dataState === "Partial data" && (
        <div className="sp-health-strip">
          <b>Partial data available</b>
          <small>
            Attendance is awaiting submissions from 3 classes. Other signals are available.
          </small>
          <Button onClick={() => openModule("Attendance")}>Review missing submissions</Button>
        </div>
      )}
      {!["Live sample data", "Partial data"].includes(dataState) ? (
        <div className="sp-state-panel">
          {dataState === "Loading" ? (
            <>
              <div className="sp-skeleton" />
              <div className="sp-skeleton" />
              <div className="sp-skeleton" />
            </>
          ) : (
            <>
              <I n={dataState === "Permission restricted" ? "shield" : "pulse"} size={32} />
              <h2>{dataState}</h2>
              <p>
                {dataState === "Offline"
                  ? "Your connection is unavailable. Reconnect to refresh institutional signals."
                  : dataState === "Failed chart"
                    ? "We could not load the intelligence data. Please try again."
                    : dataState === "Permission restricted"
                      ? "Contact your institution administrator to request access."
                      : dataState === "Session unavailable"
                        ? "Choose an available academic session to continue."
                        : "There are no records for this selection. Complete school setup or add records to get started."}
              </p>
              <Button primary onClick={() => setDataState("Live sample data")}>
                Return to sample data
              </Button>
              <Button onClick={() => openModule("Student Admission")}>Open admissions</Button>
            </>
          )}
        </div>
      ) : (
        <>
          {page === "Overview" ? (
            <>
              <Stats />
              <div className="sp-health-strip">
                <span>
                  <I n="pulse" />
                  <b>A healthy pulse. A few things to follow up.</b>
                  <small>
                    Attendance is up 1.6%.{" "}
                    {activeAlerts.filter((a) => a.severity === "Critical").length} critical signals
                    need a closer look.
                  </small>
                </span>
                <button onClick={() => onPage("Attention center")}>
                  Review attention center <I n="arrow" size={14} />
                </button>
              </div>
              {learningMetrics && (
                <ExamCard
                  title="Learning operations"
                  sub="Shared homework, resource and library records · simulation"
                >
                  <div className="op-inline">
                    <ExamButton onClick={() => openModule("Homework")}>
                      Active homework: {learningMetrics.active}
                    </ExamButton>
                    <ExamButton onClick={() => openModule("Add Homework")}>
                      Pending review: {learningMetrics.pending}
                    </ExamButton>
                    <ExamButton onClick={() => openModule("Content Share List")}>
                      Shared resources: {learningMetrics.shared}
                    </ExamButton>
                    <ExamButton onClick={() => openModule("Issue - Return")}>
                      Issued / overdue: {learningMetrics.issued} / {learningMetrics.overdue}
                    </ExamButton>
                  </div>
                </ExamCard>
              )}
              <ExamCard
                title="Reports & analytics"
                sub="Shared operational sources · transparent calculation notes"
              >
                <div className="op-inline">
                  <ExamButton onClick={() => openModule("Reports Overview")}>
                    Open reporting library
                  </ExamButton>
                  <ExamButton onClick={() => openModule("Reports / Finance")}>
                    Finance report
                  </ExamButton>
                  <ExamButton onClick={() => openModule("Reports / Attendance")}>
                    Attendance report
                  </ExamButton>
                  <ExamButton onClick={() => openModule("Reports / Audit Trail Report")}>
                    Read-only audit report
                  </ExamButton>
                </div>
              </ExamCard>
              {cms && (
                <ExamCard
                  title="Public website & publishing"
                  sub="Shared CMS records · frontend-only preview"
                >
                  <div className="op-inline">
                    <ExamButton onClick={() => openModule("Pages")}>
                      Published pages:{" "}
                      {
                        cms.content.filter(
                          (c) => c.kind === "Pages" && isPublic(c, cms.school, cms.now),
                        ).length
                      }
                    </ExamButton>
                    <ExamButton onClick={() => openModule("News")}>
                      Published news:{" "}
                      {
                        cms.content.filter(
                          (c) => c.kind === "News" && isPublic(c, cms.school, cms.now),
                        ).length
                      }
                    </ExamButton>
                    <ExamButton onClick={() => openModule("Event")}>
                      Public upcoming events:{" "}
                      {
                        cms.content.filter(
                          (c) =>
                            c.kind === "Event" &&
                            isPublic(c, cms.school, cms.now) &&
                            c.end >= cms.now.slice(0, 10),
                        ).length
                      }
                    </ExamButton>
                    <ExamButton onClick={() => openModule("Front CMS Overview")}>
                      Review / scheduled:{" "}
                      {cms.content.filter((c) => ["Review", "Scheduled"].includes(c.status)).length}
                    </ExamButton>
                    <ExamButton onClick={() => openModule("Media Manager")}>
                      Media awaiting review:{" "}
                      {cms.assets.filter((a) => a.status === "Review").length}
                    </ExamButton>
                    <ExamButton onClick={() => openModule("Public Website Preview")}>
                      Open public website preview
                    </ExamButton>
                  </div>
                </ExamCard>
              )}
              {credentials && (
                <ExamCard
                  title="Credentials & alumni"
                  sub="Shared generated documents and reviewed alumni · simulation"
                >
                  <div className="op-inline">
                    <ExamButton onClick={() => openModule("Student Certificate")}>
                      Certificates this session:{" "}
                      {
                        credentials.documents.filter(
                          (d) => d.kind === "Certificate" && d.session === session,
                        ).length
                      }
                    </ExamButton>
                    <ExamButton onClick={() => openModule("Generate Certificate")}>
                      Skipped / failed generation:{" "}
                      {
                        credentials.batches
                          .flatMap((b) => b.rows)
                          .filter((r) => r.status !== "Generated").length
                      }
                    </ExamButton>
                    <ExamButton onClick={() => openModule("Generate ID Card")}>
                      Student ID cards:{" "}
                      {credentials.documents.filter((d) => d.kind === "Student ID").length}
                    </ExamButton>
                    <ExamButton onClick={() => openModule("Generate Staff ID Card")}>
                      Staff ID cards:{" "}
                      {credentials.documents.filter((d) => d.kind === "Staff ID").length}
                    </ExamButton>
                    <ExamButton onClick={() => openModule("Manage Alumni")}>
                      Reviewed alumni: {credentials.alumni.length}
                    </ExamButton>
                    <ExamButton onClick={() => openModule("Events")}>
                      Upcoming events:{" "}
                      {
                        credentials.events.filter(
                          (e) => e.status === "Published" && e.date >= credentials.today,
                        ).length
                      }{" "}
                      · simulated RSVP: {credentials.rsvps.length}
                    </ExamButton>
                  </div>
                </ExamCard>
              )}
              {operationsMetrics && (
                <ExamCard
                  title="Inventory & transport operations"
                  sub="Shared stock ledger and fleet assignment records · simulation"
                >
                  <div className="op-inline">
                    <ExamButton onClick={() => openModule("Add Item")}>
                      Low / out of stock: {operationsMetrics.low} / {operationsMetrics.out}
                    </ExamButton>
                    <ExamButton onClick={() => openModule("Add Item Stock")}>
                      Stock units: {operationsMetrics.units}
                    </ExamButton>
                    <ExamButton onClick={() => openModule("Vehicles")}>
                      Active / maintenance vehicles: {operationsMetrics.activeVehicles} /{" "}
                      {operationsMetrics.maintenance}
                    </ExamButton>
                    <ExamButton onClick={() => openModule("Assign Vehicle")}>
                      Active assignments: {operationsMetrics.activeAssignments}
                    </ExamButton>
                  </div>
                </ExamCard>
              )}
              {examinationMetrics && (
                <ExamCard
                  title="Examination intelligence"
                  sub="Shared assessment records · published scores only for performance"
                >
                  <div className="op-inline">
                    <ExamButton onClick={() => openModule("Exam Schedule")}>
                      Upcoming sittings: {examinationMetrics.upcoming}
                    </ExamButton>
                    <ExamButton onClick={() => openModule("Exam Result")}>
                      Results pending: {examinationMetrics.pending}
                    </ExamButton>
                    <ExamButton onClick={() => openModule("Exam Result")}>
                      Marks entered:{" "}
                      {examinationMetrics.completion === null
                        ? "—"
                        : examinationMetrics.completion + "%"}
                    </ExamButton>
                    <ExamButton onClick={() => openModule("Print Marksheet")}>
                      Published: {examinationMetrics.published}
                    </ExamButton>
                  </div>
                </ExamCard>
              )}
              {editing && (
                <div className="sp-edit-banner">
                  <b>Layout editing enabled</b>
                  <span>Use widget controls to reorder, resize, or remove panels.</span>
                  <Button
                    onClick={() => {
                      setWidgets(library);
                      setSizes({});
                    }}
                  >
                    Reset
                  </Button>
                  <Button
                    primary
                    onClick={() => {
                      setSaved(widgets);
                      setEditing(false);
                      notify("Personal layout saved for this preview");
                    }}
                  >
                    Save layout
                  </Button>
                  <Button
                    onClick={() => {
                      setWidgets(saved);
                      setEditing(false);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              )}
              <div className="sp-academic-strip sp-workforce-strip">
                <button onClick={() => openModule("Staff Attendance")}>
                  <span>Staff attendance · {workforce.date}</span>
                  <b>
                    {hrSummary.present} present / {hrSummary.absent} absent
                  </b>
                  <small>{hrSummary.onLeave} on approved leave · not counted absent</small>
                </button>
                <button onClick={() => openModule("Approve Leave Request")}>
                  <span>Pending staff leave</span>
                  <b>{hrSummary.pending} requests</b>
                  <small>Submitted and Under Review requests</small>
                </button>
                <button onClick={() => openModule("Payroll")}>
                  <span>Payroll processing</span>
                  <b>{workforce.batches.length} simulated runs</b>
                  <small>No bank transfers or paid-status claims</small>
                </button>
                <button onClick={() => openModule("Email / SMS Log")}>
                  <span>Communication queue</span>
                  <b>
                    {hrSummary.queued} simulated / {hrSummary.failed} failed
                  </b>
                  <small>Provider-confirmed delivery is unavailable</small>
                </button>
              </div>
              <div className="sp-academic-strip">
                <button onClick={() => openModule("Manage Lesson Plan")}>
                  <span>Teaching delivery</span>
                  <b>
                    {
                      academic.plans.filter(
                        (p) => p.session === session && p.status === "Delivered",
                      ).length
                    }{" "}
                    / {academic.plans.filter((p) => p.session === session).length} plans
                  </b>
                  <small>Delivered · explicit plan status</small>
                </button>
                <button onClick={() => openModule("Manage Syllabus Status")}>
                  <span>Syllabus completion</span>
                  <b>
                    {academic.syllabus(session).percent === null
                      ? "—"
                      : academic.syllabus(session).percent + "%"}
                  </b>
                  <small>Derived from completed topics</small>
                </button>
                <button onClick={() => openModule("Class Timetable")}>
                  <span>Timetable coverage</span>
                  <b>{academic.slots.filter((s) => s.session === session).length} periods</b>
                  <small>
                    {
                      new Set(
                        academic.slots.filter((s) => s.session === session).map((s) => s.grade),
                      ).size
                    }{" "}
                    classes scheduled
                  </small>
                </button>
              </div>
              <div className="sp-widget-grid">
                {widgets
                  .filter(
                    (n) =>
                      isFinance ||
                      ![
                        "Fees collected vs outstanding",
                        "Income vs expenses",
                        "Financial watchlist",
                      ].includes(n),
                  )
                  .map((name, i) => (
                    <div
                      className={
                        "sp-widget " +
                        (sizes[name]
                          ? "sp-span12"
                          : ["Enrollment growth", "Fees collected vs outstanding"].includes(name)
                            ? "sp-span7"
                            : ["Attendance trend", "Income vs expenses"].includes(name)
                              ? "sp-span5"
                              : ["Attention center"].includes(name)
                                ? "sp-span12"
                                : ["Class population", "Academic performance"].includes(name)
                                  ? "sp-span6"
                                  : name === "School calendar" || name === "Syllabus progress"
                                    ? "sp-span5"
                                    : "sp-span7")
                      }
                      key={name}
                    >
                      {editing && (
                        <div className="sp-widget-controls">
                          <span>{name}</span>
                          <button
                            aria-label={"Move " + name + " earlier"}
                            disabled={i === 0}
                            onClick={() => {
                              const a = [...widgets];
                              [a[i - 1], a[i]] = [a[i], a[i - 1]];
                              setWidgets(a);
                            }}
                          >
                            ↑
                          </button>
                          <button
                            aria-label={"Move " + name + " later"}
                            disabled={i === widgets.length - 1}
                            onClick={() => {
                              const a = [...widgets];
                              [a[i], a[i + 1]] = [a[i + 1], a[i]];
                              setWidgets(a);
                            }}
                          >
                            ↓
                          </button>
                          <button onClick={() => setSizes({ ...sizes, [name]: !sizes[name] })}>
                            Resize
                          </button>
                          <button
                            aria-label={"Remove " + name}
                            onClick={() => setWidgets(widgets.filter((w) => w !== name))}
                          >
                            ×
                          </button>
                        </div>
                      )}
                      {renderWidget(name)}
                    </div>
                  ))}
              </div>
            </>
          ) : page === "Attention center" ? (
            <>
              <Stats
                items={[
                  [
                    "Active alerts",
                    String(activeAlerts.length),
                    "Across 8 modules",
                    "requires review",
                    "flag",
                    "Attention center",
                  ],
                  [
                    "Critical",
                    String(activeAlerts.filter((a) => a.severity === "Critical").length),
                    "Immediate action",
                    "priority signals",
                    "flag",
                    "Attention center",
                  ],
                  [
                    "Warnings",
                    String(activeAlerts.filter((a) => a.severity === "Warning").length),
                    "Follow up",
                    "before deadlines",
                    "clock",
                    "Attention center",
                  ],
                  [
                    "Resolved today",
                    String(Object.values(statuses).filter((v) => v === "Resolved").length),
                    "Updated now",
                    "closed by your team",
                    "check",
                    "Attention center",
                  ],
                ]}
              />
              <Attention full />
            </>
          ) : page === "Activity timeline" || page === "Reports & analytics" ? (
            <Activity full />
          ) : page === "Enrollment" ? (
            <>
              <Stats
                items={[
                  [
                    "Active enrollment",
                    count(2486),
                    "+8.2%",
                    "vs. previous session",
                    "users",
                    "Enrollment",
                  ],
                  [
                    "Admissions",
                    count(186),
                    "32 enquiries",
                    "current intake",
                    "flag",
                    "Enrollment",
                  ],
                  ["Withdrawals", count(24), "0.9%", "of enrolled students", "users", "Enrollment"],
                  [
                    "Net growth",
                    "+162",
                    "+7.0%",
                    "admissions less withdrawals",
                    "pulse",
                    "Enrollment",
                  ],
                ]}
              />
              <div className="sp-detail-grid">
                <ChartPanel name="Enrollment growth" />
                <Population />
                <Panel
                  title="Admissions funnel"
                  subtitle="From first enquiry to enrolled student"
                  wide
                >
                  <div className="sp-funnel">
                    {[
                      ["Enquiries", 320],
                      ["Applications", 248],
                      ["Accepted", 204],
                      ["Enrolled", 186],
                    ].map(([n, v], i) => (
                      <button
                        key={n}
                        onClick={() => open(`${n} · admissions pipeline`, "admissions")}
                      >
                        <span>
                          {i + 1}. {n}
                        </span>
                        <strong>{v}</strong>
                        <div style={{ width: (Number(v) / 320) * 100 + "%" }} />
                        <small>
                          {i === 0
                            ? "100% of enquiries"
                            : Math.round((Number(v) / 320) * 100) + "% conversion"}
                        </small>
                      </button>
                    ))}
                  </div>
                </Panel>
                <StudentTable />
              </div>
            </>
          ) : page === "Attendance insights" ? (
            <>
              <Stats
                items={[
                  [
                    "Attendance today",
                    "94.8%",
                    "+1.6%",
                    "vs. previous week",
                    "check",
                    "Attendance insights",
                  ],
                  [
                    "Present",
                    "2,357",
                    "Of 2,486 expected",
                    "today",
                    "users",
                    "Attendance insights",
                  ],
                  ["Absent", "129", "18 fewer", "vs. previous day", "users", "Attendance insights"],
                  [
                    "Late / excused",
                    "24 / 18",
                    "42 exceptions",
                    "today",
                    "clock",
                    "Attendance insights",
                  ],
                ]}
              />
              <div className="sp-detail-grid">
                <ChartPanel name="Attendance trend" />
                <Panel
                  title="Attendance by class"
                  subtitle="Select a class and day to open the register"
                >
                  <div className="sp-heatmap">
                    <span />
                    {["Mon", "Tue", "Wed", "Thu", "Fri"].map((d) => (
                      <small key={d}>{d}</small>
                    ))}
                    {["Grade 7", "Grade 8", "Grade 9", "Grade 10", "Grade 11"].map((g, i) => (
                      <div className="sp-heat-row" key={g}>
                        <span>{g}</span>
                        {[0, 1, 2, 3, 4].map((d) => (
                          <button
                            key={d}
                            title={`${g} · ${92 + ((i + d) % 7)}% present`}
                            style={{
                              background: `rgba(51,145,107,${0.18 + ((i + d) % 5) * 0.12})`,
                            }}
                            onClick={() =>
                              open(
                                `${g} · ${["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"][d]} attendance register`,
                                "attendance",
                              )
                            }
                          >
                            {92 + ((i + d) % 7)}%
                          </button>
                        ))}
                      </div>
                    ))}
                  </div>
                </Panel>
                <Panel
                  title="Absenteeism watchlist"
                  subtitle="Consecutive absences · proactive student support"
                  wide
                >
                  {people.slice(0, 4).map((n, i) => (
                    <button
                      className="sp-alert-row"
                      key={n}
                      onClick={() => open(n + " · attendance history", "student")}
                    >
                      <span className="sp-alert-main">
                        <b>{n}</b>
                        <small>Grade {7 + i} · Section A</small>
                      </span>
                      <span className="sp-tag sp-critical">{3 + i} consecutive days</span>
                      <span className="sp-alert-action">
                        View student <I n="arrow" size={14} />
                      </span>
                    </button>
                  ))}
                </Panel>
                <StudentTable />
              </div>
            </>
          ) : page === "Financial insights" ? (
            <>
              {isFinance ? (
                <>
                  <Stats
                    items={[
                      [
                        "Fees expected",
                        financeMoney(financeSummary.expected),
                        "This academic session",
                        "charges − discounts",
                        "wallet",
                        "Fees Collection",
                      ],
                      [
                        "Collected",
                        financeMoney(financeSummary.paid),
                        financeSummary.rate === null ? "—" : financeSummary.rate.toFixed(1) + "%",
                        "allocated confirmed simulations",
                        "wallet",
                        "Search Fees Payment",
                      ],
                      [
                        "Outstanding",
                        financeMoney(financeSummary.outstanding),
                        `${financeSummary.studentsWithBalance} student accounts`,
                        "expected − allocated payments",
                        "flag",
                        "Search Due Fees",
                      ],
                      [
                        "General income",
                        financeMoney(financeSummary.income),
                        "Non-fee entries",
                        "separate from collections",
                        "check",
                        "Search Income",
                      ],
                      [
                        "Expenses",
                        financeMoney(financeSummary.expenses),
                        "Manual preview entries",
                        "not verified disbursements",
                        "wallet",
                        "Search Expense",
                      ],
                    ]}
                  />
                  <div className="sp-detail-grid">
                    <ChartPanel name="Fees collected vs outstanding" />
                    <Panel
                      title="Receivables aging"
                      subtitle="Outstanding fees grouped by days overdue"
                    >
                      {[
                        "Current / not yet due",
                        "1–30 days overdue",
                        "31–60 days overdue",
                        "61–90 days overdue",
                        "Over 90 days overdue",
                      ].map((b, i) => (
                        <button
                          className="sp-aging"
                          key={b}
                          onClick={() => openModule("Search Due Fees")}
                        >
                          <span>{b}</span>
                          <div>
                            <i
                              style={{
                                width:
                                  (financeSummary.outstanding
                                    ? (financeSummary.aging[i] / financeSummary.outstanding) * 100
                                    : 0) + "%",
                              }}
                            />
                          </div>
                          <b>{financeMoney(financeSummary.aging[i])}</b>
                          <I n="arrow" size={14} />
                        </button>
                      ))}
                    </Panel>
                    <Panel title="Payment methods" subtitle="Fee transactions in this period">
                      {[...new Set(finance.ledger.payments.map((payment) => payment.method))].map(
                        (method) => {
                          const amount = finance.ledger.payments
                            .filter(
                              (payment) => payment.session === session && payment.method === method,
                            )
                            .reduce((sum, payment) => sum + payment.amount, 0);
                          return (
                            <button
                              className="sp-aging"
                              key={method}
                              onClick={() => openModule("Search Fees Payment")}
                            >
                              <span>{method}</span>
                              <b>{financeMoney(amount)}</b>
                              <I n="arrow" size={14} />
                            </button>
                          );
                        },
                      )}
                    </Panel>
                    <ChartPanel name="Income vs expenses" />
                    {Watchlist()}
                    <Activity />
                  </div>
                </>
              ) : (
                <div className="sp-empty">
                  <I n="shield" />
                  <h2>Financial intelligence is restricted</h2>
                  <p>Your preview role does not include financial access.</p>
                </div>
              )}
            </>
          ) : (
            <>
              <Stats
                items={[
                  [
                    "Average performance",
                    "86.4%",
                    "+3.2 pts",
                    "vs. previous assessment",
                    "book",
                    "Academic performance",
                  ],
                  [
                    "Students assessed",
                    "1,842",
                    "74.1%",
                    "of enrolled students",
                    "users",
                    "Academic performance",
                  ],
                  [
                    "Pass rate",
                    "94.2%",
                    "Configured threshold: 50%",
                    "this examination",
                    "check",
                    "Academic performance",
                  ],
                  [
                    "Require support",
                    "78",
                    "4.2% of assessed",
                    "intervention recommended",
                    "flag",
                    "Academic performance",
                  ],
                ]}
              />
              <div className="sp-academic-filters">
                <select
                  aria-label="Examination"
                  value={exam}
                  onChange={(e) => setExam(e.target.value)}
                >
                  <option>Mid-term assessment</option>
                  <option>Term 1 final</option>
                </select>
                <select aria-label="Subject">
                  <option>All subjects</option>
                  <option>Mathematics</option>
                  <option>English language</option>
                </select>
              </div>
              <div className="sp-detail-grid">
                <Academic />
                <Panel title="Subject performance" subtitle="Average assessment score by subject">
                  <div className="sp-horizontal-bars">
                    {["Mathematics", "English language", "Physics", "Biology", "History"].map(
                      (s, i) => (
                        <button
                          key={s}
                          onClick={() => open(s + " · assessment breakdown", "results")}
                        >
                          <span>{s}</span>
                          <div>
                            <i style={{ width: 92 - i * 5 + "%", background: "#8e73b6" }} />
                          </div>
                          <b>{92 - i * 5}%</b>
                        </button>
                      ),
                    )}
                  </div>
                </Panel>
                <Syllabus />
                <Panel
                  title="Academic intervention signals"
                  subtitle="Turn assessment insights into student support"
                >
                  {initialAlerts
                    .filter((a) => a.module === "Academics")
                    .map((a) => (
                      <button
                        className="sp-alert-row"
                        key={a.id}
                        onClick={() => setDrawer({ title: a.title, type: "alert", id: a.id })}
                      >
                        <span className="sp-alert-main">
                          <b>{a.title}</b>
                          <small>{a.entity}</small>
                        </span>
                        <I n="arrow" />
                      </button>
                    ))}
                  <button
                    className="sp-alert-row"
                    onClick={() => open("Physics · Grade 10 syllabus", "syllabus")}
                  >
                    <span className="sp-alert-main">
                      <b>Physics syllabus coverage needs review</b>
                      <small>57% complete · target 75%</small>
                    </span>
                    <I n="arrow" />
                  </button>
                </Panel>
                <StudentTable />
              </div>
            </>
          )}
        </>
      )}
      <div className="sp-footer">
        <span>
          <I n="shield" size={13} /> Role-aware sample intelligence · {school}
        </span>
        <span>
          <i /> Preview data · Last updated just now
        </span>
      </div>
      {drawer && (
        <div className="sp-drawer-backdrop" onClick={() => setDrawer(null)}>
          <aside
            className="sp-drawer"
            role="dialog"
            aria-modal="true"
            aria-label={drawer.title}
            onClick={(e) => e.stopPropagation()}
          >
            <header>
              <span>
                <small>
                  {drawer.type === "customize" ? "PERSONAL WORKSPACE" : "SCHOOL PULSE / DETAILS"}
                </small>
                <h2>{drawer.title}</h2>
              </span>
              <button
                className="sp-icon"
                aria-label="Close detail drawer"
                onClick={() => setDrawer(null)}
              >
                <I n="close" size={21} />
              </button>
            </header>
            <div className="sp-drawer-content">
              {drawer.type === "customize" ? (
                <>
                  <p>
                    Build your executive view. Changes stay in this preview until the page is
                    reloaded.
                  </p>
                  <div className="sp-widget-library">
                    {library.map((w) => (
                      <div key={w}>
                        <span>
                          <I n={w.includes("Fees") ? "wallet" : "pulse"} />
                          {w}
                        </span>
                        <button
                          className={widgets.includes(w) ? "added" : ""}
                          onClick={() => {
                            setWidgets(
                              widgets.includes(w)
                                ? widgets.filter((a) => a !== w)
                                : [...widgets, w],
                            );
                            setEditing(true);
                          }}
                        >
                          {widgets.includes(w) ? "Remove" : "+ Add"}
                        </button>
                      </div>
                    ))}
                  </div>
                  <Button
                    onClick={() => {
                      setEditing(true);
                      onPage("Overview");
                      setDrawer(null);
                    }}
                  >
                    Arrange & resize widgets
                  </Button>
                  <Button
                    onClick={() => {
                      setWidgets(library);
                      setSizes({});
                      notify("Default widget layout restored");
                    }}
                  >
                    Reset to default
                  </Button>
                  <Button
                    primary
                    onClick={() => {
                      setSaved(widgets);
                      setEditing(false);
                      setDrawer(null);
                      notify("Personal layout saved for this preview");
                    }}
                  >
                    Save personal layout
                  </Button>
                  {role === "Leadership" && (
                    <Button
                      onClick={() => {
                        setSaved(widgets);
                        notify("Institutional default set for this preview");
                      }}
                    >
                      Set institutional default
                    </Button>
                  )}
                </>
              ) : drawer.type === "states" ? (
                <>
                  <p>
                    Prototype controls for reviewing configurable data, access, and exception
                    states. These are not production authorization controls.
                  </p>
                  <label>
                    Preview role
                    <select value={role} onChange={(e) => setRole(e.target.value)}>
                      <option>Leadership</option>
                      <option>Teacher</option>
                      <option>Finance administrator</option>
                    </select>
                  </label>
                  <label>
                    School currency
                    <select value={currency} onChange={(e) => setCurrency(e.target.value)}>
                      <option>USD</option>
                      <option>GBP</option>
                      <option>EUR</option>
                      <option>INR</option>
                    </select>
                  </label>
                  <label>
                    Grading model
                    <select value={grading} onChange={(e) => setGrading(e.target.value)}>
                      <option>Letter grades</option>
                      <option>Competency scale</option>
                    </select>
                  </label>
                  <label>
                    Data state
                    <select value={dataState} onChange={(e) => setDataState(e.target.value)}>
                      {[
                        "Live sample data",
                        "Initial school setup",
                        "No student data",
                        "No fee data",
                        "No attendance data",
                        "No exam data",
                        "Partial data",
                        "Permission restricted",
                        "Failed chart",
                        "Session unavailable",
                        "Offline",
                        "Loading",
                      ].map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                  </label>
                  <Button primary onClick={() => setDrawer(null)}>
                    Apply preview controls
                  </Button>
                </>
              ) : alert ? (
                <>
                  <div className="sp-drawer-status">
                    <span className={"sp-tag sp-" + alert.severity.toLowerCase()}>
                      {alert.severity}
                    </span>
                    <span className="sp-tag">{statuses[alert.id] || "Open"}</span>
                    <small>{alert.id}</small>
                  </div>
                  <p>{alert.description}</p>
                  <dl>
                    <dt>Trigger data</dt>
                    <dd>{alert.entity}</dd>
                    <dt>Source module</dt>
                    <dd>{alert.module}</dd>
                    <dt>Detected</dt>
                    <dd>24 February 2025 · {alert.time}</dd>
                    <dt>Recommended action</dt>
                    <dd>
                      {alert.action} and contact the responsible team. Record the outcome before
                      resolving.
                    </dd>
                  </dl>
                  <label>
                    Assignee
                    <select value={assignee} onChange={(e) => setAssignee(e.target.value)}>
                      <option>Alex Morgan</option>
                      <option>Sarah Chen</option>
                      <option>Daniel Kim</option>
                    </select>
                  </label>
                  <h3>Affected records</h3>
                  {people.slice(0, 3).map((n) => (
                    <button
                      className="sp-drawer-record"
                      key={n}
                      onClick={() => open(n, alert.module === "Finance" ? "account" : "student")}
                    >
                      {n}
                      <I n="arrow" />
                    </button>
                  ))}
                  <h3>History</h3>
                  <p className="sp-history">Alert detected by institutional rules · {alert.time}</p>
                  {(history[alert.id] || []).map((h, i) => (
                    <p className="sp-history" key={i}>
                      {h}
                    </p>
                  ))}
                  <Button icon="arrow" primary onClick={() => openModule(alert.source)}>
                    Open related module
                  </Button>
                  <Button onClick={() => resolve("Investigating")}>Mark investigating</Button>
                  <Button icon="check" onClick={() => resolve("Resolved")}>
                    Resolve alert
                  </Button>
                  <Button onClick={() => resolve("Snoozed")}>Snooze 24 hours</Button>
                  <Button
                    onClick={() => {
                      if (window.confirm("Dismiss this institutional alert?")) resolve("Dismissed");
                    }}
                  >
                    Dismiss
                  </Button>
                </>
              ) : drawer.type === "add-event" ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    setEventList([
                      ["25", "FEB", newEvent, "School event", "Tomorrow", "Main campus"],
                      ...eventList,
                    ]);
                    setDrawer(null);
                    notify("Event added to the preview calendar");
                  }}
                >
                  <label>
                    Event title
                    <input
                      required
                      value={newEvent}
                      onChange={(e) => setNewEvent(e.target.value)}
                      placeholder="e.g. School assembly"
                    />
                  </label>
                  <p>25 February 2025 · Main campus</p>
                  <button className="sp-btn sp-primary" type="submit">
                    Add event
                  </button>
                </form>
              ) : drawer.type === "event" || drawer.type === "calendar" ? (
                <>
                  {eventList
                    .filter((e) => drawer.type === "calendar" || e[2] === drawer.title)
                    .map((e) => (
                      <div className="sp-event-detail" key={e[2]}>
                        <span className="sp-tag">{e[3]}</span>
                        <h3>{e[2]}</h3>
                        <p>
                          {e[0]} {e[1]} 2025 · {e[4]}
                        </p>
                        <p>{e[5]}</p>
                        <Button onClick={() => open("Add calendar event", "add-event")}>
                          Add another event
                        </Button>
                      </div>
                    ))}
                </>
              ) : drawer.type === "activity" ? (
                <>
                  <span className="sp-tag">Operational activity</span>
                  <dl>
                    <dt>Event</dt>
                    <dd>{drawer.title}</dd>
                    <dt>Actor</dt>
                    <dd>Alex Morgan</dd>
                    <dt>Timestamp</dt>
                    <dd>24 February 2025 · 09:42</dd>
                    <dt>Reference</dt>
                    <dd>ACT-02481 · Audit reference AUD-09142</dd>
                    <dt>Before / after</dt>
                    <dd>Pending → Completed</dd>
                  </dl>
                  <Button
                    primary
                    onClick={() =>
                      openModule(
                        drawer.title.includes("payment")
                          ? "Fees Collection"
                          : drawer.title.includes("attendance")
                            ? "Attendance"
                            : "Student Directory",
                      )
                    }
                  >
                    Open destination record
                  </Button>
                </>
              ) : drawer.type === "account" && !isFinance ? (
                <div className="sp-empty">
                  <I n="shield" size={28} />
                  <h3>Financial access restricted</h3>
                  <p>This preview role cannot view student account balances.</p>
                </div>
              ) : drawer.type === "account" ? (
                <>
                  <span className="sp-tag sp-warning">Outstanding balance</span>
                  <div className="sp-account-balance">{money(1250)}</div>
                  <dl>
                    <dt>Student</dt>
                    <dd>{drawer.title.replace(" · fee account", "")}</dd>
                    <dt>Academic session</dt>
                    <dd>{session}</dd>
                    <dt>Fee type</dt>
                    <dd>Tuition · Term 2</dd>
                    <dt>Last payment</dt>
                    <dd>12 January 2025 · {money(1500)}</dd>
                    <dt>Days overdue</dt>
                    <dd>42 days</dd>
                  </dl>
                  <Button primary onClick={() => openModule("Fees Collection")}>
                    Open student fee account
                  </Button>
                </>
              ) : drawer.type === "dues" ? (
                <>
                  <p>
                    Overdue fee accounts · {cls} · {session}
                  </p>
                  {people.slice(0, 5).map((n, i) => (
                    <button
                      className="sp-drawer-record"
                      key={n}
                      onClick={() => open(n + " · fee account", "account")}
                    >
                      <span>
                        {n}
                        <small>
                          Grade {7 + i} · {32 + i * 5} days overdue
                        </small>
                      </span>
                      <b>{money(850 + i * 125)}</b>
                      <I n="arrow" />
                    </button>
                  ))}
                  <Button primary onClick={() => openModule("Fees Collection")}>
                    Open due fees workspace
                  </Button>
                </>
              ) : drawer.type === "student" ? (
                <>
                  <span className="sp-tag sp-success">Active student</span>
                  <dl>
                    <dt>Name</dt>
                    <dd>{drawer.title}</dd>
                    <dt>Enrollment</dt>
                    <dd>
                      {cls === "All classes" ? "Grade 8" : cls} · Section A · {session}
                    </dd>
                    <dt>Attendance</dt>
                    <dd>94.8% · 3 absences this month</dd>
                    <dt>Academic standing</dt>
                    <dd>86.4% · On track</dd>
                  </dl>
                  <Button
                    primary
                    onClick={() => openModule("student:" + drawer.title.split(" · ")[0])}
                  >
                    Open Student 360
                  </Button>
                  <Button onClick={() => open(drawer.title + " · fee account", "account")}>
                    View student fee account
                  </Button>
                </>
              ) : drawer.type === "admissions" ? (
                <>
                  <p>Admissions pipeline · {session}</p>
                  {["Isabella Reed", "Ethan Parker", "Mia Reynolds"].map((n, i) => (
                    <button
                      className="sp-drawer-record"
                      key={n}
                      onClick={() => open(n + " · admission enquiry", "enquiry")}
                    >
                      <span>
                        {n}
                        <small>
                          ENQ-2025-00{i + 1} · Grade {7 + i}
                        </small>
                      </span>
                      <I n="arrow" />
                    </button>
                  ))}
                  <Button primary onClick={() => openModule("Student Admission")}>
                    Open admission enquiries
                  </Button>
                </>
              ) : drawer.type === "enquiry" ? (
                <>
                  <dl>
                    <dt>Enquiry status</dt>
                    <dd>Application complete · Ready for review</dd>
                    <dt>Guardian contact</dt>
                    <dd>+1 (555) 240-1020</dd>
                    <dt>Academic session</dt>
                    <dd>{session}</dd>
                  </dl>
                  <Button primary onClick={() => openModule("Student Admission")}>
                    Continue to admission
                  </Button>
                </>
              ) : (
                <>
                  <p>
                    {drawer.title} · {cls} · {session}
                  </p>
                  <dl>
                    <dt>Selection</dt>
                    <dd>{period}</dd>
                    <dt>Institution</dt>
                    <dd>{school}</dd>
                    <dt>Records</dt>
                    <dd>
                      {drawer.type === "syllabus"
                        ? "16 of 28 topics completed"
                        : drawer.type === "attendance"
                          ? "32 students · 30 present · 2 absent"
                          : "Current institutional sample records"}
                    </dd>
                  </dl>
                  {drawer.type === "chart" && (
                    <p>View the source workspace to inspect individual records for this period.</p>
                  )}
                  <Button
                    primary
                    icon="arrow"
                    onClick={() =>
                      openModule(
                        drawer.type === "syllabus"
                          ? "Lesson Plan"
                          : drawer.type === "results"
                            ? "Examinations"
                            : drawer.type === "attendance" || drawer.title.includes("Attendance")
                              ? "Attendance"
                              : drawer.title.includes("Fees") || drawer.title.includes("Income")
                                ? "Fees Collection"
                                : "Student Directory",
                      )
                    }
                  >
                    Open{" "}
                    {drawer.type === "syllabus"
                      ? "lesson plans"
                      : drawer.type === "results"
                        ? "examination results"
                        : drawer.type === "attendance"
                          ? "attendance register"
                          : "source records"}
                  </Button>
                </>
              )}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

import { useAcademic } from "./AcademicContext";
import { useFinance } from "./FinanceContext";
import { useWorkforce } from "./WorkforceContext";
import { useExamination } from "./ExaminationContext";
import { useLearning } from "./LearningContext";
import { useOperations } from "./OperationsContext";
import { useCredentials } from "./CredentialsContext";
import { useCMS } from "./CMSContext";
import { useReports } from "./ReportsContext";
import { balanceFor } from "./financeModel";
import { balance } from "./operationsModel";
import type { ReportRow } from "./reportsModel";
export default function useReportSources(session: string) {
  const a = useAcademic(),
    f = useFinance(),
    w = useWorkforce(),
    e = useExamination(),
    l = useLearning(),
    o = useOperations(),
    c = useCredentials(),
    cms = useCMS(),
    reports = useReports();
  const result: Record<string, ReportRow[]> = {};
  const row = (id: string, label: string, patch: Partial<ReportRow> = {}): ReportRow => ({
    id,
    label,
    date: "",
    session,
    grade: "",
    section: "",
    category: "",
    status: "",
    actor: "",
    value: null,
    detail: "",
    route: "",
    ...patch,
  });
  const student = (id: string, targetSession = session) => {
    const found = c.students.find((s) => s.id === id);
    return found ? { ...found, ...found.enrollments?.[targetSession] } : undefined;
  };
  const date = (value: string) => {
    const n = Date.parse(value);
    return Number.isFinite(n) ? new Date(n).toISOString().slice(0, 10) : "";
  };
  result["Student Information"] = c.students.map((s) =>
    row(s.id, s.name, {
      date: date(s.date),
      grade: s.enrollments?.[session]?.grade || s.grade,
      section: s.enrollments?.[session]?.section || s.section,
      category: s.category || "Not supplied",
      status: s.status,
      route: "Student Directory",
      detail: s.admission || s.id,
    }),
  );
  result.Finance = [
    ...f.ledger.obligations.map((v) =>
      row(v.id, student(v.student)?.name || "Missing student reference", {
        date: v.due,
        session: v.session,
        grade: student(v.student)?.grade || "",
        section: student(v.student)?.section || "",
        category: "Fee obligation",
        status: "Recorded",
        value: v.amount - v.discount,
        detail: `${v.item}; outstanding ${f.money(balanceFor(f.ledger, v))}`,
        route: "Search Due Fees",
      }),
    ),
    ...f.ledger.payments.map((v) =>
      row(v.id, student(v.student)?.name || "Missing student reference", {
        date: v.date,
        session: v.session,
        grade: student(v.student)?.grade || "",
        section: student(v.student)?.section || "",
        category: "Fee collection",
        status: v.method,
        actor: v.actor,
        value: v.amount,
        detail: v.reference,
        route: "Search Fees Payment",
      }),
    ),
    ...f.ledger.entries.map((v) =>
      row(v.id, v.head, {
        date: v.date,
        session: v.session,
        category: v.kind,
        status: v.method,
        value: v.amount,
        detail: v.reference,
        route: v.kind === "Income" ? "Search Income" : "Search Expense",
      }),
    ),
  ];
  result.Attendance = Object.entries(a.records).map(([key, status]) => {
    const [s, d, id] = key.split("|");
    return row(key, student(id)?.name || "Missing student reference", {
      date: d,
      session: s,
      grade: student(id, s)?.grade || "",
      section: student(id, s)?.section || "",
      category: "Marked attendance",
      status,
      route: "Attendance By Date",
    });
  });
  result.Attendance.push(
    ...a.leaves.map((v) =>
      row(v.id, student(v.student)?.name || v.student, {
        date: v.from,
        session: v.session,
        category: "Student leave",
        grade: student(v.student, v.session)?.grade || "",
        section: student(v.student, v.session)?.section || "",
        status: v.status,
        route: "Approve Leave",
        detail: `${v.from} – ${v.to}`,
      }),
    ),
  );
  result.Examinations = e.scores.map((v, i) => {
    const exam = e.exams.find((q) => q.id === v.exam),
      group = e.groups.find((g) => g.id === exam?.group);
    return row(`${v.exam}|${v.student}`, student(v.student)?.name || "Missing student reference", {
      date: group?.end || "",
      session: group?.session || "",
      grade: group?.grade || "",
      section: exam?.section || "",
      category: exam?.subject || "Missing exam",
      status: v.status,
      value: v.status === "Published" ? (v.percentage ?? null) : null,
      detail: `${exam?.name || v.exam} · ${v.status === "Published" ? `snapshot ${v.grade || "Unavailable"} / scale v${v.scaleVersion || "?"}` : "Unpublished marks"} · source ${i + 1}`,
      route: "Exam Result",
    });
  });
  result["Online Examinations"] = e.attempts.map((v) =>
    row(v.id, student(v.student)?.name || "Missing student reference", {
      date: v.started,
      category: e.online.find((q) => q.id === v.online)?.name || v.online,
      status: v.status,
      value:
        v.status === "Evaluated"
          ? Object.values(v.marks).reduce((n, x) => n + Number(x || 0), 0)
          : null,
      detail: `Responses ${Object.keys(v.responses).length}; ${v.submitted ? "submitted " + v.submitted : "not submitted"}`,
      route: "Online Exam",
      grade: student(v.student)?.grade || "",
      section: student(v.student)?.section || "",
    }),
  );
  result["Lesson Plan"] = [
    ...a.topics.map((v) =>
      row(v.id, v.name, {
        session: v.session,
        grade: v.grade,
        category: "Topic",
        status: v.completed ? "Completed" : "Pending",
        date: v.due,
        detail: v.subject,
        route: "Manage Syllabus Status",
      }),
    ),
    ...a.plans.map((v) =>
      row(v.id, v.objectives, {
        session: v.session,
        grade: v.grade,
        category: "Lesson plan",
        status: v.status,
        date: v.date,
        actor: v.teacher,
        detail: v.subject,
        route: "Manage Lesson Plan",
      }),
    ),
  ];
  result["Human Resource"] = [
    ...w.staff.map((v) =>
      row(v.id, v.name, {
        category: "Staff",
        status: v.status,
        actor: v.department,
        detail: v.designation,
        route: "Staff Directory",
      }),
    ),
    ...w.leaves.map((v) =>
      row(v.id, w.staff.find((s) => s.id === v.staff)?.name || v.staff, {
        date: v.start,
        category: "Leave",
        status: v.status,
        detail: `${v.start} – ${v.end}`,
        route: "Approve Leave Request",
      }),
    ),
    ...Object.entries(w.attendance).map(([key, status]) =>
      row(key, key, { category: "Staff attendance", status, route: "Staff Attendance" }),
    ),
  ];
  if (["School Administrator", "HR Officer"].includes(reports.role))
    result["Human Resource"].push(
      ...w.batches.map((v) =>
        row(v.id, v.period, {
          category: "Payroll",
          status: "Finalized simulation",
          value: v.rows.reduce((n, r) => n + r.net, 0),
          detail: "Minor units; no payment",
          route: "Payroll",
        }),
      ),
    );
  result.Homework = l.assignments.flatMap((v) => {
    const subs = l.submissions.filter((s) => s.assignment === v.id),
      expected = v.status === "Published" ? l.recipients(v).length : 0;
    return [
      row(v.id, v.title, {
        date: v.date,
        session: v.session,
        grade: v.grade,
        section: v.section,
        category: "Assignment",
        status: v.status,
        actor: v.teacher,
        quantity: expected,
        value: subs.length,
        detail: `${v.subject} · ${expected} eligible · ${subs.length} submitted`,
        route: "Add Homework",
      }),
      ...subs.map((s) =>
        row(s.id, student(s.student)?.name || s.student, {
          date: s.submitted,
          session: v.session,
          grade: v.grade,
          section: v.section,
          category: "Submission",
          status: s.status,
          value: s.marks.trim() ? Number(s.marks) : null,
          detail: v.title,
          route: "Add Homework",
        }),
      ),
    ];
  });
  result.Library = [
    ...l.library.books.map((v) =>
      row(v.id, v.title, {
        category: "Catalog",
        status: v.status,
        value: v.copies,
        quantity:
          v.copies -
          v.unavailable -
          l.library.loans.filter((q) => q.book === v.id && !q.returned).length,
        detail: `${v.copies} physical copies; ${v.unavailable} unavailable`,
        route: "Book List",
      }),
    ),
    ...l.library.loans.map((v) =>
      row(v.id, l.library.books.find((b) => b.id === v.book)?.title || "Missing book", {
        date: v.issued,
        category: "Loan",
        status: v.returned ? "Returned" : v.due < a.day ? "Overdue" : "Issued",
        value: v.renewals,
        detail: `Member ${v.member} · due ${v.due} · returned ${v.returned || "No"}`,
        route: "Issue - Return",
      }),
    ),
  ];
  result.Inventory = [
    ...o.items.map((v) =>
      row(v.id, v.name, {
        category: "Stock snapshot",
        status: balance(o.movements, v.id) <= v.minimum ? "Low stock" : v.status,
        value: balance(o.movements, v.id),
        detail: `${v.sku} · ${o.categories.find((q) => q.id === v.category)?.name || "Missing category"} · estimated unit ${f.money(v.unitCost)}`,
        route: "Add Item",
      }),
    ),
    ...o.movements.map((v) =>
      row(v.id, o.items.find((q) => q.id === v.item)?.name || v.item, {
        date: v.date,
        category: v.kind,
        status: "Confirmed simulation",
        value: v.quantity,
        actor: v.actor,
        detail: `${v.reference} · ${o.stores.find((q) => q.id === v.store)?.name || "Missing store"} · ${v.party}`,
        route: v.kind === "Issue" ? "Issue Item" : "Add Item Stock",
      }),
    ),
  ];
  result.Transport = [
    ...o.routes.map((v) =>
      row(v.id, v.name, {
        category: "Route",
        status: v.status,
        value: v.capacity,
        detail: `${v.stops.length} stops; passenger allocation unavailable`,
        route: "Routes",
      }),
    ),
    ...o.vehicles.map((v) =>
      row(v.id, v.name, {
        category: "Vehicle",
        status: v.status,
        value: v.capacity,
        detail: v.registration,
        route: "Vehicles",
      }),
    ),
    ...o.assignments.map((v) =>
      row(v.id, v.id, {
        category: "Assignment",
        status: v.status,
        date: v.start,
        actor: v.driver,
        detail: `Route ${v.route} · vehicle ${v.vehicle} · end ${v.end || "Open"}`,
        route: "Assign Vehicle",
      }),
    ),
  ];
  result.Hostel = [];
  result.Alumni = [
    ...c.alumni.map((v) =>
      row(v.id, v.student ? student(v.student)?.name || "Missing student" : v.externalName, {
        session: v.session,
        grade: v.grade,
        section: v.section,
        category: "Alumnus",
        status: v.status,
        date: v.history[0]?.at || "",
        detail: `Graduation year ${v.year}; manually reviewed`,
        route: "Manage Alumni",
      }),
    ),
    ...c.rsvps.map((v) =>
      row(v.id, v.alumni, {
        category: "Participation",
        status: v.status,
        date: v.at,
        detail: c.events.find((q) => q.id === v.event)?.name || v.event,
        route: "Events",
      }),
    ),
  ];
  result["User Log"] = reports.activity;
  const audits: ReportRow[] = [];
  const history = (
    id: string,
    label: string,
    route: string,
    entries: (
      | string
      | { at: string; actor: string; action?: string; reason?: string; from?: string; to?: string }
    )[],
  ) =>
    entries.forEach((v, i) => {
      const str = typeof v === "string" ? v : "";
      audits.push(
        row(`${id}-audit-${i}`, label, {
          session: "All",
          date: typeof v === "string" ? str.match(/^\d{4}-\d{2}-\d{2}T[^ ]+/)?.[0] || "" : v.at,
          actor: typeof v === "string" ? "Recorded in source text" : v.actor,
          category: route,
          status: "Recorded simulation",
          detail:
            typeof v === "string"
              ? v
              : v.action || `${v.from || ""} → ${v.to || ""}: ${v.reason || ""}`,
          route,
          entity: id,
        }),
      );
    });
  c.documents.forEach((v) => history(v.id, v.number, "Student Certificate", v.history));
  c.alumni.forEach((v) => history(v.id, "Alumni update", "Manage Alumni", v.history));
  c.events.forEach((v) => history(v.id, v.name, "Events", v.history));
  cms.content.forEach((v) => history(v.id, v.title, v.kind, v.history));
  o.movements.forEach((v) => history(v.id, v.reference, "Add Item Stock", v.history));
  w.staff.forEach((v) => history(v.id, "Staff update", "Staff Directory", v.history));
  e.scores.forEach((v) =>
    history(v.exam + "|" + v.student, "Result update", "Exam Result", v.history),
  );
  a.topics.forEach((v) => history(v.id, v.name, "Manage Syllabus Status", v.history));
  result["Audit Trail Report"] = [...audits, ...reports.activity];
  const inspect = (r: ReportRow) => {
    if (r.route === "Student Directory") {
      const s = student(r.id, r.session);
      return {
        source: "Student Registry",
        record: s
          ? {
              id: s.id,
              name: s.name,
              admission: s.admission || s.id,
              grade: s.grade,
              section: s.section,
              status: s.status,
            }
          : null,
        related: e.scores
          .filter((v) => v.student === r.id)
          .map((v) => ({ exam: v.exam, status: v.status, value: v.value, grade: v.grade })),
      };
    }
    if (r.route === "Exam Result") {
      const score = e.scores.find((v) => `${v.exam}|${v.student}` === r.id);
      return {
        source: "Examinations",
        record: score,
        related: score ? e.exams.filter((v) => v.id === score.exam) : [],
      };
    }
    if (r.category === "Staff") {
      const s = w.staff.find((s) => s.id === r.id);
      return {
        source: "Staff Directory",
        record: s
          ? {
              id: s.id,
              name: s.name,
              department: s.department,
              designation: s.designation,
              status: s.status,
            }
          : null,
        related: w.leaves.filter((v) => v.staff === r.id),
      };
    }
    if (r.route === "Add Homework") {
      const assignment = l.assignments.find((v) => v.id === r.id),
        submission = l.submissions.find((v) => v.id === r.id);
      return {
        source: "Homework",
        record: assignment || submission,
        related: assignment
          ? l.submissions.filter((v) => v.assignment === assignment.id)
          : l.assignments.filter((v) => v.id === submission?.assignment),
      };
    }
    const payment = f.ledger.payments.find((p) => p.id === r.id),
      fee = f.ledger.obligations.find((p) => p.id === r.id),
      entry = f.ledger.entries.find((p) => p.id === r.id);
    if (payment)
      return {
        source: "Finance payment",
        record: payment,
        related: f.ledger.obligations
          .filter((v) => payment.allocations.some((a) => a.id === v.id))
          .map((v) => ({ reference: v.id, fee: v.item, outstanding: balanceFor(f.ledger, v) })),
      };
    if (fee)
      return {
        source: "Fee obligation",
        record: { ...fee, outstanding: balanceFor(f.ledger, fee) },
        related: f.ledger.payments.filter((p) => p.allocations.some((a) => a.id === fee.id)),
      };
    if (entry) return { source: "General finance entry", record: entry, related: [] };
    if (r.category === "Marked attendance") {
      const [session, date, id] = r.id.split("|");
      return {
        source: "Student attendance",
        record: { student: id, session, date, status: a.records[r.id] || "Unavailable" },
        related: a.leaves.filter(
          (l) => l.student === id && l.session === session && l.from <= date && l.to >= date,
        ),
      };
    }
    const item = o.items.find((i) => i.id === r.id),
      movement = o.movements.find((m) => m.id === r.id),
      itemId = item?.id || movement?.item;
    if (itemId)
      return {
        source: "Inventory ledger",
        record: item ? { ...item, currentQuantity: balance(o.movements, item.id) } : movement,
        related: o.movements.filter((m) => m.item === itemId),
      };
    const book = l.library.books.find((b) => b.id === r.id),
      loan = l.library.loans.find((b) => b.id === r.id);
    if (book || loan)
      return {
        source: "Library",
        record: book || loan,
        related: loan
          ? [
              l.library.books.find((b) => b.id === loan.book),
              l.library.members.find((m) => m.id === loan.member),
            ].filter(Boolean)
          : l.library.loans.filter((q) => q.book === book?.id),
      };
    const assignment = o.assignments.find((v) => v.id === r.id),
      vehicle = o.vehicles.find((v) => v.id === r.id),
      route = o.routes.find((v) => v.id === r.id);
    if (assignment || vehicle || route)
      return {
        source: "Transport",
        record: assignment || vehicle || route,
        related: assignment
          ? [
              o.routes.find((q) => q.id === assignment.route),
              o.vehicles.find((q) => q.id === assignment.vehicle),
            ].filter(Boolean)
          : o.assignments.filter((q) => q.vehicle === vehicle?.id || q.route === route?.id),
      };
    const alumnus = c.alumni.find((v) => v.id === r.id),
      rsvp = c.rsvps.find((v) => v.id === r.id);
    if (alumnus || rsvp)
      return {
        source: "Alumni",
        record: alumnus
          ? {
              id: alumnus.id,
              student: alumnus.student,
              year: alumnus.year,
              session: alumnus.session,
              status: alumnus.status,
            }
          : rsvp,
        related: c.rsvps.filter((q) => q.alumni === (alumnus?.id || rsvp?.alumni)),
      };
    return { source: r.route, record: r, related: [] };
  };
  return { rows: result, finance: f, operations: o, learning: l, examination: e, inspect };
}

import { useEffect, useState } from "react";
import { useAcademic } from "./AcademicContext";
import {
  academicPages,
  attendancePages,
  academicsPages,
  lessonPages,
  attendanceStatuses,
  attendanceKey,
  summarizeAttendance,
  syllabusSummary,
  timetableError,
  promotionError,
  type AttendanceStatus,
  type Slot,
  type Plan,
  type Topic,
} from "./academicModel";
import { Button, Badge, Card, Field } from "./components/OperationsUI";
import type { Student } from "./Lifecycle";
import Icon from "./components/Icon";
import "./academic.css";
const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
export default function Academic({
  page,
  session,
  students,
  setStudents,
  navigate,
  notify,
  active,
  onDirty,
  onStudent,
}: {
  page: string;
  session: string;
  students: Student[];
  setStudents: (s: Student[]) => void;
  navigate: (p: string) => void;
  notify: (s: string) => void;
  active: boolean;
  onDirty: (v: boolean) => void;
  onStudent: (s: Student) => void;
}) {
  const a = useAcademic();
  const [grade, setGrade] = useState("All classes");
  const [section, setSection] = useState("All sections");
  const [q, setQ] = useState("");
  const [teacher, setTeacher] = useState("All teachers");
  const [weekday, setWeekday] = useState("Week");
  const [drawer, setDrawer] = useState<{ type: string; title: string; id?: string } | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [pending, setPending] = useState<Record<string, AttendanceStatus>>({});
  const [dirty, setDirty] = useState(false);
  const [selection, setSelection] = useState<string[]>([]);
  const [target, setTarget] = useState("");
  const [targetSection, setTargetSection] = useState("A");
  const [targetSession, setTargetSession] = useState("2025 – 2026");
  const [confirmation, setConfirmation] = useState("");
  const [role, setRole] = useState("Academic administrator");
  const [viewState, setViewState] = useState("Ready");
  const [pageIndex, setPageIndex] = useState(1);
  const editable = role === "Academic administrator";
  const sessionStudents = students.map((s) => ({ ...s, ...s.enrollments?.[session] }));
  const roster = sessionStudents.filter(
    (s) =>
      s.status === "Active" &&
      (grade === "All classes" || s.grade === grade) &&
      (section === "All sections" || s.section === section) &&
      [s.name, s.id].some((v) => v.toLowerCase().includes(q.toLowerCase())),
  );
  const summary = summarizeAttendance(
    roster.map((s) => s.id),
    { ...a.records, ...pending },
    session,
    a.day,
  );
  const topics = a.topics.filter(
    (t) =>
      t.session === session &&
      (grade === "All classes" || t.grade === grade) &&
      [t.name, t.subject].some((v) => v.toLowerCase().includes(q.toLowerCase())),
  );
  const coverage = syllabusSummary(topics);
  const slots = a.slots.filter(
    (s) =>
      s.session === session &&
      (grade === "All classes" || s.grade === grade) &&
      (section === "All sections" || s.section === section) &&
      (teacher === "All teachers" || s.teacher === teacher) &&
      (weekday === "Week" || s.day === weekday),
  );
  const plans = a.plans.filter(
    (p) =>
      p.session === session &&
      (grade === "All classes" || p.grade === grade) &&
      (teacher === "All teachers" || p.teacher === teacher) &&
      [p.subject, p.objectives].some((v) => v.toLowerCase().includes(q.toLowerCase())),
  );
  const module = attendancePages.includes(page)
    ? attendancePages
    : academicsPages.includes(page)
      ? academicsPages
      : lessonPages;
  const prefix = module === attendancePages ? "AC" : module === academicsPages ? "AM" : "LP";
  useEffect(() => {
    setDrawer(null);
    setPending({});
    setDirty(false);
    setError("");
    setQ("");
    setPageIndex(1);
    setSelection([]);
    setViewState("Ready");
  }, [page, session]);
  useEffect(() => {
    if (!active) setDrawer(null);
    else onDirty(dirty);
  }, [active, dirty, onDirty]);
  useEffect(() => {
    const fn = (e: BeforeUnloadEvent) => {
      if (active && dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", fn);
    return () => window.removeEventListener("beforeunload", fn);
  }, [active, dirty]);
  const go = (p: string) => {
    if (dirty && !window.confirm("Discard unsaved academic changes?")) return;
    setDirty(false);
    navigate(p);
  };
  const open = (type: string, title: string, id?: string, values: Record<string, string> = {}) => {
    setForm({
      grade: grade === "All classes" ? a.classes[0] : grade,
      section: section === "All sections" ? "A" : section,
      teacher: a.teachers[0]?.name || "",
      subject: a.subjects[0],
      day: "Monday",
      start: "09:00",
      end: "09:45",
      room: "Room 101",
      date: a.day,
      capacity: "30",
      status: "Planned",
      ...values,
    });
    setError("");
    setConfirmation("");
    setDrawer({ type, title, id });
  };
  const set = (key: string, v: string) => {
    setForm((f) => ({ ...f, [key]: v }));
    setDirty(true);
  };
  const close = () => {
    if (dirty && drawer?.type !== "promotion" && !window.confirm("Discard unsaved input?")) return;
    setDrawer(null);
    setDirty(false);
    setError("");
  };
  const stats = (items: [string, string, string?][]) => (
    <div className="op-stats">
      {items.map(([title, value, dest]) => (
        <button key={title} disabled={!dest} onClick={() => dest && go(dest)}>
          <span>
            {title}
            {dest && <Icon name="arrow" size={14} />}
          </span>
          <strong>{value}</strong>
          <small>Illustrative academic records · {session}</small>
        </button>
      ))}
    </div>
  );
  const toolbar = (withTeacher = false) => (
    <div className="op-toolbar ac-toolbar">
      <label className="op-search">
        <Icon name="search" size={16} />
        <input
          aria-label="Search academic records"
          placeholder="Search names, subjects or topics..."
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPageIndex(1);
          }}
        />
      </label>
      <select
        aria-label="Academic class"
        value={grade}
        onChange={(e) => {
          if (dirty && !window.confirm("Discard unsaved marks?")) return;
          setPending({});
          setDirty(false);
          setGrade(e.target.value);
          setSelection([]);
          setPageIndex(1);
        }}
      >
        <option>All classes</option>
        {a.classes.map((c) => (
          <option key={c}>{c}</option>
        ))}
      </select>
      <select
        aria-label="Academic section"
        value={section}
        onChange={(e) => {
          if (dirty && !window.confirm("Discard unsaved marks?")) return;
          setPending({});
          setDirty(false);
          setSection(e.target.value);
          setPageIndex(1);
        }}
      >
        <option>All sections</option>
        {a.sections.map((s) => (
          <option key={s}>{s}</option>
        ))}
      </select>
      {withTeacher && (
        <select aria-label="Teacher" value={teacher} onChange={(e) => setTeacher(e.target.value)}>
          <option>All teachers</option>
          {a.teachers.map((t) => (
            <option key={t.id}>{t.name}</option>
          ))}
        </select>
      )}
      {(q ||
        grade !== "All classes" ||
        section !== "All sections" ||
        teacher !== "All teachers") && (
        <Button
          onClick={() => {
            if (dirty && !window.confirm("Discard unsaved marks?")) return;
            setPending({});
            setDirty(false);
            setQ("");
            setGrade("All classes");
            setSection("All sections");
            setTeacher("All teachers");
            setPageIndex(1);
          }}
        >
          Reset
        </Button>
      )}
    </div>
  );
  const table = (headers: React.ReactNode[], records: React.ReactNode[]) => (
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
          <tbody>
            {records.slice(
              (Math.min(pageIndex, Math.max(1, Math.ceil(records.length / 25))) - 1) * 25,
              Math.min(pageIndex, Math.max(1, Math.ceil(records.length / 25))) * 25,
            )}
          </tbody>
        </table>
        {!records.length && (
          <div className="op-empty">
            <Icon name="book" size={26} />
            <h3>No matching records</h3>
            <p>Choose another class, date or session, or create the relevant academic record.</p>
            <Button
              onClick={() => {
                setQ("");
                setGrade("All classes");
                setSection("All sections");
              }}
            >
              Clear filters
            </Button>
          </div>
        )}
      </div>
      <div className="op-pagination">
        <span>{records.length} records · 25 per page</span>
        <div>
          <Button disabled={pageIndex <= 1} onClick={() => setPageIndex(pageIndex - 1)}>
            Previous
          </Button>
          <span>{Math.min(pageIndex, Math.max(1, Math.ceil(records.length / 25)))}</span>
          <Button
            disabled={pageIndex * 25 >= records.length}
            onClick={() => setPageIndex(pageIndex + 1)}
          >
            Next
          </Button>
        </div>
      </div>
    </>
  );
  const configLists: Record<string, string[]> = {
    Class: a.classes,
    Sections: a.sections,
    Subjects: a.subjects,
    "Subject Group": a.groups,
    Lesson: a.lessons,
  };
  const save = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!editable) return;
    if (drawer?.type === "slot") {
      const s: Slot = {
        id: drawer.id || "TT-" + Date.now(),
        session,
        day: form.day,
        start: form.start,
        end: form.end,
        grade: form.grade,
        section: form.section,
        teacher: form.teacher,
        subject: form.subject,
        room: form.room,
      };
      const err = timetableError(a.slots, s);
      if (err) {
        setError(err);
        return;
      }
      a.setSlots(
        a.slots.some((x) => x.id === s.id)
          ? a.slots.map((x) => (x.id === s.id ? s : x))
          : [...a.slots, s],
      );
    } else if (drawer?.type === "plan") {
      const topic = a.topics.find((t) => t.id === form.topic && t.session === session);
      if (!topic || topic.grade !== form.grade || topic.subject !== form.subject) {
        setError("Choose a topic matching the selected session, class and subject.");
        return;
      }
      const p: Plan = {
        id: drawer.id || "LP-" + Date.now(),
        session,
        teacher: form.teacher,
        grade: form.grade,
        subject: form.subject,
        topic: form.topic,
        date: form.date,
        objectives: form.objectives,
        resources: form.resources || "",
        status: form.status,
      };
      if (!p.teacher || !p.objectives?.trim()) {
        setError("Teacher and lesson objectives are required.");
        return;
      }
      a.setPlans(
        a.plans.some((x) => x.id === p.id)
          ? a.plans.map((x) => (x.id === p.id ? p : x))
          : [...a.plans, p],
      );
    } else if (drawer?.type === "topic") {
      const t: Topic = {
        id: drawer.id || "TOP-" + Date.now(),
        name: form.name.trim(),
        session,
        grade: form.grade,
        subject: form.subject,
        completed: false,
        due: form.date,
        history: [],
      };
      if (
        a.topics.some(
          (x) =>
            x.id !== t.id &&
            x.name.toLowerCase() === t.name.toLowerCase() &&
            x.grade === t.grade &&
            x.session === session,
        )
      ) {
        setError("This topic already exists for this class and session.");
        return;
      }
      a.setTopics(
        a.topics.some((x) => x.id === t.id)
          ? a.topics.map((x) =>
              x.id === t.id ? { ...t, completed: x.completed, history: x.history } : x,
            )
          : [...a.topics, t],
      );
    } else if (drawer?.type === "config") {
      const name = form.name?.trim();
      if (!name) {
        setError("A name is required.");
        return;
      }
      const list = configLists[page] || [];
      if (list.some((x) => x.toLowerCase() === name.toLowerCase() && x !== drawer.id)) {
        setError("A record with that name already exists.");
        return;
      }
      const values = drawer.id ? list.map((x) => (x === drawer.id ? name : x)) : [...list, name];
      if (page === "Class") {
        if (!Number.isInteger(Number(form.capacity)) || Number(form.capacity) < 1) {
          setError("Enter a positive whole-number capacity.");
          return;
        }
        if (drawer.id && drawer.id !== name && students.some((s) => s.grade === drawer.id)) {
          setError(
            "This class has enrolled students. Renaming requires a migration policy; change is blocked in preview.",
          );
          return;
        }
        a.setClasses(values);
        a.setCapacities({ ...a.capacities, [name]: Number(form.capacity) });
      }
      if (page === "Sections") {
        if (
          drawer.id &&
          drawer.id !== name &&
          (students.some((s) => s.section === drawer.id) ||
            a.slots.some((s) => s.section === drawer.id))
        ) {
          setError("Section is in use. Historical dependency changes need a product policy.");
          return;
        }
        a.setSections(values);
      }
      if (page === "Subjects") {
        if (
          drawer.id &&
          drawer.id !== name &&
          (a.topics.some((t) => t.subject === drawer.id) ||
            a.slots.some((s) => s.subject === drawer.id))
        ) {
          setError(
            "This subject is referenced by academic records. Renaming is blocked in preview.",
          );
          return;
        }
        a.setSubjects(values);
      }
      if (page === "Subject Group") {
        a.setGroups(values);
        a.setGroupSubjects({
          ...a.groupSubjects,
          [name]:
            form.members !== undefined
              ? form.members.split("|").filter(Boolean)
              : a.groupSubjects[drawer.id || ""] || [],
        });
      }
      if (page === "Lesson") a.setLessons(values);
    } else if (drawer?.type === "teacher") {
      const key = [session, form.grade, form.section].join("|");
      if (!form.teacher || !form.grade || !form.section) {
        setError("Choose a class, section and teacher.");
        return;
      }
      const existing = Object.entries(a.classTeachers).find(
        ([k, v]) => k !== key && k.startsWith(session + "|") && v === form.teacher,
      );
      if (existing) {
        setError(
          "This teacher already leads another class in this session. Review the illustrative one-class-per-teacher policy.",
        );
        return;
      }
      a.setClassTeachers({ ...a.classTeachers, [key]: form.teacher });
    }
    setDirty(false);
    setDrawer(null);
    notify("Academic record saved in preview only");
  };
  const promotionRows = sessionStudents
    .filter((s) => selection.includes(s.id))
    .map((s) => ({ s, error: promotionError(s, target, targetSection, targetSession, session) }));
  const eligible = promotionRows.filter((r) => !r.error);
  return (
    <div className="op ac" hidden={!active}>
      <div className="op-heading">
        <div>
          <div className="op-eyebrow">
            OPERATIONS <span>/</span> ACADEMIC OPERATIONS{" "}
            <em>
              {prefix}-{String(module.indexOf(page) + 1).padStart(2, "0")}
            </em>
          </div>
          <h1>
            {page === "Attendance"
              ? "Attendance overview"
              : page === "Academics"
                ? "Academic overview"
                : page === "Lesson Plan"
                  ? "Lesson plan overview"
                  : page}
          </h1>
          <p>Structure, teaching and the school day. One connected academic workspace.</p>
        </div>
        <div className="op-heading-actions">
          <Button icon="download" onClick={() => window.print()}>
            Print preview
          </Button>
          <Button icon="settings" onClick={() => open("settings", "Academic preview controls")}>
            Preview controls
          </Button>
        </div>
      </div>
      <div className="op-context">
        <select aria-label="Academic workspace" value={page} onChange={(e) => go(e.target.value)}>
          {[attendancePages, academicsPages, lessonPages].map((group, i) => (
            <optgroup key={i} label={["Attendance", "Academics", "Lesson Plan"][i]}>
              {group.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </optgroup>
          ))}
        </select>
        <span>{session}</span>
        <span>
          <i />
          Illustrative Data
        </span>
        <span>Provided teacher names · simulated academic records</span>
      </div>
      <div className="fn-tabs">
        {module.map((p) => (
          <button key={p} onClick={() => go(p)} className={p === page ? "active" : ""}>
            {p === module[0] ? "Overview" : p}
          </button>
        ))}
      </div>
      {!editable && (
        <div className="op-notice">
          <Icon name="shield" />
          Read-only preview role. No production authorization service is connected.
        </div>
      )}
      {dirty && (
        <div className="op-notice amber">
          <Icon name="clock" size={16} />
          Unsaved changes · navigating away will require confirmation.
        </div>
      )}
      {viewState !== "Ready" ? (
        <Card title={viewState} sub="Academic exception-state preview">
          <div className="op-empty">
            {viewState === "Loading" ? (
              <>
                <div className="op-skeleton" />
                <div className="op-skeleton" />
              </>
            ) : (
              <>
                <Icon name={viewState === "Restricted" ? "shield" : "book"} size={28} />
                <h3>
                  {viewState === "Error"
                    ? "Academic data could not be loaded"
                    : viewState === "Restricted"
                      ? "Access restricted"
                      : "No academic data in this selection"}
                </h3>
                <p>
                  Existing prototype records are preserved. No fabricated zero trends are shown.
                </p>
                <Button onClick={() => setViewState("Ready")}>Return to sample records</Button>
              </>
            )}
          </div>
        </Card>
      ) : page === "Attendance" || page === "Academics" || page === "Lesson Plan" ? (
        <>
          {stats(
            page === "Attendance"
              ? [
                  [
                    "Attendance today",
                    a.summary(session).rate === null
                      ? "—"
                      : a.summary(session).rate!.toFixed(1) + "%",
                    "Student Attendance",
                  ],
                  ["Present", String(a.summary(session).Present), "Student Attendance"],
                  ["Absent", String(a.summary(session).Absent), "Attendance By Date"],
                  [
                    "Leave awaiting review",
                    String(
                      a.leaves.filter((l) => l.session === session && l.status === "Pending")
                        .length,
                    ),
                    "Approve Leave",
                  ],
                ]
              : page === "Academics"
                ? [
                    [
                      "Active classes",
                      String(a.classes.filter((c) => !a.inactive.includes(c)).length),
                      "Class",
                    ],
                    [
                      "Scheduled periods",
                      String(a.slots.filter((s) => s.session === session).length),
                      "Class Timetable",
                    ],
                    ["Configured subjects", String(a.subjects.length), "Subjects"],
                    [
                      "Class teachers assigned",
                      String(
                        Object.keys(a.classTeachers).filter((k) => k.startsWith(session + "|"))
                          .length,
                      ),
                      "Assign Class Teacher",
                    ],
                  ]
                : [
                    ["Lesson plans", String(plans.length), "Manage Lesson Plan"],
                    [
                      "Delivered",
                      String(plans.filter((p) => p.status === "Delivered").length),
                      "Manage Lesson Plan",
                    ],
                    [
                      "Syllabus complete",
                      coverage.percent === null ? "—" : coverage.percent + "%",
                      "Manage Syllabus Status",
                    ],
                    [
                      "Topics needing review",
                      String(topics.filter((t) => !t.completed && t.due < a.day).length),
                      "Manage Syllabus Status",
                    ],
                  ],
          )}
          <div className="ac-overview">
            <Card
              title="The academic day"
              sub={a.day + " · illustrative school day"}
              action={<Button onClick={() => go("Class Timetable")}>Open timetable</Button>}
            >
              {a.slots
                .filter((s) => s.session === session && s.day === "Monday")
                .map((s) => (
                  <button className="op-list-row" key={s.id} onClick={() => go("Class Timetable")}>
                    <span className="ac-time">
                      {s.start}
                      <small>{s.end}</small>
                    </span>
                    <span>
                      <b>
                        {s.subject} · {s.grade} {s.section}
                      </b>
                      <small>
                        {s.teacher} · {s.room}
                      </small>
                    </span>
                    <Icon name="arrow" size={15} />
                  </button>
                ))}
            </Card>
            <Card
              title="Syllabus coverage"
              sub="Completion derived from topic records, not lesson-plan delivery"
              action={<Button onClick={() => go("Manage Syllabus Status")}>Review coverage</Button>}
            >
              {a.subjects.map((s) => {
                const list = topics.filter((t) => t.subject === s),
                  v = syllabusSummary(list);
                return (
                  <button
                    className="ac-coverage-row"
                    key={s}
                    onClick={() => {
                      go("Manage Syllabus Status");
                      setTimeout(() => setQ(s), 0);
                    }}
                  >
                    <span>
                      <b>{s}</b>
                      <small>
                        {v.complete} of {v.total} topics
                      </small>
                    </span>
                    <strong>{v.percent === null ? "—" : v.percent + "%"}</strong>
                    <div>
                      <i style={{ width: (v.percent || 0) + "%" }} />
                    </div>
                  </button>
                );
              })}
            </Card>
            <Card
              title="Academic workspaces"
              sub="All original modules and submenus remain individually accessible"
            >
              <div className="op-shortcut-grid">
                {[
                  ["Student Attendance", "check"],
                  ["Approve Leave", "calendar"],
                  ["Class Timetable", "grid"],
                  ["Manage Lesson Plan", "book"],
                  ["Assign Class Teacher", "users"],
                  ["Promote Students", "arrow"],
                ].map(([p, i]) => (
                  <button key={p} onClick={() => go(p)}>
                    <Icon name={i} />
                    <b>{p}</b>
                    <small>Open operational workspace</small>
                  </button>
                ))}
              </div>
            </Card>
            <Card title="Decision queue" sub="Illustrative exceptions requiring review">
              {a.leaves
                .filter((l) => l.session === session && l.status === "Pending")
                .map((l) => (
                  <button className="op-list-row" key={l.id} onClick={() => go("Approve Leave")}>
                    <span>
                      <b>Student leave pending</b>
                      <small>
                        {students.find((s) => s.id === l.student)?.name} · {l.from}
                      </small>
                    </span>
                    <Badge>Pending</Badge>
                  </button>
                ))}
              <button className="op-list-row" onClick={() => go("Promote Students")}>
                <span>
                  <b>Review promotion eligibility</b>
                  <small>Class assignment and inactive-record exceptions</small>
                </span>
                <Icon name="arrow" size={15} />
              </button>
            </Card>
          </div>
        </>
      ) : page === "Student Attendance" || page === "Attendance By Date" ? (
        <>
          {stats([
            ["Present", String(summary.Present)],
            ["Absent", String(summary.Absent)],
            ["Late / excused", `${summary.Late} / ${summary.Excused}`],
            ["Unmarked", String(summary.Unmarked)],
          ])}
          <Card
            title={
              page === "Student Attendance"
                ? "Daily attendance register"
                : "Attendance history by date"
            }
            sub="Rate = (Present + Late) ÷ active expected students. Excused remains in the denominator."
            action={
              <div className="ac-date">
                <label>
                  Illustrative school date
                  <input
                    type="date"
                    value={a.day}
                    onChange={(e) => {
                      if (dirty && !window.confirm("Discard unsaved attendance?")) return;
                      setPending({});
                      setDirty(false);
                      a.setDay(e.target.value);
                    }}
                  />
                </label>
              </div>
            }
          >
            {toolbar()}
            <div className="op-selection">
              <span>{roster.length} active students expected</span>
              {page === "Student Attendance" && (
                <>
                  <Button
                    disabled={!editable || !roster.length}
                    onClick={() => {
                      setPending(
                        Object.fromEntries(
                          roster.map((s) => [attendanceKey(session, a.day, s.id), "Present"]),
                        ),
                      );
                      setDirty(true);
                    }}
                  >
                    Mark all present
                  </Button>
                  <Button
                    primary
                    disabled={!editable || !roster.length || !a.day}
                    onClick={() => {
                      if (summary.Unmarked) {
                        setError("Mark every student in the selected roster before saving.");
                        return;
                      }
                      a.setRecords({ ...a.records, ...pending });
                      setPending({});
                      setDirty(false);
                      setError("");
                      notify("Attendance saved in preview · School Pulse updated");
                    }}
                  >
                    Save attendance
                  </Button>
                </>
              )}
            </div>
            {error && (
              <div className="op-form-error" role="alert">
                {error}
              </div>
            )}
            {table(
              [
                "Student",
                "Student ID",
                "Class / section",
                ...(page === "Student Attendance"
                  ? ["Attendance status"]
                  : ["Recorded status", "Action"]),
              ],
              roster.map((s) => (
                <tr key={s.id}>
                  <td>
                    <button className="op-person" onClick={() => onStudent(s)}>
                      <span className="op-avatar">
                        {s.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </span>
                      {s.name}
                    </button>
                  </td>
                  <td>{s.id}</td>
                  <td>
                    {s.grade} · {s.section}
                  </td>
                  <td>
                    {page === "Student Attendance" ? (
                      <div className="ac-attendance-options">
                        {attendanceStatuses.map((status) => (
                          <button
                            key={status}
                            disabled={!editable}
                            className={
                              (pending[attendanceKey(session, a.day, s.id)] ||
                                a.records[attendanceKey(session, a.day, s.id)]) === status
                                ? "selected " + status.toLowerCase()
                                : ""
                            }
                            onClick={() => {
                              setPending({
                                ...pending,
                                [attendanceKey(session, a.day, s.id)]: status,
                              });
                              setDirty(true);
                            }}
                          >
                            {status}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <Badge>{a.records[attendanceKey(session, a.day, s.id)] || "Unmarked"}</Badge>
                    )}
                  </td>
                  {page === "Attendance By Date" && (
                    <td>
                      <Button onClick={() => go("Student Attendance")}>Open register</Button>
                    </td>
                  )}
                </tr>
              )),
            )}
          </Card>
        </>
      ) : page === "Approve Leave" ? (
        <Card
          title="Student leave applications"
          sub="Approval does not silently change attendance. Mark excused attendance explicitly."
        >
          {toolbar()}
          {table(
            ["Reference", "Student", "Dates", "Reason", "Status", ""],
            a.leaves
              .filter(
                (l) =>
                  l.session === session &&
                  students
                    .find((s) => s.id === l.student)
                    ?.name.toLowerCase()
                    .includes(q.toLowerCase()),
              )
              .map((l) => (
                <tr key={l.id}>
                  <td>{l.id}</td>
                  <td>{students.find((s) => s.id === l.student)?.name}</td>
                  <td>
                    {l.from} → {l.to}
                  </td>
                  <td>{l.reason}</td>
                  <td>
                    <Badge>{l.status}</Badge>
                  </td>
                  <td>
                    <Button
                      onClick={() =>
                        open("leave", "Review leave application", l.id, { reason: "" })
                      }
                    >
                      Review
                    </Button>
                  </td>
                </tr>
              )),
          )}
        </Card>
      ) : page === "Class Timetable" || page === "Teachers Timetable" ? (
        <Card
          title={page}
          sub="Weekly periods · teacher, room and class conflicts checked before saving"
          action={
            <Button
              primary
              disabled={!editable}
              icon="plus"
              onClick={() => open("slot", "New timetable period")}
            >
              Add period
            </Button>
          }
        >
          {toolbar(true)}
          <div className="ac-week-controls">
            {["Week", ...days].map((d) => (
              <button
                className={weekday === d ? "active" : ""}
                key={d}
                onClick={() => setWeekday(d)}
              >
                {d}
              </button>
            ))}
          </div>
          <div className="ac-timetable">
            {(weekday === "Week" ? days : [weekday]).map((d) => (
              <section key={d}>
                <h3>{d}</h3>
                {slots
                  .filter((s) => s.day === d)
                  .sort((x, y) => x.start.localeCompare(y.start))
                  .map((s) => (
                    <button
                      className="ac-period"
                      key={s.id}
                      onClick={() => open("slot", "Timetable period", s.id, { ...s })}
                    >
                      <span>
                        {s.start}–{s.end}
                      </span>
                      <strong>{s.subject}</strong>
                      <small>
                        {s.grade} · {s.section} · {s.room}
                      </small>
                      <small>{s.teacher}</small>
                    </button>
                  ))}
                {!slots.some((s) => s.day === d) && <p>No periods scheduled</p>}
              </section>
            ))}
          </div>
        </Card>
      ) : page === "Assign Class Teacher" ? (
        <Card
          title="Class teacher assignments"
          sub="Illustrative policy: one lead class per teacher per session"
          action={
            <Button
              primary
              disabled={!editable}
              onClick={() => open("teacher", "Assign class teacher")}
            >
              Assign teacher
            </Button>
          }
        >
          {toolbar()}
          {table(
            ["Class", "Section", "Assigned teacher", "Students", ""],
            a.classes
              .filter((c) => grade === "All classes" || c === grade)
              .flatMap((c) =>
                a.sections
                  .filter((s) => section === "All sections" || s === section)
                  .map((s) => (
                    <tr key={c + s}>
                      <td>{c}</td>
                      <td>{s}</td>
                      <td>{a.classTeachers[[session, c, s].join("|")] || "Unassigned"}</td>
                      <td>{roster.filter((r) => r.grade === c && r.section === s).length}</td>
                      <td>
                        <Button
                          disabled={!editable}
                          onClick={() =>
                            open("teacher", "Assign class teacher", undefined, {
                              grade: c,
                              section: s,
                              teacher:
                                a.classTeachers[[session, c, s].join("|")] ||
                                a.teachers[0]?.name ||
                                "",
                            })
                          }
                        >
                          Assign / change
                        </Button>
                      </td>
                    </tr>
                  )),
              ),
          )}
        </Card>
      ) : page === "Promote Students" ? (
        <Card
          title="Student promotion preview"
          sub="Eligibility is illustrative: active, assigned students only. Grades, balances and approvals require product rules."
        >
          {toolbar()}
          <div className="op-form-grid ac-form-pad">
            <Field
              label="Destination session"
              value={targetSession}
              options={[session, "2025 – 2026", "2026 – 2027"].filter(
                (v, i, l) => l.indexOf(v) === i,
              )}
              onChange={setTargetSession}
            />
            <Field
              label="Destination class"
              value={target}
              options={a.classes}
              onChange={setTarget}
            />
            <Field
              label="Destination section"
              value={targetSection}
              options={a.sections}
              onChange={setTargetSection}
            />
          </div>
          <div className="op-selection">
            <b>{selection.length} selected</b>
            <Button onClick={() => setSelection(roster.map((s) => s.id))}>Select filtered</Button>
            <Button onClick={() => setSelection([])}>Clear</Button>
            <Button
              primary
              disabled={!editable || !selection.length}
              onClick={() => open("promotion", "Review promotion")}
            >
              Preview promotion
            </Button>
          </div>
          {table(
            ["", "Student", "Current class", "Destination", "Eligibility"],
            sessionStudents
              .filter(
                (s) =>
                  (grade === "All classes" || s.grade === grade) &&
                  s.name.toLowerCase().includes(q.toLowerCase()),
              )
              .map((s) => (
                <tr key={s.id}>
                  <td>
                    <input
                      aria-label={"Select " + s.name}
                      type="checkbox"
                      checked={selection.includes(s.id)}
                      onChange={() =>
                        setSelection(
                          selection.includes(s.id)
                            ? selection.filter((id) => id !== s.id)
                            : [...selection, s.id],
                        )
                      }
                    />
                  </td>
                  <td>{s.name}</td>
                  <td>
                    {s.grade || "Unassigned"} · {s.section}
                  </td>
                  <td>{target || "Choose destination"}</td>
                  <td>
                    <Badge>
                      {promotionError(s, target, targetSection, targetSession, session) ||
                        "Eligible (preview)"}
                    </Badge>
                  </td>
                </tr>
              )),
          )}
        </Card>
      ) : page === "Manage Lesson Plan" ? (
        <Card
          title="Lesson delivery plans"
          sub="Teacher → class → subject → defined topic"
          action={
            <Button primary disabled={!editable} onClick={() => open("plan", "Create lesson plan")}>
              New lesson plan
            </Button>
          }
        >
          {toolbar(true)}
          {table(
            ["Date", "Teacher", "Class", "Subject", "Topic", "Status", ""],
            plans.map((p) => (
              <tr key={p.id}>
                <td>{p.date}</td>
                <td>{p.teacher}</td>
                <td>{p.grade}</td>
                <td>{p.subject}</td>
                <td>{a.topics.find((t) => t.id === p.topic)?.name || "Topic unavailable"}</td>
                <td>
                  <Badge>{p.status}</Badge>
                </td>
                <td>
                  <Button onClick={() => open("plan", "Lesson plan details", p.id, { ...p })}>
                    Review / edit
                  </Button>
                </td>
              </tr>
            )),
          )}
        </Card>
      ) : page === "Manage Syllabus Status" || page === "Topic" ? (
        <>
          <div className="op-notice">
            <Icon name="book" />
            <span>
              Completion is an explicit teacher-entered topic flag. Delivered plans do not
              automatically mark topics complete. {coverage.complete} of {coverage.total} topics
              complete.
            </span>
          </div>
          <Card
            title={page === "Topic" ? "Topic register" : "Syllabus status"}
            sub="Progress derives from completed topics in the selected class and session"
            action={
              page === "Topic" ? (
                <Button primary disabled={!editable} onClick={() => open("topic", "Create topic")}>
                  Add topic
                </Button>
              ) : (
                <Badge>
                  {coverage.percent === null ? "No topics" : coverage.percent + "% complete"}
                </Badge>
              )
            }
          >
            {toolbar()}
            {table(
              ["Topic", "Subject", "Class", "Due date", "Completion", "History", ""],
              topics.map((t) => (
                <tr key={t.id}>
                  <td>{t.name}</td>
                  <td>{t.subject}</td>
                  <td>{t.grade}</td>
                  <td>{t.due}</td>
                  <td>
                    <label className="ac-completion">
                      <input
                        aria-label={"Complete " + t.name}
                        disabled={!editable}
                        type="checkbox"
                        checked={t.completed}
                        onChange={(e) => {
                          a.setTopics(
                            a.topics.map((topic) =>
                              topic.id === t.id
                                ? {
                                    ...topic,
                                    completed: e.target.checked,
                                    history: [
                                      ...topic.history,
                                      `${e.target.checked ? "Completed" : "Reopened"} · sample academic administrator · ${a.day}`,
                                    ],
                                  }
                                : topic,
                            ),
                          );
                          notify("Topic completion updated · School Pulse refreshed");
                        }}
                      />
                      {t.completed ? "Complete" : t.due < a.day ? "Delayed" : "Planned"}
                    </label>
                  </td>
                  <td>
                    <Button onClick={() => open("history", "Topic history", t.id)}>
                      View history
                    </Button>
                  </td>
                  <td>
                    <Button
                      onClick={() =>
                        open("topic", "Edit topic", t.id, {
                          name: t.name,
                          grade: t.grade,
                          subject: t.subject,
                          date: t.due,
                        })
                      }
                    >
                      Edit
                    </Button>
                  </td>
                </tr>
              )),
            )}
          </Card>
        </>
      ) : (
        <Card
          title={page}
          sub={
            page === "Subject Group"
              ? "Subject groups organize selected subjects; no grading policy is implied."
              : "School-configurable structures · changes do not silently rewrite historical records"
          }
          action={
            <Button
              primary
              disabled={!editable}
              onClick={() => open("config", "Add " + page.toLowerCase())}
            >
              Add new
            </Button>
          }
        >
          {table(
            [
              "Name",
              ...(page === "Class"
                ? ["Capacity", "Enrolled"]
                : page === "Subject Group"
                  ? ["Subjects"]
                  : []),
              "Status",
              "",
            ],
            (configLists[page] || [])
              .filter((n) => n.toLowerCase().includes(q.toLowerCase()))
              .map((name) => (
                <tr key={name}>
                  <td>
                    <b>{name}</b>
                  </td>
                  {page === "Class" && (
                    <>
                      <td>{a.capacities[name] || "Not set"}</td>
                      <td>
                        {
                          sessionStudents.filter((s) => s.grade === name && s.status === "Active")
                            .length
                        }
                      </td>
                    </>
                  )}
                  {page === "Subject Group" && (
                    <td>{a.groupSubjects[name]?.join(", ") || "No subjects assigned"}</td>
                  )}
                  <td>
                    <Badge>{a.inactive.includes(name) ? "Inactive" : "Active"}</Badge>
                  </td>
                  <td>
                    <div className="op-inline">
                      <Button
                        disabled={!editable}
                        onClick={() =>
                          open("config", "Edit " + page.toLowerCase(), name, {
                            name,
                            capacity: String(a.capacities[name] || 30),
                          })
                        }
                      >
                        Edit
                      </Button>
                      <Button
                        disabled={!editable}
                        onClick={() => {
                          if (
                            !window.confirm(
                              "Change availability for new assignments? Historical records are retained.",
                            )
                          )
                            return;
                          a.setInactive(
                            a.inactive.includes(name)
                              ? a.inactive.filter((n) => n !== name)
                              : [...a.inactive, name],
                          );
                          notify("Availability changed in preview");
                        }}
                      >
                        {a.inactive.includes(name) ? "Activate" : "Deactivate"}
                      </Button>
                    </div>
                  </td>
                </tr>
              )),
          )}
        </Card>
      )}
      <div className="op-footnote">
        <span>
          <Icon name="shield" size={13} />
          Preview records reset on reload · no backend or real authorization
        </span>
        <span>Imported teacher names · illustrative academic activity</span>
      </div>
      {drawer && (
        <div className="op-overlay" onClick={close}>
          <aside
            className="op-drawer"
            role="dialog"
            aria-modal="true"
            aria-label={drawer.title}
            onClick={(e) => e.stopPropagation()}
          >
            <header>
              <div>
                <small>ACADEMIC OPERATIONS / PREVIEW</small>
                <h2>{drawer.title}</h2>
              </div>
              <button aria-label="Close academic drawer" onClick={close}>
                <Icon name="close" size={21} />
              </button>
            </header>
            <div className="op-drawer-body">
              {drawer.type === "settings" ? (
                <>
                  <Field
                    label="Preview role"
                    value={role}
                    options={["Academic administrator", "Read-only staff"]}
                    onChange={setRole}
                  />
                  <Field
                    label="Exception state"
                    value={viewState}
                    options={["Ready", "Loading", "Empty", "Error", "Restricted"]}
                    onChange={setViewState}
                  />
                  <div className="op-notice">
                    Saved means in-memory preview state only. Attendance and topic records feed
                    School Pulse immediately.
                  </div>
                  <h3>Product decisions still open</h3>
                  <ul className="op-assumptions">
                    {[
                      "Authoritative academic records, school isolation and server authorization",
                      "Attendance rules, late/excused denominator and session date boundaries",
                      "Teacher/class/room conflict rules and overlap exceptions",
                      "Promotion assessment, fee and administrative eligibility",
                      "Immutable audit records and recovery policies",
                      "Hostel report preserved; operational Hostel scope is undefined",
                    ].map((t) => (
                      <li key={t}>{t}</li>
                    ))}
                  </ul>
                </>
              ) : drawer.type === "leave" ? (
                (() => {
                  const l = a.leaves.find((l) => l.id === drawer.id);
                  if (!l) return null;
                  return (
                    <>
                      <Badge>{l.status}</Badge>
                      <dl className="op-dl">
                        <div>
                          <dt>Student</dt>
                          <dd>{students.find((s) => s.id === l.student)?.name}</dd>
                        </div>
                        <div>
                          <dt>Dates</dt>
                          <dd>
                            {l.from} → {l.to}
                          </dd>
                        </div>
                        <div>
                          <dt>Reason</dt>
                          <dd>{l.reason}</dd>
                        </div>
                        <div>
                          <dt>Supporting document</dt>
                          <dd>Not supplied · no storage connected</dd>
                        </div>
                      </dl>
                      <Field
                        label="Decision reason"
                        required
                        value={form.reason || ""}
                        type="textarea"
                        onChange={(v) => set("reason", v)}
                      />
                      <div className="op-drawer-actions">
                        {["Approved", "Rejected"].map((status) => (
                          <Button
                            key={status}
                            primary={status === "Approved"}
                            disabled={!editable || !form.reason?.trim() || l.status !== "Pending"}
                            onClick={() => {
                              a.setLeaves(
                                a.leaves.map((item) =>
                                  item.id === l.id
                                    ? {
                                        ...item,
                                        status,
                                        history: [
                                          ...item.history,
                                          `${status} · ${form.reason} · sample administrator · ${a.day}`,
                                        ],
                                      }
                                    : item,
                                ),
                              );
                              setDirty(false);
                              notify("Leave decision recorded in preview");
                            }}
                          >
                            {status === "Approved" ? "Approve" : "Reject"}
                          </Button>
                        ))}
                      </div>
                      <h3>Decision history</h3>
                      <div className="op-timeline">
                        {l.history.map((h, i) => (
                          <div key={i}>
                            <i />
                            <p>{h}</p>
                          </div>
                        ))}
                      </div>
                    </>
                  );
                })()
              ) : drawer.type === "history" ? (
                <div className="op-timeline">
                  {(a.topics.find((t) => t.id === drawer.id)?.history.length
                    ? a.topics.find((t) => t.id === drawer.id)!.history
                    : ["No completion changes recorded yet."]
                  ).map((h, i) => (
                    <div key={i}>
                      <i />
                      <p>{h}</p>
                    </div>
                  ))}
                </div>
              ) : drawer.type === "promotion" ? (
                <>
                  <div className="op-notice">
                    <Icon name="shield" />
                    <span>
                      Simulation only. Adds a destination-session enrollment and keeps the
                      source-session class in enrollment history. No fees or examination rules are
                      evaluated.
                    </span>
                  </div>
                  <p className="op-description">
                    {eligible.length} eligible · {promotionRows.length - eligible.length} blocked ·{" "}
                    {targetSession} → {target} {targetSection}
                  </p>
                  {promotionRows.map(({ s, error }) => (
                    <div className="op-list-row" key={s.id}>
                      <span>
                        <b>{s.name}</b>
                        <small>{error || "Eligible in illustrative policy"}</small>
                      </span>
                      <Badge>{error ? "Blocked" : "Eligible"}</Badge>
                    </div>
                  ))}
                  <Field
                    label="Type PROMOTE to confirm eligible records only"
                    value={confirmation}
                    onChange={setConfirmation}
                  />
                  <Button
                    primary
                    disabled={!editable || !eligible.length || confirmation !== "PROMOTE"}
                    onClick={() => {
                      const ids = eligible.map((r) => r.s.id);
                      setStudents(
                        students.map((s) =>
                          ids.includes(s.id)
                            ? {
                                ...s,
                                enrollments: {
                                  ...s.enrollments,
                                  [session]: {
                                    grade: s.enrollments?.[session]?.grade || s.grade,
                                    section: s.enrollments?.[session]?.section || s.section,
                                  },
                                  [targetSession]: { grade: target, section: targetSection },
                                },
                                history: [
                                  `Promoted in preview · ${session} ${s.grade} → ${targetSession} ${target} ${targetSection}`,
                                  ...(s.history || []),
                                ],
                              }
                            : s,
                        ),
                      );
                      setSelection([]);
                      setDrawer(null);
                      notify(
                        "Eligible enrollments added for destination session · source history retained",
                      );
                    }}
                  >
                    Confirm simulated promotion
                  </Button>
                </>
              ) : (
                <form onSubmit={save}>
                  <div className="op-form-grid">
                    {drawer.type === "config" ? (
                      <>
                        {page === "Subject Group" && (
                          <div>
                            <h3>Included subjects</h3>
                            {a.subjects.map((subject) => {
                              const members =
                                form.members !== undefined
                                  ? form.members.split("|")
                                  : a.groupSubjects[drawer.id || ""] || [];
                              return (
                                <label key={subject} className="op-checkbox-row">
                                  <input
                                    type="checkbox"
                                    checked={members.includes(subject)}
                                    onChange={() =>
                                      set(
                                        "members",
                                        (members.includes(subject)
                                          ? members.filter((s) => s !== subject)
                                          : [...members, subject]
                                        ).join("|"),
                                      )
                                    }
                                  />
                                  {subject}
                                </label>
                              );
                            })}
                          </div>
                        )}
                        <Field
                          label="Name"
                          required
                          value={form.name || ""}
                          onChange={(v) => set("name", v)}
                        />
                        {page === "Class" && (
                          <Field
                            label="Capacity per class"
                            type="number"
                            required
                            value={form.capacity || ""}
                            onChange={(v) => set("capacity", v)}
                          />
                        )}
                      </>
                    ) : (
                      <>
                        {drawer.type === "slot" && (
                          <>
                            <Field
                              label="Day"
                              value={form.day}
                              options={days}
                              onChange={(v) => set("day", v)}
                            />
                            <Field
                              label="Start time"
                              required
                              type="time"
                              value={form.start}
                              onChange={(v) => set("start", v)}
                            />
                            <Field
                              label="End time"
                              required
                              type="time"
                              value={form.end}
                              onChange={(v) => set("end", v)}
                            />
                            <Field
                              label="Classroom"
                              required
                              value={form.room}
                              onChange={(v) => set("room", v)}
                            />
                          </>
                        )}
                        {drawer.type === "topic" && (
                          <Field
                            label="Topic name"
                            required
                            value={form.name || ""}
                            onChange={(v) => set("name", v)}
                          />
                        )}
                        <Field
                          label="Class"
                          required
                          value={form.grade || ""}
                          options={a.classes.filter((c) => !a.inactive.includes(c))}
                          onChange={(v) => set("grade", v)}
                        />
                        {(drawer.type === "slot" || drawer.type === "teacher") && (
                          <Field
                            label="Section"
                            required
                            value={form.section}
                            options={a.sections.filter((s) => !a.inactive.includes(s))}
                            onChange={(v) => set("section", v)}
                          />
                        )}{" "}
                        {drawer.type !== "topic" && (
                          <Field
                            label="Teacher (provided staff name)"
                            required
                            value={form.teacher || ""}
                            options={a.teachers.map((t) => t.name)}
                            onChange={(v) => set("teacher", v)}
                          />
                        )}{" "}
                        {drawer.type !== "teacher" && (
                          <Field
                            label="Subject"
                            required
                            value={form.subject || ""}
                            options={a.subjects.filter((s) => !a.inactive.includes(s))}
                            onChange={(v) => set("subject", v)}
                          />
                        )}{" "}
                        {(drawer.type === "topic" || drawer.type === "plan") && (
                          <Field
                            label="Delivery / due date"
                            required
                            type="date"
                            value={form.date || ""}
                            onChange={(v) => set("date", v)}
                          />
                        )}{" "}
                        {drawer.type === "plan" && (
                          <>
                            <label className="op-field">
                              <span>Defined topic *</span>
                              <select
                                required
                                value={form.topic || ""}
                                onChange={(e) => set("topic", e.target.value)}
                              >
                                <option value="">Choose matching topic</option>
                                {a.topics
                                  .filter(
                                    (t) =>
                                      t.session === session &&
                                      t.grade === form.grade &&
                                      t.subject === form.subject,
                                  )
                                  .map((t) => (
                                    <option key={t.id} value={t.id}>
                                      {t.name}
                                    </option>
                                  ))}
                              </select>
                            </label>
                            <Field
                              label="Lesson objectives"
                              required
                              type="textarea"
                              value={form.objectives || ""}
                              onChange={(v) => set("objectives", v)}
                            />
                            <Field
                              label="Resources"
                              type="textarea"
                              value={form.resources || ""}
                              onChange={(v) => set("resources", v)}
                            />
                            <Field
                              label="Delivery status"
                              value={form.status || "Planned"}
                              options={["Planned", "Delivered", "Cancelled"]}
                              onChange={(v) => set("status", v)}
                            />
                          </>
                        )}
                      </>
                    )}
                  </div>
                  {error && (
                    <div role="alert" className="op-form-error">
                      {error}
                    </div>
                  )}
                  <div className="op-drawer-actions">
                    <Button onClick={close}>Cancel</Button>
                    <Button primary type="submit" disabled={!editable}>
                      Save preview
                    </Button>
                  </div>
                </form>
              )}
            </div>
            <footer>
              <Icon name="shield" size={13} />
              Simulated records only · no production academic ledger
            </footer>
          </aside>
        </div>
      )}
    </div>
  );
}

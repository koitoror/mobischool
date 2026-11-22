import { Fragment, useEffect, useState } from "react";
import { useExamination } from "./ExaminationContext";
import { Button, Badge, Card, Field } from "./components/OperationsUI";
import { AssessmentDialog, AssessmentTable as Table } from "./components/AssessmentUI";
import {
  assessmentPages,
  onlinePages,
  examinationPages,
  groupError,
  scheduleError,
  gradeError,
  gradeFor,
  scoreError,
  questionError,
  onlineError,
  attemptError,
  evaluationError,
  type ExamGroup,
  type Exam,
  type Sitting,
  type Question,
  type OnlineExam,
  type Attempt,
  type DocTemplate,
} from "./examinationModel";
import type { Student } from "./Lifecycle";
import "./examinations.css";
const uid = (prefix: string) => prefix + "-" + crypto.randomUUID().slice(0, 8);
export default function Examinations({
  page,
  active,
  school,
  navigate,
  onStudent,
  onDirty,
  notify,
}: {
  page: string;
  active: boolean;
  school: string;
  navigate: (p: string) => void;
  onStudent: (s: Student) => void;
  onDirty: (b: boolean) => void;
  notify: (s: string) => void;
}) {
  const x = useExamination(),
    a = x.academic;
  const [dialog, setDialog] = useState(""),
    [form, setForm] = useState<Record<string, string>>({}),
    [error, setError] = useState(""),
    [dirty, setDirty] = useState(false),
    [search, setSearch] = useState(""),
    [state, setState] = useState("Ready"),
    [selection, setSelection] = useState<string[]>([]);
  const [bandDraft, setBandDraft] = useState(x.bands),
    [calculator, setCalculator] = useState("75");
  const [template, setTemplate] = useState<DocTemplate>(x.templates["Admit Card"]);
  const [questionIds, setQuestionIds] = useState<string[]>([]),
    [attemptId, setAttemptId] = useState(""),
    [questionIndex, setQuestionIndex] = useState(0),
    [clock, setClock] = useState(Date.now());
  const [onlineId, setOnlineId] = useState(""),
    [candidateId, setCandidateId] = useState(""),
    [scheduleView, setScheduleView] = useState("Table");
  const exam = x.exams.find((e) => e.id === x.selectedExam),
    group = x.groups.find((g) => g.id === exam?.group);
  const candidates = exam ? x.candidates(exam) : [],
    sittings = x.sittings.filter((s) => s.exam === exam?.id);
  const scores = x.scores.filter((s) => s.exam === exam?.id),
    metrics = x.metrics();
  const currentOnline = x.online.find((o) => o.id === onlineId),
    attempt = x.attempts.find((t) => t.id === attemptId);
  const onlineExam = currentOnline && x.exams.find((e) => e.id === currentOnline.exam);
  const canConfigure = [
    "School Administrator",
    "Academic Administrator",
    "Examination Officer",
  ].includes(x.role);
  const canMark = canConfigure || ["Teacher", "Class Teacher"].includes(x.role);
  const canPublish = ["School Administrator", "Academic Administrator"].includes(x.role);
  const docKind = page.includes("Admit") ? "Admit Card" : "Marksheet";
  const isDesign = page.startsWith("Design "),
    isPrint = page.startsWith("Print ");
  const close = () => {
    if (dirty && !window.confirm("Discard unsaved assessment form changes?")) return;
    setDialog("");
    setDirty(false);
    setError("");
  };
  useEffect(() => {
    setDialog("");
    setDirty(false);
    setSearch("");
    setSelection([]);
    setError("");
    setState("Ready");
    if (page.startsWith("Design "))
      setTemplate(x.templates[page.includes("Admit") ? "Admit Card" : "Marksheet"]);
  }, [page, active]);
  useEffect(() => {
    if (active) onDirty(dirty);
  }, [dirty, active, onDirty]);
  useEffect(() => {
    if (!active || !attempt || attempt.status !== "In Progress") return;
    const timer = setInterval(() => setClock((now) => now + 1000), 1000);
    return () => clearInterval(timer);
  }, [active, attempt?.id, attempt?.status]);
  const open = (type: string, values: Record<string, string> = {}) => {
    setForm(values);
    setError("");
    setDirty(false);
    setDialog(type);
  };
  const go = (p: string) => {
    if (dirty && !window.confirm("Discard unsaved assessment changes?")) return;
    setDirty(false);
    navigate(p);
  };
  const set = (key: string, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    setDirty(true);
  };
  const field = (
    label: string,
    key: string,
    options?: string[],
    type = "text",
    required = false,
  ) => (
    <Field
      label={label}
      value={form[key] || ""}
      options={options}
      type={type}
      required={required}
      onChange={(v) => set(key, v)}
    />
  );
  const save = (fn: () => void) => {
    try {
      fn();
      setDirty(false);
      setDialog("");
      setError("");
      notify("Assessment updated in local simulation only");
    } catch (e) {
      setError((e as Error).message);
    }
  };
  const assert = (message: string) => {
    if (message) throw Error(message);
  };
  const history = (text: string) => x.audit(text);
  const badge = (text: string) => <Badge>{text}</Badge>;
  const pickExam = (
    <Field
      label="Assessment"
      value={exam ? `${exam.id} · ${exam.name}` : ""}
      options={x.sessionExams.map((e) => `${e.id} · ${e.name}`)}
      onChange={(v) => {
        x.setSelectedExam(v.split(" · ")[0]);
        setSelection([]);
      }}
    />
  );
  const filtered = <T extends { name?: string; text?: string }>(items: T[]) =>
    items.filter((v) => (v.name || v.text || "").toLowerCase().includes(search.toLowerCase()));
  const stat = (label: string, value: string, destination: string) => (
    <Button onClick={() => go(destination)}>
      <span className="ex-stat">
        <span>{label}</span>
        <strong>{value}</strong>
        <small>Shared examination records</small>
      </span>
    </Button>
  );
  const actions = (...children: React.ReactNode[]) => (
    <div className="op-inline">
      {children.map((child, index) => (
        <Fragment key={index}>{child}</Fragment>
      ))}
    </div>
  );
  const editGroup = (g?: ExamGroup) =>
    open(
      "Exam group",
      g
        ? { ...g }
        : {
            name: "",
            grade: a.classes[0] || "",
            term: "",
            start: a.day,
            end: a.day,
            status: "Active",
          },
    );
  const editExam = () =>
    open("Create exam", {
      group: x.groups.find((g) => g.session === x.session && g.status === "Active")?.id || "",
      subject: a.subjects[0] || "",
      section: a.sections[0] || "",
      maximum: "100",
      component: "Written",
    });
  const editSitting = (s?: Sitting) =>
    open(
      "Schedule sitting",
      s
        ? { ...s }
        : {
            exam: exam?.id || "",
            date: group?.start || a.day,
            start: "09:00",
            end: "10:00",
            room: "",
            teacher: a.teachers[0]?.name || "",
          },
    );
  const editQuestion = (q?: Question) =>
    open(
      "Question editor",
      q
        ? { ...q, marks: String(q.marks), options: q.options.join("\n") }
        : {
            subject: exam?.subject || a.subjects[0] || "",
            grade: group?.grade || a.classes[0] || "",
            type: "Single choice",
            difficulty: "Standard",
            marks: "5",
            status: "Active",
          },
    );
  const marksRows = candidates.map((s) => {
    const score = scores.find((v) => v.student === s.id);
    const value = form[s.id] ?? score?.value ?? "";
    const invalid = exam ? scoreError(value, exam.maximum) : "";
    return [
      s.name,
      s.id,
      <Field
        label={`Score for ${s.name}`}
        value={value}
        onChange={(v) => set(s.id, v)}
        type="number"
      />,
      exam?.maximum || "",
      invalid || gradeFor(Number(value), exam?.maximum || 100, x.bands).grade,
      badge(score?.status || "Missing"),
      score?.remark || "—",
    ];
  });
  const validCandidates = candidates.filter(
    (s) =>
      !scoreError(
        form[s.id] ?? scores.find((v) => v.student === s.id)?.value ?? "",
        exam?.maximum || 100,
      ),
  ).length;
  const saveMarks = (status: "Draft" | "Reviewed") =>
    save(() => {
      assert(!exam ? "Select an exam." : "");
      assert(!canMark ? "This preview role cannot enter marks." : "");
      assert(
        scores.some((s) => s.status === "Published")
          ? "Published records are locked. Create a new assessment for corrections."
          : "",
      );
      if (status === "Reviewed")
        assert(
          validCandidates !== candidates.length || !candidates.length
            ? "All eligible candidates need valid marks before review."
            : "",
        );
      const next = candidates.map((s) => {
        const previous = scores.find((v) => v.student === s.id),
          value = form[s.id] ?? previous?.value ?? "";
        if (value.trim()) assert(scoreError(value, exam!.maximum));
        return {
          exam: exam!.id,
          student: s.id,
          value,
          remark: form.remarks || previous?.remark || "",
          status,
          history: [
            ...(previous?.history || []),
            x.stamp(
              `${previous?.value || "Missing"} → ${value || "Missing"}; ${previous?.status || "Missing"} → ${status}`,
            ),
          ],
        };
      });
      x.setScores((old) => [...old.filter((s) => s.exam !== exam!.id), ...next]);
      history(`Marks ${status}; ${next.length} candidates; ${exam!.id}`);
    });
  const publish = () =>
    save(() => {
      assert(!canPublish ? "Only an academic administrator can publish in this preview." : "");
      assert(!exam || !candidates.length ? "No eligible candidates." : "");
      assert(gradeError(x.bands));
      assert(
        candidates.some((s) => {
          const score = scores.find((v) => v.student === s.id);
          return !score || score.status !== "Reviewed" || scoreError(score.value, exam!.maximum);
        })
          ? "Every candidate must have a reviewed valid score."
          : "",
      );
      x.setScores((old) =>
        old.map((s) =>
          s.exam === exam!.id
            ? {
                ...s,
                status: "Published",
                ...gradeFor(Number(s.value), exam!.maximum, x.bands),
                scaleVersion: x.scaleVersion,
                publishedAt: new Date().toISOString(),
                gradingSnapshot: x.bands.map((b) => ({ ...b })),
                passingGradesSnapshot: x.passingGrades ? [...x.passingGrades] : null,
                schemeNameSnapshot: x.schemeName,
                history: [
                  ...s.history,
                  x.stamp("Reviewed → Published; explicit scope confirmation"),
                ],
              }
            : s,
        ),
      );
      history(
        `Published ${candidates.length} results for ${exam!.id}; grade scale v${x.scaleVersion}`,
      );
    });
  const eligibleDoc = (id: string) =>
    docKind === "Admit Card"
      ? sittings.length > 0
      : scores.find((s) => s.student === id)?.status === "Published";
  const document = (student: Student, t = template) => {
    const score = scores.find((v) => v.student === student.id);
    return (
      <article
        className={`ex-document ex-align-${t.alignment.toLowerCase()} ex-density-${t.density.toLowerCase()}`}
      >
        <div className="ex-document-brand">
          <strong>{school}</strong>
          <small>School-configurable identity · illustrative document</small>
        </div>
        <div className="ex-document-title">{t.title}</div>
        <div className="ex-document-identity">
          <strong>{student.name}</strong>
          <span>
            {student.admission || student.id} · {student.grade} / {student.section}
          </span>
          <span>
            {x.session} · {group?.name}
          </span>
          <small>
            Photograph not supplied · template v{t.version} · {t.paper}
          </small>
        </div>
        {docKind === "Admit Card" ? (
          t.showSchedule && (
            <Table
              headers={["Subject", "Date", "Time", "Room"]}
              rows={sittings.map((s) => [exam?.subject, s.date, `${s.start}–${s.end}`, s.room])}
            />
          )
        ) : (
          <Table
            headers={["Subject / component", "Marks", "Maximum", "Percentage", "Grade", "Status"]}
            rows={[
              [
                `${exam?.subject} · ${exam?.component}`,
                score?.value || "Missing",
                exam?.maximum,
                score?.percentage === undefined ? "—" : score.percentage + "%",
                score?.grade || "—",
                score?.status || "Draft",
              ],
            ]}
          />
        )}
        <p>{t.instructions}</p>
        {t.showSignatures && (
          <div className="ex-signatures">
            <span>Student / Class teacher signature</span>
            <span>School authorization / stamp</span>
          </div>
        )}
        <p>{t.footer}</p>
      </article>
    );
  };
  const createOnline = () => {
    setQuestionIds([]);
    open("Online exam builder", {
      exam: exam?.id || "",
      duration: "30",
      attempts: "1",
      start: `${a.day}T09:00`,
      end: `${a.day}T12:00`,
    });
  };
  const updateAttempt = (change: (t: Attempt) => Attempt) =>
    x.setAttempts((old) => old.map((t) => (t.id === attemptId ? change(t) : t)));
  const remaining =
    attempt && currentOnline
      ? Math.max(
          0,
          Math.ceil(
            (Math.min(
              Date.parse(attempt.started) + currentOnline.duration * 60000,
              Date.parse(currentOnline.end),
            ) -
              clock) /
              1000,
          ),
        )
      : 0;
  const durationLabel = `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")}`;
  return (
    <div className="op ex" hidden={!active}>
      <div className="op-heading">
        <div>
          <div className="op-eyebrow">
            OPERATIONS / {onlinePages.includes(page) ? "ONLINE EXAMINATIONS" : "EXAMINATIONS"}
          </div>
          <div className="ex-title" role="heading" aria-level={1}>
            {page === "Examinations"
              ? "Examinations overview"
              : page === "Online Examinations"
                ? "Online examinations overview"
                : page}
          </div>
          <p>One assessment journey. Clear evidence. Every outcome traceable.</p>
        </div>
        <div className="op-heading-actions">
          <Button icon="settings" onClick={() => open("Preview controls")}>
            Preview controls
          </Button>
          <Button
            primary
            icon="plus"
            disabled={!canConfigure}
            onClick={onlinePages.includes(page) ? createOnline : editExam}
          >
            {onlinePages.includes(page) ? "Create online exam" : "Create exam"}
          </Button>
        </div>
      </div>
      <div className="op-context">
        <Field label="Examination workspace" value={page} options={assessmentPages} onChange={go} />
        <span>{x.session}</span>
        <Badge>Illustrative Data</Badge>
        <span>Simulation · resets on reload</span>
      </div>
      <div className="ex-route-tabs">
        {(onlinePages.includes(page) ? onlinePages : examinationPages).map((p) => (
          <Button key={p} onClick={() => go(p)} disabled={page === p}>
            {p === "Examinations" || p === "Online Examinations" ? "Overview" : p}
          </Button>
        ))}
      </div>
      <div className="op-notice">
        No authenticated exam session, secure timer, proctoring, official result publication or
        document service is connected.
      </div>
      {error && (
        <div className="op-form-error" role="alert">
          {error}
        </div>
      )}
      {!["School Administrator", "Academic Administrator", "Examination Officer"].includes(
        x.role,
      ) && (
        <div className="op-notice">
          Role preview: {x.role}. Controls are illustrative, not backend authorization. Teacher
          assignment scope and student ownership require production enforcement.
        </div>
      )}
      {state !== "Ready" ? (
        <Card title={state} sub="Explicit examination exception preview">
          <div className="op-empty">
            {state === "Loading" ? (
              <div className="op-skeleton" />
            ) : (
              <>
                <strong>
                  {state === "Error"
                    ? "Records could not be loaded"
                    : state === "Restricted"
                      ? "Examination access restricted"
                      : "No examination records"}
                </strong>
                <p>Your existing local records are preserved.</p>
              </>
            )}
            <Button onClick={() => setState("Ready")}>Return to records</Button>
          </div>
        </Card>
      ) : (
        <>
          {![
            "Examinations",
            "Online Examinations",
            "Exam Group",
            "Marks Grade",
            "Question Bank",
          ].includes(page) && (
            <div className="ex-filters">
              {pickExam}
              <Field label="Search examination records" value={search} onChange={setSearch} />
              <span>
                {group?.grade} · {exam?.section} · {exam?.subject}
              </span>
            </div>
          )}
          {page === "Examinations" ? (
            <>
              <div className="ex-stats">
                {stat("Exams this session", String(metrics.total), "Exam Group")}
                {stat("Upcoming sittings", String(metrics.upcoming), "Exam Schedule")}
                {stat("Registered students", String(metrics.registered), "Print Admit Card")}
                {stat("Results pending", String(metrics.pending), "Exam Result")}
                {stat("Published results", String(metrics.published), "Print Marksheet")}
                {stat(
                  "Marks entry completion",
                  metrics.completion === null ? "—" : metrics.completion + "%",
                  "Exam Result",
                )}
              </div>
              <div className="ex-grid">
                <Card
                  title="Assessment pipeline"
                  sub="Setup → schedule → assess → review → publish"
                  action={<Button onClick={() => go("Exam Result")}>Enter marks</Button>}
                >
                  <Table
                    headers={["Assessment", "Subject", "Scheduled", "Reviewed", "Published"]}
                    rows={x.sessionExams.map((e) => [
                      e.name,
                      e.subject,
                      String(x.sittings.filter((s) => s.exam === e.id).length),
                      String(
                        x.scores.filter((s) => s.exam === e.id && s.status === "Reviewed").length,
                      ),
                      String(
                        x.scores.filter((s) => s.exam === e.id && s.status === "Published").length,
                      ),
                    ])}
                  />
                </Card>
                <Card
                  title="Grade distribution"
                  sub="Published results only · no incomplete scores"
                >
                  <div className="ex-pad">
                    {x.bands.map((b) => (
                      <Button key={b.label} onClick={() => go("Exam Result")}>
                        {b.label}:{" "}
                        {
                          x.scores.filter(
                            (s) =>
                              x.sessionExams.some((e) => e.id === s.exam) &&
                              s.status === "Published" &&
                              s.grade === b.label,
                          ).length
                        }
                      </Button>
                    ))}
                    <p>
                      Published mean:{" "}
                      {metrics.average === null
                        ? "Not available"
                        : metrics.average.toFixed(2) + "%"}
                    </p>
                  </div>
                </Card>
                <Card
                  title="Upcoming exam schedule"
                  sub={"Preview date " + a.day}
                  action={<Button onClick={() => go("Exam Schedule")}>Manage schedule</Button>}
                >
                  <Table
                    headers={["Exam", "Date", "Time", "Room"]}
                    rows={x.sittings
                      .filter((s) => x.sessionExams.some((e) => e.id === s.exam) && s.date >= a.day)
                      .map((s) => [
                        x.exams.find((e) => e.id === s.exam)?.name,
                        s.date,
                        `${s.start}–${s.end}`,
                        s.room,
                      ])}
                  />
                </Card>
                <Card
                  title="Recent examination activity"
                  sub="Actor and timestamp recorded in memory"
                >
                  <div className="ex-pad">
                    {x.history.slice(0, 5).map((h) => (
                      <p key={h}>{h}</p>
                    ))}
                    {!x.history.length && <p>No recorded activity yet.</p>}
                  </div>
                </Card>
              </div>
            </>
          ) : page === "Exam Group" ? (
            <Card
              title="Assessment groups"
              sub="The session and class scope determine eligible shared student records."
              action={
                <Button disabled={!canConfigure} onClick={() => editGroup()}>
                  Create exam group
                </Button>
              }
            >
              <Table
                headers={[
                  "Group",
                  "Session / term",
                  "Class",
                  "Dates",
                  "Exams",
                  "Status",
                  "Actions",
                ]}
                rows={x.groups
                  .filter((g) => g.session === x.session)
                  .map((g) => [
                    g.name,
                    `${g.session} · ${g.term}`,
                    g.grade,
                    `${g.start} → ${g.end}`,
                    x.exams.filter((e) => e.group === g.id).length,
                    badge(g.status),
                    actions(
                      <Button disabled={!canConfigure} onClick={() => editGroup(g)}>
                        Edit
                      </Button>,
                      <Button
                        onClick={() => {
                          x.setSelectedExam(x.exams.find((e) => e.group === g.id)?.id || "");
                          go("Exam Schedule");
                        }}
                      >
                        View exams
                      </Button>,
                      <Button
                        disabled={!canConfigure}
                        onClick={() => editGroup({ ...g, id: "", name: g.name + " copy" })}
                      >
                        Duplicate
                      </Button>,
                    ),
                  ])}
              />
            </Card>
          ) : page === "Exam Schedule" ? (
            <Card
              title="Examination timetable"
              sub="Overlapping class, room and invigilator assignments are blocked."
              action={actions(
                <Button disabled={!canConfigure || !exam} onClick={() => editSitting()}>
                  Add schedule
                </Button>,
                <Button onClick={() => window.print()}>Print timetable preview</Button>,
              )}
            >
              <div className="ex-pad">
                <Field
                  label="Schedule view"
                  value={scheduleView}
                  options={["Table", "By Class", "By Subject", "Calendar agenda"]}
                  onChange={setScheduleView}
                />
                <p>
                  {scheduleView} · {group?.start} to {group?.end} · no conflicts saved
                </p>
              </div>
              <Table
                headers={[
                  "Exam / subject",
                  "Class / section",
                  "Date",
                  "Time",
                  "Room",
                  "Invigilator",
                  "Actions",
                ]}
                rows={sittings.map((s) => [
                  exam?.name,
                  `${group?.grade} / ${exam?.section}`,
                  s.date,
                  `${s.start}–${s.end}`,
                  s.room,
                  s.teacher,
                  actions(
                    <Button disabled={!canConfigure} onClick={() => editSitting(s)}>
                      Edit
                    </Button>,
                    <Button
                      disabled={!canConfigure}
                      onClick={() => open("Remove schedule", { id: s.id, reason: "" })}
                    >
                      Remove
                    </Button>,
                  ),
                ])}
              />
              <div className="ex-pad">
                {actions(
                  <Button onClick={() => go("Print Admit Card")}>Print Admit Card</Button>,
                  <Button disabled={!canMark} onClick={() => open("Marks entry")}>
                    Enter marks
                  </Button>,
                )}
              </div>
            </Card>
          ) : page === "Exam Result" ? (
            <>
              <div className="ex-stats">
                {stat(
                  "Students assessed",
                  String(scores.filter((s) => s.value !== "").length),
                  "Exam Result",
                )}
                {stat(
                  "Missing marks",
                  String(candidates.length - scores.filter((s) => s.value !== "").length),
                  "Exam Result",
                )}
                {stat(
                  "Published",
                  String(scores.filter((s) => s.status === "Published").length),
                  "Print Marksheet",
                )}
              </div>
              <Card
                title="Result register"
                sub="Draft → reviewed → published; published grades are immutable snapshots."
                action={actions(
                  <Button disabled={!canMark || !exam} onClick={() => open("Marks entry")}>
                    Enter marks
                  </Button>,
                  <Button disabled={!canPublish || !exam} onClick={() => open("Publish results")}>
                    Review publication
                  </Button>,
                )}
              >
                <Table
                  headers={[
                    "Student",
                    "Admission",
                    "Subject",
                    "Score / maximum",
                    "Percentage",
                    "Grade",
                    "Status",
                    "Actions",
                  ]}
                  rows={candidates
                    .filter((s) => `${s.name} ${s.id}`.toLowerCase().includes(search.toLowerCase()))
                    .map((s) => {
                      const score = scores.find((v) => v.student === s.id),
                        preview = score?.value
                          ? gradeFor(Number(score.value), exam!.maximum, x.bands)
                          : null;
                      return [
                        s.name,
                        s.admission || s.id,
                        exam?.subject,
                        `${score?.value || "—"} / ${exam?.maximum}`,
                        score?.percentage === undefined
                          ? preview
                            ? preview.percentage + "% (draft)"
                            : "—"
                          : score.percentage + "%",
                        score?.grade || preview?.grade || "—",
                        badge(score?.status || "Incomplete"),
                        actions(
                          <Button onClick={() => open("Result details", { student: s.id })}>
                            View result
                          </Button>,
                          <Button onClick={() => onStudent(s)}>Student 360</Button>,
                        ),
                      ];
                    })}
                />
              </Card>
            </>
          ) : isDesign ? (
            <div className="ex-grid">
              <Card
                title={`${docKind} canvas`}
                sub="Live sample preview · no photograph, signature or stamp fabricated"
              >
                {candidates[0] ? (
                  document(candidates[0])
                ) : (
                  <div className="op-empty">Select an exam with an eligible student.</div>
                )}
              </Card>
              <Card
                title="Template configuration"
                sub={`Active v${x.templates[docKind].version} · prior versions preserved on save`}
              >
                <div className="ex-pad ex-fields">
                  <Field
                    label="Document title"
                    value={template.title}
                    onChange={(v) => {
                      setTemplate({ ...template, title: v });
                      setDirty(true);
                    }}
                  />
                  <Field
                    label="Instructions"
                    type="textarea"
                    value={template.instructions}
                    onChange={(v) => {
                      setTemplate({ ...template, instructions: v });
                      setDirty(true);
                    }}
                  />
                  <Field
                    label="Footer"
                    value={template.footer}
                    onChange={(v) => {
                      setTemplate({ ...template, footer: v });
                      setDirty(true);
                    }}
                  />
                  <Field
                    label="Paper size"
                    value={template.paper}
                    options={["A4 Portrait", "A4 Landscape"]}
                    onChange={(v) => {
                      setTemplate({ ...template, paper: v });
                      setDirty(true);
                    }}
                  />
                  <Field
                    label="Alignment"
                    value={template.alignment}
                    options={["Left", "Center"]}
                    onChange={(v) => {
                      setTemplate({ ...template, alignment: v });
                      setDirty(true);
                    }}
                  />
                  <Field
                    label="Spacing"
                    value={template.density}
                    options={["Comfortable", "Compact"]}
                    onChange={(v) => {
                      setTemplate({ ...template, density: v });
                      setDirty(true);
                    }}
                  />
                  {actions(
                    <Button
                      onClick={() => {
                        setTemplate({ ...template, showSchedule: !template.showSchedule });
                        setDirty(true);
                      }}
                    >
                      Subject schedule: {template.showSchedule ? "Shown" : "Hidden"}
                    </Button>,
                    <Button
                      onClick={() => {
                        setTemplate({ ...template, showSignatures: !template.showSignatures });
                        setDirty(true);
                      }}
                    >
                      Signatures: {template.showSignatures ? "Shown" : "Hidden"}
                    </Button>,
                  )}
                  <Button
                    disabled={!canConfigure}
                    primary
                    onClick={() => {
                      setDirty(false);
                      open("Save template");
                    }}
                  >
                    Save template version
                  </Button>
                  <Button
                    onClick={() => {
                      setTemplate(x.templates[docKind]);
                      setDirty(false);
                    }}
                  >
                    Reset to active
                  </Button>
                  <p>
                    {x.templateHistory[docKind]?.length || 0} archived versions · generated
                    documents retain a version snapshot.
                  </p>
                </div>
              </Card>
            </div>
          ) : isPrint ? (
            <Card
              title={`${docKind} candidate selection`}
              sub={
                docKind === "Admit Card"
                  ? "Active shared students with a valid scheduled sitting only."
                  : "Published complete results only. Drafts are excluded."
              }
              action={
                <Button
                  disabled={!canConfigure || !selection.length}
                  onClick={() => open("Document batch")}
                >
                  Preview selected batch
                </Button>
              }
            >
              <div className="ex-pad">
                {actions(
                  <Button
                    onClick={() =>
                      setSelection(candidates.filter((s) => eligibleDoc(s.id)).map((s) => s.id))
                    }
                  >
                    Select eligible
                  </Button>,
                  <Button onClick={() => setSelection([])}>Clear selection</Button>,
                )}
                <p>
                  {selection.length} selected · photographs not supplied · active template v
                  {x.templates[docKind].version}
                </p>
              </div>
              <Table
                headers={[
                  "Select",
                  "Student",
                  "Admission",
                  "Class / section",
                  "Eligibility",
                  "Generation",
                ]}
                rows={candidates.map((s) => [
                  <Button
                    disabled={!eligibleDoc(s.id)}
                    onClick={() =>
                      setSelection((old) =>
                        old.includes(s.id) ? old.filter((id) => id !== s.id) : [...old, s.id],
                      )
                    }
                  >
                    {selection.includes(s.id) ? "Selected" : "Select"}
                  </Button>,
                  s.name,
                  s.admission || s.id,
                  `${s.grade} / ${s.section}`,
                  eligibleDoc(s.id)
                    ? "Ready"
                    : docKind === "Admit Card"
                      ? "Missing schedule"
                      : "Unpublished / incomplete",
                  x.generations.some(
                    (g) => g.kind === docKind && g.exam === exam?.id && g.student === s.id,
                  )
                    ? "Previously generated"
                    : "Not generated",
                ])}
              />
            </Card>
          ) : page === "Marks Grade" ? (
            <Card
              title="Illustrative grading scale"
              sub={`Configurable two-decimal bands · v${x.scaleVersion} · no pass mark or ranking policy assumed`}
              action={
                <Button
                  disabled={!canConfigure}
                  onClick={() => {
                    setBandDraft(x.bands.map((b) => ({ ...b })));
                    open("Grade scale");
                  }}
                >
                  Edit grade scale
                </Button>
              }
            >
              <Table
                headers={["Grade", "Minimum %", "Maximum %", "Description"]}
                rows={x.bands.map((b) => [b.label, b.min, b.max, b.description])}
              />
              <div className="ex-pad">
                <Field
                  label="Preview percentage"
                  type="number"
                  value={calculator}
                  onChange={setCalculator}
                />
                <p>
                  Calculated grade:{" "}
                  {Number.isFinite(Number(calculator)) &&
                  Number(calculator) >= 0 &&
                  Number(calculator) <= 100
                    ? gradeFor(Number(calculator), 100, x.bands).grade
                    : "Enter 0–100"}
                  . Published results retain their original scale version.
                </p>
              </div>
            </Card>
          ) : page === "Question Bank" ? (
            <Card
              title="Reusable question bank"
              sub="Single choice, True / False, Short Answer and Essay · used questions are locked."
              action={
                <Button disabled={!canMark} onClick={() => editQuestion()}>
                  Add question
                </Button>
              }
            >
              <div className="ex-pad">
                <Field label="Search question bank" value={search} onChange={setSearch} />
              </div>
              <Table
                headers={[
                  "ID / question",
                  "Type",
                  "Subject / class",
                  "Topic",
                  "Marks",
                  "Status",
                  "Actions",
                ]}
                rows={filtered(x.questions).map((q) => [
                  `${q.id} · ${q.text}`,
                  q.type,
                  `${q.subject} / ${q.grade}`,
                  q.topic,
                  q.marks,
                  badge(q.status),
                  actions(
                    <Button
                      disabled={
                        !canMark || x.online.some((o) => o.questions.some((v) => v.id === q.id))
                      }
                      onClick={() => editQuestion(q)}
                    >
                      Edit
                    </Button>,
                    <Button
                      disabled={!canMark}
                      onClick={() => editQuestion({ ...q, id: "", text: q.text + " (copy)" })}
                    >
                      Duplicate
                    </Button>,
                    <Button onClick={() => open("Question preview", { id: q.id })}>Preview</Button>,
                  ),
                ])}
              />
            </Card>
          ) : page === "Online Examinations" ? (
            <>
              <div className="ex-stats">
                {stat(
                  "Online exams",
                  String(
                    x.online.filter((o) => x.sessionExams.some((e) => e.id === o.exam)).length,
                  ),
                  "Online Exam",
                )}
                {stat(
                  "Submitted attempts",
                  String(x.attempts.filter((t) => t.status === "Submitted").length),
                  "Online Exam",
                )}
                {stat("Question bank", String(x.questions.length), "Question Bank")}
              </div>
              <div className="ex-grid">
                <Card
                  title="Digital assessment pipeline"
                  sub="Draft → scheduled → submitted → evaluated → reviewed result"
                >
                  <Table
                    headers={["Exam", "Questions", "Status"]}
                    rows={x.online
                      .filter((o) => x.sessionExams.some((e) => e.id === o.exam))
                      .map((o) => [o.name, o.questions.length, badge(o.status)])}
                  />
                </Card>
                <Card title="Integrity boundaries" sub="Demonstration only">
                  <div className="ex-pad">
                    <p>
                      Timers and answer recovery operate only in this browser memory. Reload loses
                      attempts. No proctoring, lockdown, identity verification or secure submission
                      is performed.
                    </p>
                    <Button onClick={() => go("Question Bank")}>Manage Question Bank</Button>
                  </div>
                </Card>
              </div>
            </>
          ) : page === "Online Exam" ? (
            <>
              <Card
                title="Online assessment register"
                sub="Question snapshots are frozen at exam creation; only explicit scheduling opens the preview."
                action={
                  <Button disabled={!canConfigure} onClick={createOnline}>
                    Create online exam
                  </Button>
                }
              >
                <Table
                  headers={[
                    "Name",
                    "Questions / maximum",
                    "Window",
                    "Duration / attempts",
                    "Status",
                    "Actions",
                  ]}
                  rows={x.online
                    .filter((o) => x.sessionExams.some((e) => e.id === o.exam))
                    .map((o) => [
                      o.name,
                      `${o.questions.length} / ${o.questions.reduce((n, q) => n + q.marks, 0)}`,
                      `${o.start} → ${o.end}`,
                      `${o.duration} min / ${o.attempts}`,
                      badge(o.status),
                      actions(
                        <Button
                          onClick={() => {
                            setOnlineId(o.id);
                            setCandidateId(
                              x.candidates(x.exams.find((e) => e.id === o.exam)!).at(0)?.id || "",
                            );
                            open("Student exam entry", { now: o.start });
                          }}
                        >
                          Student preview
                        </Button>,
                        <Button
                          disabled={!canConfigure || o.status !== "Draft"}
                          onClick={() =>
                            save(() => {
                              assert(
                                onlineError(
                                  o,
                                  x.exams.find((e) => e.id === o.exam),
                                ),
                              );
                              x.setOnline((old) =>
                                old.map((v) => (v.id === o.id ? { ...v, status: "Scheduled" } : v)),
                              );
                              history(`${o.id}: Draft → Scheduled`);
                            })
                          }
                        >
                          Schedule
                        </Button>,
                      ),
                    ])}
                />
              </Card>
              <Card
                title="Submission and evaluation queue"
                sub="Objective and written responses require explicit evaluator review; no automatic marking claim."
              >
                <Table
                  headers={["Attempt", "Student", "Status", "Submitted", "Actions"]}
                  rows={x.attempts
                    .filter((t) =>
                      x.online.some(
                        (o) => o.id === t.online && x.sessionExams.some((e) => e.id === o.exam),
                      ),
                    )
                    .map((t) => [
                      t.id,
                      x.students.find((s) => s.id === t.student)?.name,
                      badge(t.status),
                      t.submitted || "—",
                      <Button
                        disabled={!canMark || t.status !== "Submitted"}
                        onClick={() => {
                          setAttemptId(t.id);
                          setOnlineId(t.online);
                          open("Evaluate attempt");
                        }}
                      >
                        Evaluate
                      </Button>,
                    ])}
                />
              </Card>
            </>
          ) : null}
        </>
      )}
      <div className="op-footnote">
        <span>{school} · illustrative assessments · no official publication</span>
        <span>{dirty ? "Unsaved changes" : "Local prototype state"}</span>
      </div>
      {dialog && active && (
        <AssessmentDialog title={dialog} onClose={close}>
          {dialog === "Preview controls" ? (
            <>
              {
                <Field
                  label="Preview role"
                  value={x.role}
                  options={[
                    "School Administrator",
                    "Academic Administrator",
                    "Examination Officer",
                    "Teacher",
                    "Class Teacher",
                    "Student",
                    "Auditor",
                  ]}
                  onChange={x.setRole}
                />
              }
              <Field
                label="Data state"
                value={state}
                options={["Ready", "Loading", "Empty", "Error", "Restricted"]}
                onChange={setState}
              />
              <p>
                These roles are proposed UI permissions, not authorization. Student preview identity
                is explicitly selected by an operator.
              </p>
            </>
          ) : dialog === "Exam group" ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                save(() => {
                  assert(!canConfigure ? "Restricted role." : "");
                  const g: ExamGroup = {
                    id: form.id || uid("EG"),
                    name: form.name.trim(),
                    session: x.session,
                    term: form.term,
                    grade: form.grade,
                    start: form.start,
                    end: form.end,
                    status: form.status,
                    description: form.description || "",
                  };
                  assert(groupError(g, x.groups));
                  const previous = x.groups.find((v) => v.id === g.id);
                  if (
                    previous &&
                    x.exams.some((e) => e.group === g.id) &&
                    [
                      g.grade !== previous.grade,
                      g.start !== previous.start,
                      g.end !== previous.end,
                    ].some(Boolean)
                  )
                    throw Error(
                      "Dependent exams exist. Class/date changes are blocked; duplicate the group instead.",
                    );
                  x.setGroups((old) => [...old.filter((v) => v.id !== g.id), g]);
                  history(`Group ${g.id}: ${previous?.status || "New"} → ${g.status}`);
                });
              }}
            >
              <div className="ex-fields">
                {field("Group name", "name", undefined, "text", true)}
                {field("Term / assessment period", "term", undefined, "text", true)}
                {field("Class scope", "grade", a.classes)}
                {field("Start date", "start", undefined, "date", true)}
                {field("End date", "end", undefined, "date", true)}
                {field("Description", "description", undefined, "textarea")}
                {field("Status", "status", ["Active", "Inactive", "Archived"])}
                <p>Session: {x.session}. Historical exams are never deleted.</p>
                <Button primary type="submit">
                  Save exam group
                </Button>
              </div>
            </form>
          ) : dialog === "Create exam" ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                save(() => {
                  const g = x.groups.find(
                    (g) => g.id === form.group && g.status === "Active" && g.session === x.session,
                  );
                  assert(!canConfigure || !g ? "Choose an active group in this session." : "");
                  assert(
                    !form.name?.trim() ||
                      !a.subjects.includes(form.subject) ||
                      !a.sections.includes(form.section)
                      ? "Name, configured subject and section are required."
                      : "",
                  );
                  assert(
                    !Number.isFinite(Number(form.maximum)) || Number(form.maximum) <= 0
                      ? "Maximum marks must be positive."
                      : "",
                  );
                  const next: Exam = {
                    id: uid("EX"),
                    name: form.name.trim(),
                    group: form.group,
                    section: form.section,
                    subject: form.subject,
                    maximum: Number(form.maximum),
                    component: form.component,
                  };
                  x.setExams((old) => [...old, next]);
                  x.setSelectedExam(next.id);
                  history(`Created assessment ${next.id}`);
                });
              }}
            >
              <div className="ex-fields">
                {field("Exam name", "name", undefined, "text", true)}
                {field(
                  "Exam group ID",
                  "group",
                  x.groups
                    .filter((g) => g.session === x.session && g.status === "Active")
                    .map((g) => g.id),
                )}
                {field("Subject", "subject", a.subjects)}
                {field("Section", "section", a.sections)}
                {field("Maximum marks", "maximum", undefined, "number", true)}
                {field("Component", "component", [
                  "Written",
                  "Practical",
                  "Oral",
                  "Project",
                  "Continuous Assessment",
                ])}
                <p>
                  Subject/class mappings are not configured in Academics yet; all configured
                  subjects are available for explicit operator selection.
                </p>
                <Button primary type="submit">
                  Save exam
                </Button>
              </div>
            </form>
          ) : dialog === "Schedule sitting" ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                save(() => {
                  assert(!canConfigure ? "Restricted role." : "");
                  const s: Sitting = {
                    id: form.id || uid("SIT"),
                    exam: form.exam,
                    date: form.date,
                    start: form.start,
                    end: form.end,
                    room: form.room.trim(),
                    teacher: form.teacher,
                  };
                  assert(
                    !a.teachers.some((t) => t.name === s.teacher)
                      ? "Choose an active shared teacher."
                      : "",
                  );
                  assert(scheduleError(s, x.sittings, x.exams, x.groups));
                  x.setSittings((old) => [...old.filter((v) => v.id !== s.id), s]);
                  history(`Saved sitting ${s.id}; class/room/invigilator conflicts validated`);
                });
              }}
            >
              <div className="ex-fields">
                {field(
                  "Exam ID",
                  "exam",
                  x.sessionExams.map((e) => e.id),
                )}
                {field("Exam date", "date", undefined, "date", true)}
                {field("Start time", "start", undefined, "time", true)}
                {field("End time", "end", undefined, "time", true)}
                {field("Room", "room", undefined, "text", true)}
                {field(
                  "Invigilator",
                  "teacher",
                  a.teachers.map((t) => t.name),
                )}
                <Button primary type="submit">
                  Review and save schedule
                </Button>
              </div>
            </form>
          ) : dialog === "Remove schedule" ? (
            <>
              {field("Reason for removing schedule", "reason", undefined, "textarea")}
              <p>
                Removing this sitting affects future admit card previews. Generated document
                snapshots are retained.
              </p>
              <Button
                danger
                disabled={!canConfigure || !form.reason?.trim()}
                onClick={() =>
                  save(() => {
                    x.setSittings((old) => old.filter((s) => s.id !== form.id));
                    history(`Removed sitting ${form.id}; reason: ${form.reason}`);
                  })
                }
              >
                Confirm removal
              </Button>
            </>
          ) : dialog === "Marks entry" ? (
            <>
              <p>
                {candidates.length} candidates · {validCandidates} valid ·{" "}
                {candidates.length - validCandidates} missing/invalid. Blank is not zero.
              </p>
              <Table
                headers={[
                  "Student",
                  "ID",
                  "Marks",
                  "Maximum",
                  "Grade / validation",
                  "State",
                  "Remarks",
                ]}
                rows={marksRows}
              />
              {field("Entry remarks", "remarks", undefined, "textarea")}
              <p>
                Calculation: entered score ÷ maximum × 100, rounded to 2 decimals. One unweighted
                component per assessment; weighting and ranking are not assumed.
              </p>
              {actions(
                <Button disabled={!canMark} onClick={() => saveMarks("Draft")}>
                  Save draft marks
                </Button>,
                <Button disabled={!canMark} onClick={() => saveMarks("Reviewed")}>
                  Validate and submit for review
                </Button>,
              )}
            </>
          ) : dialog === "Publish results" ? (
            <>
              <p>
                Publication scope: {exam?.name} · {candidates.length} candidates.
              </p>
              <p>
                {scores.filter((s) => s.status === "Reviewed").length} reviewed;{" "}
                {
                  candidates.filter(
                    (s) =>
                      !scores.some(
                        (v) => v.student === s.id && !scoreError(v.value, exam?.maximum || 100),
                      ),
                  ).length
                }{" "}
                missing/invalid. Every candidate must have reviewed, graded data.
              </p>
              <p>Actor: {x.actor}. No student portal or notifications are connected.</p>
              <Button primary disabled={!canPublish} onClick={publish}>
                Confirm publication (simulation)
              </Button>
            </>
          ) : dialog === "Result details" ? (
            <>
              <Table
                headers={["Subject", "Score", "Maximum", "Grade", "Status"]}
                rows={scores
                  .filter((s) => s.student === form.student)
                  .map((s) => [
                    exam?.subject,
                    s.value,
                    exam?.maximum,
                    s.grade || "Not published",
                    s.status,
                  ])}
              />
              <div className="ex-pad">
                {scores
                  .find((s) => s.student === form.student)
                  ?.history.map((h) => (
                    <p key={h}>{h}</p>
                  ))}
              </div>
              <Button
                onClick={() => {
                  setDialog("");
                  go("Print Marksheet");
                }}
              >
                View marksheet
              </Button>
            </>
          ) : dialog === "Save template" ? (
            <>
              <p>
                Saving creates a new active template version. Prior versions and generated document
                snapshots are retained. This does not replace historical documents.
              </p>
              <Button
                primary
                disabled={!canConfigure}
                onClick={() =>
                  save(() => {
                    assert(!template.title.trim() ? "A document title is required." : "");
                    x.setTemplateHistory((old) => ({
                      ...old,
                      [docKind]: [...(old[docKind] || []), x.templates[docKind]],
                    }));
                    x.setTemplates((old) => ({
                      ...old,
                      [docKind]: { ...template, version: old[docKind].version + 1 },
                    }));
                    history(`Activated ${docKind} template v${x.templates[docKind].version + 1}`);
                  })
                }
              >
                Confirm new template version
              </Button>
            </>
          ) : dialog === "Document batch" ? (
            <>
              <p>
                {selection.length} selected · {selection.filter((id) => eligibleDoc(id)).length}{" "}
                eligible · {selection.filter((id) => !eligibleDoc(id)).length} excluded ·{" "}
                {selection.length} missing photos (not fabricated).
              </p>
              {candidates
                .filter((s) => selection.includes(s.id) && eligibleDoc(s.id))
                .map((s) => (
                  <div key={s.id}>{document(s, x.templates[docKind])}</div>
                ))}
              <Button
                primary
                disabled={!canConfigure}
                onClick={() =>
                  save(() => {
                    const ready = candidates.filter(
                      (s) => selection.includes(s.id) && eligibleDoc(s.id),
                    );
                    assert(!ready.length ? "No eligible candidates." : "");
                    const fresh = ready.filter(
                      (s) =>
                        !x.generations.some(
                          (g) =>
                            g.kind === docKind &&
                            g.exam === exam?.id &&
                            g.student === s.id &&
                            g.template.version === x.templates[docKind].version,
                        ),
                    );
                    x.setGenerations((old) => [
                      ...old,
                      ...fresh.map((s) => ({
                        id: uid("DOC"),
                        kind: docKind,
                        exam: exam!.id,
                        student: s.id,
                        template: { ...x.templates[docKind] },
                        created: new Date().toISOString(),
                        score: scores.find((v) => v.student === s.id),
                        schedule: sittings.map((s) => ({ ...s })),
                      })),
                    ]);
                    history(
                      `Generated ${fresh.length} ${docKind} previews; ${ready.length - fresh.length} duplicates excluded`,
                    );
                  })
                }
              >
                Confirm generation (simulation)
              </Button>
              <Button onClick={() => window.print()}>Print batch preview</Button>
            </>
          ) : dialog === "Grade scale" ? (
            <>
              <p>
                Illustrative policy only. Full 0–100 coverage with no gaps/overlap at two-decimal
                precision.
              </p>
              {bandDraft.map((b, i) => (
                <div className="ex-grade-row" key={i}>
                  <Field
                    label={`Grade ${i + 1}`}
                    value={b.label}
                    onChange={(v) =>
                      setBandDraft((old) => old.map((b, j) => (j === i ? { ...b, label: v } : b)))
                    }
                  />
                  <Field
                    label={`Minimum ${i + 1}`}
                    type="number"
                    value={String(b.min)}
                    onChange={(v) =>
                      setBandDraft((old) =>
                        old.map((b, j) => (j === i ? { ...b, min: Number(v) } : b)),
                      )
                    }
                  />
                  <Field
                    label={`Maximum ${i + 1}`}
                    type="number"
                    value={String(b.max)}
                    onChange={(v) =>
                      setBandDraft((old) =>
                        old.map((b, j) => (j === i ? { ...b, max: Number(v) } : b)),
                      )
                    }
                  />
                </div>
              ))}
              <Button
                primary
                disabled={!canConfigure}
                onClick={() =>
                  save(() => {
                    assert(gradeError(bandDraft));
                    x.setBands(bandDraft);
                    x.setScaleVersion((v) => v + 1);
                    history(
                      `Activated grade scale v${x.scaleVersion + 1}; published grades unchanged`,
                    );
                  })
                }
              >
                Validate and activate scale
              </Button>
            </>
          ) : dialog === "Question editor" ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                save(() => {
                  assert(!canMark ? "Restricted role." : "");
                  const q: Question = {
                    id: form.id || uid("Q"),
                    subject: form.subject,
                    grade: form.grade,
                    topic: form.topic || "",
                    type: form.type,
                    difficulty: form.difficulty,
                    text: form.text || "",
                    options: (form.options || "").split("\n"),
                    answer: form.answer || "",
                    guide: form.guide || "",
                    marks: Number(form.marks),
                    status: form.status,
                  };
                  assert(questionError(q));
                  assert(
                    x.questions.some(
                      (v) =>
                        v.id !== q.id &&
                        v.text.trim().toLowerCase() === q.text.trim().toLowerCase(),
                    )
                      ? "Duplicate question text."
                      : "",
                  );
                  x.setQuestions((old) => [...old.filter((v) => v.id !== q.id), q]);
                  history(`Saved question ${q.id}`);
                });
              }}
            >
              <div className="ex-fields">
                {field("Subject", "subject", a.subjects)}
                {field("Class", "grade", a.classes)}
                {field("Topic", "topic", undefined, "text", true)}
                {field("Question type", "type", [
                  "Single choice",
                  "True / False",
                  "Short Answer",
                  "Essay",
                ])}
                {field("Difficulty", "difficulty", ["Introductory", "Standard", "Advanced"])}
                {field("Question text", "text", undefined, "textarea", true)}
                {field("Marks", "marks", undefined, "number", true)}
                {form.type === "Single choice" &&
                  field("Four options, one per line", "options", undefined, "textarea")}
                {form.type !== "Essay" &&
                  field(
                    "Expected answer",
                    "answer",
                    form.type === "True / False" ? ["True", "False"] : undefined,
                  )}
                {field("Marking guide / explanation", "guide", undefined, "textarea")}
                {field("Status", "status", ["Active", "Draft", "Archived"])}
                <Button type="submit" primary>
                  Save question
                </Button>
              </div>
            </form>
          ) : dialog === "Question preview" ? (
            <>
              {x.questions
                .filter((q) => q.id === form.id)
                .map((q) => (
                  <Card key={q.id} title={q.text} sub={`${q.type} · ${q.marks} marks`}>
                    <div className="ex-pad">
                      {q.options.map((o, i) => (
                        <p key={i}>{o}</p>
                      ))}
                      <p>Evaluator answer: {q.answer || q.guide}</p>
                    </div>
                  </Card>
                ))}
            </>
          ) : dialog === "Online exam builder" ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                save(() => {
                  assert(!canConfigure ? "Restricted role." : "");
                  const source = x.exams.find((e) => e.id === form.exam),
                    questions = x.questions
                      .filter((q) => questionIds.includes(q.id))
                      .map((q) => ({ ...q, options: [...q.options] }));
                  const o: OnlineExam = {
                    id: uid("OX"),
                    exam: form.exam,
                    name: form.name || "",
                    questions,
                    duration: Number(form.duration),
                    attempts: Number(form.attempts),
                    start: form.start,
                    end: form.end,
                    instructions: form.instructions || "",
                    status: "Draft",
                  };
                  assert(onlineError(o, source));
                  assert(
                    questions.some(
                      (q) => q.grade !== x.groups.find((g) => g.id === source?.group)?.grade,
                    )
                      ? "Question class must match the exam group."
                      : "",
                  );
                  x.setOnline((old) => [...old, o]);
                  history(
                    `Created draft online exam ${o.id}; ${questions.length} frozen question snapshots`,
                  );
                });
              }}
            >
              <div className="ex-fields">
                {field("Online exam name", "name", undefined, "text", true)}
                {field(
                  "Assessment ID",
                  "exam",
                  x.sessionExams.map((e) => e.id),
                )}
                <strong>Choose questions from the shared bank</strong>
                {x.questions
                  .filter((q) => q.status === "Active")
                  .map((q) => (
                    <Button
                      key={q.id}
                      onClick={() =>
                        setQuestionIds((old) =>
                          old.includes(q.id) ? old.filter((id) => id !== q.id) : [...old, q.id],
                        )
                      }
                    >
                      {questionIds.includes(q.id) ? "Selected: " : "Select: "}
                      {q.text} · {q.marks}
                    </Button>
                  ))}
                {!x.questions.length && <p>Create questions in Question Bank first.</p>}
                {field("Duration minutes", "duration", undefined, "number", true)}
                {field("Attempts allowed", "attempts", undefined, "number", true)}
                {field("Access window start", "start", undefined, "datetime-local", true)}
                {field("Access window end", "end", undefined, "datetime-local", true)}
                {field("Instructions", "instructions", undefined, "textarea")}
                <p>
                  {questionIds.length} questions selected. Question order is fixed. Answers remain
                  hidden from student preview after submission.
                </p>
                <Button primary type="submit">
                  Review and save draft exam
                </Button>
              </div>
            </form>
          ) : dialog === "Student exam entry" && currentOnline ? (
            <>
              <strong>{currentOnline.name}</strong>
              <p>{currentOnline.instructions || "Follow the school’s assessment instructions."}</p>
              <p>
                {currentOnline.duration} minutes · {currentOnline.questions.length} questions ·{" "}
                {currentOnline.attempts} allowed attempts · {currentOnline.start} →{" "}
                {currentOnline.end}
              </p>
              <Field
                label="Preview candidate"
                value={candidateId}
                options={onlineExam ? x.candidates(onlineExam).map((s) => s.id) : []}
                onChange={setCandidateId}
              />
              {field("Simulated school clock", "now", undefined, "datetime-local")}
              <p>
                Operator-controlled clock for testing access rules, not a secure timer. Starting an
                attempt is local and lost on reload.
              </p>
              <Button
                primary
                onClick={() => {
                  try {
                    assert(
                      attemptError(
                        currentOnline,
                        candidateId,
                        onlineExam ? x.candidates(onlineExam).map((s) => s.id) : [],
                        x.attempts,
                        form.now,
                      ),
                    );
                    const t: Attempt = {
                      id: uid("ATT"),
                      online: currentOnline.id,
                      student: candidateId,
                      started: new Date(form.now).toISOString(),
                      responses: {},
                      flagged: [],
                      status: "In Progress",
                      marks: {},
                      history: [x.stamp("Started preview attempt")],
                    };
                    x.setAttempts((old) => [...old, t]);
                    setAttemptId(t.id);
                    setQuestionIndex(0);
                    setClock(Date.parse(t.started));
                    setDialog("Student assessment");
                    setError("");
                  } catch (e) {
                    setError((e as Error).message);
                  }
                }}
              >
                Start exam preview
              </Button>
            </>
          ) : dialog === "Student assessment" && attempt && currentOnline ? (
            <>
              <div className="ex-attempt-header">
                <strong>{currentOnline.name}</strong>
                <Badge>Local countdown {durationLabel}</Badge>
              </div>
              <p>Answers are kept in browser memory only · no server autosave.</p>
              <details>
                <summary>
                  Question navigator ·{" "}
                  {Object.values(attempt.responses).filter((v) => v.trim()).length} answered
                </summary>
                <div className="ex-question-nav">
                  {currentOnline.questions.map((q, i) => (
                    <Button key={q.id} onClick={() => setQuestionIndex(i)}>
                      {i + 1}
                      {attempt.responses[q.id] ? " · answered" : ""}
                      {attempt.flagged.includes(q.id) ? " · flagged" : ""}
                    </Button>
                  ))}
                </div>
              </details>
              {(() => {
                const q = currentOnline.questions[questionIndex];
                return q ? (
                  <Card title={`Question ${questionIndex + 1} · ${q.marks} marks`} sub={q.type}>
                    <div className="ex-pad">
                      <p className="ex-question-text">{q.text}</p>
                      <Field
                        label="Your answer"
                        value={attempt.responses[q.id] || ""}
                        options={
                          q.type === "Single choice"
                            ? q.options
                            : q.type === "True / False"
                              ? ["True", "False"]
                              : undefined
                        }
                        type={q.type === "Essay" ? "textarea" : "text"}
                        onChange={(v) => {
                          if (remaining <= 0) return;
                          updateAttempt((t) => ({
                            ...t,
                            responses: { ...t.responses, [q.id]: v },
                          }));
                        }}
                      />
                      <Button
                        onClick={() =>
                          updateAttempt((t) => ({
                            ...t,
                            flagged: t.flagged.includes(q.id)
                              ? t.flagged.filter((id) => id !== q.id)
                              : [...t.flagged, q.id],
                          }))
                        }
                      >
                        {attempt.flagged.includes(q.id) ? "Unflag" : "Mark for review"}
                      </Button>
                    </div>
                  </Card>
                ) : null;
              })()}
              {actions(
                <Button
                  disabled={questionIndex === 0}
                  onClick={() => setQuestionIndex((i) => i - 1)}
                >
                  Previous question
                </Button>,
                <Button
                  disabled={questionIndex === currentOnline.questions.length - 1}
                  onClick={() => setQuestionIndex((i) => i + 1)}
                >
                  Next question
                </Button>,
                <Button primary onClick={() => setDialog("Confirm submission")}>
                  Review submission
                </Button>,
              )}
              {remaining === 0 && (
                <p role="alert">
                  Preview timer expired. Answers are read-only; submit to record the timeout in
                  local history.
                </p>
              )}
            </>
          ) : dialog === "Confirm submission" && attempt && currentOnline ? (
            <>
              <p>
                {Object.values(attempt.responses).filter((v) => v.trim()).length} answered ·{" "}
                {currentOnline.questions.length -
                  Object.values(attempt.responses).filter((v) => v.trim()).length}{" "}
                unanswered · {attempt.flagged.length} flagged.
              </p>
              <p>
                Unanswered questions remain unanswered. This confirmation does not guarantee
                submission integrity or network delivery.
              </p>
              <Button
                primary
                onClick={() => {
                  if (attempt.status !== "In Progress") {
                    setError("Attempt already submitted.");
                    return;
                  }
                  updateAttempt((t) => ({
                    ...t,
                    status: "Submitted",
                    submitted: new Date(clock).toISOString(),
                    history: [
                      ...t.history,
                      x.stamp(
                        remaining
                          ? "In Progress → Submitted"
                          : "Timer expired → Submitted late (preview)",
                      ),
                    ],
                  }));
                  history(`Submitted attempt ${attempt.id}`);
                  setDialog("Submission confirmed");
                }}
              >
                Confirm submission (simulation)
              </Button>
            </>
          ) : dialog === "Submission confirmed" ? (
            <>
              <Badge>Submitted · pending evaluation</Badge>
              <p>
                Local submission recorded. No correct answers are exposed. Reload will discard this
                attempt.
              </p>
              <Button
                onClick={() => {
                  setDialog("");
                  go("Online Exam");
                }}
              >
                Return to online exams
              </Button>
            </>
          ) : dialog === "Evaluate attempt" && attempt && currentOnline ? (
            <>
              <p>
                Candidate: {x.students.find((s) => s.id === attempt.student)?.name} · all questions
                require explicit evaluator marks.
              </p>
              {currentOnline.questions.map((q) => (
                <Card key={q.id} title={q.text} sub={`Maximum ${q.marks}`}>
                  <div className="ex-pad">
                    <p>Response: {attempt.responses[q.id] || "Unanswered"}</p>
                    <p>Expected / guide: {q.answer || q.guide}</p>
                    <Field
                      label={`Awarded marks ${q.id}`}
                      type="number"
                      value={attempt.marks[q.id] || ""}
                      onChange={(v) =>
                        updateAttempt((t) => ({ ...t, marks: { ...t.marks, [q.id]: v } }))
                      }
                    />
                  </div>
                </Card>
              ))}
              <Button
                primary
                onClick={() =>
                  save(() => {
                    assert(!canMark ? "Restricted role." : "");
                    assert(evaluationError(attempt, currentOnline));
                    const e = x.exams.find((e) => e.id === currentOnline.exam)!;
                    assert(
                      !x.candidates(e).some((s) => s.id === attempt.student)
                        ? "Student no longer eligible."
                        : "",
                    );
                    assert(
                      x.scores.some(
                        (s) =>
                          s.exam === e.id &&
                          s.student === attempt.student &&
                          s.status === "Published",
                      )
                        ? "Published result is locked."
                        : "",
                    );
                    const maximum = currentOnline.questions.reduce((n, q) => n + q.marks, 0),
                      value = Object.values(attempt.marks).reduce((n, v) => n + Number(v), 0);
                    assert(
                      maximum !== e.maximum
                        ? "Online maximum differs from the assessment maximum. Create a matching assessment before evaluation."
                        : "",
                    );
                    updateAttempt((t) => ({
                      ...t,
                      status: "Evaluated",
                      history: [...t.history, x.stamp("Submitted → Evaluated")],
                    }));
                    x.setScores((old) => [
                      ...old.filter((s) => !(s.exam === e.id && s.student === attempt.student)),
                      {
                        exam: e.id,
                        student: attempt.student,
                        value: String(value),
                        remark: "Online assessment explicitly evaluated",
                        status: "Draft",
                        history: [
                          x.stamp(
                            `Evaluated attempt ${attempt.id}; ${value}/${maximum}; result Draft`,
                          ),
                        ],
                      },
                    ]);
                    history(`Evaluated ${attempt.id}; draft score created for review`);
                  })
                }
              >
                Confirm evaluation and create draft score
              </Button>
            </>
          ) : null}
          {error && (
            <div className="op-form-error" role="alert">
              {error}
            </div>
          )}
        </AssessmentDialog>
      )}
    </div>
  );
}

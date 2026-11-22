import { Fragment, useEffect, useState, type ReactNode } from "react";
import { useLearning } from "./LearningContext";
import { Button, Badge, Card, Field } from "./components/OperationsUI";
import { AssessmentDialog } from "./components/AssessmentUI";
import {
  assignmentError,
  resourceError,
  bookError,
  available,
  register,
  issue,
  returnLoan,
  overdueDays,
  homeworkPages,
  downloadPages,
  libraryPages,
  learningPages,
  type Assignment,
  type Resource,
  type Book,
  type Loan,
} from "./learningModel";
import "./learning.css";
const uid = (prefix: string) => prefix + "-" + crypto.randomUUID().slice(0, 8);
export function LearningTable({ headers, rows }: { headers: string[]; rows: ReactNode[][] }) {
  return (
    <div className="op-table-wrap">
      <table>
        <thead>
          <tr>
            {headers.map((h) => (
              <th key={h}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {r.map((c, j) => (
                <td key={j}>{c}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {!rows.length && (
        <div className="op-empty">
          <strong>No matching learning records</strong>
          <p>Create a record or change your filters. No activity has been fabricated.</p>
        </div>
      )}
    </div>
  );
}
export default function Learning({
  page,
  active,
  school,
  navigate,
  onDirty,
  notify,
}: {
  page: string;
  active: boolean;
  school: string;
  navigate: (p: string) => void;
  onDirty: (b: boolean) => void;
  notify: (s: string) => void;
}) {
  const x = useLearning(),
    a = x.academic,
    m = x.metrics();
  const [dialog, setDialog] = useState(""),
    [f, setF] = useState<Record<string, string>>({}),
    [error, setError] = useState(""),
    [dirty, setDirty] = useState(false),
    [q, setQ] = useState(""),
    [status, setStatus] = useState("All"),
    [grade, setGrade] = useState("All"),
    [sort, setSort] = useState("A–Z"),
    [index, setIndex] = useState(1),
    [selected, setSelected] = useState<string[]>([]),
    [details, setDetails] = useState(true),
    [state, setState] = useState("Ready");
  const isHomework = homeworkPages.includes(page),
    isResource = downloadPages.includes(page),
    kind = page === "Add Staff Member" ? "Staff" : "Student";
  const canTeach = ["Administrator", "Teacher"].includes(x.role),
    canLibrary = ["Administrator", "Librarian"].includes(x.role),
    canResource = ["Administrator", "Teacher"].includes(x.role);
  const close = () => {
    if (dirty && !window.confirm("Discard unsaved learning form changes?")) return;
    setDialog("");
    setDirty(false);
    setError("");
  };
  useEffect(() => {
    setDialog("");
    setDirty(false);
    setQ("");
    setSelected([]);
    setIndex(1);
    setError("");
    setStatus("All");
    setGrade("All");
  }, [page, active]);
  useEffect(() => {
    if (active) onDirty(dirty);
  }, [active, dirty, onDirty]);
  const go = (p: string) => {
    if (dirty && !window.confirm("Discard unsaved learning changes?")) return;
    setDirty(false);
    navigate(p);
  };
  const open = (type: string, form: Record<string, string> = {}) => {
    setDialog(type);
    setF(form);
    setError("");
    setDirty(false);
  };
  const set = (key: string, v: string) => {
    setF((old) => ({ ...old, [key]: v }));
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
      value={f[key] || ""}
      options={options}
      type={type}
      required={required}
      onChange={(v) => set(key, v)}
    />
  );
  const assert = (e: string) => {
    if (e) throw Error(e);
  };
  const save = (fn: () => void) => {
    try {
      fn();
      setDialog("");
      setError("");
      setDirty(false);
      notify("Updated in prototype memory only · no live institutional action");
    } catch (e) {
      setError((e as Error).message);
    }
  };
  const acts = (...nodes: ReactNode[]) => (
    <div className="op-inline">
      {nodes.map((n, i) => (
        <Fragment key={i}>{n}</Fragment>
      ))}
    </div>
  );
  const stats = (items: [string, string, string][]) => (
    <div className="learn-stats">
      {items.map(([label, value, dest]) => (
        <Button key={label} onClick={() => go(dest)}>
          <span>
            {label}
            <strong>{value}</strong>
            <small>Shared prototype records</small>
          </span>
        </Button>
      ))}
    </div>
  );
  const toolbar = (
    <div className="learn-filters">
      <Field
        label="Search learning records"
        value={q}
        onChange={(v) => {
          setQ(v);
          setIndex(1);
        }}
      />
      <Field
        label="Record status"
        value={status}
        options={["All", "Draft", "Published", "Active", "Archived"]}
        onChange={(v) => {
          setStatus(v);
          setIndex(1);
        }}
      />
      <Field
        label="Class filter"
        value={grade}
        options={["All", ...a.classes]}
        onChange={(v) => {
          setGrade(v);
          setIndex(1);
        }}
      />
      <Field label="Sort" value={sort} options={["A–Z", "Z–A"]} onChange={setSort} />
      <Button onClick={() => setDetails((v) => !v)}>
        {details ? "Hide" : "Show"} detail columns
      </Button>
    </div>
  );
  const matches = (title: string, s: string, g = "") =>
    title.toLowerCase().includes(q.toLowerCase()) &&
    (status === "All" || status === s) &&
    (grade === "All" || g === grade);
  const sorted = <T extends { title: string }>(rows: T[]) =>
    [...rows].sort((a, b) =>
      sort === "A–Z" ? a.title.localeCompare(b.title) : b.title.localeCompare(a.title),
    );
  const paginate = (headers: string[], rows: ReactNode[][]) => (
    <>
      <LearningTable
        headers={headers}
        rows={rows.slice(
          (Math.min(index, Math.max(1, Math.ceil(rows.length / 10))) - 1) * 10,
          Math.min(index, Math.max(1, Math.ceil(rows.length / 10))) * 10,
        )}
      />
      <div className="learn-pad op-inline">
        <span>
          {rows.length} records · page {Math.min(index, Math.max(1, Math.ceil(rows.length / 10)))}
        </span>
        <Button disabled={index <= 1} onClick={() => setIndex((v) => v - 1)}>
          Previous
        </Button>
        <Button disabled={index * 10 >= rows.length} onClick={() => setIndex((v) => v + 1)}>
          Next
        </Button>
      </div>
    </>
  );
  const tick = (id: string) =>
    setSelected((old) => (old.includes(id) ? old.filter((v) => v !== id) : [...old, id]));
  const assignment = (v?: Assignment) =>
    open(
      "Homework editor",
      v
        ? { ...v, history: "" }
        : {
            date: a.day,
            due: a.day + "T16:00",
            grade: a.classes[0] || "",
            section: a.sections[0] || "",
            subject: a.subjects[0] || "",
            teacher: a.teachers[0]?.name || "",
            type: "Assignment",
            method: "Text response",
            late: "Allow and label late",
            resubmit: "No",
            status: "Draft",
          },
    );
  const resource = (v?: Resource) =>
    open(
      "Resource editor",
      v
        ? { ...v, history: "" }
        : {
            date: a.day,
            grade: a.classes[0] || "",
            section: a.sections[0] || "",
            subject: a.subjects[0] || "",
            uploader: x.workforce.staff.find((s) => s.status === "Active")?.name || "",
            category: "Worksheet",
            scope: "Selected class",
            status: "Draft",
            size: "1",
          },
    );
  const editBook = (v?: Book) =>
    open(
      "Book editor",
      v
        ? { ...v, copies: String(v.copies), unavailable: String(v.unavailable), history: "" }
        : { copies: "1", unavailable: "0", status: "Active", category: "General" },
    );
  const books = sorted(
    x.library.books.filter((b) => matches(`${b.title} ${b.author} ${b.isbn}`, b.status)),
  );
  const resources = sorted(
    x.resources.filter((r) => r.session === x.session && matches(r.title, r.status, r.grade)),
  );
  const assignments = sorted(
    x.assignments.filter((h) => h.session === x.session && matches(h.title, h.status, h.grade)),
  );
  const loanRows = x.library.loans.filter((l) =>
    `${x.library.books.find((b) => b.id === l.book)?.title} ${x.library.members.find((m) => m.id === l.member)?.person}`
      .toLowerCase()
      .includes(q.toLowerCase()),
  );
  const loanTable = (loans: Loan[]) =>
    paginate(
      ["Book", "Borrower", "Issue / due", "State", "Actions"],
      loans.map((l) => {
        const member = x.library.members.find((m) => m.id === l.member);
        return [
          x.library.books.find((b) => b.id === l.book)?.title,
          member ? x.person(member.kind, member.person)?.name : "Missing identity",
          `${l.issued} → ${l.due}`,
          l.returned
            ? `Closed · ${l.condition} · ${l.returned}`
            : l.due < a.day
              ? "Overdue"
              : "Issued",
          acts(
            <Button
              disabled={!canLibrary || !!l.returned}
              onClick={() => open("Return book", { id: l.id, date: a.day, condition: "Good" })}
            >
              Return
            </Button>,
            <Button
              disabled={!canLibrary || !!l.returned}
              onClick={() => open("Renew loan", { id: l.id, due: l.due, reason: "" })}
            >
              Renew
            </Button>,
            <Button onClick={() => open("Loan receipt", { id: l.id })}>Receipt / history</Button>,
          ),
        ];
      }),
    );
  return (
    <div className="op learn" hidden={!active}>
      <div className="op-heading">
        <div>
          <div className="op-eyebrow">OPERATIONS / LEARNING SERVICES</div>
          <div className="learn-title" role="heading" aria-level={1}>
            {["Homework", "Download Center", "Library"].includes(page) ? page + " Overview" : page}
          </div>
          <p>Assignments, resources and circulation connected to your school.</p>
        </div>
        <div className="op-heading-actions">
          <Button icon="settings" onClick={() => open("Preview and policies")}>
            Preview and policies
          </Button>
          <Button
            primary
            icon="plus"
            disabled={isHomework ? !canTeach : isResource ? !canResource : !canLibrary}
            onClick={() => (isHomework ? assignment() : isResource ? resource() : editBook())}
          >
            {isHomework ? "Add homework" : isResource ? "Add resource" : "Add book"}
          </Button>
        </div>
      </div>
      <div className="op-context">
        <Field label="Learning workspace" value={page} options={learningPages} onChange={go} />
        <span>
          {x.session} · {school}
        </span>
        <Badge>Illustrative Data</Badge>
        <span>Simulation · resets on reload</span>
      </div>
      <div className="learn-tabs">
        {(isHomework ? homeworkPages : isResource ? downloadPages : libraryPages).map((p) => (
          <Button key={p} disabled={p === page} onClick={() => go(p)}>
            {p === "Homework" || p === "Download Center" || p === "Library" ? "Overview" : p}
          </Button>
        ))}
      </div>
      <div className="op-notice">
        No real submissions, file storage, downloads, notifications or library transactions. Role
        selection is not authentication.
      </div>
      {state !== "Ready" ? (
        <Card title={state} sub="Learning services state preview">
          <div className="op-empty">
            {state === "Loading" ? (
              <div className="op-skeleton" />
            ) : (
              <strong>
                {state === "Restricted"
                  ? "Access restricted"
                  : state === "Error"
                    ? "Records could not be loaded"
                    : "No records available"}
              </strong>
            )}
            <Button onClick={() => setState("Ready")}>Return to records</Button>
          </div>
        </Card>
      ) : (
        <>
          {isHomework ? (
            <>
              {page === "Homework" &&
                stats([
                  ["Published assignments", String(m.active), "Add Homework"],
                  ["Pending review", String(m.pending), "Add Homework"],
                  [
                    "Draft assignments",
                    String(
                      x.assignments.filter((h) => h.session === x.session && h.status === "Draft")
                        .length,
                    ),
                    "Add Homework",
                  ],
                ])}
              <Card
                title={page === "Homework" ? "Assignment activity" : "Assignment register"}
                sub="Draft → Published → Submitted → Reviewed. Blank marks are never zero."
                action={
                  <Button disabled={!canTeach} onClick={() => assignment()}>
                    Create assignment
                  </Button>
                }
              >
                {toolbar}
                {paginate(
                  ["Assignment", "Class / subject", "Due", "Submissions", "Status", "Actions"],
                  assignments.map((h) => [
                    h.title,
                    `${h.grade} / ${h.section} · ${h.subject}`,
                    h.due,
                    `${x.submissions.filter((s) => s.assignment === h.id).length} / ${x.recipients(h).length}`,
                    <Badge>{h.status}</Badge>,
                    acts(
                      <Button onClick={() => open("Assignment details", { id: h.id })}>
                        Details / submissions
                      </Button>,
                      <Button
                        disabled={!canTeach || h.status !== "Draft"}
                        onClick={() => assignment(h)}
                      >
                        Edit draft
                      </Button>,
                      <Button
                        disabled={!canTeach}
                        onClick={() =>
                          assignment({ ...h, id: "", title: h.title + " copy", status: "Draft" })
                        }
                      >
                        Duplicate
                      </Button>,
                    ),
                  ]),
                )}
              </Card>
            </>
          ) : isResource ? (
            <>
              {page === "Download Center" &&
                stats([
                  [
                    "Resources",
                    String(x.resources.filter((r) => r.session === x.session).length),
                    "Content Share List",
                  ],
                  ["Shared resources", String(m.shared), "Content Share List"],
                  [
                    "Draft resources",
                    String(
                      x.resources.filter((r) => r.session === x.session && r.status === "Draft")
                        .length,
                    ),
                    "Content Share List",
                  ],
                ])}
              <Card
                title={
                  page === "Upload/Share Content"
                    ? "Resource upload and sharing"
                    : "Learning resource registry"
                }
                sub="Filename/size metadata simulation only · storage and download counts are not connected."
                action={
                  <Button disabled={!canResource} onClick={() => resource()}>
                    Upload/share resource
                  </Button>
                }
              >
                {toolbar}
                <div className="learn-pad">
                  {acts(
                    <Button
                      disabled={!selected.length || !canResource}
                      onClick={() => open("Archive resources", { reason: "" })}
                    >
                      Archive selected ({selected.length})
                    </Button>,
                    <Button onClick={() => setSelected([])}>Clear selection</Button>,
                  )}
                </div>
                {paginate(
                  [
                    "Select",
                    "Resource",
                    "Subject / class",
                    "Scope",
                    ...(details ? ["File / size", "Uploaded by / date"] : []),
                    "Status",
                    "Actions",
                  ],
                  resources.map((r) => [
                    <Button onClick={() => tick(r.id)}>
                      {selected.includes(r.id) ? "Selected" : "Select"}
                    </Button>,
                    `${r.title} · ${r.category}`,
                    `${r.subject} / ${r.grade}`,
                    r.scope,
                    ...(details
                      ? [`${r.filename} / ${r.size} MB`, `${r.uploader} / ${r.date}`]
                      : []),
                    r.status,
                    acts(
                      <Button onClick={() => open("Resource preview", { id: r.id })}>
                        Preview
                      </Button>,
                      <Button
                        disabled={!canResource || r.status === "Archived"}
                        onClick={() => resource(r)}
                      >
                        Edit/share scope
                      </Button>,
                      <Button
                        onClick={() =>
                          notify("Download simulated only · no file bytes or persistent link exist")
                        }
                      >
                        Download simulation
                      </Button>,
                    ),
                  ]),
                )}
              </Card>
            </>
          ) : page === "Book List" ? (
            <Card
              title="Library catalog"
              sub="Available = total − unresolved issued − lost/damaged copies."
              action={
                <Button disabled={!canLibrary} onClick={() => editBook()}>
                  Add catalog book
                </Button>
              }
            >
              {toolbar}
              {paginate(
                [
                  "Book / ISBN",
                  "Author",
                  ...(details ? ["Category / shelf"] : []),
                  "Total",
                  "Available",
                  "Status",
                  "Actions",
                ],
                books.map((b) => [
                  `${b.title} / ${b.isbn || "Not supplied"}`,
                  b.author,
                  ...(details ? [`${b.category} / ${b.shelf || "Unassigned"}`] : []),
                  b.copies,
                  available(x.library, b),
                  b.status,
                  acts(
                    <Button onClick={() => open("Book details", { id: b.id })}>Details</Button>,
                    <Button disabled={!canLibrary} onClick={() => editBook(b)}>
                      Edit / adjust copies
                    </Button>,
                  ),
                ]),
              )}
            </Card>
          ) : page === "Issue - Return" ? (
            <Card
              title="Circulation desk"
              sub={`Preview date ${a.day} · ${x.policy.days}-day illustrative lending period · no fine collected`}
              action={
                <Button
                  disabled={!canLibrary}
                  onClick={() =>
                    open("Issue book", {
                      book: x.library.books.find((b) => available(x.library, b) > 0)?.id || "",
                      member: x.library.members[0]?.id || "",
                      issued: a.day,
                      due: new Date(Date.parse(a.day) + x.policy.days * 86400000)
                        .toISOString()
                        .slice(0, 10),
                    })
                  }
                >
                  Issue book
                </Button>
              }
            >
              {toolbar}
              {loanTable(loanRows)}
            </Card>
          ) : page === "Add Student" || page === "Add Staff Member" ? (
            <Card
              title={`${kind} borrower registration`}
              sub="Identity comes from the existing registry; only membership is created here."
              action={
                <Button
                  disabled={!canLibrary || !selected.length}
                  onClick={() => open("Register borrowers")}
                >
                  Review registrations ({selected.length})
                </Button>
              }
            >
              {toolbar}
              {paginate(
                [
                  "Select",
                  "Identity",
                  "Class / department",
                  "Eligibility",
                  "Membership",
                  "Active loans",
                ],
                x
                  .people(kind)
                  .filter((p) => p.name.toLowerCase().includes(q.toLowerCase()))
                  .map((p) => {
                    const member = x.library.members.find(
                      (m) => m.kind === kind && m.person === p.id,
                    );
                    return [
                      <Button
                        disabled={!!member || p.status !== "Active"}
                        onClick={() => tick(p.id)}
                      >
                        {selected.includes(p.id) ? "Selected" : "Select"}
                      </Button>,
                      `${p.name} / ${p.id}`,
                      "grade" in p ? p.grade : "department" in p ? p.department : "",
                      p.status,
                      member?.id || "Not registered",
                      member
                        ? x.library.loans.filter((l) => l.member === member.id && !l.returned)
                            .length
                        : 0,
                    ];
                  }),
              )}
            </Card>
          ) : (
            <>
              {stats([
                ["Catalog titles", String(x.library.books.length), "Book List"],
                [
                  "Available copies",
                  String(x.library.books.reduce((n, b) => n + available(x.library, b), 0)),
                  "Book List",
                ],
                ["Issued copies", String(m.issued), "Issue - Return"],
                ["Overdue loans", String(m.overdue), "Issue - Return"],
                [
                  "Student members",
                  String(x.library.members.filter((m) => m.kind === "Student").length),
                  "Add Student",
                ],
                [
                  "Staff members",
                  String(x.library.members.filter((m) => m.kind === "Staff").length),
                  "Add Staff Member",
                ],
              ])}
              <Card
                title="Circulation activity and overdue watchlist"
                sub="Shared circulation records; no decorative usage metrics."
              >
                {loanTable(x.library.loans)}
              </Card>
            </>
          )}
        </>
      )}
      <div className="op-footnote">
        <span>
          {dirty ? "Unsaved changes" : "Local prototype state"} · {x.role} preview
        </span>
        <span>{school}</span>
      </div>
      {dialog && active && (
        <AssessmentDialog title={dialog} onClose={close}>
          {dialog === "Preview and policies" ? (
            <>
              <Field
                label="Preview role"
                value={x.role}
                options={[
                  "Administrator",
                  "Teacher",
                  "Librarian",
                  "Student",
                  "Staff borrower",
                  "Management",
                ]}
                onChange={x.setRole}
              />
              <Field
                label="Data state"
                value={state}
                options={["Ready", "Loading", "Empty", "Error", "Restricted"]}
                onChange={setState}
              />
              <p>Illustrative policy values. Changing them does not rewrite existing loan dates.</p>
              {(["days", "renewals", "limit", "fine"] as const).map((key) => (
                <Field
                  key={key}
                  label={`Library policy ${key}`}
                  type="number"
                  value={String(x.policy[key])}
                  onChange={(v) => {
                    const n = Number(v);
                    if (
                      Number.isFinite(n) &&
                      Number.isInteger(n) &&
                      n >= (key === "days" || key === "limit" ? 1 : 0)
                    )
                      x.setPolicy((old) => ({ ...old, [key]: n }));
                  }}
                />
              ))}
              <Field
                label="Maximum file size MB"
                type="number"
                value={String(x.fileLimit)}
                onChange={(v) => {
                  if (Number(v) > 0) x.setFileLimit(Number(v));
                }}
              />
              <p>
                Fine is a minor-unit/day preview only; no Finance posting or collection.
                Teacher/student ownership scope needs server enforcement.
              </p>
            </>
          ) : dialog === "Homework editor" ? (
            <form
              className="learn-fields"
              onSubmit={(e) => {
                e.preventDefault();
                const h: Assignment = {
                  ...f,
                  title: f.title || "",
                  instructions: f.instructions || "",
                  grade: f.grade || "",
                  section: f.section || "",
                  subject: f.subject || "",
                  teacher: f.teacher || "",
                  date: f.date || "",
                  due: f.due || "",
                  type: f.type || "",
                  maximum: f.maximum || "",
                  method: f.method || "",
                  resource: f.resource || "",
                  late: f.late || "",
                  resubmit: f.resubmit || "",
                  status: f.status || "Draft",
                  id: f.id || uid("HW"),
                  session: x.session,
                  history: [],
                } as Assignment;
                try {
                  assert(!canTeach ? "Restricted role." : "");
                  assert(assignmentError(h));
                  if (f.status === "Published") {
                    setF({ ...f, id: h.id });
                    setDialog("Publish homework");
                    setDirty(false);
                  } else
                    save(() =>
                      x.setAssignments((old) => [
                        ...old.filter((v) => v.id !== h.id),
                        {
                          ...h,
                          history: [
                            ...(old.find((v) => v.id === h.id)?.history || []),
                            x.stamp("Saved Draft"),
                          ],
                        },
                      ]),
                    );
                } catch (e) {
                  setError((e as Error).message);
                }
              }}
            >
              {field("Homework title", "title", undefined, "text", true)}
              {field("Instructions", "instructions", undefined, "textarea", true)}
              {field("Class", "grade", a.classes)}
              {field("Section", "section", a.sections)}
              {field("Subject", "subject", a.subjects)}
              {field(
                "Teacher",
                "teacher",
                a.teachers.map((t) => t.name),
              )}
              {field("Assignment date", "date", undefined, "date", true)}
              {field("Due date and time", "due", undefined, "datetime-local", true)}
              {field("Assignment type", "type", ["Assignment", "Project", "Reading", "Practice"])}
              {field("Submission method", "method", [
                "Text response",
                "Attachment filename preview",
              ])}
              {field("Resource ID (optional)", "resource", [
                "None",
                ...x.resources
                  .filter((r) => r.session === x.session && r.status === "Published")
                  .map((r) => r.id),
              ])}
              {field("Maximum marks (optional)", "maximum", undefined, "number")}
              {field("Late policy", "late", ["Allow and label late", "Block late"])}
              {field("Allow resubmission", "resubmit", ["No", "Yes"])}
              {field("Status", "status", ["Draft", "Published"])}
              <Button primary type="submit">
                Review and save homework
              </Button>
            </form>
          ) : dialog === "Publish homework" ? (
            <>
              <p>
                Publish {f.title} to active students in {f.grade} / {f.section}. No notifications
                are sent.
              </p>
              <Button
                primary
                disabled={!canTeach}
                onClick={() =>
                  save(() => {
                    const h = {
                      ...f,
                      session: x.session,
                      history: [x.stamp("Draft → Published; confirmed recipient scope")],
                    } as Assignment;
                    assert(assignmentError(h));
                    x.setAssignments((old) => [...old.filter((v) => v.id !== h.id), h]);
                  })
                }
              >
                Confirm publish homework
              </Button>
            </>
          ) : dialog === "Assignment details" ? (
            (() => {
              const h = x.assignments.find((h) => h.id === f.id)!;
              const submissions = x.submissions.filter((s) => s.assignment === h.id);
              return (
                <>
                  <strong>{h.title}</strong>
                  <p>{h.instructions}</p>
                  <p>
                    {h.grade} / {h.section} · {h.subject} · {h.teacher} · {h.due} · {h.status}
                  </p>
                  <p>
                    {x.recipients(h).length} eligible recipients · {h.late} · resubmission{" "}
                    {h.resubmit}
                  </p>
                  {h.status === "Published" && (
                    <Button
                      onClick={() =>
                        open("Simulate submission", {
                          assignment: h.id,
                          student: x.recipients(h)[0]?.id || "",
                          submitted: h.due,
                          text: "",
                        })
                      }
                    >
                      Preview student submission
                    </Button>
                  )}
                  <LearningTable
                    headers={[
                      "Student",
                      "Submitted",
                      "Late",
                      "Marks / feedback",
                      "Status",
                      "Action",
                    ]}
                    rows={submissions.map((s) => [
                      x.students.find((p) => p.id === s.student)?.name,
                      s.submitted,
                      s.submitted > h.due ? "Late" : "On time",
                      `${s.marks || "Ungraded"} / ${s.feedback}`,
                      s.status,
                      <Button
                        disabled={!canTeach}
                        onClick={() =>
                          open("Review submission", {
                            id: s.id,
                            marks: s.marks,
                            feedback: s.feedback,
                          })
                        }
                      >
                        Review
                      </Button>,
                    ])}
                  />
                  {h.history.map((v, i) => (
                    <p key={i}>{v}</p>
                  ))}
                </>
              );
            })()
          ) : dialog === "Simulate submission" ? (
            <form
              className="learn-fields"
              onSubmit={(e) => {
                e.preventDefault();
                save(() => {
                  const h = x.assignments.find((h) => h.id === f.assignment)!;
                  assert(
                    !x.recipients(h).some((s) => s.id === f.student)
                      ? "Student is not eligible."
                      : "",
                  );
                  assert(
                    !f.text?.trim() || !Number.isFinite(Date.parse(f.submitted))
                      ? "Response and timestamp are required."
                      : "",
                  );
                  assert(
                    f.submitted > h.due && h.late === "Block late"
                      ? "Late submission blocked by policy."
                      : "",
                  );
                  const previous = x.submissions.find(
                    (s) => s.assignment === h.id && s.student === f.student,
                  );
                  assert(previous && h.resubmit !== "Yes" ? "Resubmission is not permitted." : "");
                  x.setSubmissions((old) => [
                    ...old.filter((s) => s.id !== previous?.id),
                    {
                      id: previous?.id || uid("SUB"),
                      assignment: h.id,
                      student: f.student,
                      text: f.text,
                      submitted: f.submitted,
                      marks: "",
                      feedback: "",
                      status: "Submitted",
                      history: [
                        ...(previous?.history || []),
                        x.stamp("Simulated student response submitted"),
                      ],
                    },
                  ]);
                });
              }}
            >
              {field(
                "Preview student ID",
                "student",
                x.recipients(x.assignments.find((h) => h.id === f.assignment)!).map((s) => s.id),
              )}
              {field("Submitted timestamp", "submitted", undefined, "datetime-local", true)}
              {field("Response / attachment filename", "text", undefined, "textarea", true)}
              <Button primary type="submit">
                Confirm simulated submission
              </Button>
            </form>
          ) : dialog === "Review submission" ? (
            <>
              {field("Awarded marks", "marks", undefined, "number")}
              {field("Teacher feedback", "feedback", undefined, "textarea")}
              <Button
                primary
                disabled={!canTeach}
                onClick={() =>
                  save(() => {
                    const s = x.submissions.find((s) => s.id === f.id)!,
                      h = x.assignments.find((h) => h.id === s.assignment)!;
                    assert(
                      h.maximum &&
                        (!f.marks?.trim() ||
                          !Number.isFinite(Number(f.marks)) ||
                          Number(f.marks) < 0 ||
                          Number(f.marks) > Number(h.maximum))
                        ? "Enter valid marks within the assignment maximum."
                        : "",
                    );
                    assert(!f.feedback?.trim() ? "Feedback required." : "");
                    x.setSubmissions((old) =>
                      old.map((s) =>
                        s.id === f.id
                          ? {
                              ...s,
                              marks: f.marks,
                              feedback: f.feedback,
                              status: "Reviewed",
                              history: [...s.history, x.stamp("Submitted → Reviewed")],
                            }
                          : s,
                      ),
                    );
                  })
                }
              >
                Confirm teacher review
              </Button>
            </>
          ) : dialog === "Resource editor" ? (
            <form
              className="learn-fields"
              onSubmit={(e) => {
                e.preventDefault();
                try {
                  const r = {
                    ...f,
                    title: f.title || "",
                    description: f.description || "",
                    category: f.category || "",
                    subject: f.subject || "",
                    grade: f.grade || "",
                    section: f.section || "",
                    scope: f.scope || "",
                    filename: f.filename || "",
                    size: f.size || "",
                    uploader: f.uploader || "",
                    date: f.date || "",
                    status: f.status || "Draft",
                    id: f.id || uid("RES"),
                    session: x.session,
                    history: [],
                  } as Resource;
                  assert(resourceError(r, x.fileLimit));
                  setF({ ...f, id: r.id });
                  setDirty(false);
                  setDialog("Confirm resource");
                } catch (e) {
                  setError((e as Error).message);
                }
              }}
            >
              <div className="op-notice">
                Upload simulation: enter filename and size metadata. No file is uploaded or stored.
              </div>
              {field("Resource title", "title", undefined, "text", true)}
              {field("Description", "description", undefined, "textarea")}
              {field("Category", "category", [
                "Worksheet",
                "Revision notes",
                "Past papers",
                "Teaching materials",
                "Audio",
                "Video",
                "Presentation",
              ])}
              {field("Filename with extension", "filename", undefined, "text", true)}
              {field("Illustrative file size MB", "size", undefined, "number", true)}
              {field("Subject", "subject", a.subjects)}
              {field("Class", "grade", a.classes)}
              {field("Section", "section", a.sections)}
              {field(
                "Uploaded by",
                "uploader",
                x.workforce.staff.filter((s) => s.status === "Active").map((s) => s.name),
              )}
              {field("Upload date", "date", undefined, "date")}
              {field("Sharing scope", "scope", [
                "Entire school",
                "Selected class",
                "Selected section",
                "Staff only",
                "Students only",
              ])}
              {field("Status", "status", ["Draft", "Published"])}
              <Button primary disabled={!canResource} type="submit">
                Preview resource sharing
              </Button>
            </form>
          ) : dialog === "Confirm resource" ? (
            <>
              <p>
                {f.title} · {f.filename} · {f.size} MB · {f.scope} · {f.grade} / {f.section} ·{" "}
                {f.status}
              </p>
              <p>Filename metadata only. No upload, cloud storage or student notification.</p>
              <Button
                primary
                disabled={!canResource}
                onClick={() =>
                  save(() => {
                    const r = {
                      ...f,
                      session: x.session,
                      history: [x.stamp(`Saved ${f.status}; share scope ${f.scope}`)],
                    } as Resource;
                    assert(resourceError(r, x.fileLimit));
                    x.setResources((old) => [
                      ...old.filter((v) => v.id !== r.id),
                      {
                        ...r,
                        history: [...(old.find((v) => v.id === r.id)?.history || []), ...r.history],
                      },
                    ]);
                  })
                }
              >
                Confirm resource simulation
              </Button>
            </>
          ) : dialog === "Resource preview" ? (
            (() => {
              const r = x.resources.find((r) => r.id === f.id)!;
              return (
                <>
                  <strong>{r.title}</strong>
                  <p>{r.description}</p>
                  <p>
                    {r.filename} · {r.size} MB · {r.scope} · {r.status}
                  </p>
                  <p>File content unavailable: this prototype retains metadata only.</p>
                  <Button
                    onClick={() =>
                      notify("Share-link simulation: no externally accessible URL exists")
                    }
                  >
                    Copy share-link simulation
                  </Button>
                  {r.history.map((h, i) => (
                    <p key={i}>{h}</p>
                  ))}
                </>
              );
            })()
          ) : dialog === "Archive resources" ? (
            <>
              {field("Archive reason", "reason", undefined, "textarea")}
              <p>
                {selected.length} selected resources. Linked homework keeps its historical resource
                ID; no records are deleted.
              </p>
              <Button
                danger
                disabled={!canResource || !f.reason?.trim()}
                onClick={() =>
                  save(() =>
                    x.setResources((old) =>
                      old.map((r) =>
                        selected.includes(r.id)
                          ? {
                              ...r,
                              status: "Archived",
                              history: [...r.history, x.stamp("Archived: " + f.reason)],
                            }
                          : r,
                      ),
                    ),
                  )
                }
              >
                Confirm bulk archive
              </Button>
            </>
          ) : dialog === "Book editor" ? (
            <form
              className="learn-fields"
              onSubmit={(e) => {
                e.preventDefault();
                try {
                  const b = {
                    ...f,
                    title: f.title || "",
                    isbn: f.isbn || "",
                    author: f.author || "",
                    category: f.category || "",
                    subject: f.subject || "",
                    shelf: f.shelf || "",
                    status: f.status || "Active",
                    description: f.description || "",
                    id: f.id || uid("BOOK"),
                    copies: Number(f.copies),
                    unavailable: Number(f.unavailable || 0),
                    history: [],
                  } as Book;
                  assert(bookError(b, x.library));
                  setF({ ...f, id: b.id });
                  setDirty(false);
                  setDialog("Confirm inventory");
                } catch (e) {
                  setError((e as Error).message);
                }
              }}
            >
              {field("Book title", "title", undefined, "text", true)}
              {field("ISBN", "isbn")}
              {field("Author", "author", undefined, "text", true)}
              {field("Category", "category", undefined, "text", true)}
              {field("Subject", "subject", a.subjects)}
              {field("Shelf/location", "shelf")}
              {field("Total copies", "copies", undefined, "number", true)}
              {field("Description", "description", undefined, "textarea")}
              {field("Status", "status", ["Active", "Archived"])}
              <Button primary disabled={!canLibrary} type="submit">
                Review inventory change
              </Button>
            </form>
          ) : dialog === "Confirm inventory" ? (
            <>
              <p>
                {f.title} · current copies {x.library.books.find((b) => b.id === f.id)?.copies || 0}{" "}
                → proposed {f.copies} · {f.status}
              </p>
              <Button
                primary
                disabled={!canLibrary}
                onClick={() =>
                  save(() =>
                    x.setLibrary((old) => {
                      const b = {
                        ...f,
                        copies: Number(f.copies),
                        unavailable: Number(f.unavailable || 0),
                        history: [
                          ...(old.books.find((b) => b.id === f.id)?.history || []),
                          x.stamp(`Inventory → ${f.copies}; ${f.status}`),
                        ],
                      } as Book;
                      assert(bookError(b, old));
                      return { ...old, books: [...old.books.filter((v) => v.id !== b.id), b] };
                    }),
                  )
                }
              >
                Confirm inventory update
              </Button>
            </>
          ) : dialog === "Book details" ? (
            (() => {
              const b = x.library.books.find((b) => b.id === f.id)!;
              return (
                <>
                  <strong>{b.title}</strong>
                  <p>
                    {b.author} · {b.isbn} · {b.category} · {b.shelf}
                  </p>
                  <p>
                    {available(x.library, b)} available / {b.copies} total · {b.unavailable}{" "}
                    lost/damaged
                  </p>
                  {loanTable(x.library.loans.filter((l) => l.book === b.id))}
                  {b.history.map((h, i) => (
                    <p key={i}>{h}</p>
                  ))}
                </>
              );
            })()
          ) : dialog === "Register borrowers" ? (
            <>
              <p>
                {selected.length} {kind.toLowerCase()} identities selected. Existing profiles are
                not copied.
              </p>
              <Button
                primary
                disabled={!canLibrary}
                onClick={() =>
                  save(() =>
                    x.setLibrary((old) => {
                      let next = old;
                      for (const id of selected) {
                        next = register(
                          next,
                          { id: uid("LIB"), kind, person: id, status: "Active" },
                          x.person(kind, id)?.status === "Active",
                        );
                      }
                      return next;
                    }),
                  )
                }
              >
                Confirm borrower registration
              </Button>
            </>
          ) : dialog === "Issue book" ? (
            <>
              {field(
                "Book ID",
                "book",
                x.library.books.filter((b) => b.status === "Active").map((b) => b.id),
              )}
              {field(
                "Member ID",
                "member",
                x.library.members.map((m) => m.id),
              )}
              {field("Issue date", "issued", undefined, "date")}
              {field("Expected return date", "due", undefined, "date")}
              <p>Confirm one copy issue. Availability and borrower eligibility are revalidated.</p>
              <Button
                primary
                disabled={!canLibrary}
                onClick={() =>
                  save(() =>
                    x.setLibrary((old) => {
                      const member = old.members.find((m) => m.id === f.member);
                      return issue(
                        old,
                        {
                          id: uid("LOAN"),
                          book: f.book,
                          member: f.member,
                          issued: f.issued,
                          due: f.due,
                          returned: "",
                          condition: "Good",
                          renewals: 0,
                          history: [x.stamp("Confirmed simulated issue")],
                        },
                        !!member && x.person(member.kind, member.person)?.status === "Active",
                        x.policy,
                      );
                    }),
                  )
                }
              >
                Confirm issue (simulation)
              </Button>
            </>
          ) : dialog === "Return book" ? (
            <>
              {field("Return date", "date", undefined, "date")}
              {field("Return condition", "condition", ["Good", "Damaged", "Lost"])}
              <p>
                Overdue days:{" "}
                {overdueDays(x.library.loans.find((l) => l.id === f.id)!.due, f.date) || 0}. Fine
                preview:{" "}
                {overdueDays(x.library.loans.find((l) => l.id === f.id)!.due, f.date) *
                  x.policy.fine || 0}{" "}
                minor units. No charge is posted. Lost/damaged copies stay unavailable.
              </p>
              <Button
                primary
                disabled={!canLibrary}
                onClick={() =>
                  save(() =>
                    x.setLibrary((old) =>
                      returnLoan(
                        old,
                        f.id,
                        f.date,
                        f.condition,
                        x.stamp(`Returned ${f.date}; condition ${f.condition}`),
                      ),
                    ),
                  )
                }
              >
                Confirm return (simulation)
              </Button>
            </>
          ) : dialog === "Renew loan" ? (
            <>
              {field("New due date", "due", undefined, "date")}
              {field("Reason", "reason", undefined, "textarea")}
              <Button
                disabled={!canLibrary}
                onClick={() =>
                  save(() =>
                    x.setLibrary((old) => {
                      const loan = old.loans.find((l) => l.id === f.id);
                      assert(!loan || !!loan.returned ? "Loan is already closed." : "");
                      assert(loan!.renewals >= x.policy.renewals ? "Renewal limit reached." : "");
                      assert(
                        !/^\d{4}-\d{2}-\d{2}$/.test(f.due) ||
                          f.due <= loan!.due ||
                          !f.reason?.trim()
                          ? "A later due date and reason are required."
                          : "",
                      );
                      return {
                        ...old,
                        loans: old.loans.map((l) =>
                          l.id === f.id
                            ? {
                                ...l,
                                due: f.due,
                                renewals: l.renewals + 1,
                                history: [
                                  ...l.history,
                                  x.stamp(`Renewed ${l.due} → ${f.due}; ${f.reason}`),
                                ],
                              }
                            : l,
                        ),
                      };
                    }),
                  )
                }
              >
                Confirm renewal
              </Button>
            </>
          ) : dialog === "Loan receipt" ? (
            (() => {
              const l = x.library.loans.find((l) => l.id === f.id)!;
              return (
                <>
                  <strong>Circulation receipt · SIMULATION</strong>
                  <p>
                    {school} · {l.id} · book {l.book} · member {l.member}
                  </p>
                  <p>
                    Issue {l.issued} · due {l.due} · return {l.returned || "Open"} · {l.condition}
                  </p>
                  {l.history.map((h, i) => (
                    <p key={i}>{h}</p>
                  ))}
                  <p>No real circulation or financial posting.</p>
                </>
              );
            })()
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

import { useState, lazy, Suspense } from "react";
import "./index.css";
import Icon from "./components/Icon";
import { frontPages, studentPages } from "./operationNavigation";
import { FinanceProvider } from "./FinanceContext";
import { financePages, feePages, incomePages, expensePages } from "./financeModel";
import { AcademicProvider } from "./AcademicContext";
import { academicPages, attendancePages, academicsPages, lessonPages } from "./academicModel";
import { WorkforceProvider } from "./WorkforceContext";
import { ExaminationProvider } from "./ExaminationContext";
import { LearningProvider } from "./LearningContext";
import { OperationsProvider } from "./OperationsContext";
import { CredentialsProvider } from "./CredentialsContext";
import { CMSProvider } from "./CMSContext";
import { ReportsProvider, ReportReturnBar } from "./ReportsContext";
import { SettingsProvider } from "./SettingsContext";
import { settingsPages, systemSettingPages, schoolConfigurationPages } from "./settingsModel";
const Settings = lazy(() => import("./Settings"));
import { reportPages } from "./reportsModel";
const Reports = lazy(() => import("./Reports"));
import { cmsPages } from "./cmsModel";
const CMS = lazy(() => import("./CMS"));
import { credentialPages, certificatePages, alumniPages } from "./credentialsModel";
const Credentials = lazy(() => import("./Credentials"));
import {
  operationsPages as operationalPages,
  inventoryPages,
  transportPages,
} from "./operationsModel";
const Operations = lazy(() => import("./Operations"));
import { learningPages, homeworkPages, downloadPages, libraryPages } from "./learningModel";
const Learning = lazy(() => import("./Learning"));
import { assessmentPages, examinationPages, onlinePages } from "./examinationModel";
const Examinations = lazy(() => import("./Examinations"));
import { hrPages, communicationPages, workforcePages } from "./workforceModel";
const Workforce = lazy(() => import("./Workforce"));
const Academic = lazy(() => import("./Academic"));
const PeopleDirectory = lazy(() => import("./PeopleDirectory"));
const Finance = lazy(() => import("./Finance"));
import type { Student } from "./Lifecycle";
const Lifecycle = lazy(() => import("./Lifecycle"));
const Pulse = lazy(() => import("./Pulse"));

const students = [
  "Olivia Rhye",
  "Phoenix Baker",
  "Lana Steiner",
  "Demi Wilkinson",
  "Drew Cano",
  "Natali Craig",
  "Orlando Diggs",
  "Andi Lane",
  "Kate Morrison",
  "Noah Williams",
  "Ava Thompson",
  "Liam Wilson",
].map((name, i) => ({
  id: `ST-${2024001 + i}`,
  name,
  grade: `Grade ${8 + (i % 4)}`,
  section: ["A", "B", "C"][i % 3],
  guardian: ["Michael Rhye", "Sarah Baker", "James Steiner", "Emma Wilkinson"][i % 4],
  phone: `+1 (555) 240-${1020 + i}`,
  date: "12 Aug 2024",
  status: i === 7 ? "Inactive" : "Active",
}));
const operationGroups = [
  "Front Office",
  "Student Information",
  "Fees Collection",
  "Income",
  "Expenses",
  "Examinations",
  "Attendance",
  "Online Examinations",
  "Academics",
  "Lesson Plan",
  "Human Resource",
  "Communicate",
  "Download Center",
  "Homework",
  "Library",
  "Inventory",
  "Transport",
  "Certificate",
  "Front CMS",
  "Alumni",
  "Reports",
];
const configGroups = [
  "Institution Identity",
  "Academic Configuration",
  "Financial Configuration",
  "People & Access",
  "Student Configuration",
  "Staff & HR Configuration",
  "Communication Configuration",
  "Operational Configuration",
  "Data & Security",
  "Integrations",
];
const modulePages: Record<string, string[]> = {
  Reports: reportPages,
  "Front CMS": cmsPages,
  Certificate: certificatePages,
  Alumni: alumniPages,
  Inventory: inventoryPages,
  Transport: transportPages,
  Homework: homeworkPages,
  "Download Center": downloadPages,
  Library: libraryPages,
  Examinations: examinationPages,
  "Online Examinations": onlinePages,
  "Human Resource": hrPages,
  Communicate: communicationPages,
  "Front Office": frontPages,
  "Student Information": studentPages.filter((p) => p !== "Student 360"),
  "Fees Collection": feePages,
  Income: incomePages,
  Expenses: expensePages,
  Attendance: attendancePages,
  Academics: academicsPages,
  "Lesson Plan": lessonPages,
};
const colors = ["#e8e9fc", "#fce6da", "#d9eee8", "#f3e3ee", "#e0eafa"];
function App() {
  const [layer, setLayer] = useState("pulse");
  const [page, setPageValue] = useState("Overview");
  const [feesRequest, setFeesRequest] = useState(0);
  const [lifecycleDirty, setLifecycleDirty] = useState(false);
  const [expandedModule, setExpandedModule] = useState("Front Office");
  const setPage = (next: string) => {
    if (lifecycleDirty && !window.confirm("Discard unsaved student lifecycle changes?"))
      return false;
    setLifecycleDirty(false);
    setPageValue(next);
    return true;
  };
  const [collapsed, setCollapsed] = useState(false);
  const [session, setSession] = useState("2024 – 2025");
  const [sessionNames, setSessionNames] = useState(["2024 – 2025", "2025 – 2026", "2023 – 2024"]);
  const [school, setSchool] = useState("Ascada School");
  const [brand, setBrand] = useState("Ascada School");
  const [logo, setLogo] = useState("");
  const [draftLogo, setDraftLogo] = useState("");
  const [motto, setMotto] = useState("Knowledge. Character. Possibility.");
  const [accent, setAccent] = useState("#347cb5");
  const [draftAccent, setDraftAccent] = useState("#347cb5");
  const [toast, setToast] = useState("");
  const [modal, setModal] = useState("");
  const [query, setQuery] = useState("");
  const [grade, setGrade] = useState("All classes");
  const [selected, setSelected] = useState<string[]>([]);
  const [profile, setProfile] = useState<Student>(students[0]);
  const [tab, setTab] = useState("Overview");
  const [attendance, setAttendance] = useState<Record<string, string>>({});
  const [widgets, setWidgets] = useState([
    "Enrollment",
    "Financial",
    "Attention",
    "Attendance",
    "Schedule",
    "Activity",
  ]);
  const [view, setView] = useState("Executive overview");
  const [rows, setRows] = useState<Student[]>(students);
  const sessionRows = rows.map((s) => ({ ...s, ...s.enrollments?.[session] }));
  const [sort, setSort] = useState(false);
  const [directoryPage, setDirectoryPage] = useState(1);
  const [directoryStatus, setDirectoryStatus] = useState("All");
  const [hiddenColumns, setHiddenColumns] = useState<number[]>([]);
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});
  const [fields, setFields] = useState(["Blood group", "Previous school", "Transport route"]);
  const [notifs, setNotifs] = useState(false);
  const notify = (text: string) => {
    setToast(text);
    setTimeout(() => setToast(""), 3500);
  };
  const go = (p: string, l = "operations") => {
    if (!setPage(p)) return;
    setLayer(l);
    setQuery("");
    setTab("Overview");
  };
  const exportRows = () => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(
      new Blob(
        [
          "Student ID,Name,Class,Status\n" +
            rows.map((r) => [r.id, r.name, r.grade, r.status].join(",")).join("\n"),
        ],
        { type: "text/csv" },
      ),
    );
    a.download = "schoolos-students.csv";
    a.click();
    notify("Export downloaded");
  };
  const btn = (text: string, action: () => void, icon?: string, primary = false) => (
    <button className={primary ? "btn primary" : "btn"} onClick={action}>
      {icon && <Icon name={icon} size={15} />}
      {text}
    </button>
  );
  const head = (title: string, sub: string, action?: React.ReactNode) => (
    <div className="page-heading">
      <div>
        <div className="eyebrow">
          {layer === "pulse"
            ? "INSTITUTIONAL INTELLIGENCE"
            : layer === "config"
              ? "SYSTEM CONTROL"
              : "OPERATIONAL WORKSPACE"}
        </div>
        <h1>{title}</h1>
        <p>{sub}</p>
      </div>
      <div className="heading-actions">{action}</div>
    </div>
  );
  const panelHead = (title: string, sub?: string, action?: React.ReactNode) => (
    <div className="panel-head">
      <div>
        <h3>{title}</h3>
        {sub && <p>{sub}</p>}
      </div>
      {action || (
        <button className="icon-btn" onClick={() => notify(`${title} is up to date`)}>
          <Icon name="more" />
        </button>
      )}
    </div>
  );
  const kpis = [
    ["Total students", "2,486", "+8.2%", "vs. last session", "users", "Student Directory"],
    ["Active staff", "164", "+12", "this session", "users", "Staff Directory"],
    ["Attendance today", "94.8%", "+1.6%", "vs. last week", "check", "Attendance"],
    ["Absent students", "129", "−18", "vs. yesterday", "users", "Attendance"],
    ["Fees collected", "$284,650", "+12.4%", "this term", "wallet", "Fees Collection"],
    ["Fees outstanding", "$42,380", "68 accounts", "need follow-up", "wallet", "Fees Collection"],
    ["Admissions pipeline", "86", "24 new", "this week", "flag", "Student Admission"],
    ["Active classes", "48", "12 grades", "across 3 sections", "book", "Academics"],
  ];
  function Directory() {
    const staff = page === "Staff Directory",
      guardian = page === "Guardian Directory";
    let filtered = rows.filter(
      (r) =>
        (r.name.toLowerCase().includes(query.toLowerCase()) ||
          r.id.toLowerCase().includes(query.toLowerCase()) ||
          (guardian && r.guardian.toLowerCase().includes(query.toLowerCase()))) &&
        (grade === "All classes" || r.grade === grade) &&
        (directoryStatus !== "Inactive" || r.status === "Inactive") &&
        (directoryStatus !== "Recent" || rows.indexOf(r) < 4),
    );
    if (sort) filtered = [...filtered].sort((a, b) => a.name.localeCompare(b.name));
    const pageCount = Math.max(1, Math.ceil(filtered.length / 8));
    const currentPage = Math.min(directoryPage, pageCount);
    const visibleRows = filtered.slice((currentPage - 1) * 8, currentPage * 8);
    return (
      <>
        {head(
          page,
          staff
            ? "Your people, connected. Manage your institution’s team."
            : guardian
              ? "Connected families. A unified view of every guardian."
              : "A single source of truth for every student in your institution.",
          <>
            {btn("Export", exportRows, "download")}
            {btn(
              staff ? "Add staff" : guardian ? "Add guardian" : "Add student",
              () => setModal("Add student"),
              "plus",
              true,
            )}
          </>,
        )}
        <div className="mini-stats">
          {(staff
            ? [
                ["Total staff", "164"],
                ["Teaching staff", "126"],
                ["Non-teaching", "38"],
                ["On leave", "4"],
              ]
            : guardian
              ? [
                  ["Total guardians", "2,104"],
                  ["Active accounts", "1,982"],
                  ["Multiple children", "382"],
                  ["Pending activation", "122"],
                ]
              : [
                  ["Total students", "2,486"],
                  ["Active students", "2,462"],
                  ["New this session", "186"],
                  ["Inactive", "24"],
                ]
          ).map((k) => (
            <div key={k[0]}>
              <span>{k[0]}</span>
              <strong>{k[1]}</strong>
            </div>
          ))}
        </div>
        <section className="panel registry">
          {!staff && !guardian && (
            <style>
              {hiddenColumns
                .map(
                  (n) => `.registry th:nth-child(${n}),.registry td:nth-child(${n}){display:none}`,
                )
                .join("")}
            </style>
          )}
          <div className="table-tabs">
            <button
              className={directoryStatus === "All" ? "active" : ""}
              onClick={() => {
                setDirectoryStatus("All");
                setQuery("");
                setGrade("All classes");
                setDirectoryPage(1);
              }}
            >
              All {staff ? "staff" : guardian ? "guardians" : "students"}{" "}
              <span>{staff ? "164" : "2,486"}</span>
            </button>
            <button
              onClick={() => {
                setDirectoryStatus("Recent");
                setDirectoryPage(1);
              }}
              className={directoryStatus === "Recent" ? "active" : ""}
            >
              Recently added
            </button>
            <button
              onClick={() => {
                setDirectoryStatus("Inactive");
                setDirectoryPage(1);
              }}
              className={directoryStatus === "Inactive" ? "active" : ""}
            >
              Inactive
            </button>
          </div>
          <div className="table-toolbar">
            <label className="search-field">
              <Icon name="search" size={17} />
              <input
                placeholder="Search by name or student ID..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
            <select value={grade} onChange={(e) => setGrade(e.target.value)}>
              {["All classes", "Grade 8", "Grade 9", "Grade 10", "Grade 11"].map((g) => (
                <option key={g}>{g}</option>
              ))}
            </select>
            {btn("Filters", () => setModal("Filters"), "filter")}
            {btn("Columns", () => setModal("Table columns"), "settings")}
            {btn("Print", () => window.print(), "download")}
          </div>
          {selected.length > 0 && (
            <div className="selection-bar">
              {selected.length} selected {btn("Clear", () => setSelected([]))}
              {btn("Export selected", exportRows)}
            </div>
          )}
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>
                    <input
                      type="checkbox"
                      checked={selected.length === rows.length}
                      onChange={(e) => setSelected(e.target.checked ? rows.map((r) => r.id) : [])}
                    />
                  </th>
                  <th>{staff ? "Staff ID" : "Student ID"}</th>
                  <th>
                    <button onClick={() => setSort(!sort)}>
                      {staff ? "Staff name" : guardian ? "Guardian name" : "Student name"} ↓
                    </button>
                  </th>
                  {(staff
                    ? ["Email", "Role", "Department", "Phone", "Status"]
                    : guardian
                      ? ["Linked students", "Username", "Phone", "Account status"]
                      : ["Class", "Section", "Guardian", "Phone", "Admission date", "Status"]
                  ).map((c) => (
                    <th key={c}>{c}</th>
                  ))}
                  <th />
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((r, i) => (
                  <tr key={r.id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selected.includes(r.id)}
                        onChange={() =>
                          setSelected(
                            selected.includes(r.id)
                              ? selected.filter((id) => id !== r.id)
                              : [...selected, r.id],
                          )
                        }
                      />
                    </td>
                    <td className="muted">{staff ? r.id.replace("ST", "SF") : r.id}</td>
                    <td>
                      <button
                        className="person"
                        onClick={() => {
                          setProfile(r);
                          guardian
                            ? setModal("Guardian details")
                            : staff
                              ? setModal("Staff profile")
                              : go("Student 360");
                        }}
                      >
                        <span className="avatar" style={{ background: colors[i % 5] }}>
                          {r.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </span>
                        <span>
                          {guardian ? r.guardian : r.name}
                          <small>
                            {staff
                              ? "Full-time"
                              : guardian
                                ? "Parent / Guardian"
                                : r.id.replace("ST", "ADM")}
                          </small>
                        </span>
                      </button>
                    </td>
                    {staff ? (
                      <>
                        <td>{r.name.split(" ")[0].toLowerCase()}@westbridge.edu</td>
                        <td>Teacher</td>
                        <td>{["Science", "Mathematics", "Languages"][i % 3]}</td>
                      </>
                    ) : guardian ? (
                      <>
                        <td>
                          {r.name}
                          {i % 3 === 0 ? " +1" : ""}
                        </td>
                        <td>{r.guardian.toLowerCase().replace(" ", ".")}</td>
                      </>
                    ) : (
                      <>
                        <td>{r.grade}</td>
                        <td>
                          <span className="section-tag">{r.section}</span>
                        </td>
                        <td>{r.guardian}</td>
                      </>
                    )}
                    <td>{r.phone}</td>
                    {!staff && !guardian && <td>{r.date}</td>}
                    <td>
                      <button
                        className={"badge " + (r.status === "Active" ? "green" : "neutral")}
                        onClick={() => guardian && notify("Activation invitation sent")}
                      >
                        <i className="tiny-dot" />
                        {r.status}
                      </button>
                    </td>
                    <td>
                      <button
                        className="icon-btn"
                        onClick={() => {
                          setProfile(r);
                          setModal("Student actions");
                        }}
                      >
                        <Icon name="more" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!filtered.length && (
              <div className="empty">
                No students match your search.{" "}
                <button
                  onClick={() => {
                    setQuery("");
                    setGrade("All classes");
                    setDirectoryStatus("All");
                  }}
                >
                  Clear filters
                </button>
              </div>
            )}
          </div>
          <div className="pagination">
            <span>
              Showing {filtered.length ? (currentPage - 1) * 8 + 1 : 0}–
              {Math.min(currentPage * 8, filtered.length)} of {filtered.length} sample{" "}
              {staff ? "staff" : guardian ? "guardians" : "students"}
            </span>
            <div>
              <button
                className="btn"
                disabled={currentPage === 1}
                onClick={() => setDirectoryPage(currentPage - 1)}
              >
                Previous
              </button>
              {Array.from({ length: pageCount }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  className={"page-number " + (n === currentPage ? "active" : "")}
                  onClick={() => setDirectoryPage(n)}
                >
                  {n}
                </button>
              ))}
              <button
                className="btn"
                disabled={currentPage === pageCount}
                onClick={() => setDirectoryPage(currentPage + 1)}
              >
                Next
              </button>
            </div>
          </div>
        </section>
      </>
    );
  }
  function Profile() {
    return (
      <>
        {head(
          "Student 360",
          "Student Information / Student Directory / " + profile.name,
          btn("Back to directory", () => go("Student Directory")),
        )}
        <div className="panel profile-top">
          <span className="big-avatar">{profile.name.split(" ").map((n) => n[0])}</span>
          <div>
            <h2>{profile.name}</h2>
            <p>{profile.id} · Admission ADM-2024-001</p>
            <span className="badge green">Active</span>{" "}
            <span>
              {profile.grade} · Section {profile.section} · {session}
            </span>
          </div>
          {btn("Edit student", () => setModal("Edit student"), "settings")}
        </div>
        <div className="profile-tabs">
          {[
            "Overview",
            "Academics",
            "Attendance",
            "Fees",
            "Examinations",
            "Homework",
            "Documents",
            "Guardian",
            "Activity",
          ].map((t) => (
            <button className={tab === t ? "active" : ""} onClick={() => setTab(t)} key={t}>
              {t}
            </button>
          ))}
        </div>
        <div className="config-grid">
          <section className="panel padded">
            <h3>{tab === "Overview" ? "Student journey" : tab}</h3>
            {(tab === "Overview"
              ? [
                  "Admitted · 12 August 2024",
                  "Enrolled in " + profile.grade,
                  "First term completed · 86.4%",
                  "Mid-term assessment · In progress",
                ]
              : tab === "Guardian"
                ? [profile.guardian, profile.phone, "Primary guardian · Emergency contact"]
                : tab === "Fees"
                  ? ["Annual tuition · $4,500", "Paid to date · $3,250", "Outstanding · $1,250"]
                  : [
                      "Current session · " + session,
                      "Overall performance · Excellent",
                      "Attendance · 96.8%",
                      "Last updated · Today",
                    ]
            ).map((t) => (
              <div className="detail-row" key={t}>
                <Icon name="check" />
                <span>{t}</span>
              </div>
            ))}
          </section>
          <section className="panel padded">
            <h3>At a glance</h3>
            <div className="detail-row">
              Academic standing <b>Excellent</b>
            </div>
            <div className="detail-row">
              Attendance <b>96.8%</b>
            </div>
            <div className="detail-row">
              House <b>Oak House</b>
            </div>
            <div className="detail-row">
              Class teacher <b>Sarah Chen</b>
            </div>
          </section>
        </div>
      </>
    );
  }
  function Attendance() {
    return (
      <>
        {head(
          "Student attendance",
          "A daily record. A lasting impact.",
          btn(
            "Save attendance",
            () => notify("Attendance saved for " + Object.keys(attendance).length + " students"),
            "check",
            true,
          ),
        )}
        <div className="panel padded attendance-filters">
          {["Session", "Class", "Section"].map((l, i) => (
            <label key={l}>
              {l}
              <select>
                <option>{[session, "Grade 8", "Section A"][i]}</option>
                <option>{["2023 – 2024", "Grade 9", "Section B"][i]}</option>
              </select>
            </label>
          ))}
          <label>
            Date
            <input type="date" defaultValue="2025-02-24" />
          </label>
          {btn(
            "Mark all present",
            () => setAttendance(Object.fromEntries(rows.map((r) => [r.id, "Present"]))),
            "check",
          )}
        </div>
        <div className="mini-stats">
          {["Present", "Absent", "Late", "Excused"].map((s) => (
            <div key={s}>
              <span>{s}</span>
              <strong>{Object.values(attendance).filter((v) => v === s).length}</strong>
            </div>
          ))}
        </div>
        <section className="panel">
          <div className="panel-head">
            <h3>Grade 8 · Section A</h3>
            <span className="badge orange">
              {rows.length - Object.keys(attendance).length} unmarked
            </span>
          </div>
          {rows.map((r, i) => (
            <div className="roster" key={r.id}>
              <span className="muted">{String(i + 1).padStart(2, "0")}</span>
              <span className="avatar" style={{ background: colors[i % 5] }}>
                {r.name[0]}
              </span>
              <strong>{r.name}</strong>
              <small>{r.id}</small>
              <div>
                {["Present", "Absent", "Late", "Excused"].map((s) => (
                  <button
                    key={s}
                    className={"attendance-option " + (attendance[r.id] === s ? "chosen" : "")}
                    onClick={() => setAttendance({ ...attendance, [r.id]: s })}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </section>
      </>
    );
  }
  function Config() {
    if (page === "Branding Editor")
      return (
        <>
          {head(
            "School branding",
            "Your institution’s identity, throughout the platform.",
            btn(
              "Apply changes",
              () => {
                setSchool(brand);
                setAccent(draftAccent);
                setLogo(draftLogo);
                notify("Branding applied to your current preview");
              },
              "check",
              true,
            ),
          )}
          <div className="config-grid">
            <section className="panel padded">
              <h3>Institution identity</h3>
              <label className="form-label">
                School name
                <input value={brand} onChange={(e) => setBrand(e.target.value)} />
              </label>
              <label className="form-label">
                School motto
                <input value={motto} onChange={(e) => setMotto(e.target.value)} />
              </label>
              <label className="form-label">
                School logo
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (!file.type.startsWith("image/") || file.size > 2000000) {
                      notify("Choose an image under 2 MB");
                      return;
                    }
                    const reader = new FileReader();
                    reader.onload = () => setDraftLogo(String(reader.result));
                    reader.readAsDataURL(file);
                  }}
                />
              </label>
              <label className="form-label">
                Brand accent color
                <input
                  type="color"
                  value={draftAccent}
                  onChange={(e) => setDraftAccent(e.target.value)}
                />
              </label>
              <p className="muted">Changes are only applied after you confirm.</p>
            </section>
            <section className="panel padded">
              <h3>Live preview</h3>
              <div className="brand-preview">
                <div style={{ background: draftAccent }}>
                  {draftLogo ? (
                    <img
                      src={draftLogo}
                      alt="School logo preview"
                      style={{ width: 40, height: 40, objectFit: "contain" }}
                    />
                  ) : (
                    <Icon name="book" size={28} />
                  )}
                </div>
                <h2>{brand}</h2>
                <p>{motto}</p>
                <button className="btn primary" style={{ background: draftAccent }}>
                  Welcome to your institution
                </button>
              </div>
            </section>
          </div>
        </>
      );
    if (page === "Permissions Matrix")
      return (
        <>
          {head(
            "Roles & permissions",
            "Deliberate access. Institutional accountability.",
            btn("Save permissions", () => setModal("Confirm permissions"), "shield", true),
          )}
          <section className="panel">
            <div className="panel-head">
              <h3>Module permissions</h3>
              <span className="badge neutral">6 action types · 4 roles</span>
            </div>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    {["Module / Action", "Administrator", "Principal", "Teacher", "Accountant"].map(
                      (x) => (
                        <th key={x}>{x}</th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {[
                    "Students",
                    "Fees",
                    "Attendance",
                    "Examinations",
                    "Staff",
                    "Configuration",
                  ].flatMap((m, i) =>
                    ["View", "Create", "Edit", "Delete", "Approve", "Export"].map((a, j) => (
                      <tr key={m + a}>
                        <td>
                          <b>{m}</b> <span className="muted"> / {a}</span>
                        </td>
                        {[0, 1, 2, 3].map((r) => (
                          <td key={r}>
                            <input
                              aria-label={`${m} ${a} role ${r}`}
                              type="checkbox"
                              checked={
                                permissions[m + a + r] ??
                                (r === 0 || j === 0 || (r === 1 && j !== 3) || (r === 2 && i === 2))
                              }
                              onChange={(e) =>
                                setPermissions({ ...permissions, [m + a + r]: e.target.checked })
                              }
                            />
                          </td>
                        ))}
                      </tr>
                    )),
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      );
    if (page === "Custom Fields Builder")
      return (
        <>
          {head(
            "Custom fields",
            "Adapt the platform to the way your institution works.",
            btn("Add field", () => setModal("Add custom field"), "plus", true),
          )}
          <section className="panel">
            <table>
              <thead>
                <tr>
                  {[
                    "Field name",
                    "Type",
                    "Target entity",
                    "Required",
                    "Visible",
                    "Searchable",
                    "Actions",
                  ].map((t) => (
                    <th key={t}>{t}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {fields.map((f) => (
                  <tr key={f}>
                    <td>
                      <b>{f}</b>
                    </td>
                    <td>Text</td>
                    <td>Student</td>
                    {[0, 1, 2].map((x) => (
                      <td key={x}>
                        <input type="checkbox" defaultChecked={x > 0} />
                      </td>
                    ))}
                    <td>
                      <button
                        className="icon-btn"
                        onClick={() => setFields(fields.filter((a) => a !== f))}
                      >
                        <Icon name="close" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </>
      );
    if (page === "Academic Structure")
      return (
        <>
          {head(
            "Academic structure",
            "A flexible foundation for learning.",
            btn("Add class", () => setModal("Add class"), "plus", true),
          )}
          <section className="panel padded">
            <h3>{school}</h3>
            <div className="structure-session">
              <Icon name="calendar" />
              {session} <span className="badge green">Current session</span>
            </div>
            <div className="config-grid">
              {["Primary school", "Middle school", "Secondary school"].map((g, i) => (
                <div className="structure-block" key={g}>
                  <h3>{g}</h3>
                  {[1, 2, 3, 4].map((n) => (
                    <details key={n}>
                      <summary>
                        Grade {i * 4 + n} <span>3 sections · 6 subjects</span>
                      </summary>
                      <div className="detail-row">Section A · Sarah Chen</div>
                      <div className="detail-row">Section B · James Brooks</div>
                      <div className="detail-row">Mathematics · English · Science</div>
                    </details>
                  ))}
                </div>
              ))}
            </div>
          </section>
        </>
      );
    return (
      <>
        {head(
          "Configuration center",
          "The foundation of your institution. Structured, secure, and entirely yours.",
          <span className="badge green">
            <i className="tiny-dot" /> All systems operational
          </span>,
        )}
        <div className="config-summary panel">
          <div className="school-mark">
            <Icon name="book" size={28} />
          </div>
          <div>
            <h2>{school}</h2>
            <p>{session} · Main campus · Institutional plan</p>
          </div>
          <div>
            <strong>86%</strong>
            <p>Configuration complete</p>
            <div className="progress">
              <i />
            </div>
          </div>
          {btn("Complete setup", () => go("Branding Editor", "config"), "arrow")}
        </div>
        <div className="config-grid">
          {configGroups.map((g, i) => (
            <button
              className="panel config-card"
              key={g}
              onClick={() =>
                go(
                  [
                    "Branding Editor",
                    "Academic Structure",
                    "Financial Configuration",
                    "Permissions Matrix",
                    "Custom Fields Builder",
                  ][i % 5],
                  "config",
                )
              }
            >
              <span className="config-icon">
                <Icon
                  name={
                    [
                      "book",
                      "grid",
                      "wallet",
                      "shield",
                      "users",
                      "users",
                      "mail",
                      "settings",
                      "shield",
                      "grid",
                    ][i]
                  }
                />
              </span>
              <div>
                <h3>{g}</h3>
                <p>
                  {
                    [
                      "School profile, logo, branding, and theme",
                      "Sessions, classes, sections, and subjects",
                      "Currency, fees, payment methods, receipts",
                      "Users, roles, permissions, and access policies",
                      "Categories, houses, admissions, custom fields",
                      "Departments, designations, leave, payroll",
                      "Email, SMS, templates, and notifications",
                      "Transport, library, inventory, certificates",
                      "Backups, audit logs, and data retention",
                      "Payments, gateways, API, and webhooks",
                    ][i]
                  }
                </p>
                <small>
                  {i === 6 ? "2 settings need attention" : "Configured"}{" "}
                  <Icon name="chevron" size={13} />
                </small>
              </div>
            </button>
          ))}
        </div>
      </>
    );
  }
  function Workspace() {
    const finance = page === "Fees Collection",
      exam = page === "Examinations";
    return (
      <>
        {head(
          finance ? "Fees & finance" : exam ? "Examinations" : page,
          finance
            ? "Clear accounts. Confident decisions."
            : exam
              ? "From assessment planning to published results."
              : "Manage your institution’s daily workflows.",
          btn(
            finance ? "Collect payment" : exam ? "Create examination" : "Add record",
            () =>
              setModal(finance ? "Collect payment" : exam ? "Create examination" : "Add record"),
            "plus",
            true,
          ),
        )}
        <div className="mini-stats">
          {(finance
            ? [
                ["Collected this term", "$284,650"],
                ["Outstanding", "$42,380"],
                ["Overdue", "$12,450"],
                ["Collection rate", "87.0%"],
              ]
            : exam
              ? [
                  ["Examination groups", "6"],
                  ["Scheduled exams", "24"],
                  ["Results published", "18"],
                  ["Average score", "86.4%"],
                ]
              : [
                  ["Active classes", "48"],
                  ["Sections", "144"],
                  ["Subjects", "32"],
                  ["Teachers assigned", "126"],
                ]
          ).map((k) => (
            <div key={k[0]}>
              <span>{k[0]}</span>
              <strong>{k[1]}</strong>
            </div>
          ))}
        </div>
        <div className="profile-tabs">
          {(finance
            ? [
                "Payment records",
                "Fee structures",
                "Student accounts",
                "Discounts",
                "Bulk receipts",
              ]
            : exam
              ? ["Examination groups", "Schedules", "Marks entry", "Results", "Admit cards"]
              : [
                  "Classes",
                  "Sections",
                  "Subjects",
                  "Teacher assignments",
                  "Timetable",
                  "Promotions",
                ]
          ).map((t) => (
            <button key={t} className={tab === t ? "active" : ""} onClick={() => setTab(t)}>
              {t}
            </button>
          ))}
        </div>
        <section className="panel">
          <div className="panel-head">
            <h3>
              {tab === "Overview"
                ? finance
                  ? "Recent payments"
                  : exam
                    ? "Examination groups"
                    : "Classes & sections"
                : tab}
            </h3>
            {btn("Export", exportRows, "download")}
          </div>
          <table>
            <thead>
              <tr>
                {(finance
                  ? ["Receipt", "Student", "Fee type", "Payment method", "Amount", "Status"]
                  : exam
                    ? ["Examination", "Class", "Schedule", "Subject", "Progress", "Status"]
                    : ["Class", "Sections", "Class teacher", "Students", "Subjects", "Status"]
                ).map((t) => (
                  <th key={t}>{t}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 8).map((r, i) => (
                <tr
                  key={r.id}
                  onClick={() => {
                    setProfile(r);
                    setModal(
                      finance ? "Payment receipt" : exam ? "Examination details" : "Class details",
                    );
                  }}
                >
                  {(finance
                    ? [
                        `RCP-00${i + 124}`,
                        r.name,
                        ["Tuition fee", "Transport", "Library fee"][i % 3],
                        ["Bank transfer", "Card", "Cash"][i % 3],
                        "$1,250.00",
                      ]
                    : exam
                      ? [
                          ["Mid-term assessment", "Final examination", "Unit test"][i % 3],
                          r.grade,
                          "24 Feb – 08 Mar",
                          "Mathematics",
                          "86% complete",
                        ]
                      : [r.grade, "A, B, C", r.guardian, String(28 + i), "6 subjects"]
                  ).map((v, j) => (
                    <td key={j}>{v}</td>
                  ))}
                  <td>
                    <span className="badge green">
                      {finance ? "Paid" : exam ? "In progress" : "Active"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </>
    );
  }
  return (
    <WorkforceProvider>
      <AcademicProvider students={rows} session={session}>
        <FinanceProvider ids={rows.map((r) => r.id)} session={session}>
          <ExaminationProvider students={sessionRows} session={session}>
            <LearningProvider students={sessionRows} session={session}>
              <OperationsProvider students={sessionRows}>
                <CredentialsProvider students={rows} session={session} school={school}>
                  <CMSProvider school={school} session={session} logo={logo} motto={motto}>
                    <ReportsProvider>
                      <SettingsProvider
                        school={school}
                        session={session}
                        logo={logo}
                        motto={motto}
                        students={rows}
                        sessions={sessionNames}
                        setSession={setSession}
                        setSessions={setSessionNames}
                        setStudents={setRows}
                        setIdentity={(v) => {
                          setSchool(v.name);
                          setBrand(v.name);
                          setLogo(v.logo);
                          setDraftLogo(v.logo);
                          setMotto(v.motto);
                        }}
                      >
                        <div
                          className={"app " + (collapsed ? "collapsed" : "")}
                          style={{ "--accent": accent } as React.CSSProperties}
                        >
                          <aside className="sidebar">
                            <div className="product-brand">
                              <div className="product-logo">
                                <Icon name="book" size={23} />
                              </div>
                              <span>
                                School<span className="os">OS</span>
                                <small>INSTITUTIONAL PLATFORM</small>
                              </span>
                              <button
                                className="collapse-button"
                                onClick={() => setCollapsed(!collapsed)}
                              >
                                <Icon name="grid" size={15} />
                              </button>
                            </div>
                            <div className="layer-switch">
                              <span className="nav-caption">YOUR WORKSPACE</span>
                              {[
                                ["pulse", "pulse", "School Pulse", "Intelligence & oversight"],
                                ["operations", "grid", "Operations", "Everyday management"],
                                ["config", "settings", "Configuration", "Institution-wide control"],
                              ].map((l) => (
                                <button
                                  key={l[0]}
                                  className={layer === l[0] ? "selected" : ""}
                                  onClick={() => {
                                    if (
                                      lifecycleDirty &&
                                      !window.confirm("Discard unsaved preview changes?")
                                    )
                                      return;
                                    setLifecycleDirty(false);
                                    setLayer(l[0]);
                                    setPageValue(
                                      l[0] === "pulse"
                                        ? "Overview"
                                        : l[0] === "operations"
                                          ? "Front Office"
                                          : "System Settings Overview",
                                    );
                                  }}
                                >
                                  <Icon name={l[1]} size={19} />
                                  <span>
                                    {l[2]}
                                    <small>{l[3]}</small>
                                  </span>
                                  {layer === l[0] && <i />}
                                </button>
                              ))}
                            </div>
                            <div className="sidebar-navigation">
                              <span className="nav-caption">
                                {layer === "pulse"
                                  ? "INTELLIGENCE"
                                  : layer === "operations"
                                    ? "QUICK LINKS"
                                    : "CONTROL CENTER"}
                              </span>
                              {(layer === "pulse"
                                ? [
                                    ["pulse", "Overview"],
                                    ["users", "Enrollment"],
                                    ["check", "Attendance insights"],
                                    ["wallet", "Financial insights"],
                                    ["book", "Academic performance"],
                                    ["flag", "Attention center"],
                                    ["chart", "Activity timeline"],
                                  ]
                                : layer === "operations"
                                  ? [
                                      ["users", "Student Directory"],
                                      ["users", "Guardian Directory"],
                                      ["wallet", "Fees Collection"],
                                      ["check", "Attendance"],
                                      ["book", "Examinations"],
                                      ["users", "Staff Directory"],
                                      ["grid", "Academics"],
                                    ]
                                  : [
                                      ["settings", "Configuration center"],
                                      ["book", "Branding Editor"],
                                      ["grid", "Academic Structure"],
                                      ["shield", "Permissions Matrix"],
                                      ["settings", "Custom Fields Builder"],
                                    ]
                              ).map((n) => (
                                <button
                                  key={n[1]}
                                  className={"nav-item " + (page === n[1] ? "active" : "")}
                                  title={n[1]}
                                  onClick={() => setPage(n[1])}
                                >
                                  <Icon name={n[0]} size={17} />
                                  <span>{n[1]}</span>
                                  {n[1] === "Attention center" && <b>6</b>}
                                </button>
                              ))}
                              {layer === "config" && (
                                <>
                                  <div className="nav-divider" />
                                  <span className="nav-caption">SYSTEM SETTINGS</span>
                                  {systemSettingPages.map((p) => (
                                    <button
                                      key={p}
                                      title={p}
                                      className={"nav-item " + (page === p ? "active" : "")}
                                      onClick={() => setPage(p)}
                                    >
                                      <Icon name="settings" size={16} />
                                      <span>{p}</span>
                                    </button>
                                  ))}
                                  <div className="nav-divider" />
                                  <span className="nav-caption">SCHOOL CONFIGURATION</span>
                                  {schoolConfigurationPages.map((p) => (
                                    <button
                                      key={p}
                                      title={p}
                                      className={"nav-item " + (page === p ? "active" : "")}
                                      onClick={() => setPage(p)}
                                    >
                                      <Icon name="book" size={16} />
                                      <span>{p}</span>
                                    </button>
                                  ))}
                                </>
                              )}
                              {layer === "pulse" && (
                                <>
                                  <div className="nav-divider" />
                                  <span className="nav-caption">PINNED WORKSPACES</span>
                                  {[
                                    ["users", "Student Directory"],
                                    ["wallet", "Fees Collection"],
                                    ["calendar", "Academic Calendar"],
                                  ].map((n) => (
                                    <button
                                      className="nav-item"
                                      key={n[1]}
                                      onClick={() =>
                                        n[1] === "Academic Calendar"
                                          ? setModal("School calendar")
                                          : go(n[1])
                                      }
                                    >
                                      <Icon name={n[0]} size={17} />
                                      <span>{n[1]}</span>
                                      <Icon name="arrow" size={12} />
                                    </button>
                                  ))}
                                  <button
                                    className="add-shortcut"
                                    onClick={() => setModal("Add shortcut")}
                                  >
                                    <Icon name="plus" size={14} /> Add shortcut
                                  </button>
                                </>
                              )}
                              {layer === "operations" && (
                                <>
                                  <div className="nav-divider" />
                                  <span className="nav-caption">ALL MODULES</span>
                                  {operationGroups.map((g, i) => (
                                    <div key={g}>
                                      <button
                                        title={g}
                                        className={
                                          "nav-item " +
                                          ((g === "Front Office"
                                            ? frontPages
                                            : g === "Student Information"
                                              ? studentPages
                                              : g === "Fees Collection"
                                                ? feePages
                                                : g === "Income"
                                                  ? incomePages
                                                  : g === "Expenses"
                                                    ? expensePages
                                                    : modulePages[g] || []
                                          ).includes(page)
                                            ? "active"
                                            : "")
                                        }
                                        onClick={() => {
                                          if (
                                            g === "Front Office" ||
                                            g === "Student Information" ||
                                            [
                                              "Fees Collection",
                                              "Income",
                                              "Expenses",
                                              "Attendance",
                                              "Academics",
                                              "Lesson Plan",
                                              "Human Resource",
                                              "Communicate",
                                              "Examinations",
                                              "Online Examinations",
                                              "Homework",
                                              "Download Center",
                                              "Library",
                                              "Inventory",
                                              "Transport",
                                              "Certificate",
                                              "Front CMS",
                                              "Reports",
                                              "Alumni",
                                            ].includes(g)
                                          ) {
                                            if (
                                              setPage(
                                                g === "Front Office"
                                                  ? "Front Office"
                                                  : g === "Student Information"
                                                    ? "Student Directory"
                                                    : g === "Certificate"
                                                      ? "Certificates Overview"
                                                      : g === "Reports"
                                                        ? "Reports Overview"
                                                        : g === "Front CMS"
                                                          ? "Front CMS Overview"
                                                          : g === "Alumni"
                                                            ? "Alumni Overview"
                                                            : g,
                                              )
                                            )
                                              setExpandedModule(expandedModule === g ? "" : g);
                                          } else go(g);
                                        }}
                                      >
                                        <Icon
                                          name={
                                            ["grid", "users", "wallet", "chart", "wallet", "book"][
                                              i % 6
                                            ]
                                          }
                                          size={16}
                                        />
                                        <span>{g}</span>
                                        <Icon name="down" size={12} />
                                      </button>
                                      {expandedModule === g &&
                                        (g === "Front Office" ||
                                          g === "Student Information" ||
                                          [
                                            "Fees Collection",
                                            "Income",
                                            "Expenses",
                                            "Attendance",
                                            "Academics",
                                            "Lesson Plan",
                                            "Human Resource",
                                            "Communicate",
                                            "Examinations",
                                            "Online Examinations",
                                            "Homework",
                                            "Download Center",
                                            "Library",
                                            "Inventory",
                                            "Transport",
                                            "Certificate",
                                            "Front CMS",
                                            "Reports",
                                            "Alumni",
                                          ].includes(g)) && (
                                          <div className="op-sidebar-subnav">
                                            {(g === "Front Office"
                                              ? frontPages
                                              : g === "Student Information"
                                                ? studentPages.filter((p) => p !== "Student 360")
                                                : g === "Fees Collection"
                                                  ? feePages
                                                  : g === "Income"
                                                    ? incomePages
                                                    : modulePages[g] || []
                                            ).map((p) => (
                                              <button
                                                title={p}
                                                className={page === p ? "active" : ""}
                                                key={p}
                                                onClick={() => setPage(p)}
                                              >
                                                {p === "Student Directory"
                                                  ? "Student Details"
                                                  : p === "Front Office"
                                                    ? "Overview"
                                                    : p.startsWith("Reports / ")
                                                      ? p.slice(10)
                                                      : p}
                                              </button>
                                            ))}
                                          </div>
                                        )}
                                    </div>
                                  ))}
                                </>
                              )}
                            </div>
                            <div className="sidebar-bottom">
                              <div className="session-status">
                                <i />
                                Academic session active<span>{session}</span>
                              </div>
                              <button
                                className="nav-item"
                                onClick={() => setModal("Help & documentation")}
                              >
                                <Icon name="book" size={17} />
                                <span>Help & documentation</span>
                                <Icon name="arrow" size={12} />
                              </button>
                              <button className="account" onClick={() => setModal("Your account")}>
                                <span className="avatar admin">AM</span>
                                <span>
                                  Alex Morgan<small>Super Administrator</small>
                                </span>
                                <Icon name="down" size={14} />
                              </button>
                            </div>
                          </aside>
                          <div className="main">
                            <header className="topbar">
                              <button
                                className="icon-btn mobile-toggle"
                                title="Toggle navigation"
                                onClick={() => setCollapsed(!collapsed)}
                              >
                                <Icon name="grid" />
                              </button>
                              <div className="institution">
                                <span className="school-mark">
                                  {logo ? (
                                    <img
                                      src={logo}
                                      alt={`${school} logo`}
                                      style={{ width: 24, height: 24, objectFit: "contain" }}
                                    />
                                  ) : (
                                    <Icon name="shield" size={21} />
                                  )}
                                </span>
                                <strong>{school}</strong>
                                <Icon name="down" size={13} />
                              </div>
                              <div className="header-divider" />
                              <select
                                aria-label="Academic session"
                                value={session}
                                onChange={(e) => setSession(e.target.value)}
                              >
                                {sessionNames.map((name) => (
                                  <option key={name}>{name}</option>
                                ))}
                              </select>
                              <button
                                className="global-search"
                                onClick={() => setModal("Global search")}
                              >
                                <Icon name="search" size={17} />
                                <span>Search anything...</span>
                                <kbd>⌘ K</kbd>
                              </button>
                              <button
                                className="icon-btn"
                                onClick={() => setModal("School calendar")}
                              >
                                <Icon name="calendar" />
                              </button>
                              <button
                                className="icon-btn"
                                title="Pending tasks"
                                onClick={() => {
                                  setLayer("pulse");
                                  setPage("Attention center");
                                }}
                              >
                                <Icon name="check" />
                              </button>
                              <button
                                className="icon-btn notification-btn"
                                onClick={() => setNotifs(!notifs)}
                              >
                                <Icon name="bell" />
                                <i />
                              </button>
                              <div className="header-divider" />
                              {btn("Quick add", () => setModal("Quick actions"), "plus")}
                              <span
                                className="avatar admin header-avatar"
                                onClick={() => setModal("Your account")}
                              >
                                AM
                              </span>
                            </header>
                            {notifs && (
                              <div className="notification-popup panel padded">
                                <h3>Notifications</h3>
                                <p>12 new admissions await review</p>
                                <p>4 staff leave requests are pending</p>
                                <button
                                  className="text-button"
                                  onClick={() => {
                                    setNotifs(false);
                                    go("Student Admission");
                                  }}
                                >
                                  Review pending items →
                                </button>
                              </div>
                            )}
                            <div className="breadcrumb">
                              <span>{school}</span>
                              <Icon name="chevron" size={12} />
                              <span>
                                {layer === "pulse"
                                  ? "School Pulse"
                                  : layer === "config"
                                    ? "Institutional Configuration"
                                    : "Operations"}
                              </span>
                              <Icon name="chevron" size={12} />
                              <b>{page}</b>
                              <span className="campus">
                                <i /> Main campus <Icon name="down" size={11} />
                              </span>
                            </div>
                            <main className="content">
                              {layer === "config" && settingsPages.includes(page) && (
                                <Suspense fallback={<div className="op-skeleton" />}>
                                  <Settings
                                    page={page}
                                    active={true}
                                    modules={operationGroups}
                                    navigate={(p) => {
                                      setPageValue(p);
                                      setLayer(
                                        settingsPages.includes(p) || p === "Branding Editor"
                                          ? "config"
                                          : "operations",
                                      );
                                    }}
                                    notify={notify}
                                    onDirty={setLifecycleDirty}
                                  />
                                </Suspense>
                              )}
                              <ReportReturnBar
                                page={page}
                                navigate={(p) => {
                                  setPageValue(p);
                                  setLayer("operations");
                                }}
                              />
                              {layer === "operations" && reportPages.includes(page) && (
                                <Suspense fallback={<div className="op-skeleton" />}>
                                  <Reports
                                    page={page}
                                    active={layer === "operations" && reportPages.includes(page)}
                                    session={session}
                                    school={school}
                                    navigate={(p) => {
                                      setPageValue(p);
                                      setLayer("operations");
                                    }}
                                    notify={notify}
                                    onStudent={(id) => {
                                      const student = rows.find((s) => s.id === id);
                                      if (student) {
                                        setProfile(student);
                                        setPageValue("Student 360");
                                        setLayer("operations");
                                      }
                                    }}
                                  />
                                </Suspense>
                              )}
                              <Suspense fallback={<div className="op-skeleton" />}>
                                <CMS
                                  page={page}
                                  active={layer === "operations" && cmsPages.includes(page)}
                                  navigate={(p) => {
                                    setPageValue(p);
                                    setLayer("operations");
                                  }}
                                  onDirty={setLifecycleDirty}
                                  notify={notify}
                                />
                              </Suspense>
                              <Suspense fallback={<div className="op-skeleton" />}>
                                <Credentials
                                  page={page}
                                  active={layer === "operations" && credentialPages.includes(page)}
                                  navigate={(p) => {
                                    setPageValue(p);
                                    setLayer("operations");
                                  }}
                                  onDirty={setLifecycleDirty}
                                  notify={notify}
                                />
                              </Suspense>
                              <Suspense fallback={<div className="op-skeleton" />}>
                                <Operations
                                  page={page}
                                  active={layer === "operations" && operationalPages.includes(page)}
                                  school={school}
                                  navigate={(p) => {
                                    setPageValue(p);
                                    setLayer("operations");
                                  }}
                                  notify={notify}
                                  onDirty={setLifecycleDirty}
                                />
                              </Suspense>
                              <Suspense fallback={<div className="op-skeleton" />}>
                                <Learning
                                  page={page}
                                  active={layer === "operations" && learningPages.includes(page)}
                                  school={school}
                                  navigate={(p) => {
                                    setPageValue(p);
                                    setLayer("operations");
                                  }}
                                  notify={notify}
                                  onDirty={setLifecycleDirty}
                                />
                              </Suspense>
                              <Suspense fallback={<div className="op-skeleton" />}>
                                <Examinations
                                  page={page}
                                  active={layer === "operations" && assessmentPages.includes(page)}
                                  school={school}
                                  navigate={(p) => {
                                    setPageValue(p);
                                    setLayer("operations");
                                  }}
                                  onStudent={(s) => {
                                    setProfile(s);
                                    setPageValue("Student 360");
                                    setLayer("operations");
                                  }}
                                  onDirty={setLifecycleDirty}
                                  notify={notify}
                                />
                              </Suspense>
                              <div hidden={layer !== "pulse"}>
                                <Suspense
                                  fallback={
                                    <div
                                      className="sp-state-panel"
                                      aria-label="Loading School Pulse"
                                    >
                                      <div className="sp-skeleton" />
                                      <div className="sp-skeleton" />
                                    </div>
                                  }
                                >
                                  <Pulse
                                    school={school}
                                    session={session}
                                    page={layer === "pulse" ? page : "Overview"}
                                    onPage={setPage}
                                    onNavigate={(p) => {
                                      if (p.startsWith("student:")) {
                                        const record = rows.find((r) => r.name === p.slice(8));
                                        if (record) setProfile(record);
                                        go("Student 360");
                                      } else go(p);
                                    }}
                                    notify={notify}
                                  />
                                </Suspense>
                              </div>
                              <Suspense fallback={<div className="op-skeleton" />}>
                                <Lifecycle
                                  feesRequest={feesRequest}
                                  page={page}
                                  session={session}
                                  school={school}
                                  rows={sessionRows}
                                  setRows={setRows}
                                  profile={{
                                    ...(rows.find((s) => s.id === profile.id) || profile),
                                    ...(rows.find((s) => s.id === profile.id)?.enrollments?.[
                                      session
                                    ] || {}),
                                  }}
                                  setProfile={setProfile}
                                  active={
                                    layer === "operations" &&
                                    [
                                      ...frontPages,
                                      ...studentPages,
                                      "Student Information",
                                    ].includes(page)
                                  }
                                  navigate={(p) => {
                                    setPageValue(p);
                                    setLayer("operations");
                                  }}
                                  notify={notify}
                                  onDirty={setLifecycleDirty}
                                />
                              </Suspense>
                              <Suspense fallback={<div className="op-skeleton" />}>
                                <Finance
                                  page={page}
                                  session={session}
                                  school={school}
                                  students={sessionRows}
                                  active={layer === "operations" && financePages.includes(page)}
                                  navigate={(p) => {
                                    setPageValue(p);
                                    setLayer("operations");
                                  }}
                                  onStudent={(s) => {
                                    setFeesRequest((n) => n + 1);
                                    setProfile(s);
                                    setPageValue("Student 360");
                                    setLayer("operations");
                                  }}
                                  notify={notify}
                                  onDirty={setLifecycleDirty}
                                />
                              </Suspense>
                              <Suspense fallback={<div className="op-skeleton" />}>
                                <Academic
                                  page={page}
                                  session={session}
                                  students={rows}
                                  setStudents={setRows}
                                  active={layer === "operations" && academicPages.includes(page)}
                                  navigate={(p) => {
                                    setPageValue(p);
                                    setLayer("operations");
                                  }}
                                  notify={notify}
                                  onDirty={setLifecycleDirty}
                                  onStudent={(s) => {
                                    setProfile(s);
                                    setPageValue("Student 360");
                                    setLayer("operations");
                                  }}
                                />
                              </Suspense>
                              {layer === "operations" && ["Guardian Directory"].includes(page) && (
                                <Suspense fallback={<div className="op-skeleton" />}>
                                  <PeopleDirectory key={page} staff={page === "Staff Directory"} />
                                </Suspense>
                              )}
                              <Suspense fallback={<div className="op-skeleton" />}>
                                <Workforce
                                  page={page}
                                  active={layer === "operations" && workforcePages.includes(page)}
                                  session={session}
                                  school={school}
                                  students={sessionRows}
                                  navigate={(p) => {
                                    setPageValue(p);
                                    setLayer("operations");
                                  }}
                                  notify={notify}
                                  onDirty={setLifecycleDirty}
                                />
                              </Suspense>
                              {layer === "pulse" ||
                              (layer === "config" && settingsPages.includes(page)) ||
                              (layer === "operations" && credentialPages.includes(page)) ||
                              (layer === "operations" && cmsPages.includes(page)) ||
                              (layer === "operations" && reportPages.includes(page)) ||
                              (layer === "operations" && assessmentPages.includes(page)) ||
                              (layer === "operations" && learningPages.includes(page)) ||
                              (layer === "operations" && operationalPages.includes(page)) ||
                              (layer === "operations" && workforcePages.includes(page)) ||
                              (layer === "operations" &&
                                [
                                  ...academicPages,
                                  "Staff Directory",
                                  "Guardian Directory",
                                ].includes(page)) ||
                              (layer === "operations" && financePages.includes(page)) ||
                              (layer === "operations" &&
                                [...frontPages, ...studentPages, "Student Information"].includes(
                                  page,
                                ))
                                ? null
                                : layer === "config"
                                  ? Config()
                                  : page === "Student 360"
                                    ? Profile()
                                    : [
                                          "Student Directory",
                                          "Guardian Directory",
                                          "Staff Directory",
                                        ].includes(page)
                                      ? Directory()
                                      : page === "Attendance"
                                        ? Attendance()
                                        : Workspace()}
                            </main>
                          </div>
                          {toast && (
                            <div className="toast">
                              <Icon name="check" />
                              {toast}
                            </div>
                          )}
                          {modal && (
                            <div className="modal-backdrop" onClick={() => setModal("")}>
                              <div className="modal" onClick={(e) => e.stopPropagation()}>
                                <div className="panel-head">
                                  <h2>{modal}</h2>
                                  <button className="icon-btn" onClick={() => setModal("")}>
                                    <Icon name="close" />
                                  </button>
                                </div>
                                <div className="modal-body">
                                  {modal === "Table columns" ? (
                                    <>
                                      <p className="muted">
                                        Choose which details appear in your student directory.
                                      </p>
                                      {[
                                        "Class",
                                        "Section",
                                        "Guardian",
                                        "Phone",
                                        "Admission date",
                                        "Status",
                                      ].map((name, i) => (
                                        <label key={name} className="detail-row">
                                          <input
                                            type="checkbox"
                                            checked={!hiddenColumns.includes(i + 4)}
                                            onChange={() =>
                                              setHiddenColumns(
                                                hiddenColumns.includes(i + 4)
                                                  ? hiddenColumns.filter((n) => n !== i + 4)
                                                  : [...hiddenColumns, i + 4],
                                              )
                                            }
                                          />
                                          {name}
                                        </label>
                                      ))}
                                      {btn("Apply columns", () => setModal(""), "check", true)}
                                    </>
                                  ) : modal === "Customize dashboard" ? (
                                    <>
                                      <p className="muted">
                                        Choose the intelligence panels that matter to you.
                                      </p>
                                      {[
                                        "Enrollment",
                                        "Financial",
                                        "Attention",
                                        "Attendance",
                                        "Schedule",
                                        "Activity",
                                      ].map((w) => (
                                        <label className="detail-row" key={w}>
                                          <input
                                            type="checkbox"
                                            checked={widgets.includes(w)}
                                            onChange={() =>
                                              setWidgets(
                                                widgets.includes(w)
                                                  ? widgets.filter((x) => x !== w)
                                                  : [...widgets, w],
                                              )
                                            }
                                          />
                                          {w}
                                          <button
                                            onClick={() =>
                                              setWidgets([w, ...widgets.filter((x) => x !== w)])
                                            }
                                          >
                                            Move to top ↑
                                          </button>
                                        </label>
                                      ))}
                                      {btn(
                                        "Save preferences",
                                        () => {
                                          setModal("");
                                          notify("Dashboard preferences saved for this preview");
                                        },
                                        "check",
                                        true,
                                      )}
                                    </>
                                  ) : modal === "Global search" ? (
                                    <>
                                      <label className="search-field">
                                        <Icon name="search" />
                                        <input
                                          autoFocus
                                          placeholder="Search students, modules, settings..."
                                          value={query}
                                          onChange={(e) => setQuery(e.target.value)}
                                        />
                                      </label>
                                      {[
                                        "Student Directory",
                                        "Staff Directory",
                                        "Fees Collection",
                                        "Attendance",
                                        "Examinations",
                                        "Academics",
                                      ]
                                        .filter((x) =>
                                          x.toLowerCase().includes(query.toLowerCase()),
                                        )
                                        .map((x) => (
                                          <button
                                            className="detail-row search-result"
                                            onClick={() => {
                                              go(x);
                                              setModal("");
                                            }}
                                            key={x}
                                          >
                                            {x}
                                            <Icon name="arrow" />
                                          </button>
                                        ))}
                                    </>
                                  ) : modal === "Add student" || modal === "Edit student" ? (
                                    <form
                                      onSubmit={(e) => {
                                        e.preventDefault();
                                        const data = new FormData(e.currentTarget);
                                        setRows([
                                          ...rows,
                                          {
                                            ...students[0],
                                            id: `ST-${2024013 + rows.length}`,
                                            name: String(data.get("name")),
                                          },
                                        ]);
                                        setModal("");
                                        notify("Student record created");
                                      }}
                                    >
                                      <label className="form-label">
                                        Full name
                                        <input
                                          name="name"
                                          required
                                          placeholder="Student full name"
                                        />
                                      </label>
                                      <label className="form-label">
                                        Email
                                        <input
                                          type="email"
                                          required
                                          placeholder="guardian@example.com"
                                        />
                                      </label>
                                      <label className="form-label">
                                        Class
                                        <select>
                                          <option>Grade 8</option>
                                          <option>Grade 9</option>
                                        </select>
                                      </label>
                                      <button className="btn primary" type="submit">
                                        Save student
                                      </button>
                                    </form>
                                  ) : modal === "Add custom field" ? (
                                    <form
                                      onSubmit={(e) => {
                                        e.preventDefault();
                                        setFields([
                                          ...fields,
                                          String(new FormData(e.currentTarget).get("field")),
                                        ]);
                                        setModal("");
                                        notify("Custom field created");
                                      }}
                                    >
                                      <label className="form-label">
                                        Field name
                                        <input name="field" required />
                                      </label>
                                      <label className="form-label">
                                        Field type
                                        <select>
                                          <option>Text</option>
                                          <option>Number</option>
                                          <option>Date</option>
                                          <option>Dropdown</option>
                                        </select>
                                      </label>
                                      <label className="form-label">
                                        Target entity
                                        <select>
                                          <option>Student</option>
                                          <option>Staff</option>
                                          <option>Guardian</option>
                                        </select>
                                      </label>
                                      <button className="btn primary">Create field</button>
                                    </form>
                                  ) : modal === "Filters" ? (
                                    <>
                                      <label className="form-label">
                                        Class
                                        <select
                                          value={grade}
                                          onChange={(e) => setGrade(e.target.value)}
                                        >
                                          {[
                                            "All classes",
                                            "Grade 8",
                                            "Grade 9",
                                            "Grade 10",
                                            "Grade 11",
                                          ].map((g) => (
                                            <option key={g}>{g}</option>
                                          ))}
                                        </select>
                                      </label>
                                      {btn("Apply filters", () => setModal(""), undefined, true)}
                                    </>
                                  ) : modal === "Confirm permissions" ? (
                                    <>
                                      <p>
                                        Changes to permissions affect access across the institution.
                                        Please confirm that you have reviewed all changes.
                                      </p>
                                      {btn(
                                        "Confirm & apply",
                                        () => {
                                          setModal("");
                                          notify("Role permissions updated");
                                        },
                                        "shield",
                                        true,
                                      )}
                                    </>
                                  ) : modal === "Collect payment" ? (
                                    <form
                                      onSubmit={(e) => {
                                        e.preventDefault();
                                        setModal("Payment receipt");
                                        notify("Payment recorded successfully");
                                      }}
                                    >
                                      <label className="form-label">
                                        Student
                                        <select>
                                          {rows.map((r) => (
                                            <option key={r.id}>{r.name}</option>
                                          ))}
                                        </select>
                                      </label>
                                      <label className="form-label">
                                        Amount
                                        <input type="number" min="1" required placeholder="0.00" />
                                      </label>
                                      <label className="form-label">
                                        Payment method
                                        <select>
                                          <option>Bank transfer</option>
                                          <option>Cash</option>
                                          <option>Card</option>
                                        </select>
                                      </label>
                                      <button className="btn primary">
                                        Record payment & generate receipt
                                      </button>
                                    </form>
                                  ) : modal === "Quick actions" || modal === "Add shortcut" ? (
                                    <>
                                      {[
                                        "Student Directory",
                                        "Fees Collection",
                                        "Attendance",
                                        "Examinations",
                                        "Staff Directory",
                                      ].map((x) => (
                                        <button
                                          key={x}
                                          className="detail-row search-result"
                                          onClick={() => {
                                            go(x);
                                            setModal("");
                                          }}
                                        >
                                          <Icon name="plus" />
                                          {x}
                                          <Icon name="arrow" />
                                        </button>
                                      ))}
                                    </>
                                  ) : modal === "Guardian details" ||
                                    modal === "Staff profile" ||
                                    modal === "Student actions" ? (
                                    <>
                                      <h3>
                                        {modal === "Guardian details"
                                          ? profile.guardian
                                          : profile.name}
                                      </h3>
                                      <div className="detail-row">{profile.phone}</div>
                                      <div className="detail-row">
                                        Linked student: {profile.name}
                                      </div>
                                      {btn("Open Student 360", () => {
                                        go("Student 360");
                                        setModal("");
                                      })}
                                    </>
                                  ) : modal === "School calendar" ? (
                                    <>
                                      <h3>February 2025</h3>
                                      <div className="calendar-grid">
                                        {Array.from({ length: 28 }, (_, i) => (
                                          <button
                                            key={i}
                                            className={i === 23 ? "chosen" : ""}
                                            onClick={() => notify(`February ${i + 1} selected`)}
                                          >
                                            {i + 1}
                                          </button>
                                        ))}
                                      </div>
                                      <div className="detail-row">
                                        24 Feb · Mid-term examinations
                                      </div>
                                      <div className="detail-row">
                                        28 Feb · Parent–teacher consultations
                                      </div>
                                    </>
                                  ) : modal === "Payment receipt" ? (
                                    <>
                                      <div className="brand-preview">
                                        <Icon name="check" size={30} />
                                        <h2>Payment received</h2>
                                        <p>{school} · Receipt RCP-00124</p>
                                        <h2>$1,250.00</h2>
                                      </div>
                                      {btn("Print receipt", () => window.print(), "download")}
                                    </>
                                  ) : (
                                    <>
                                      <p className="muted">
                                        {modal === "All attention items"
                                          ? "Fee arrears · Attendance concerns · Pending admissions · Upcoming exams · Leave approvals · Inventory shortages"
                                          : `${modal} for ${school} · ${session}`}
                                      </p>
                                      <div className="detail-row">
                                        <Icon name="shield" />
                                        Administrator access enabled
                                      </div>
                                      <label className="form-label">
                                        Details
                                        <input placeholder="Enter details..." />
                                      </label>
                                      {btn(
                                        "Save changes",
                                        () => {
                                          setModal("");
                                          notify("Changes saved in this preview");
                                        },
                                        "check",
                                        true,
                                      )}
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </SettingsProvider>
                    </ReportsProvider>
                  </CMSProvider>
                </CredentialsProvider>
              </OperationsProvider>
            </LearningProvider>
          </ExaminationProvider>
        </FinanceProvider>
      </AcademicProvider>
    </WorkforceProvider>
  );
}
export default App;

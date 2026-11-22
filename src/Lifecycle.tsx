import { useEffect, useState } from "react";
import Icon from "./components/Icon";
import { Button, Badge, Card, Field } from "./components/OperationsUI";
import StudentFeePanel from "./components/StudentFeePanel";
import StudentExamPanel from "./components/StudentExamPanel";
import StudentLearningPanel from "./components/StudentLearningPanel";
import StudentCredentialsPanel from "./components/StudentCredentialsPanel";
import "./lifecycle.css";
import { frontPages, studentPages } from "./operationNavigation";
export type Student = {
  enrollments?: Record<string, { grade: string; section: string }>;
  id: string;
  name: string;
  grade: string;
  section: string;
  guardian: string;
  phone: string;
  date: string;
  status: string;
  house?: string;
  category?: string;
  dob?: string;
  email?: string;
  reason?: string;
  history?: string[];
  additional?: string;
  balance?: number;
  admission?: string;
};
type RecordRow = {
  id: string;
  name: string;
  guardian?: string;
  phone?: string;
  grade?: string;
  source?: string;
  date: string;
  follow?: string;
  status: string;
  owner?: string;
  notes?: string;
  docs?: string[];
  [key: string]: string | string[] | undefined;
};
const applicants = [
  "Isabella Reed",
  "Ethan Parker",
  "Mia Reynolds",
  "Lucas Bennett",
  "Sofia Martinez",
  "Oliver Chen",
  "Amelia Brooks",
  "Elijah Wilson",
];
const enquirySeed: RecordRow[] = applicants.map((name, i) => ({
  id: `ENQ-2025-${142 + i}`,
  name,
  guardian: ["Charlotte Reed", "Henry Parker", "Emily Reynolds", "William Bennett"][i % 4],
  phone: `+1 (555) 310-${4000 + i}`,
  grade: `Grade ${7 + (i % 5)}`,
  source: ["Website", "Walk-in", "Referral"][i % 3],
  date: "2025-02-24",
  follow: "2025-02-25",
  status: ["New", "Contacted", "Follow-up", "Converted"][i % 4],
  owner: ["Sarah Chen", "Alex Morgan"][i % 2],
  notes: "Family is interested in the upcoming academic session.",
}));
const registerSeed: Record<string, RecordRow[]> = {
  "Visitor Book": [
    {
      id: "VIS-1042",
      name: "Michael Rhye",
      phone: "+1 (555) 240-1020",
      purpose: "Parent meeting",
      department: "Academic office",
      date: "2025-02-24",
      time: "09:15",
      exit: "—",
      status: "On campus",
    },
    {
      id: "VIS-1041",
      name: "Emily Carter",
      phone: "+1 (555) 240-1034",
      purpose: "Delivery",
      department: "Administration",
      date: "2025-02-24",
      time: "08:40",
      exit: "09:05",
      status: "Checked out",
    },
  ],
  "Phone Call Log": [
    {
      id: "CAL-0218",
      name: "Sarah Baker",
      phone: "+1 (555) 240-1021",
      type: "Incoming",
      owner: "Sarah Chen",
      reason: "Admissions",
      date: "2025-02-24",
      status: "Answered",
      follow: "2025-02-25",
      notes: "Requested a campus tour.",
    },
    {
      id: "CAL-0217",
      name: "James Steiner",
      phone: "+1 (555) 240-1022",
      type: "Outgoing",
      owner: "Alex Morgan",
      reason: "Student records",
      date: "2025-02-24",
      status: "Returned",
      notes: "Guardian contact details confirmed.",
    },
  ],
  "Postal Dispatch": [
    {
      id: "DSP-0082",
      name: "District Education Office",
      address: "14 Central Avenue",
      type: "Official letter",
      method: "Courier",
      date: "2025-02-24",
      tracking: "TRK-104822",
      owner: "Alex Morgan",
      status: "Dispatched",
    },
  ],
  "Postal Receive": [
    {
      id: "RCV-0064",
      name: "Regional Examination Board",
      organization: "Education authority",
      type: "Examination documents",
      date: "2025-02-24",
      department: "Examinations",
      owner: "Sarah Chen",
      status: "Awaiting acknowledgment",
    },
  ],
  Complaints: [
    {
      id: "CMP-0028",
      name: "Transport pickup delay",
      contact: "Michael Rhye",
      phone: "+1 (555) 240-1020",
      category: "Transport",
      priority: "High",
      owner: "Alex Morgan",
      date: "2025-02-24",
      status: "Received",
      notes: "Route 4 arrived 20 minutes after the scheduled pickup time.",
    },
    {
      id: "CMP-0027",
      name: "Library access request",
      contact: "Sarah Baker",
      category: "Facilities",
      priority: "Medium",
      owner: "Sarah Chen",
      date: "2025-02-23",
      status: "Investigating",
      notes: "Request to extend after-school library access.",
    },
  ],
};
const registerColumns: Record<string, [string, string][]> = {
  "Visitor Book": [
    ["name", "Visitor"],
    ["phone", "Phone"],
    ["purpose", "Purpose"],
    ["department", "Visiting"],
    ["time", "Check-in"],
    ["exit", "Check-out"],
    ["status", "Status"],
  ],
  "Phone Call Log": [
    ["name", "Caller"],
    ["phone", "Phone"],
    ["type", "Call type"],
    ["owner", "Recipient"],
    ["reason", "Reason"],
    ["date", "Date"],
    ["status", "Outcome"],
    ["follow", "Follow-up"],
  ],
  "Postal Dispatch": [
    ["id", "Reference"],
    ["name", "Recipient"],
    ["type", "Document type"],
    ["method", "Delivery"],
    ["date", "Dispatched"],
    ["tracking", "Tracking no."],
    ["owner", "Staff"],
    ["status", "Status"],
  ],
  "Postal Receive": [
    ["id", "Reference"],
    ["name", "Sender"],
    ["organization", "Organization"],
    ["date", "Received"],
    ["type", "Document type"],
    ["department", "Department"],
    ["owner", "Assigned staff"],
    ["status", "Acknowledgment"],
  ],
  Complaints: [
    ["id", "Complaint ID"],
    ["name", "Complaint"],
    ["contact", "Complainant"],
    ["category", "Category"],
    ["priority", "Priority"],
    ["owner", "Assigned to"],
    ["date", "Date"],
    ["status", "Status"],
  ],
};
const configSeed: Record<string, string[]> = {
  "Enquiry Sources": ["Website", "Walk-in", "Referral", "Social media"],
  "Enquiry Statuses": ["New", "Contacted", "Follow-up", "Converted", "Closed"],
  "Complaint Categories": ["Transport", "Facilities", "Academics", "Administration"],
  "Complaint Priorities": ["High", "Medium", "Low"],
  "Visitor Purposes": ["Parent meeting", "Delivery", "Campus tour"],
  "Call Types": ["Incoming", "Outgoing"],
  "Postal Types": ["Official letter", "Documents", "Parcel"],
  "Follow-up Defaults": ["2 working days", "Assign to enquiry owner"],
  "Student Categories": ["General", "Scholarship", "International"],
  "Student House": ["Oak House", "Cedar House", "Maple House", "Willow House"],
  "Disable Reason": [
    "Transferred to another school",
    "Temporary withdrawal",
    "Parent/guardian request",
    "Administrative review",
  ],
};
export default function Lifecycle({
  page,
  session,
  school,
  rows,
  setRows,
  profile,
  setProfile,
  navigate,
  notify,
  active,
  onDirty,
  feesRequest = 0,
}: {
  page: string;
  session: string;
  school: string;
  rows: Student[];
  setRows: (r: Student[]) => void;
  profile: Student;
  setProfile: (s: Student) => void;
  navigate: (p: string) => void;
  notify: (s: string) => void;
  active: boolean;
  onDirty: (b: boolean) => void;
  feesRequest?: number;
}) {
  const [enquiries, setEnquiries] = useState(enquirySeed);
  const [applications, setApplications] = useState<RecordRow[]>(
    enquirySeed.slice(0, 4).map((e, i) => ({
      ...e,
      id: `APP-2025-${84 + i}`,
      status: ["Submitted", "Under Review", "Awaiting Information", "Approved"][i],
      docs: i === 2 ? ["Birth certificate"] : ["Birth certificate", "Previous school record"],
    })),
  );
  const [registers, setRegisters] = useState(registerSeed);
  const [configs, setConfigs] = useState(configSeed);
  const [inactive, setInactive] = useState<string[]>([]);
  const [q, setQ] = useState("");
  const [classFilter, setClassFilter] = useState("All classes");
  const [statusFilter, setStatusFilter] = useState("All statuses");
  const [sectionFilter, setSectionFilter] = useState("All sections");
  const [index, setIndex] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sort, setSort] = useState("Name");
  const [selected, setSelected] = useState<string[]>([]);
  const [hidden, setHidden] = useState<string[]>([]);
  const [drawer, setDrawer] = useState<{ type: string; title: string; row?: RecordRow } | null>(
    null,
  );
  const [form, setForm] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [dirty, setDirty] = useState(false);
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [draftSaved, setDraftSaved] = useState(false);
  const [origin, setOrigin] = useState("");
  const [profileTab, setProfileTab] = useState("Overview");
  useEffect(() => {
    if (feesRequest) setProfileTab("Fees");
  }, [feesRequest]);
  const [configTab, setConfigTab] = useState("Enquiry Sources");
  const [role, setRole] = useState("Administrator");
  const [state, setState] = useState("Ready");
  const [notes, setNotes] = useState<Record<string, string[]>>({});
  const [newNote, setNewNote] = useState("");
  const [documents, setDocuments] = useState<Record<string, string[]>>({});
  const [admitted, setAdmitted] = useState<Student | null>(null);
  const [confirmText, setConfirmText] = useState("");
  const canEdit = role === "Administrator";
  const isNewStudent = profile.date === "2025-02-24";
  const classes = ["Grade 7", "Grade 8", "Grade 9", "Grade 10", "Grade 11", "Grade 12"];
  useEffect(() => {
    setDirty(false);
    setQ("");
    setClassFilter("All classes");
    setStatusFilter("All statuses");
    setSectionFilter("All sections");
    setIndex(1);
    setSelected([]);
    setError("");
    setDrawer(null);
    setState("Ready");
  }, [page]);
  useEffect(() => {
    onDirty(dirty);
    const fn = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", fn);
    return () => window.removeEventListener("beforeunload", fn);
  }, [dirty, onDirty]);
  useEffect(() => {
    if (!active) setDrawer(null);
  }, [active]);
  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (e.key === "Escape" && (!dirty || window.confirm("Discard unsaved preview changes?"))) {
        setDrawer(null);
        setDirty(false);
      }
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [dirty]);
  const go = (p: string) => {
    if (dirty && !window.confirm("Discard unsaved preview changes?")) return;
    setDirty(false);
    setDrawer(null);
    navigate(p);
  };
  const show = (type: string, title: string, row?: RecordRow) => {
    setForm(
      row
        ? (Object.fromEntries(
            Object.entries(row).filter(([, v]) => typeof v === "string"),
          ) as Record<string, string>)
        : {
            session,
            date: "2025-02-24",
            grade: classes[1],
            section: "A",
            owner: "Sarah Chen",
            source: "Website",
            status: "New",
            house: "Oak House",
          },
    );
    setError("");
    setDirty(false);
    setConfirmText("");
    setDrawer({ type, title, row });
  };
  const change = (key: string, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    setDirty(true);
  };
  const updateDraft = (key: string, value: string) => {
    setDraft((d) => ({ ...d, [key]: value }));
    setDirty(true);
    setDraftSaved(false);
  };
  const openStudent = (s: Student) => {
    setProfile(s);
    setProfileTab("Overview");
    go("Student 360");
  };
  const log = (id: string, text: string) =>
    setNotes((n) => ({ ...n, [id]: [...(n[id] || []), text + " · Alex Morgan · just now"] }));
  const applyRegister = (id: string, patch: Partial<RecordRow>) =>
    setRegisters((r) => ({
      ...r,
      [page]: (r[page] || []).map((x) => (x.id === id ? { ...x, ...patch } : x)),
    }));
  const exportCsv = (records: Record<string, unknown>[], name: string) => {
    if (!records.length) {
      notify("No records to export");
      return;
    }
    const keys = Object.keys(records[0]);
    const csv = [keys, ...records.map((r) => keys.map((k) => String(r[k] ?? "")))]
      .map((r) => r.map((v) => '"' + String(v).replace(/"/g, '""') + '"').join(","))
      .join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = name + ".csv";
    a.click();
    URL.revokeObjectURL(a.href);
    notify("Preview records exported");
  };
  const isRegistry = [
    "Student Directory",
    "Disabled Students",
    "Bulk Delete",
    "Multi Class Student",
  ].includes(page);
  const list = rows
    .filter(
      (r) =>
        (page === "Disabled Students"
          ? r.status === "Inactive"
          : page === "Multi Class Student"
            ? !!r.additional
            : page === "Bulk Delete"
              ? true
              : r.status !== "Inactive") &&
        [r.name, r.id, r.admission || "", r.guardian, r.phone].some((v) =>
          v.toLowerCase().includes(q.toLowerCase()),
        ) &&
        (classFilter === "All classes" || r.grade === classFilter) &&
        (sectionFilter === "All sections" || r.section === sectionFilter) &&
        (statusFilter === "All statuses" || r.status === statusFilter),
    )
    .sort((a, b) =>
      sort === "Admission no."
        ? a.id.localeCompare(b.id)
        : sort === "Admission date"
          ? b.date.localeCompare(a.date)
          : a.name.localeCompare(b.name),
    );
  const selectedRows = rows.filter((r) => selected.includes(r.id));
  const blocked = selectedRows.filter((r) => r.status === "Active");
  const eligible = selectedRows.filter((r) => r.status !== "Active");
  const clear = () => {
    setQ("");
    setClassFilter("All classes");
    setSectionFilter("All sections");
    setStatusFilter("All statuses");
    setIndex(1);
  };
  const stat = (items: [string, string, string?][]) => (
    <div className="op-stats">
      {items.map(([name, val, dest]) => (
        <button key={name} onClick={() => dest && go(dest)} disabled={!dest}>
          <span>
            {name}
            <Icon name="arrow" size={14} />
          </span>
          <strong>{val}</strong>
          <small>Illustrative records · this session</small>
        </button>
      ))}
    </div>
  );
  const profileAction = (title: string) => {
    setSelected([profile.id]);
    show("student-action", title);
    setForm({
      grade: profile.grade,
      section: profile.section,
      house: profile.house || "Oak House",
      reason: configs["Disable Reason"][0],
      name: profile.name,
      guardian: profile.guardian,
      phone: profile.phone,
    });
  };
  const table = (heads: string[], body: React.ReactNode, count: number) => (
    <>
      <div className="op-table-wrap">
        <table>
          <thead>
            <tr>
              {heads.map((h, i) => (
                <th key={i}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>{body}</tbody>
        </table>
        {count === 0 && (
          <div className="op-empty">
            <Icon name="search" size={26} />
            <h3>No matching records</h3>
            <p>Try another search or clear your current filters.</p>
            <Button onClick={clear}>Clear filters</Button>
          </div>
        )}
      </div>
      <div className="op-pagination">
        <span>
          {count
            ? `${(Math.min(index, Math.max(1, Math.ceil(count / pageSize))) - 1) * pageSize + 1}–${Math.min(index * pageSize, count)}`
            : "0"}{" "}
          of {count} records
        </span>
        <div>
          <label>
            Rows{" "}
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setIndex(1);
              }}
            >
              {[10, 25, 50, 100].map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
          </label>
          <button disabled={index === 1} onClick={() => setIndex(index - 1)}>
            ← Previous
          </button>
          <span className="op-page-index">
            {Math.min(index, Math.max(1, Math.ceil(count / pageSize)))}
          </span>
          <button disabled={index * pageSize >= count} onClick={() => setIndex(index + 1)}>
            Next →
          </button>
        </div>
      </div>
    </>
  );
  const slice = <T,>(data: T[]) =>
    data.slice(
      (Math.min(index, Math.max(1, Math.ceil(data.length / pageSize))) - 1) * pageSize,
      Math.min(index, Math.max(1, Math.ceil(data.length / pageSize))) * pageSize,
    );
  const toolbar = (student = false) => (
    <div className="op-toolbar">
      <label className="op-search">
        <Icon name="search" size={17} />
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setIndex(1);
          }}
          placeholder={
            student
              ? "Search name, admission no. or guardian..."
              : "Search names, references, contacts..."
          }
        />
      </label>
      <select
        aria-label="Class filter"
        value={classFilter}
        onChange={(e) => {
          setClassFilter(e.target.value);
          setIndex(1);
        }}
      >
        <option>All classes</option>
        {classes.map((c) => (
          <option key={c}>{c}</option>
        ))}
      </select>
      {student && (
        <select
          aria-label="Section filter"
          value={sectionFilter}
          onChange={(e) => {
            setSectionFilter(e.target.value);
            setIndex(1);
          }}
        >
          <option>All sections</option>
          {["A", "B", "C"].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      )}
      <select
        aria-label="Status filter"
        value={statusFilter}
        onChange={(e) => {
          setStatusFilter(e.target.value);
          setIndex(1);
        }}
      >
        <option>All statuses</option>
        {(student
          ? ["Active", "Inactive"]
          : page === "Admission Enquiry"
            ? configs["Enquiry Statuses"]
            : page === "Online Admission"
              ? ["Submitted", "Under Review", "Awaiting Information", "Approved", "Rejected"]
              : [...new Set((registers[page] || []).map((r) => r.status))]
        ).map((s) => (
          <option key={s}>{s}</option>
        ))}
      </select>
      <Button icon="settings" onClick={() => show("filters", "View & table options")}>
        View options
      </Button>
      {(q ||
        classFilter !== "All classes" ||
        statusFilter !== "All statuses" ||
        sectionFilter !== "All sections") && <Button onClick={clear}>Reset</Button>}
    </div>
  );
  const admit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (step < 3) {
      if (step === 0 && (!draft.first || !draft.last)) {
        setError("First and last name are required.");
        return;
      }
      if (step === 1 && (!draft.guardian || (!draft.phone && !draft.email))) {
        setError("Add a guardian and at least one contact method.");
        return;
      }
      if (step === 2 && (!draft.grade || !draft.section || !draft.admission)) {
        setError("Choose a class, section and admission number.");
        return;
      }
      setStep(step + 1);
      return;
    }
    const name = `${draft.first} ${draft.last}`;
    if (rows.some((r) => r.id === draft.admission || r.admission === draft.admission)) {
      setError("This admission number is already in use. Return to Enrollment to choose another.");
      return;
    }
    if (rows.some((r) => r.name.toLowerCase() === name.toLowerCase())) {
      setError("Possible duplicate student. Review the registry before admitting.");
      return;
    }
    if (draft.session !== session) {
      setError(
        "The application session differs from the current shell session. Update Enrollment before admitting.",
      );
      return;
    }
    const s: Student = {
      id: draft.admission,
      name,
      guardian: draft.guardian,
      phone: draft.phone || draft.email,
      grade: draft.grade,
      section: draft.section,
      date: draft.date || "2025-02-24",
      status: "Active",
      house: draft.house,
      category: draft.category,
      dob: draft.dob,
      email: draft.email,
      history: ["Admitted to " + draft.grade + " · " + session + " · just now"],
      balance: 0,
    };
    setRows([...rows, s]);
    if (origin) {
      setApplications((a) => a.map((r) => (r.id === origin ? { ...r, status: "Admitted" } : r)));
    }
    setAdmitted(s);
    setDirty(false);
    setDraft({});
    setStep(0);
    show("success", "Admission complete");
    notify("Student admitted in this preview only");
  };
  const startAdmission = (record?: RecordRow) => {
    setDraft({
      first: record?.name.split(" ")[0] || "",
      last: record?.name.split(" ").slice(1).join(" ") || "",
      guardian: record?.guardian || "",
      phone: record?.phone || "",
      grade: record?.grade || classes[1],
      section: "A",
      session,
      date: "2025-02-24",
      admission: `ADM-2025-${String(rows.length + 143).padStart(4, "0")}`,
      house: "Oak House",
      category: "General",
      relationship: "Parent",
    });
    setStep(0);
    setOrigin(record?.id || "");
    setDirty(false);
    setDrawer(null);
    navigate("Student Admission");
  };
  const saveForm = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (drawer?.type === "enquiry-form") {
      if (!form.name?.trim() || !form.guardian?.trim() || (!form.phone && !form.email)) {
        setError("Applicant name, guardian and at least one contact method are required.");
        return;
      }
      if (
        enquiries.some(
          (r) =>
            r.id !== drawer.row?.id &&
            r.name.toLowerCase() === form.name.toLowerCase() &&
            r.phone === form.phone,
        )
      ) {
        setError("An enquiry with this applicant and contact already exists.");
        return;
      }
      const r = {
        ...form,
        id: drawer.row?.id || `ENQ-2025-${142 + enquiries.length}`,
        date: form.date || "2025-02-24",
        name: form.name,
        status: form.status || "New",
      } as RecordRow;
      setEnquiries(drawer.row ? enquiries.map((x) => (x.id === r.id ? r : x)) : [r, ...enquiries]);
      log(r.id, "Enquiry saved");
    } else if (drawer?.type === "register-form") {
      if (!form.name?.trim()) {
        setError("A name or subject is required.");
        return;
      }
      if (
        page === "Visitor Book" &&
        registers[page].some(
          (r) => r.name.toLowerCase() === form.name.toLowerCase() && r.status === "On campus",
        )
      ) {
        setError("This visitor already has an active check-in.");
        return;
      }
      const r = {
        ...form,
        id: `${page.slice(0, 3).toUpperCase()}-${Date.now().toString().slice(-5)}`,
        name: form.name,
        date: form.date || "2025-02-24",
        status:
          page === "Visitor Book"
            ? "On campus"
            : page === "Complaints"
              ? "Received"
              : page === "Postal Receive"
                ? "Awaiting acknowledgment"
                : page === "Postal Dispatch"
                  ? "Prepared"
                  : "Answered",
        time: form.time || "09:30",
        exit: "—",
      } as RecordRow;
      setRegisters({ ...registers, [page]: [r, ...(registers[page] || [])] });
    } else if (drawer?.type === "config-form") {
      const group = page === "Front Office Setup" ? configTab : page;
      const name = form.name?.trim();
      if (!name) return;
      if (
        configs[group].some((n) => n.toLowerCase() === name.toLowerCase() && n !== drawer.row?.name)
      ) {
        setError("That name already exists.");
        return;
      }
      setConfigs({
        ...configs,
        [group]: drawer.row
          ? configs[group].map((n) => (n === drawer.row?.name ? name : n))
          : [...configs[group], name],
      });
    }
    setDirty(false);
    setDrawer(null);
    notify("Saved in preview · not persisted");
  };
  const title =
    page === "Student Directory"
      ? "Student registry"
      : page === "Student 360"
        ? "Student 360"
        : page === "Front Office"
          ? "Front Office"
          : page;
  const frame = frontPages.includes(page)
    ? `FO-${String(frontPages.indexOf(page) + 1).padStart(2, "0")}`
    : `ST-${String(studentPages.indexOf(page) + 1).padStart(2, "0")}`;
  return (
    <div className="op" hidden={!active}>
      <div className="op-heading">
        <div>
          <div className="op-eyebrow">
            OPERATIONS <span>/</span>{" "}
            {frontPages.includes(page) ? "FRONT OFFICE" : "STUDENT INFORMATION"} <em>{frame}</em>
          </div>
          <h1>{title}</h1>
          <p>
            {page === "Front Office"
              ? "Every first impression, follow-up, and conversation. Connected."
              : page === "Student Directory"
                ? "A complete view of your learners. From admission to their next chapter."
                : page === "Student 360"
                  ? "One student. Every part of their school journey."
                  : "Manage " + title.toLowerCase() + " across your institution."}
          </p>
        </div>
        <div className="op-heading-actions">
          <Button
            icon="download"
            disabled={!canEdit}
            onClick={() =>
              exportCsv(
                isRegistry
                  ? (list as unknown as Record<string, unknown>[])
                  : page === "Admission Enquiry"
                    ? enquiries
                    : registers[page] || applications,
                "schoolos-" + page.toLowerCase().replace(/ /g, "-"),
              )
            }
          >
            Export
          </Button>
          {page === "Student Directory" ? (
            <Button primary icon="plus" disabled={!canEdit} onClick={() => startAdmission()}>
              Admit student
            </Button>
          ) : page === "Front Office" || page === "Admission Enquiry" ? (
            <Button
              primary
              icon="plus"
              disabled={!canEdit}
              onClick={() => show("enquiry-form", "New admission enquiry")}
            >
              New enquiry
            </Button>
          ) : registerColumns[page] ? (
            <Button
              primary
              icon="plus"
              disabled={!canEdit}
              onClick={() =>
                show(
                  "register-form",
                  page === "Visitor Book"
                    ? "Check in visitor"
                    : page === "Complaints"
                      ? "New complaint"
                      : "New " + page.toLowerCase() + " record",
                )
              }
            >
              {page === "Visitor Book"
                ? "Check in visitor"
                : page === "Phone Call Log"
                  ? "Log call"
                  : page === "Complaints"
                    ? "New complaint"
                    : "Add record"}
            </Button>
          ) : null}
        </div>
      </div>
      <div className="op-context">
        <select
          aria-label="Operational workspace"
          value={page}
          onChange={(e) => go(e.target.value)}
        >
          <optgroup label="Front Office">
            {frontPages.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </optgroup>
          <optgroup label="Student Information">
            {studentPages
              .filter((p) => p !== "Student 360" || page === "Student 360")
              .map((p) => (
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
        <span>Preview only · changes reset on reload</span>
        <button onClick={() => show("preview", "Preview & assumptions")}>
          <Icon name="settings" size={14} /> Preview controls
        </button>
      </div>
      {!canEdit && (
        <div className="op-notice">
          <Icon name="shield" />
          Read-only preview role. Record changes and sensitive actions are disabled.
        </div>
      )}
      {state !== "Ready" ? (
        <Card title={state} sub="Prototype exception-state preview">
          <div className="op-empty">
            {state === "Loading" ? (
              <>
                <div className="op-skeleton" />
                <div className="op-skeleton" />
                <div className="op-skeleton" />
              </>
            ) : (
              <>
                <Icon name={state === "Restricted" ? "shield" : "search"} size={28} />
                <h3>
                  {state === "Filtered empty"
                    ? "No matching records"
                    : state === "Error"
                      ? "Records could not be loaded"
                      : state === "Restricted"
                        ? "Access restricted"
                        : "No records yet"}
                </h3>
                <p>
                  {state === "Error"
                    ? "Your current form and filters are preserved. Retry to return to the illustrative dataset."
                    : "Use the appropriate workflow to add records or adjust your filters."}
                </p>
                <Button primary onClick={() => setState("Ready")}>
                  {state === "Error" ? "Retry" : "Return to records"}
                </Button>
              </>
            )}
          </div>
        </Card>
      ) : page === "Front Office" ? (
        <>
          {stat([
            ["Admission enquiries", String(enquiries.length), "Admission Enquiry"],
            [
              "Follow-ups due",
              String(enquiries.filter((r) => r.status === "Follow-up").length),
              "Admission Enquiry",
            ],
            [
              "Visitors on campus",
              String(registers["Visitor Book"].filter((r) => r.status === "On campus").length),
              "Visitor Book",
            ],
            [
              "Open complaints",
              String(registers.Complaints.filter((r) => r.status !== "Resolved").length),
              "Complaints",
            ],
          ])}
          <div className="op-overview-grid">
            <Card
              title="Admissions pipeline"
              sub="From the first conversation to a place in your school"
              action={
                <Button onClick={() => go("Admission Enquiry")}>
                  View enquiries <Icon name="arrow" size={13} />
                </Button>
              }
            >
              <div className="op-pipeline">
                {["New", "Contacted", "Follow-up", "Converted"].map((s, i) => (
                  <button
                    key={s}
                    onClick={() => {
                      go("Admission Enquiry");
                      setTimeout(() => setStatusFilter(s), 0);
                    }}
                  >
                    <span>
                      <i>{i + 1}</i>
                      {s}
                    </span>
                    <strong>{enquiries.filter((e) => e.status === s).length}</strong>
                    <div>
                      <i style={{ width: 100 - i * 18 + "%" }} />
                    </div>
                  </button>
                ))}
              </div>
              <div className="op-pipeline-foot">
                <Icon name="shield" size={14} />
                <span>Conversions are reviewed before an application becomes a student.</span>
              </div>
            </Card>
            <Card
              title="Follow-ups to make"
              sub="Your next conversations · 25 February"
              action={
                <span className="op-badge warn">
                  {enquiries.filter((e) => e.status === "Follow-up").length} due
                </span>
              }
            >
              {enquiries
                .filter((e) => e.status === "Follow-up")
                .map((r) => (
                  <button
                    className="op-list-row"
                    key={r.id}
                    onClick={() => show("enquiry", "Enquiry details", r)}
                  >
                    <span className="op-avatar">
                      {r.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </span>
                    <span>
                      <b>{r.name}</b>
                      <small>
                        {r.grade} · {r.guardian}
                      </small>
                    </span>
                    <span className="op-list-right">
                      10:00 AM<small>{r.owner}</small>
                    </span>
                    <Icon name="chevron" size={14} />
                  </button>
                ))}
            </Card>
            <Card
              title="Recent visitors"
              sub="A clear view of who is on campus"
              action={<Button onClick={() => go("Visitor Book")}>Visitor book</Button>}
            >
              {registers["Visitor Book"].map((r) => (
                <button className="op-list-row" key={r.id} onClick={() => go("Visitor Book")}>
                  <span className="op-icon-box">
                    <Icon name="users" />
                  </span>
                  <span>
                    <b>{r.name}</b>
                    <small>
                      {r.purpose} · {r.department}
                    </small>
                  </span>
                  <Badge>{r.status}</Badge>
                </button>
              ))}
            </Card>
            <Card
              title="Complaint queue"
              sub="Conversations that need a thoughtful response"
              action={<Button onClick={() => go("Complaints")}>View all</Button>}
            >
              {registers.Complaints.map((r) => (
                <button className="op-list-row" key={r.id} onClick={() => go("Complaints")}>
                  <span className="op-icon-box amber">
                    <Icon name="flag" />
                  </span>
                  <span>
                    <b>{r.name}</b>
                    <small>
                      {r.id} · {r.contact}
                    </small>
                  </span>
                  <Badge>{r.priority}</Badge>
                </button>
              ))}
            </Card>
            <Card title="Front desk activity" sub="Calls and correspondence in one place">
              <div className="op-shortcut-grid">
                {["Phone Call Log", "Postal Dispatch", "Postal Receive", "Front Office Setup"].map(
                  (p, i) => (
                    <button key={p} onClick={() => go(p)}>
                      <Icon name={["clock", "mail", "download", "settings"][i]} />
                      <b>{p}</b>
                      <small>
                        {i === 3
                          ? "Manage school-specific defaults"
                          : `${registers[p]?.length || 0} records in the preview`}
                      </small>
                      <Icon name="arrow" size={15} />
                    </button>
                  ),
                )}
              </div>
            </Card>
          </div>
        </>
      ) : page === "Admission Enquiry" || page === "Online Admission" ? (
        <>
          {stat(
            page === "Admission Enquiry"
              ? [
                  ["Total enquiries", String(enquiries.length)],
                  ["New", String(enquiries.filter((e) => e.status === "New").length)],
                  ["Follow-up", String(enquiries.filter((e) => e.status === "Follow-up").length)],
                  ["Converted", String(enquiries.filter((e) => e.status === "Converted").length)],
                ]
              : [
                  ["Applications", String(applications.length)],
                  [
                    "In review",
                    String(applications.filter((a) => a.status === "Under Review").length),
                  ],
                  [
                    "Awaiting information",
                    String(applications.filter((a) => a.status === "Awaiting Information").length),
                  ],
                  ["Approved", String(applications.filter((a) => a.status === "Approved").length)],
                ],
          )}
          <Card
            title={page === "Admission Enquiry" ? "Enquiry register" : "Application review"}
            sub="Illustrative applications · approval does not automatically enroll a student"
          >
            {toolbar()}
            {(() => {
              const data = (page === "Admission Enquiry" ? enquiries : applications).filter(
                (r) =>
                  [r.name, r.guardian || "", r.id].some((s) =>
                    s.toLowerCase().includes(q.toLowerCase()),
                  ) &&
                  (classFilter === "All classes" || r.grade === classFilter) &&
                  (statusFilter === "All statuses" || r.status === statusFilter),
              );
              return table(
                page === "Admission Enquiry"
                  ? [
                      "Enquiry ID",
                      "Applicant",
                      "Guardian",
                      "Applying for",
                      "Source",
                      "Follow-up",
                      "Status",
                      "Owner",
                      "",
                    ]
                  : [
                      "Application ID",
                      "Applicant",
                      "Guardian",
                      "Applying for",
                      "Documents",
                      "Submitted",
                      "Status",
                      "Reviewer",
                      "",
                    ],
                slice(data).map((r) => (
                  <tr key={r.id}>
                    <td className="op-mono">{r.id}</td>
                    <td>
                      <button
                        className="op-person"
                        onClick={() =>
                          show(
                            page === "Admission Enquiry" ? "enquiry" : "application",
                            page === "Admission Enquiry" ? "Enquiry details" : "Application review",
                            r,
                          )
                        }
                      >
                        <span className="op-avatar">
                          {r.name
                            .split(" ")
                            .map((s) => s[0])
                            .join("")}
                        </span>
                        <span>
                          {r.name}
                          <small>{r.date}</small>
                        </span>
                      </button>
                    </td>
                    <td>{r.guardian}</td>
                    <td>{r.grade}</td>
                    <td>
                      {page === "Admission Enquiry" ? (
                        r.source
                      ) : (
                        <Badge>{(r.docs?.length || 0) >= 2 ? "Complete" : "Incomplete"}</Badge>
                      )}
                    </td>
                    <td>{page === "Admission Enquiry" ? r.follow : r.date}</td>
                    <td>
                      <Badge>{r.status}</Badge>
                    </td>
                    <td>{r.owner}</td>
                    <td>
                      <button
                        className="op-row-link"
                        onClick={() =>
                          show(
                            page === "Admission Enquiry" ? "enquiry" : "application",
                            page === "Admission Enquiry" ? "Enquiry details" : "Application review",
                            r,
                          )
                        }
                      >
                        Review <Icon name="arrow" size={13} />
                      </button>
                    </td>
                  </tr>
                )),
                data.length,
              );
            })()}
          </Card>
        </>
      ) : isRegistry ? (
        <>
          {stat([
            [
              "Active students",
              String(rows.filter((r) => r.status === "Active").length),
              "Student Directory",
            ],
            ["Newly admitted", String(rows.filter((r) => r.date === "2025-02-24").length)],
            [
              "Disabled records",
              String(rows.filter((r) => r.status === "Inactive").length),
              "Disabled Students",
            ],
            ["Without assignment", String(rows.filter((r) => !r.grade).length)],
          ])}
          {page === "Bulk Delete" && (
            <div className="op-notice danger">
              <Icon name="shield" />
              <span>
                <b>Guarded administrative action.</b> This preview only archives eligible inactive
                rows. Active students are blocked. Backend deletion policy and dependencies are not
                implemented.
              </span>
            </div>
          )}
          <Card
            title={
              page === "Disabled Students"
                ? "Disabled student records"
                : page === "Multi Class Student"
                  ? "Concurrent class assignments"
                  : page === "Bulk Delete"
                    ? "Select records to review"
                    : "All student records"
            }
            sub={
              page === "Multi Class Student"
                ? "Illustrative concurrent membership model · confirm school-specific rules before production"
                : "Search, filter, and work from the same central student record."
            }
            action={
              page === "Multi Class Student" ? (
                <Button
                  primary
                  disabled={!canEdit}
                  onClick={() => {
                    setSelected([]);
                    show("student-action", "Assign additional class");
                  }}
                >
                  Assign student
                </Button>
              ) : (
                <span className="op-count">{list.length} records</span>
              )
            }
          >
            {toolbar(true)}
            {selected.length > 0 && (
              <div className="op-selection">
                <b>{selected.length} selected</b>
                <Button disabled={!canEdit} onClick={() => show("student-action", "Assign class")}>
                  Assign class
                </Button>
                <Button disabled={!canEdit} onClick={() => show("student-action", "Change house")}>
                  Change house
                </Button>
                <Button
                  disabled={!canEdit}
                  onClick={() =>
                    exportCsv(
                      selectedRows as unknown as Record<string, unknown>[],
                      "selected-students",
                    )
                  }
                >
                  Export
                </Button>
                <Button
                  disabled={!canEdit}
                  onClick={() => show("student-action", "Disable student")}
                >
                  Disable
                </Button>
                <Button
                  danger
                  disabled={!canEdit}
                  onClick={() => show("delete", "Review bulk archive")}
                >
                  Delete / archive
                </Button>
                <button onClick={() => setSelected([])}>Clear</button>
              </div>
            )}
            {table(
              [
                "",
                ...[
                  "Student",
                  "Admission no.",
                  "Class",
                  "Section",
                  "Guardian",
                  "Phone",
                  "Admission date",
                  "Status",
                  ...(page === "Multi Class Student" ? ["Additional class"] : []),
                  "",
                ].filter((h) => !hidden.includes(h)),
              ],
              slice(list).map((r) => (
                <tr key={r.id}>
                  <td>
                    <input
                      aria-label={"Select " + r.name}
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
                  {!hidden.includes("Student") && (
                    <td>
                      <button className="op-person" onClick={() => openStudent(r)}>
                        <span className="op-avatar">
                          {r.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </span>
                        <span>
                          {r.name}
                          <small>{r.id}</small>
                        </span>
                      </button>
                    </td>
                  )}
                  {!hidden.includes("Admission no.") && (
                    <td className="op-mono">{r.admission || r.id.replace("ST", "ADM")}</td>
                  )}
                  {!hidden.includes("Class") && <td>{r.grade || <Badge>Unassigned</Badge>}</td>}
                  {!hidden.includes("Section") && (
                    <td>
                      <span className="op-section">{r.section || "—"}</span>
                    </td>
                  )}
                  {!hidden.includes("Guardian") && <td>{r.guardian || "Not provided"}</td>}
                  {!hidden.includes("Phone") && <td>{r.phone || "Not provided"}</td>}
                  {!hidden.includes("Admission date") && <td>{r.date}</td>}
                  {!hidden.includes("Status") && (
                    <td>
                      <Badge>{r.status === "Inactive" ? "Disabled" : r.status}</Badge>
                    </td>
                  )}
                  {page === "Multi Class Student" && <td>{r.additional}</td>}
                  <td>
                    <button className="op-row-link" onClick={() => openStudent(r)}>
                      {page === "Disabled Students" ? "Review" : "View"}
                      <Icon name="arrow" size={14} />
                    </button>
                  </td>
                </tr>
              )),
              list.length,
            )}
            <div className="op-table-bottom">
              <label>
                <input
                  type="checkbox"
                  checked={list.length > 0 && list.every((r) => selected.includes(r.id))}
                  onChange={(e) => setSelected(e.target.checked ? list.map((r) => r.id) : [])}
                />
                Select all {list.length} matching records
              </label>
              <span>Table preferences are preview-only</span>
            </div>
          </Card>
        </>
      ) : page === "Student 360" ? (
        <>
          <div className="op-profile-header">
            <span className="op-avatar large">
              {profile.name
                .split(" ")
                .map((n) => n[0])
                .join("")}
            </span>
            <div>
              <span className="op-profile-id">
                {profile.admission || profile.id.replace("ST", "ADM")}{" "}
                <Badge>{profile.status === "Inactive" ? "Disabled" : "Active"}</Badge>
              </span>
              <h2>{profile.name}</h2>
              <p>
                {profile.grade || "Unassigned"} · Section {profile.section || "—"} <span>•</span>{" "}
                {session}
              </p>
            </div>
            <div className="op-profile-actions">
              <Button
                disabled={!canEdit}
                icon="settings"
                onClick={() => profileAction("Edit details")}
              >
                Edit details
              </Button>
              <Button onClick={() => profileAction("Student actions")}>
                More actions <Icon name="down" size={13} />
              </Button>
            </div>
          </div>
          <div className="op-profile-tabs">
            {[
              "Overview",
              "Academics",
              "Attendance",
              "Fees",
              "Examinations",
              "Homework",
              "Download Center",
              "Library",
              "Documents",
              "Credentials / Documents",
              "Guardian",
              "Timeline",
            ].map((t) => (
              <button
                key={t}
                className={profileTab === t ? "active" : ""}
                onClick={() => setProfileTab(t)}
              >
                {t}
              </button>
            ))}
          </div>
          {profileTab === "Overview" ? (
            <div className="op-profile-grid">
              <div>
                <Card title="Student details" sub="Identity and institutional record">
                  <dl className="op-dl">
                    {[
                      ["Admission number", profile.admission || profile.id.replace("ST", "ADM")],
                      ["Date of birth", profile.dob || "14 June 2011"],
                      ["Admission date", profile.date],
                      ["Category", profile.category || "General"],
                      ["House", profile.house || "Oak House"],
                      ["Student status", profile.status],
                    ].map(([k, v]) => (
                      <div key={k}>
                        <dt>{k}</dt>
                        <dd>{v}</dd>
                      </div>
                    ))}
                  </dl>
                </Card>
                <Card title="Guardian & emergency contact">
                  <div className="op-contact">
                    <span className="op-avatar">
                      {profile.guardian
                        ?.split(" ")
                        .map((n) => n[0])
                        .join("") || "—"}
                    </span>
                    <div>
                      <b>{profile.guardian || "Guardian not provided"}</b>
                      <p>Parent · Primary guardian</p>
                      <span>{profile.phone || "Contact details missing"}</span>
                    </div>
                  </div>
                  <dl className="op-dl">
                    <div>
                      <dt>Email</dt>
                      <dd>{profile.email || "Not provided"}</dd>
                    </div>
                    <div>
                      <dt>Emergency contact</dt>
                      <dd>Same as primary guardian</dd>
                    </div>
                  </dl>
                </Card>
              </div>
              <div>
                <Card title="Current enrollment" action={<Badge>Current session</Badge>}>
                  <div className="op-enrollment">
                    <Icon name="book" size={23} />
                    <div>
                      <h3>
                        {profile.grade || "Unassigned"} · {profile.section || "No section"}
                      </h3>
                      <p>{session} · Main campus</p>
                    </div>
                  </div>
                  <div className="op-enrollment-stats">
                    <div>
                      <strong>{isNewStudent ? "—" : "94.8%"}</strong>
                      <small>Attendance</small>
                    </div>
                    <div>
                      <strong>{isNewStudent ? "—" : "86.4%"}</strong>
                      <small>Average score</small>
                    </div>
                    <div>
                      <strong>{isNewStudent ? "Not assessed" : "On track"}</strong>
                      <small>Academic standing</small>
                    </div>
                  </div>
                </Card>
                <Card title="Student journey" sub="Significant moments, kept together">
                  <div className="op-timeline">
                    {[
                      ...(profile.history || []),
                      ...(!isNewStudent
                        ? [
                            "Term 2 enrollment confirmed · 06 January 2025",
                            "Term 1 assessment completed · 86.4%",
                            "Admitted to " + profile.grade + " · " + profile.date,
                          ]
                        : []),
                    ].map((t, i) => (
                      <div key={i}>
                        <i />
                        <p>{t}</p>
                      </div>
                    ))}
                  </div>
                </Card>
                <Card title="Quick actions">
                  <div className="op-quick-actions">
                    {[
                      "Assign class",
                      "Change house",
                      "Print student ID",
                      profile.status === "Inactive" ? "Reactivate student" : "Disable student",
                    ].map((t) => (
                      <button
                        disabled={!canEdit && t !== "Print student ID"}
                        key={t}
                        onClick={() => profileAction(t)}
                      >
                        <Icon
                          name={
                            t.includes("Print")
                              ? "download"
                              : t.includes("Disable")
                                ? "shield"
                                : "arrow"
                          }
                          size={16}
                        />
                        {t}
                        <Icon name="chevron" size={14} />
                      </button>
                    ))}
                  </div>
                </Card>
              </div>
            </div>
          ) : profileTab === "Documents" ? (
            <Card
              title="Student documents"
              sub="Illustrative checklist · document requirements must be school-configured"
            >
              <div className="op-document-grid">
                {[
                  "Birth certificate",
                  "Previous school record",
                  "Student photograph",
                  "Medical information",
                ].map((d, i) => (
                  <div key={d}>
                    <Icon name="book" size={24} />
                    <h3>{d}</h3>
                    <Badge>
                      {documents[profile.id]?.includes(d)
                        ? "Selected locally"
                        : !isNewStudent && i < 2
                          ? "Verified"
                          : "Pending"}
                    </Badge>
                    <label className="op-file-link">
                      Select local file
                      <input
                        type="file"
                        disabled={!canEdit}
                        onChange={(e) => {
                          if (e.target.files?.[0]) {
                            setDocuments({
                              ...documents,
                              [profile.id]: [...(documents[profile.id] || []), d],
                            });
                            notify(
                              "File selected in preview only; no upload or verification performed",
                            );
                          }
                        }}
                      />
                    </label>
                  </div>
                ))}
              </div>
            </Card>
          ) : profileTab === "Credentials / Documents" ? (
            <StudentCredentialsPanel student={profile.id} navigate={go} />
          ) : ["Homework", "Download Center", "Library"].includes(profileTab) ? (
            <StudentLearningPanel student={profile.id} tab={profileTab} navigate={go} />
          ) : profileTab === "Examinations" || profileTab === "Academics" ? (
            <StudentExamPanel student={profile.id} navigate={go} />
          ) : profileTab === "Fees" ? (
            <StudentFeePanel student={profile} session={session} onNavigate={go} />
          ) : profileTab === "Timeline" ? (
            <Card
              title="Student activity"
              sub="Operational student history · not the formal audit log"
            >
              <div className="op-timeline">
                {[
                  ...(profile.history || []),
                  "Student profile reviewed · Alex Morgan",
                  "Enrollment confirmed · " + profile.date,
                ].map((t, i) => (
                  <div key={i}>
                    <i />
                    <p>{t}</p>
                  </div>
                ))}
              </div>
            </Card>
          ) : profileTab === "Guardian" ? (
            <Card title="Guardian information">
              <dl className="op-dl">
                {[
                  ["Name", profile.guardian],
                  ["Contact", profile.phone],
                  ["Email", profile.email || "Not provided"],
                ].map(([k, v]) => (
                  <div key={k}>
                    <dt>{k}</dt>
                    <dd>{v}</dd>
                  </div>
                ))}
              </dl>
            </Card>
          ) : (
            <Card
              title={profileTab + " history"}
              sub={profile.name + " · " + session}
              action={
                <Button
                  onClick={() =>
                    go(
                      profileTab === "Fees"
                        ? "Fees Collection"
                        : profileTab === "Attendance"
                          ? "Attendance"
                          : profileTab === "Homework"
                            ? "Homework"
                            : "Examinations",
                    )
                  }
                >
                  Open workspace <Icon name="arrow" size={14} />
                </Button>
              }
            >
              {profileTab === "Fees" ? (
                <div className="op-record-metrics">
                  <div>
                    <small>Fees charged</small>
                    <strong>{isNewStudent ? "$0" : "$4,500"}</strong>
                  </div>
                  <div>
                    <small>Payments received</small>
                    <strong>{isNewStudent ? "$0" : "$3,250"}</strong>
                  </div>
                  <div>
                    <small>Outstanding</small>
                    <strong>{isNewStudent ? "$0" : "$1,250"}</strong>
                  </div>
                </div>
              ) : profileTab === "Attendance" ? (
                <div className="op-record-metrics">
                  <div>
                    <small>Present</small>
                    <strong>{isNewStudent ? "—" : "146 days"}</strong>
                  </div>
                  <div>
                    <small>Absent</small>
                    <strong>{isNewStudent ? "—" : "8 days"}</strong>
                  </div>
                  <div>
                    <small>Attendance rate</small>
                    <strong>{isNewStudent ? "—" : "94.8%"}</strong>
                  </div>
                </div>
              ) : null}
              {profileTab === "Fees"
                ? table(
                    ["Date", "Reference", "Transaction", "Charge", "Paid", "Status"],
                    (isNewStudent
                      ? []
                      : [
                          ["06 Jan 2025", "FEE-01042", "Annual tuition", "$4,500", "—", "Posted"],
                          ["12 Jan 2025", "RCP-02481", "Bank transfer", "—", "$3,250", "Paid"],
                        ]
                    ).map((r) => (
                      <tr key={r[1]}>
                        {r.map((v, i) => (
                          <td key={i}>{i === 5 ? <Badge>{v}</Badge> : v}</td>
                        ))}
                      </tr>
                    )),
                    isNewStudent ? 0 : 2,
                  )
                : table(
                    profileTab === "Attendance"
                      ? ["Date", "Session", "Status", "Notes"]
                      : ["Subject / activity", "Teacher", "Progress", "Status"],
                    (isNewStudent
                      ? []
                      : ["Mathematics", "English language", "Science", "History"]
                    ).map((s, i) => (
                      <tr key={s}>
                        {profileTab === "Attendance" ? (
                          <>
                            <td>{24 - i} February 2025</td>
                            <td>{session}</td>
                            <td>
                              <Badge>{i === 2 ? "Absent" : "Present"}</Badge>
                            </td>
                            <td>{i === 2 ? "Guardian notified" : "—"}</td>
                          </>
                        ) : (
                          <>
                            <td>{s}</td>
                            <td>Sarah Chen</td>
                            <td>{90 - i * 4}%</td>
                            <td>
                              <Badge>On track</Badge>
                            </td>
                          </>
                        )}
                      </tr>
                    )),
                    isNewStudent ? 0 : 4,
                  )}
            </Card>
          )}
        </>
      ) : page === "Student Admission" ? (
        <>
          <div className="op-stepper">
            {["Student", "Guardian", "Enrollment", "Review"].map((s, i) => (
              <div key={s} className={i === step ? "current" : i < step ? "complete" : ""}>
                <span>{i < step ? <Icon name="check" size={16} /> : i + 1}</span>
                <div>
                  <b>{s}</b>
                  <small>
                    {
                      [
                        "Identity & background",
                        "Contacts & care",
                        "Academic placement",
                        "Confirm admission",
                      ][i]
                    }
                  </small>
                </div>
              </div>
            ))}
          </div>
          <form className="op-admission" onSubmit={admit}>
            <Card
              title={
                [
                  "Student information",
                  "Guardian information",
                  "Enrollment & placement",
                  "Review admission",
                ][step]
              }
              sub={
                step === 3
                  ? "Review the record before admitting. No fees are charged by this preview."
                  : "Complete the required fields. Save a draft to continue within this preview."
              }
            >
              <div className="op-form-grid">
                {(step === 0
                  ? [
                      ["first", "First name", true],
                      ["last", "Last name", true],
                      ["dob", "Date of birth", false, "date"],
                      ["previous", "Previous school"],
                      ["category", "Category", false, configs["Student Categories"]],
                      ["house", "House", false, configs["Student House"]],
                    ]
                  : step === 1
                    ? [
                        ["guardian", "Guardian full name", true],
                        [
                          "relationship",
                          "Relationship",
                          true,
                          ["Parent", "Legal guardian", "Other"],
                        ],
                        ["phone", "Phone"],
                        ["email", "Email", false, "email"],
                        ["address", "Address"],
                        ["emergency", "Emergency contact"],
                      ]
                    : step === 2
                      ? [
                          [
                            "session",
                            "Academic session",
                            true,
                            [session, "2025 – 2026", "2023 – 2024"],
                          ],
                          ["grade", "Class", true, classes],
                          ["section", "Section", true, ["A", "B", "C"]],
                          ["date", "Admission date", true, "date"],
                          ["admission", "Admission number", true],
                          ["source", "Admission source", false, configs["Enquiry Sources"]],
                        ]
                      : []
                ).map(([key, label, req, opts]) => (
                  <Field
                    key={String(key)}
                    label={String(label)}
                    value={draft[String(key)] || ""}
                    onChange={(v) => updateDraft(String(key), v)}
                    required={!!req}
                    options={Array.isArray(opts) ? (opts as string[]) : undefined}
                    type={typeof opts === "string" ? opts : "text"}
                  />
                ))}
                {step === 2 && (
                  <div className="op-notice">
                    <Icon name="shield" size={17} />
                    <span>
                      Identifier is an illustrative preview. The real admission-number policy and
                      document requirements remain configuration decisions.
                    </span>
                  </div>
                )}
                {step === 3 && (
                  <>
                    <div className="op-review-person">
                      <span className="op-avatar large">
                        {draft.first?.[0]}
                        {draft.last?.[0]}
                      </span>
                      <div>
                        <h2>
                          {draft.first} {draft.last}
                        </h2>
                        <p>
                          {draft.admission} · {draft.grade} · Section {draft.section}
                        </p>
                      </div>
                    </div>
                    <dl className="op-dl">
                      {[
                        ["Guardian", draft.guardian],
                        ["Contact", draft.phone || draft.email],
                        ["Session", draft.session],
                        ["Admission date", draft.date],
                        ["House", draft.house || "Not assigned"],
                        ["Source", draft.source || "Not specified"],
                      ].map(([k, v]) => (
                        <div key={k}>
                          <dt>{k}</dt>
                          <dd>{v}</dd>
                        </div>
                      ))}
                    </dl>
                    <div className="op-notice">
                      <Icon name="check" size={17} />
                      Review required documents in Online Admission before a production approval.
                    </div>
                  </>
                )}
              </div>
              {error && (
                <div role="alert" className="op-form-error">
                  {error}
                </div>
              )}
            </Card>
            <div className="op-wizard-footer">
              <Button
                onClick={() => {
                  if (step > 0) setStep(step - 1);
                  else go("Student Directory");
                }}
              >
                {step ? "Back" : "Cancel"}
              </Button>
              <span>
                {draftSaved
                  ? "Draft saved in preview memory"
                  : dirty
                    ? "Unsaved changes"
                    : "Preview admission workflow"}
              </span>
              <Button
                onClick={() => {
                  setDraftSaved(true);
                  setDirty(false);
                  notify("Draft retained in this preview until reload");
                }}
              >
                Save draft
              </Button>
              <Button primary disabled={!canEdit} type="submit">
                {step === 3 ? "Admit student" : "Continue"}
                <Icon name="chevron" size={14} />
              </Button>
            </div>
          </form>
        </>
      ) : registerColumns[page] ? (
        <>
          <div className="op-module-tabs">
            {frontPages.map((p) => (
              <button key={p} className={p === page ? "active" : ""} onClick={() => go(p)}>
                {p === "Front Office" ? "Overview" : p}
              </button>
            ))}
          </div>
          {page === "Complaints" &&
            stat([
              ["Open", String(registers.Complaints.filter((r) => r.status !== "Resolved").length)],
              [
                "High priority",
                String(registers.Complaints.filter((r) => r.priority === "High").length),
              ],
              [
                "Awaiting reply",
                String(registers.Complaints.filter((r) => r.status === "Awaiting Reply").length),
              ],
              [
                "Resolved",
                String(registers.Complaints.filter((r) => r.status === "Resolved").length),
              ],
            ])}
          <Card
            title={page === "Complaints" ? "Complaint register" : page}
            sub="Illustrative records · changes are simulated in this preview"
          >
            {toolbar()}
            {(() => {
              const data = (registers[page] || []).filter(
                (r) =>
                  [r.name, r.id, r.phone || "", r.contact || ""].some((x) =>
                    String(x).toLowerCase().includes(q.toLowerCase()),
                  ) &&
                  (statusFilter === "All statuses" || r.status === statusFilter),
              );
              return table(
                [...registerColumns[page].map((c) => c[1]), ""],
                slice(data).map((r) => (
                  <tr key={r.id}>
                    {registerColumns[page].map(([k], i) => (
                      <td key={k}>
                        {k === "status" || k === "priority" ? (
                          <Badge>{r[k]}</Badge>
                        ) : i === 0 ? (
                          <button
                            className="op-row-link"
                            onClick={() => show("register-detail", r.name, r)}
                          >
                            {r[k]}
                          </button>
                        ) : (
                          r[k] || "—"
                        )}
                      </td>
                    ))}
                    <td>
                      <button
                        className="op-row-link"
                        onClick={() => show("register-detail", r.name, r)}
                      >
                        Details <Icon name="arrow" size={14} />
                      </button>
                    </td>
                  </tr>
                )),
                data.length,
              );
            })()}
          </Card>
        </>
      ) : (
        <>
          <div className="op-settings-layout">
            {page === "Front Office Setup" && (
              <nav>
                {Object.keys(configSeed)
                  .slice(0, 8)
                  .map((t) => (
                    <button
                      className={configTab === t ? "active" : ""}
                      key={t}
                      onClick={() => setConfigTab(t)}
                    >
                      {t}
                      <Icon name="chevron" size={14} />
                    </button>
                  ))}
              </nav>
            )}
            <Card
              title={page === "Front Office Setup" ? configTab : page}
              sub="School-specific reference values · historical records are not rewritten"
              action={
                <Button
                  primary
                  icon="plus"
                  disabled={!canEdit}
                  onClick={() =>
                    show(
                      "config-form",
                      "Add " + (page === "Front Office Setup" ? configTab : page).toLowerCase(),
                    )
                  }
                >
                  Add new
                </Button>
              }
            >
              {page === "Student House" && (
                <div className="op-house-grid">
                  {configs["Student House"].map((h, i) => (
                    <button
                      key={h}
                      onClick={() => {
                        setSelected([]);
                        show("house-roster", h);
                      }}
                    >
                      <i
                        style={{ background: ["#729f8b", "#7398b4", "#c9a26c", "#a08bb7"][i % 4] }}
                      />
                      <strong>{h}</strong>
                      <span>
                        {rows.filter((r) => (r.house || "Oak House") === h).length} students
                      </span>
                      <small>View roster →</small>
                    </button>
                  ))}
                </div>
              )}
              {table(
                ["Name", "Description / code", "Usage", "Status", ""],
                (configs[page === "Front Office Setup" ? configTab : page] || []).map((name, i) => (
                  <tr key={name}>
                    <td>
                      <b>{name}</b>
                    </td>
                    <td>
                      {(page === "Front Office Setup" ? configTab : page).toUpperCase().slice(0, 3)}
                      -{String(i + 1).padStart(2, "0")}
                    </td>
                    <td>
                      {page === "Student House"
                        ? rows.filter((r) => (r.house || "Oak House") === name).length
                        : page === "Student Categories"
                          ? rows.filter((r) => (r.category || "General") === name).length
                          : "—"}
                    </td>
                    <td>
                      <Badge>{inactive.includes(name) ? "Inactive" : "Active"}</Badge>
                    </td>
                    <td>
                      <div className="op-inline">
                        <Button
                          disabled={!canEdit}
                          onClick={() =>
                            show("config-form", "Edit reference value", {
                              id: name,
                              name,
                              date: "2025-02-24",
                              status: "Active",
                            })
                          }
                        >
                          Edit
                        </Button>
                        <Button
                          disabled={!canEdit}
                          onClick={() => {
                            if (
                              window.confirm(
                                "Change availability for future use? Historical record values will be retained.",
                              )
                            ) {
                              setInactive(
                                inactive.includes(name)
                                  ? inactive.filter((n) => n !== name)
                                  : [...inactive, name],
                              );
                              notify("Availability changed in preview");
                            }
                          }}
                        >
                          {inactive.includes(name) ? "Activate" : "Disable"}
                        </Button>
                      </div>
                    </td>
                  </tr>
                )),
                (configs[page === "Front Office Setup" ? configTab : page] || []).length,
              )}
            </Card>
          </div>
        </>
      )}
      <div className="op-footnote">
        <span>
          <Icon name="shield" size={13} />
          Shared student record · {school}
        </span>
        <span>Illustrative Data · no backend connected</span>
      </div>
      {drawer && (
        <div
          className="op-overlay"
          onClick={() => {
            if (!dirty || window.confirm("Discard unsaved changes?")) {
              setDrawer(null);
              setDirty(false);
            }
          }}
        >
          <aside
            className={"op-drawer " + (drawer.type === "delete" ? "op-delete-drawer" : "")}
            role="dialog"
            aria-modal="true"
            aria-label={drawer.title}
            onClick={(e) => e.stopPropagation()}
          >
            <header>
              <div>
                <small>
                  {drawer.type === "delete" ? "GUARDED PREVIEW ACTION" : "OPERATIONS / " + session}
                </small>
                <h2>{drawer.title}</h2>
              </div>
              <button
                aria-label="Close drawer"
                onClick={() => {
                  if (!dirty || window.confirm("Discard unsaved changes?")) {
                    setDrawer(null);
                    setDirty(false);
                  }
                }}
              >
                <Icon name="close" size={21} />
              </button>
            </header>
            <div className="op-drawer-body">
              {drawer.type === "preview" ? (
                <>
                  <div className="op-notice">
                    <Icon name="shield" />
                    <span>
                      All records and actions are illustrative. No database, uploads, live
                      authorization, or audit service is connected.
                    </span>
                  </div>
                  <Field
                    label="Preview role"
                    value={role}
                    onChange={setRole}
                    options={["Administrator", "Read-only staff"]}
                  />
                  <Field
                    label="Exception state"
                    value={state}
                    onChange={setState}
                    options={["Ready", "Loading", "Empty", "Filtered empty", "Error", "Restricted"]}
                  />
                  <h3>Product decisions still required</h3>
                  <ul className="op-assumptions">
                    {[
                      "Required admission documents and approval rules",
                      "Admission-number format, uniqueness and generation policy",
                      "Concurrent class membership model",
                      "Disable/reactivation and historical enrollment behavior",
                      "Deletion eligibility, archival and database dependencies",
                      "Real roles, financial access, audit and retention policy",
                    ].map((t) => (
                      <li key={t}>{t}</li>
                    ))}
                  </ul>
                </>
              ) : drawer.type === "filters" ? (
                <>
                  <Field
                    label="Sort students by"
                    value={sort}
                    onChange={setSort}
                    options={["Name", "Admission no.", "Admission date"]}
                  />
                  <h3>Visible registry columns</h3>
                  {[
                    "Admission no.",
                    "Class",
                    "Section",
                    "Guardian",
                    "Phone",
                    "Admission date",
                    "Status",
                  ].map((h) => (
                    <label className="op-checkbox-row" key={h}>
                      <input
                        type="checkbox"
                        checked={!hidden.includes(h)}
                        onChange={() =>
                          setHidden(
                            hidden.includes(h) ? hidden.filter((x) => x !== h) : [...hidden, h],
                          )
                        }
                      />
                      {h}
                    </label>
                  ))}
                  <Button primary onClick={() => setDrawer(null)}>
                    Apply view
                  </Button>
                </>
              ) : drawer.type === "success" && admitted ? (
                <>
                  <div className="op-success">
                    <span>
                      <Icon name="check" size={28} />
                    </span>
                    <h2>Welcome, {admitted.name.split(" ")[0]}.</h2>
                    <p>The student is now part of your preview registry.</p>
                    <Badge>Active student</Badge>
                  </div>
                  <dl className="op-dl">
                    <div>
                      <dt>Admission number</dt>
                      <dd>{admitted.id}</dd>
                    </div>
                    <div>
                      <dt>Enrollment</dt>
                      <dd>
                        {admitted.grade} · {admitted.section}
                      </dd>
                    </div>
                  </dl>
                  <Button primary onClick={() => openStudent(admitted)}>
                    Open Student 360 <Icon name="arrow" size={14} />
                  </Button>
                </>
              ) : drawer.type === "enquiry-form" ||
                drawer.type === "register-form" ||
                drawer.type === "config-form" ? (
                <form onSubmit={saveForm}>
                  <div className="op-form-grid">
                    {(drawer.type === "enquiry-form"
                      ? [
                          ["name", "Applicant full name", true],
                          ["grade", "Applying class", true, classes],
                          ["session", "Academic session", true, [session, "2025 – 2026"]],
                          ["guardian", "Guardian full name", true],
                          ["phone", "Guardian phone"],
                          ["email", "Guardian email", false, "email"],
                          ["source", "Enquiry source", false, configs["Enquiry Sources"]],
                          ["owner", "Assigned staff", false, ["Sarah Chen", "Alex Morgan"]],
                          ["follow", "Follow-up date", false, "date"],
                          ["previous", "Previous school"],
                          ["notes", "Notes", false, "textarea"],
                        ]
                      : drawer.type === "config-form"
                        ? [
                            ["name", "Name", true],
                            ["description", "Description", false, "textarea"],
                          ]
                        : page === "Visitor Book"
                          ? [
                              ["name", "Visitor full name", true],
                              ["phone", "Phone", true],
                              ["organization", "Organization"],
                              ["purpose", "Purpose", true, configs["Visitor Purposes"]],
                              ["department", "Person / department", true],
                              ["time", "Check-in time", true, "time"],
                              ["notes", "Notes", false, "textarea"],
                            ]
                          : page === "Complaints"
                            ? [
                                ["name", "Complaint summary", true],
                                ["contact", "Complainant", true],
                                ["phone", "Contact phone"],
                                ["category", "Category", true, configs["Complaint Categories"]],
                                ["priority", "Priority", true, configs["Complaint Priorities"]],
                                ["owner", "Assigned handler", true, ["Sarah Chen", "Alex Morgan"]],
                                ["notes", "Description", true, "textarea"],
                              ]
                            : page === "Phone Call Log"
                              ? [
                                  ["name", "Caller full name", true],
                                  ["phone", "Phone", true],
                                  ["type", "Call type", true, configs["Call Types"]],
                                  ["owner", "Recipient", true, ["Sarah Chen", "Alex Morgan"]],
                                  ["reason", "Reason", true],
                                  ["follow", "Follow-up date", false, "date"],
                                  ["notes", "Call summary", false, "textarea"],
                                ]
                              : [
                                  [
                                    "name",
                                    page === "Postal Dispatch" ? "Recipient" : "Sender",
                                    true,
                                  ],
                                  ["organization", "Organization"],
                                  ["address", "Address / contact"],
                                  ["type", "Document type", true, configs["Postal Types"]],
                                  ["date", "Date", true, "date"],
                                  [
                                    page === "Postal Dispatch" ? "method" : "department",
                                    page === "Postal Dispatch"
                                      ? "Delivery method"
                                      : "Recipient department",
                                    true,
                                  ],
                                  ["tracking", "Tracking reference"],
                                  [
                                    "owner",
                                    "Responsible staff",
                                    true,
                                    ["Sarah Chen", "Alex Morgan"],
                                  ],
                                  ["notes", "Description / notes", false, "textarea"],
                                ]
                    ).map(([k, l, r, o]) => (
                      <Field
                        key={String(k)}
                        label={String(l)}
                        value={form[String(k)] || ""}
                        required={!!r}
                        onChange={(v) => change(String(k), v)}
                        options={Array.isArray(o) ? (o as string[]) : undefined}
                        type={typeof o === "string" ? o : "text"}
                      />
                    ))}
                  </div>
                  {error && (
                    <p className="op-form-error" role="alert">
                      {error}
                    </p>
                  )}
                  <div className="op-drawer-actions">
                    <Button
                      onClick={() => {
                        if (!dirty || window.confirm("Discard unsaved changes?")) {
                          setDrawer(null);
                          setDirty(false);
                        }
                      }}
                    >
                      Cancel
                    </Button>
                    <Button primary disabled={!canEdit} type="submit">
                      Save preview
                    </Button>
                  </div>
                </form>
              ) : drawer.type === "enquiry" && drawer.row ? (
                <>
                  <div className="op-detail-person">
                    <span className="op-avatar large">
                      {drawer.row.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </span>
                    <div>
                      <h2>{drawer.row.name}</h2>
                      <p>
                        {drawer.row.id} · {drawer.row.grade}
                      </p>
                      <Badge>
                        {enquiries.find((r) => r.id === drawer.row?.id)?.status ||
                          drawer.row.status}
                      </Badge>
                    </div>
                  </div>
                  <dl className="op-dl">
                    {[
                      ["Guardian", drawer.row.guardian],
                      ["Phone", drawer.row.phone],
                      ["Source", drawer.row.source],
                      ["Owner", drawer.row.owner],
                      [
                        "Follow-up",
                        enquiries.find((r) => r.id === drawer.row?.id)?.follow || "Not scheduled",
                      ],
                    ].map(([k, v]) => (
                      <div key={k}>
                        <dt>{k}</dt>
                        <dd>{v || "—"}</dd>
                      </div>
                    ))}
                  </dl>
                  <p className="op-description">{drawer.row.notes}</p>
                  <h3>Next follow-up</h3>
                  <input
                    aria-label="Follow-up date"
                    type="date"
                    defaultValue={drawer.row.follow}
                    onChange={(e) => {
                      setEnquiries(
                        enquiries.map((r) =>
                          r.id === drawer.row?.id
                            ? { ...r, follow: e.target.value, status: "Follow-up" }
                            : r,
                        ),
                      );
                      log(drawer.row!.id, "Follow-up scheduled for " + e.target.value);
                      notify("Follow-up scheduled in preview");
                    }}
                    disabled={!canEdit}
                  />
                  <h3>Activity</h3>
                  <div className="op-timeline">
                    {["Enquiry created · " + drawer.row.date, ...(notes[drawer.row.id] || [])].map(
                      (t, i) => (
                        <div key={i}>
                          <i />
                          <p>{t}</p>
                        </div>
                      ),
                    )}
                  </div>
                  <div className="op-drawer-actions">
                    <Button
                      disabled={!canEdit}
                      onClick={() =>
                        show(
                          "enquiry-form",
                          "Edit admission enquiry",
                          enquiries.find((r) => r.id === drawer.row?.id),
                        )
                      }
                    >
                      Edit enquiry
                    </Button>
                    <Button
                      primary
                      disabled={!canEdit}
                      onClick={() => {
                        const existing = applications.find((a) => a.enquiry === drawer.row!.id);
                        if (existing) {
                          show("application", "Application review", existing);
                          return;
                        }
                        const app = {
                          ...drawer.row!,
                          id: `APP-2025-${84 + applications.length}`,
                          enquiry: drawer.row!.id,
                          status: "Submitted",
                          docs: [],
                        };
                        setApplications([...applications, app]);
                        setEnquiries(
                          enquiries.map((r) =>
                            r.id === drawer.row!.id ? { ...r, status: "Converted" } : r,
                          ),
                        );
                        log(drawer.row!.id, "Converted to application " + app.id);
                        show("application", "Application review", app);
                      }}
                    >
                      Convert to application
                    </Button>
                  </div>
                </>
              ) : drawer.type === "application" && drawer.row ? (
                <>
                  {(() => {
                    const r = applications.find((a) => a.id === drawer.row!.id) || drawer.row!;
                    return (
                      <>
                        <div className="op-detail-person">
                          <span className="op-avatar large">
                            {r.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")}
                          </span>
                          <div>
                            <h2>{r.name}</h2>
                            <p>
                              {r.id} · {r.grade}
                            </p>
                            <Badge>{r.status}</Badge>
                          </div>
                        </div>
                        <h3>Document review</h3>
                        {["Birth certificate", "Previous school record"].map((d) => (
                          <label className="op-checkbox-row" key={d}>
                            <input
                              disabled={!canEdit}
                              type="checkbox"
                              checked={r.docs?.includes(d) || false}
                              onChange={() =>
                                setApplications(
                                  applications.map((a) =>
                                    a.id === r.id
                                      ? {
                                          ...a,
                                          docs: a.docs?.includes(d)
                                            ? a.docs.filter((x) => x !== d)
                                            : [...(a.docs || []), d],
                                        }
                                      : a,
                                  ),
                                )
                              }
                            />
                            {d}
                            <Badge>{r.docs?.includes(d) ? "Verified" : "Missing"}</Badge>
                          </label>
                        ))}
                        <p className="op-description">
                          Checklist is illustrative and manually reviewed. No uploaded documents or
                          online application service are connected.
                        </p>
                        <Field
                          label="Review status"
                          value={r.status}
                          options={
                            r.status === "Admitted"
                              ? ["Admitted"]
                              : [
                                  "Submitted",
                                  "Under Review",
                                  "Awaiting Information",
                                  "Approved",
                                  "Rejected",
                                ]
                          }
                          onChange={(v) => {
                            if (!canEdit) return;
                            if (v === "Approved" && (r.docs?.length || 0) < 2) {
                              notify("Review the missing documents before approval");
                              return;
                            }
                            setApplications(
                              applications.map((a) => (a.id === r.id ? { ...a, status: v } : a)),
                            );
                            log(r.id, "Review status changed to " + v);
                          }}
                        />
                        <Field
                          label="Assigned reviewer"
                          value={r.owner || "Sarah Chen"}
                          options={["Sarah Chen", "Alex Morgan"]}
                          onChange={(v) =>
                            canEdit &&
                            setApplications(
                              applications.map((a) => (a.id === r.id ? { ...a, owner: v } : a)),
                            )
                          }
                        />
                        <h3>Review notes</h3>
                        <textarea
                          aria-label="Review notes"
                          value={newNote}
                          onChange={(e) => setNewNote(e.target.value)}
                        />
                        <Button
                          disabled={!canEdit || !newNote.trim()}
                          onClick={() => {
                            log(r.id, newNote);
                            setNewNote("");
                          }}
                        >
                          Add internal note
                        </Button>
                        <div className="op-timeline">
                          {(notes[r.id] || []).map((n, i) => (
                            <div key={i}>
                              <i />
                              <p>{n}</p>
                            </div>
                          ))}
                        </div>
                        {(r.docs?.length || 0) < 2 && (
                          <div className="op-notice amber">
                            Documents are incomplete. Request information before approval.
                          </div>
                        )}
                        <div className="op-drawer-actions">
                          <Button
                            disabled={!canEdit}
                            onClick={() => {
                              setApplications(
                                applications.map((a) =>
                                  a.id === r.id ? { ...a, status: "Awaiting Information" } : a,
                                ),
                              );
                              log(r.id, "Additional information requested");
                            }}
                          >
                            Request information
                          </Button>
                          <Button
                            disabled={
                              !canEdit || (r.docs?.length || 0) < 2 || r.status === "Admitted"
                            }
                            onClick={() => {
                              setApplications(
                                applications.map((a) =>
                                  a.id === r.id ? { ...a, status: "Approved" } : a,
                                ),
                              );
                              log(r.id, "Application approved; admission still required");
                            }}
                          >
                            Approve
                          </Button>
                          <Button
                            primary
                            disabled={!canEdit || r.status !== "Approved"}
                            onClick={() => startAdmission(r)}
                          >
                            Continue to admission
                          </Button>
                        </div>
                      </>
                    );
                  })()}
                </>
              ) : drawer.type === "register-detail" && drawer.row ? (
                <>
                  {(() => {
                    const r =
                      (registers[page] || []).find((x) => x.id === drawer.row!.id) || drawer.row!;
                    return (
                      <>
                        <Badge>{r.status}</Badge>
                        <dl className="op-dl">
                          {(registerColumns[page] || []).map(([k, l]) => (
                            <div key={k}>
                              <dt>{l}</dt>
                              <dd>{r[k] || "—"}</dd>
                            </div>
                          ))}
                        </dl>
                        <p className="op-description">{r.notes || "No additional notes."}</p>
                        {page === "Visitor Book" ? (
                          <Button
                            primary
                            disabled={!canEdit || r.status === "Checked out"}
                            onClick={() => {
                              applyRegister(r.id, { status: "Checked out", exit: "10:30" });
                              log(r.id, "Visitor checked out");
                              notify("Visitor checked out in preview");
                            }}
                          >
                            Check out visitor
                          </Button>
                        ) : page === "Complaints" ? (
                          <>
                            <Field
                              label="Complaint status"
                              value={r.status}
                              options={["Received", "Investigating", "Awaiting Reply", "Resolved"]}
                              onChange={(v) => {
                                if (v === "Resolved" && !newNote.trim()) {
                                  setError("Add a resolution note before resolving.");
                                  return;
                                }
                                if (canEdit) {
                                  applyRegister(r.id, { status: v });
                                  log(
                                    r.id,
                                    "Status changed to " + v + (newNote ? " · " + newNote : ""),
                                  );
                                  setNewNote("");
                                  setError("");
                                }
                              }}
                            />
                            <Field
                              label="Assigned handler"
                              value={r.owner || "Alex Morgan"}
                              options={["Alex Morgan", "Sarah Chen"]}
                              onChange={(v) => canEdit && applyRegister(r.id, { owner: v })}
                            />
                            <Field
                              label="Internal / resolution note"
                              value={newNote}
                              onChange={setNewNote}
                              type="textarea"
                            />
                            <Button
                              disabled={!canEdit || !newNote.trim()}
                              onClick={() => {
                                log(r.id, newNote);
                                setNewNote("");
                              }}
                            >
                              Add note
                            </Button>
                            {error && <p className="op-form-error">{error}</p>}
                            {r.status === "Resolved" && (
                              <Button
                                disabled={!canEdit}
                                onClick={() => {
                                  applyRegister(r.id, { status: "Received" });
                                  log(r.id, "Complaint reopened");
                                }}
                              >
                                Reopen complaint
                              </Button>
                            )}
                          </>
                        ) : (
                          <Button
                            disabled={!canEdit}
                            primary
                            onClick={() => {
                              applyRegister(r.id, {
                                status:
                                  page === "Postal Receive"
                                    ? "Acknowledged"
                                    : page === "Postal Dispatch"
                                      ? "Delivered"
                                      : "Returned",
                              });
                              log(r.id, "Record status updated");
                              notify("Status updated in preview");
                            }}
                          >
                            {page === "Postal Receive"
                              ? "Acknowledge receipt"
                              : page === "Postal Dispatch"
                                ? "Mark delivered"
                                : "Mark call returned"}
                          </Button>
                        )}
                        <h3>Activity history</h3>
                        <div className="op-timeline">
                          {["Record created · " + r.date, ...(notes[r.id] || [])].map((n, i) => (
                            <div key={i}>
                              <i />
                              <p>{n}</p>
                            </div>
                          ))}
                        </div>
                      </>
                    );
                  })()}
                </>
              ) : drawer.type === "delete" ? (
                <>
                  <div className="op-notice danger">
                    <Icon name="shield" />
                    <span>
                      <b>Preview archival, not database deletion.</b> Real eligibility and
                      linked-record protections need backend decisions.
                    </span>
                  </div>
                  <h3>
                    {selected.length} selected · {eligible.length} eligible · {blocked.length}{" "}
                    blocked
                  </h3>
                  {selectedRows.map((r) => (
                    <div className="op-list-row" key={r.id}>
                      <span>
                        <b>{r.name}</b>
                        <small>{r.id}</small>
                      </span>
                      <Badge>{r.status === "Active" ? "Blocked" : "Eligible"}</Badge>
                    </div>
                  ))}
                  <p className="op-description">
                    Active students are excluded in this illustrative policy. Financial, attendance,
                    examination and document dependencies are not evaluated by a backend.
                  </p>
                  <Field
                    label="Reason for action"
                    value={form.reason || ""}
                    onChange={(v) => change("reason", v)}
                    type="textarea"
                    required
                  />
                  <Field
                    label="Type DELETE to confirm preview archival"
                    value={confirmText}
                    onChange={setConfirmText}
                  />
                  <div className="op-drawer-actions">
                    <Button onClick={() => setDrawer(null)}>Cancel</Button>
                    <Button
                      danger
                      disabled={
                        !canEdit ||
                        !eligible.length ||
                        confirmText !== "DELETE" ||
                        !form.reason?.trim()
                      }
                      onClick={() => {
                        setRows(rows.filter((r) => !eligible.some((e) => e.id === r.id)));
                        setSelected(blocked.map((r) => r.id));
                        setDrawer(null);
                        setDirty(false);
                        notify(
                          `${eligible.length} eligible record(s) removed from this preview only`,
                        );
                      }}
                    >
                      Archive {eligible.length} eligible record(s)
                    </Button>
                  </div>
                </>
              ) : drawer.type === "house-roster" ? (
                <>
                  <p className="op-description">
                    House membership persistence across sessions is a product assumption.
                  </p>
                  {rows.map((r) => (
                    <label key={r.id} className="op-checkbox-row">
                      <input
                        type="checkbox"
                        disabled={!canEdit}
                        checked={(r.house || "Oak House") === drawer.title}
                        onChange={(e) =>
                          setRows(
                            rows.map((s) =>
                              s.id === r.id
                                ? { ...s, house: e.target.checked ? drawer.title : "Unassigned" }
                                : s,
                            ),
                          )
                        }
                      />
                      {r.name}
                      <small>{r.grade}</small>
                    </label>
                  ))}
                  <Button
                    primary
                    onClick={() => {
                      setDrawer(null);
                      notify("House roster updated in preview");
                    }}
                  >
                    Done
                  </Button>
                </>
              ) : drawer.type === "student-action" ? (
                <>
                  {drawer.title === "Student actions" ? (
                    <div className="op-quick-actions">
                      {[
                        "Assign class",
                        "Assign additional class",
                        "Change house",
                        "Print student ID",
                        profile.status === "Inactive" ? "Reactivate student" : "Disable student",
                      ].map((a) => (
                        <button key={a} onClick={() => profileAction(a)}>
                          {a}
                          <Icon name="chevron" size={14} />
                        </button>
                      ))}
                    </div>
                  ) : drawer.title === "Print student ID" ? (
                    <>
                      <div className="op-id-card">
                        <Icon name="book" size={28} />
                        <h3>{school}</h3>
                        <span className="op-avatar large">{profile.name[0]}</span>
                        <h2>{profile.name}</h2>
                        <p>{profile.id}</p>
                        <Badge>
                          {profile.grade} · {profile.section}
                        </Badge>
                        <small>Illustrative student ID · not an official credential</small>
                      </div>
                      <Button onClick={() => window.print()}>Print preview</Button>
                    </>
                  ) : (
                    <>
                      <p className="op-description">
                        {selected.length || 1} student record(s) · {session}. This action updates
                        the preview only and does not rewrite historical records.
                      </p>
                      {drawer.title === "Assign additional class" && selected.length === 0 && (
                        <Field
                          label="Student"
                          value={form.student || rows[0]?.id}
                          options={rows.map((r) => r.id)}
                          onChange={(v) => change("student", v)}
                        />
                      )}
                      <div className="op-form-grid">
                        {drawer.title === "Edit details" ? (
                          ["name", "guardian", "phone"].map((k) => (
                            <Field
                              key={k}
                              label={k.charAt(0).toUpperCase() + k.slice(1)}
                              value={form[k] || ""}
                              onChange={(v) => change(k, v)}
                              required
                            />
                          ))
                        ) : drawer.title.toLowerCase().includes("house") ? (
                          <Field
                            label="House"
                            value={form.house || "Oak House"}
                            onChange={(v) => change("house", v)}
                            options={configs["Student House"]}
                          />
                        ) : drawer.title.toLowerCase().includes("disable") ? (
                          <Field
                            label="Disable reason"
                            value={form.reason || configs["Disable Reason"][0]}
                            onChange={(v) => change("reason", v)}
                            options={configs["Disable Reason"]}
                          />
                        ) : (
                          <>
                            <Field
                              label="Class"
                              value={form.grade || classes[0]}
                              onChange={(v) => change("grade", v)}
                              options={classes}
                            />
                            <Field
                              label="Section"
                              value={form.section || "A"}
                              onChange={(v) => change("section", v)}
                              options={["A", "B", "C"]}
                            />
                          </>
                        )}
                      </div>
                      {drawer.title.includes("Reactivate") && (
                        <div className="op-notice">
                          Reactivation restores active status. Confirm the current class and section
                          above. Historical enrollment remains unchanged.
                        </div>
                      )}
                      <div className="op-drawer-actions">
                        <Button onClick={() => setDrawer(null)}>Cancel</Button>
                        <Button
                          primary
                          disabled={!canEdit}
                          onClick={() => {
                            const ids = selected.length ? selected : [form.student || rows[0]?.id];
                            const next = rows.map((r) => {
                              if (!ids.includes(r.id)) return r;
                              let patch: Partial<Student> =
                                drawer.title === "Edit details"
                                  ? {
                                      name: form.name || r.name,
                                      guardian: form.guardian || r.guardian,
                                      phone: form.phone || r.phone,
                                    }
                                  : drawer.title.toLowerCase().includes("house")
                                    ? { house: form.house || "Oak House" }
                                    : drawer.title.toLowerCase().includes("disable")
                                      ? {
                                          status: "Inactive",
                                          reason: form.reason || configs["Disable Reason"][0],
                                        }
                                      : drawer.title === "Assign additional class"
                                        ? { additional: form.grade || classes[0] }
                                        : {
                                            grade: form.grade || classes[0],
                                            section: form.section || "A",
                                            ...(drawer.title.includes("Reactivate")
                                              ? { status: "Active" }
                                              : {}),
                                          };
                              return {
                                ...r,
                                ...patch,
                                history: [
                                  drawer.title + " · " + session + " · just now",
                                  ...(r.history || []),
                                ],
                              };
                            });
                            setRows(next);
                            const p = next.find((r) => r.id === profile.id);
                            if (p) setProfile(p);
                            setDrawer(null);
                            setDirty(false);
                            notify("Student record updated in preview");
                          }}
                        >
                          Confirm preview change
                        </Button>
                      </div>
                    </>
                  )}
                </>
              ) : null}
            </div>
            <footer>
              <Icon name="shield" size={13} />
              Preview only · no server-backed changes
            </footer>
          </aside>
        </div>
      )}
    </div>
  );
}

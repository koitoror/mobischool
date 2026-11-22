import { useEffect, useState } from "react";
import { useWorkforce } from "./WorkforceContext";
import { useFinance } from "./FinanceContext";
import {
  hrPages,
  communicationPages,
  staffStatuses,
  workingDays,
  leaveError,
  payrollTotals,
  normalizedRecipients,
  messageError,
  smsMetrics,
  type Staff,
  type StaffLeave,
  type Audit,
  type Notice,
  type Message,
} from "./workforceModel";
import { Button, Badge, Card, Field } from "./components/OperationsUI";
import Icon from "./components/Icon";
import useDialogFocus from "./components/useDialogFocus";
import { importedGuardians } from "./peopleData";
import type { Student } from "./Lifecycle";
import "./workforce.css";
const roles = [
  "School Administrator",
  "HR Manager",
  "HR Officer",
  "Finance Officer",
  "Department Head",
  "Teacher",
  "General Staff",
  "Communications Officer",
];
export default function Workforce({
  page,
  active,
  session,
  school,
  students,
  navigate,
  notify,
  onDirty,
}: {
  page: string;
  active: boolean;
  session: string;
  school: string;
  students: Student[];
  navigate: (p: string) => void;
  notify: (s: string) => void;
  onDirty: (b: boolean) => void;
}) {
  const w = useWorkforce();
  const { money, currency, setCurrency } = useFinance();
  const [q, setQ] = useState("");
  const [department, setDepartment] = useState("All departments");
  const [designation, setDesignation] = useState("All designations");
  const [employment, setEmployment] = useState("All employment types");
  const [status, setStatus] = useState("All statuses");
  const [index, setIndex] = useState(1);
  const [size, setSize] = useState(10);
  const [sort, setSort] = useState("Name");
  const [hidden, setHidden] = useState<string[]>([]);
  const [selection, setSelection] = useState<string[]>([]);
  const [focused, setFocused] = useState("");
  const [profileTab, setProfileTab] = useState("Overview");
  const [drawer, setDrawer] = useState<{ type: string; title: string; id?: string } | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [drafts, setDrafts] = useState<Record<string, Record<string, string>>>({});
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState("");
  const [confirm, setConfirm] = useState("");
  const [state, setState] = useState("Ready");
  const [period, setPeriod] = useState("2025-02");
  const [attendanceDraft, setAttendanceDraft] = useState<Record<string, string>>({});
  const [audience, setAudience] = useState("Manual recipients");
  const [targetIds, setTargetIds] = useState<string[]>([]);
  const [criterionScores, setCriterionScores] = useState<Record<string, number>>({});
  const [channelFilter, setChannelFilter] = useState("All channels");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const administrator = w.role === "School Administrator";
  const hrEdit = ["School Administrator", "HR Manager", "HR Officer"].includes(w.role);
  const hrApprove = ["School Administrator", "HR Manager"].includes(w.role);
  const payrollAccess = ["School Administrator", "HR Manager", "Finance Officer"].includes(w.role);
  const evaluateAccess = ["School Administrator", "HR Manager", "Department Head"].includes(w.role);
  const communicationsAccess = ["School Administrator", "Communications Officer"].includes(w.role);
  const ownOnly = ["Teacher", "General Staff"].includes(w.role);
  const actor = w.staff.find((s) => s.id === w.actor);
  const actorName = actor?.name || "Preview operator";
  const staffById = (id: string) => w.staff.find((s) => s.id === id);
  const audit = (old: string, next: string, reason: string): Audit => ({
    at: new Date().toISOString(),
    actor: actorName,
    from: old,
    to: next,
    reason,
  });
  const allVisible = w.staff.filter((s) => !ownOnly || s.id === w.actor);
  const staffRows = allVisible
    .filter(
      (s) =>
        (page === "Disabled Staff"
          ? s.status === "Disabled"
          : status === "Disabled"
            ? s.status === "Disabled"
            : s.status === "Active") &&
        [s.name, s.id, s.department, s.designation].some((v) =>
          v.toLowerCase().includes(q.toLowerCase()),
        ) &&
        (department === "All departments" || s.department === department) &&
        (designation === "All designations" || s.designation === designation) &&
        (employment === "All employment types" || s.employment === employment),
    )
    .sort((a, b) =>
      sort === "Staff ID" ? a.id.localeCompare(b.id) : a.name.localeCompare(b.name),
    );
  const summary = w.summary();
  const profile = staffById(focused);
  const selectedStaff = w.staff.filter((s) => selection.includes(s.id));
  const payrollRows = selectedStaff.map((s) => {
    const salary = w.salaries[s.id];
    try {
      return {
        s,
        salary,
        calc: salary ? payrollTotals(salary) : null,
        error: !salary
          ? "Salary not configured"
          : s.status !== "Active"
            ? "Staff disabled"
            : w.batches.some((b) => b.period === period && b.rows.some((r) => r.staff === s.id))
              ? "Already included in a finalized simulation"
              : "",
      };
    } catch (e) {
      return { s, salary, calc: null, error: (e as Error).message };
    }
  });
  const eligiblePayroll = payrollRows.filter((r) => !r.error && r.calc && r.salary);
  const group = hrPages.includes(page) ? hrPages : communicationPages;
  const isCommunication = group === communicationPages;
  const channel = page === "Send SMS" ? "SMS" : "Email";
  useEffect(() => {
    setDrawer(null);
    setDirty(false);
    setError("");
    setQ("");
    setIndex(1);
    setSelection(page === "Payroll" && focused ? [focused] : []);
    setStatus("All statuses");
    setState("Ready");
    setForm(drafts[page] || {});
    setTargetIds([]);
    setAudience("Manual recipients");
    setAttendanceDraft({});
  }, [page]);
  useEffect(() => {
    if (active) onDirty(dirty);
    else setDrawer(null);
    const fn = (e: BeforeUnloadEvent) => {
      if (active && dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", fn);
    return () => window.removeEventListener("beforeunload", fn);
  }, [active, dirty, onDirty]);
  const go = (p: string) => {
    if (dirty && !window.confirm("Discard unsaved HR/communication input?")) return;
    setDirty(false);
    navigate(p);
  };
  const close = () => {
    if (
      dirty &&
      !["payroll-review", "message-review", "notice-preview", "attendance-review"].includes(
        drawer?.type || "",
      ) &&
      !window.confirm("Discard unsaved input?")
    )
      return;
    setDrawer(null);
    setError("");
    if (
      !["payroll-review", "message-review", "notice-preview", "attendance-review"].includes(
        drawer?.type || "",
      )
    )
      setDirty(false);
  };
  useDialogFocus(!!drawer && active, close);
  const open = (type: string, title: string, id?: string, values: Record<string, string> = {}) => {
    setForm(values);
    setError("");
    setConfirm("");
    setDrawer({ type, title, id });
  };
  const set = (key: string, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    setDirty(true);
  };
  const tick = (id: string) =>
    setSelection(selection.includes(id) ? selection.filter((s) => s !== id) : [...selection, id]);
  const reset = () => {
    setQ("");
    setDepartment("All departments");
    setDesignation("All designations");
    setEmployment("All employment types");
    setStatus("All statuses");
    setChannelFilter("All channels");
    setFrom("");
    setTo("");
    setIndex(1);
  };
  const exportCsv = (data: Record<string, unknown>[]) => {
    if (!data.length) return notify("No matching records to export");
    const keys = Object.keys(data[0]);
    const text = [keys, ...data.map((r) => keys.map((k) => String(r[k] ?? "")))]
      .map((row) => row.map((v) => '"' + v.replace(/"/g, '""') + '"').join(","))
      .join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], { type: "text/csv" }));
    a.download = "schoolos-" + page.toLowerCase().replace(/\W/g, "-") + ".csv";
    a.click();
    URL.revokeObjectURL(a.href);
    notify("Preview records exported");
  };
  const stats = (items: [string, string, string?][]) => (
    <div className="op-stats wf-stats">
      {items.map(([name, value, dest]) => (
        <button
          key={name}
          disabled={!dest}
          onClick={() => {
            go(dest!);
            if (name === "Staff Absent Today") setTimeout(() => setStatus("Absent"), 0);
            if (name === "Staff Present Today") setTimeout(() => setStatus("Present"), 0);
          }}
        >
          <span>
            {name}
            {dest && <Icon name="arrow" size={14} />}
          </span>
          <strong>{value}</strong>
          <small>Defined from shared preview records</small>
        </button>
      ))}
    </div>
  );
  const table = (headers: React.ReactNode[], rows: React.ReactNode[]) => (
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
            {rows.slice(
              (Math.min(index, Math.max(1, Math.ceil(rows.length / size))) - 1) * size,
              Math.min(index, Math.max(1, Math.ceil(rows.length / size))) * size,
            )}
          </tbody>
        </table>
        {!rows.length && (
          <div className="op-empty">
            <Icon name={isCommunication ? "mail" : "users"} size={27} />
            <h3>No matching records</h3>
            <p>No activity, salaries or delivery receipts have been fabricated.</p>
            <Button onClick={reset}>Clear filters</Button>
          </div>
        )}
      </div>
      <div className="op-pagination">
        <span>{rows.length} records</span>
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
          <Button disabled={index <= 1} onClick={() => setIndex(index - 1)}>
            Previous
          </Button>
          <span>{Math.min(index, Math.max(1, Math.ceil(rows.length / size)))}</span>
          <Button disabled={index * size >= rows.length} onClick={() => setIndex(index + 1)}>
            Next
          </Button>
        </div>
      </div>
    </>
  );
  const toolbar = (staff = true) => (
    <div className="op-toolbar wf-toolbar">
      <label className="op-search">
        <Icon name="search" size={16} />
        <input
          aria-label="Search workforce records"
          placeholder={
            staff
              ? "Search staff name, ID or department..."
              : "Search title, message or recipient..."
          }
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setIndex(1);
          }}
        />
      </label>
      {staff && (
        <select
          aria-label="Department filter"
          value={department}
          onChange={(e) => {
            setDepartment(e.target.value);
            setIndex(1);
          }}
        >
          <option>All departments</option>
          {w.departments.map((d) => (
            <option key={d}>{d}</option>
          ))}
        </select>
      )}
      <Button
        icon="filter"
        onClick={() => setDrawer({ type: "filters", title: "Filters & table preferences" })}
      >
        Filters & columns
      </Button>
      {(q || department !== "All departments" || status !== "All statuses") && (
        <Button onClick={reset}>Reset</Button>
      )}
    </div>
  );
  const profileOpen = (s: Staff) => {
    setFocused(s.id);
    setProfileTab("Overview");
    open("profile", "Staff profile", s.id);
  };
  const editStaff = (s?: Staff) => {
    const parts = s?.name.split(" ") || [];
    open("staff", s ? "Edit staff member" : "Add staff member", s?.id, {
      ...s?.details,
      id: s?.id || "",
      first: parts[0] || "",
      middle: parts.slice(1, -1).join(" "),
      last: parts.length > 1 ? parts[parts.length - 1] || "" : "",
      department: s?.department || "",
      designation: s?.designation || "",
      employment: s?.employment || "Full-time",
      phone: s?.phone || "",
      email: s?.email || "",
      joined: s?.joined || "",
      role: s?.role || "Teacher",
    });
  };
  const saveStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hrEdit) return;
    setError("");
    if (!form.id?.trim() || !form.first?.trim() || !form.department || !form.designation) {
      setError("Staff ID, first name, department and designation are required.");
      return;
    }
    if (
      w.staff.some(
        (s) => s.id.toLowerCase() === form.id.trim().toLowerCase() && s.id !== drawer?.id,
      )
    ) {
      setError("That staff ID already exists.");
      return;
    }
    if (drawer?.id && form.id !== drawer.id) {
      setError("Existing staff IDs are immutable to preserve linked history.");
      return;
    }
    if (form.email && !/^\S+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setError("Enter a valid email or leave it empty.");
      return;
    }
    const old = staffById(drawer?.id || "");
    const s: Staff = {
      id: form.id.trim(),
      name: [form.first, form.middle, form.last].filter(Boolean).join(" ").trim(),
      role: form.role || "Teacher",
      department: form.department,
      designation: form.designation,
      employment: form.employment,
      phone: form.phone || "",
      email: form.email || "",
      joined: form.joined || "",
      status: old?.status || "Active",
      source: old?.source || "Manually entered preview record · not verified",
      details: { ...form },
      history: [
        ...(old?.history || []),
        audit(old ? "Existing" : "New", "Active", "Staff details saved in preview"),
      ],
    };
    w.setStaff(old ? w.staff.map((r) => (r.id === s.id ? s : r)) : [...w.staff, s]);
    setDirty(false);
    setFocused(s.id);
    setDrawer({ type: "profile", title: "Staff profile", id: s.id });
    notify("Staff record saved in preview only");
  };
  const leaveRows = w.leaves.filter(
    (l) =>
      (!ownOnly || l.staff === w.actor) &&
      [staffById(l.staff)?.name || "", l.id, l.type].some((v) =>
        v.toLowerCase().includes(q.toLowerCase()),
      ) &&
      (department === "All departments" || staffById(l.staff)?.department === department) &&
      (status === "All statuses" || l.status === status),
  );
  const submitLeave = (e: React.FormEvent, draft = false) => {
    e.preventDefault();
    const l: StaffLeave = {
      id: "SL-" + Date.now(),
      staff: ownOnly ? w.actor : form.staff || w.actor,
      type: form.type || "",
      start: form.start || "",
      end: form.end || "",
      reason: form.reason || "",
      contact: form.contact,
      attachment: form.attachment,
      status: draft ? "Draft" : "Submitted",
      history: [
        audit(
          "Draft",
          draft ? "Draft" : "Submitted",
          "Leave application " + (draft ? "saved as draft" : "submitted"),
        ),
      ],
    };
    const err = leaveError(w.leaves, l);
    if (!draft && err) {
      setError(err);
      return;
    }
    if (!draft && staffById(l.staff)?.status !== "Active") {
      setError("Choose an active staff member.");
      return;
    }
    w.setLeaves([l, ...w.leaves]);
    setDrafts((d) => ({ ...d, [page]: {} }));
    setForm({});
    setDirty(false);
    setDrawer({ type: "leave", title: "Leave request", id: l.id });
    notify("Leave " + (draft ? "draft saved" : "submitted") + " in preview");
  };
  const noticeRows = w.notices.filter(
    (n) =>
      [n.title, n.body, n.category].some((v) => v.toLowerCase().includes(q.toLowerCase())) &&
      (status === "All statuses" || n.status === status),
  );
  const messageRows = w.messages.filter(
    (m) =>
      (channelFilter === "All channels" || m.channel === channelFilter) &&
      (status === "All statuses" || m.status === status) &&
      (!from || m.created.slice(0, 10) >= from) &&
      (!to || m.created.slice(0, 10) <= to) &&
      [m.id, m.subject, m.body, ...m.recipients].some((v) =>
        v.toLowerCase().includes(q.toLowerCase()),
      ),
  );
  const audiencePeople =
    audience === "Staff" || audience === "Department" || audience === "Staff groups"
      ? w.staff
          .filter(
            (s) =>
              s.status === "Active" &&
              (audience !== "Department" || s.department === form.targetDepartment) &&
              (audience !== "Staff groups" || s.role === form.targetRole),
          )
          .map((s) => ({ id: s.id, name: s.name, email: s.email, phone: s.phone }))
      : audience === "Students" || audience === "Class"
        ? students
            .filter(
              (s) =>
                s.status === "Active" && (audience !== "Class" || s.grade === form.targetClass),
            )
            .map((s) => ({ id: s.id, name: s.name, email: "", phone: "" }))
        : audience === "Guardians"
          ? importedGuardians.map((name, i) => ({
              id: "GUARDIAN-" + i,
              name,
              email: "",
              phone: "",
            }))
          : [];
  const selectedAudience = audiencePeople.filter((p) => targetIds.includes(p.id));
  const contacts = selectedAudience
    .map((p) => (channel === "Email" ? p.email : p.phone))
    .filter(Boolean);
  const toList = normalizedRecipients(form.to || "").map((r) =>
    channel === "SMS" ? r.replace(/[\s()-]/g, "") : r,
  );
  const cc = normalizedRecipients(form.cc || "").filter((r) => !toList.includes(r));
  const bcc = normalizedRecipients(form.bcc || "").filter(
    (r) => !toList.includes(r) && !cc.includes(r),
  );
  const recipients = [...new Set([...contacts, ...toList])];
  const missingContacts = selectedAudience.filter(
    (p) => !(channel === "Email" ? p.email : p.phone),
  ).length;
  const sms = smsMetrics(form.body || "");
  const composerPreview = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!communicationsAccess) return;
    if (missingContacts) {
      setError(
        `${missingContacts} selected person(s) have no supplied ${channel === "Email" ? "email" : "phone"}. Remove them or explicitly enter preview contact details; none are invented.`,
      );
      return;
    }
    const err = messageError(
      channel,
      [...recipients, ...cc, ...bcc],
      form.subject || "",
      form.body || "",
    );
    if (err) {
      setError(err);
      return;
    }
    if (form.schedule && Date.parse(form.schedule) <= Date.now()) {
      setError(
        "Choose a future schedule time. Scheduling remains a simulated queue, not a background job.",
      );
      return;
    }
    if (channel === "SMS" && sms.segments > 6) {
      setError(
        "Preview limit: six estimated SMS segments. Shorten the message; real provider limits remain unconfigured.",
      );
      return;
    }
    setDrawer({ type: "message-review", title: "Review " + channel + " · simulation" });
    setConfirm("");
  };
  const audiencePicker = (notice = false) => (
    <div className="wf-audience">
      <Field
        label="Audience"
        value={audience}
        options={
          notice
            ? ["Staff", "Students", "Guardians", "Class", "Department", "Staff groups"]
            : [
                "Manual recipients",
                "Staff",
                "Students",
                "Guardians",
                "Class",
                "Department",
                "Staff groups",
              ]
        }
        onChange={(v) => {
          setAudience(v);
          setTargetIds([]);
          setDirty(true);
        }}
      />
      {audience === "Department" && (
        <Field
          label="Target department"
          value={form.targetDepartment || ""}
          options={w.departments}
          onChange={(v) => {
            set("targetDepartment", v);
            setTargetIds([]);
          }}
        />
      )}
      {audience === "Class" && (
        <Field
          label="Target class"
          value={form.targetClass || ""}
          options={[...new Set(students.map((s) => s.grade))]}
          onChange={(v) => {
            set("targetClass", v);
            setTargetIds([]);
          }}
        />
      )}
      {audience === "Staff groups" && (
        <Field
          label="Staff group / role"
          value={form.targetRole || ""}
          options={[...new Set(w.staff.map((s) => s.role))]}
          onChange={(v) => {
            set("targetRole", v);
            setTargetIds([]);
          }}
        />
      )}
      {audience !== "Manual recipients" && (
        <>
          <div className="wf-audience-summary">
            <span>
              {targetIds.length} selected · {audiencePeople.length} available
            </span>
            <Button
              onClick={() => {
                setTargetIds(audiencePeople.map((p) => p.id));
                setDirty(true);
              }}
            >
              Select this audience
            </Button>
            <Button onClick={() => setTargetIds([])}>Clear</Button>
          </div>
          <div className="wf-recipient-list">
            {audiencePeople.map((p) => (
              <label key={p.id}>
                <input
                  type="checkbox"
                  checked={targetIds.includes(p.id)}
                  onChange={() => {
                    setTargetIds(
                      targetIds.includes(p.id)
                        ? targetIds.filter((id) => id !== p.id)
                        : [...targetIds, p.id],
                    );
                    setDirty(true);
                  }}
                />
                <span>{p.name}</span>
                {!notice && (
                  <small>
                    {(channel === "Email" ? p.email : p.phone) || "Contact not supplied"}
                  </small>
                )}
              </label>
            ))}
          </div>
        </>
      )}
    </div>
  );
  const saveNotice = (e: React.FormEvent, asDraft = false) => {
    e.preventDefault();
    setError("");
    if (!communicationsAccess) return;
    if (!form.title?.trim() || !form.body?.trim()) {
      setError("Title and notice body are required.");
      return;
    }
    if (!asDraft && (!targetIds.length || !form.publish || !form.expiry)) {
      setError("Select an explicit audience and publication/expiry dates.");
      return;
    }
    if (form.publish && form.expiry && form.expiry < form.publish) {
      setError("Expiry cannot be before publication.");
      return;
    }
    if (!asDraft && form.expiry < new Date().toISOString().slice(0, 10)) {
      setError("This notice would already be expired.");
      return;
    }
    if (asDraft) {
      const n: Notice = {
        id: drawer?.id || "NTC-" + Date.now(),
        title: form.title,
        body: form.body,
        category: form.category || "General",
        audience,
        targets: targetIds,
        publish: form.publish || "",
        expiry: form.expiry || "",
        priority: form.priority || "Normal",
        status: "Draft",
        attachments: form.attachment ? [form.attachment] : [],
        history: [
          ...(w.notices.find((n) => n.id === drawer?.id)?.history || []),
          audit("Draft", "Draft", "Draft saved"),
        ],
      };
      w.setNotices(
        w.notices.some((x) => x.id === n.id)
          ? w.notices.map((x) => (x.id === n.id ? n : x))
          : [n, ...w.notices],
      );
      setDirty(false);
      setDrawer(null);
      notify("Notice draft saved in preview");
    } else {
      setDrawer({ type: "notice-preview", title: "Review notice publication", id: drawer?.id });
      setConfirm("");
    }
  };
  const profileHistory = (history: Audit[]) => (
    <div className="op-timeline">
      {history.length ? (
        history.map((h, i) => (
          <div key={i}>
            <i />
            <p>
              <b>
                {h.from} → {h.to}
              </b>
              <br />
              {h.actor} · {new Date(h.at).toLocaleString()}
              <br />
              {h.reason}
            </p>
          </div>
        ))
      ) : (
        <p className="op-description">No simulated changes recorded.</p>
      )}
    </div>
  );
  const fileField = (label = "Supporting document") => (
    <label className="op-field">
      <span>{label} · local selection only</span>
      <input type="file" onChange={(e) => set("attachment", e.target.files?.[0]?.name || "")} />
      <small>
        {form.attachment || "No file selected. No upload, storage or verification is performed."}
      </small>
    </label>
  );
  const newNotice = () => {
    setAudience("Staff");
    setTargetIds([]);
    open("notice", "Create notice", undefined, {
      publish: new Date().toISOString().slice(0, 10),
      expiry: "",
      priority: "Normal",
      category: "General",
    });
  };
  const title =
    page === "Communicate"
      ? "Communication overview"
      : page === "Human Resource"
        ? "Human Resource"
        : page;
  const restricted =
    (page === "Payroll" && !payrollAccess) ||
    (page === "Teachers Rating" && !evaluateAccess) ||
    (page === "Approve Leave Request" && !hrApprove) ||
    (["Department", "Designation", "Leave Type", "Disabled Staff"].includes(page) && !hrEdit) ||
    (["Send Email", "Send SMS", "Notice Board"].includes(page) && !communicationsAccess);
  return (
    <div className="op wf" hidden={!active}>
      <div className="op-heading">
        <div>
          <div className="op-eyebrow">
            OPERATIONS <span>/</span> {isCommunication ? "COMMUNICATE" : "HUMAN RESOURCE"}{" "}
            <em>
              {isCommunication ? "CM" : "HR"}-{String(group.indexOf(page) + 1).padStart(2, "0")}
            </em>
          </div>
          <h1>{title}</h1>
          <p>
            {isCommunication
              ? "Clear audiences. Considered messages. Honest delivery status."
              : "Your people, their working day, and every step of their journey."}
          </p>
        </div>
        <div className="op-heading-actions">
          <Button
            icon="settings"
            onClick={() => setDrawer({ type: "settings", title: "Role & preview controls" })}
          >
            Preview controls
          </Button>
          {page === "Staff Directory" && (
            <Button primary icon="plus" disabled={!hrEdit} onClick={() => editStaff()}>
              Add staff member
            </Button>
          )}
          {page === "Notice Board" && (
            <Button primary icon="plus" disabled={!communicationsAccess} onClick={newNotice}>
              Create notice
            </Button>
          )}
        </div>
      </div>
      <div className="op-context">
        <select aria-label="Workforce workspace" value={page} onChange={(e) => go(e.target.value)}>
          <optgroup label="Human Resource">
            {hrPages.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </optgroup>
          <optgroup label="Communicate">
            {communicationPages.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </optgroup>
        </select>
        <span>{session}</span>
        <span>
          <i />
          Imported names · simulated operations
        </span>
        <span>Resets on reload</span>
        <button onClick={() => setDrawer({ type: "settings", title: "Role & preview controls" })}>
          {w.role}
        </button>
      </div>
      <div className="fn-tabs">
        {group.map((p) => (
          <button key={p} className={p === page ? "active" : ""} onClick={() => go(p)}>
            {p === group[0] ? "Overview" : p}
          </button>
        ))}
      </div>
      {dirty && (
        <div className="op-notice amber">
          <Icon name="clock" size={16} />
          Unsaved changes · draft input is not persisted.
        </div>
      )}
      {restricted || state === "Restricted" ? (
        <Card title="Access restricted in this preview">
          <div className="op-empty">
            <Icon name="shield" size={30} />
            <h3>Your selected preview role cannot access this workspace.</h3>
            <p>
              UI role guards are not production security. Change the illustrative role under Preview
              controls.
            </p>
          </div>
        </Card>
      ) : state !== "Ready" ? (
        <Card title={state}>
          <div className="op-empty">
            {state === "Loading" ? (
              <>
                <div className="op-skeleton" />
                <div className="op-skeleton" />
              </>
            ) : (
              <>
                <Icon name={isCommunication ? "mail" : "users"} size={28} />
                <h3>
                  {state === "Error" ? "Operation could not be completed" : "No records available"}
                </h3>
                <p>
                  Form inputs and existing preview records are preserved. Retry or create the
                  relevant record.
                </p>
                <Button onClick={() => setState("Ready")}>Retry / return to records</Button>
              </>
            )}
          </div>
        </Card>
      ) : page === "Human Resource" ? (
        <>
          {stats([
            ["Total Staff", String(summary.total), "Staff Directory"],
            ["Active Staff", String(summary.active), "Staff Directory"],
            ["Staff Present Today", String(summary.present), "Staff Attendance"],
            ["Staff Absent Today", String(summary.absent), "Staff Attendance"],
            ["Pending Leave Requests", String(summary.pending), "Approve Leave Request"],
            [
              "Payroll Status",
              w.batches.length ? `${w.batches.length} simulated runs` : "Not processed",
              "Payroll",
            ],
            ["Disabled Staff", String(summary.disabled), "Disabled Staff"],
            ["Departments", String(w.departments.length), "Department"],
          ])}
          <div className="wf-overview-grid">
            <Card
              title="Staff by department"
              sub="Imported department metadata · active preview records"
              action={<Button onClick={() => go("Department")}>Manage departments</Button>}
            >
              {w.departments.map((d) => (
                <button
                  className="wf-bar-row"
                  key={d}
                  onClick={() => {
                    go("Staff Directory");
                    setTimeout(() => setDepartment(d), 0);
                  }}
                >
                  <span>{d}</span>
                  <div>
                    <i
                      style={{
                        width: w.staff.length
                          ? (w.staff.filter((s) => s.department === d && s.status === "Active")
                              .length /
                              w.staff.length) *
                              100 +
                            "%"
                          : "0%",
                      }}
                    />
                  </div>
                  <b>{w.staff.filter((s) => s.department === d && s.status === "Active").length}</b>
                </button>
              ))}
            </Card>
            <Card title="Leave requests" sub="Status counts come from submitted preview requests">
              {["Submitted", "Under Review", "Approved", "Rejected", "Clarification Requested"].map(
                (s) => (
                  <button
                    className="wf-bar-row"
                    key={s}
                    onClick={() => {
                      go("Approve Leave Request");
                      setTimeout(() => setStatus(s), 0);
                    }}
                  >
                    <span>{s}</span>
                    <b>{w.leaves.filter((l) => l.status === s).length}</b>
                    <Icon name="arrow" size={13} />
                  </button>
                ),
              )}
            </Card>
            <Card
              title="Staff by designation"
              sub="Provided metadata · configurable for future assignments"
            >
              {w.designations.map((d) => (
                <button
                  className="wf-bar-row"
                  key={d}
                  onClick={() => {
                    go("Staff Directory");
                    setTimeout(() => setDesignation(d), 0);
                  }}
                >
                  <span>{d}</span>
                  <b>{w.staff.filter((s) => s.designation === d).length}</b>
                </button>
              ))}
            </Card>
            <Card
              title="Attendance record"
              sub="No devices or automated clock-in integrations are connected"
            >
              {[...new Set(Object.keys(w.attendance).map((k) => k.split("|")[0]))]
                .sort()
                .slice(-6)
                .map((d) => (
                  <button
                    className="wf-bar-row"
                    key={d}
                    onClick={() => {
                      w.setDate(d);
                      go("Staff Attendance");
                    }}
                  >
                    <span>{d}</span>
                    <b>
                      {w.staff.filter((s) => w.attendanceFor(s.id, d) === "Present").length} present
                    </b>
                  </button>
                ))}
              {!Object.keys(w.attendance).length && (
                <div className="op-empty">
                  <p>No staff attendance saved yet.</p>
                  <Button onClick={() => go("Staff Attendance")}>Mark attendance</Button>
                </div>
              )}
            </Card>
            <Card
              title="Payroll processing"
              sub="Gross, deductions and net are distinct · no bank transfers"
            >
              {w.batches.slice(0, 4).map((b) => (
                <button
                  className="op-list-row"
                  key={b.id}
                  onClick={() => {
                    go("Payroll");
                    setTimeout(
                      () => setDrawer({ type: "batch-detail", title: "Payroll batch", id: b.id }),
                      0,
                    );
                  }}
                >
                  <span>
                    <b>
                      {b.period} · {b.id}
                    </b>
                    <small>{b.rows.length} staff · finalized simulation</small>
                  </span>
                  <Badge>{b.currency}</Badge>
                </button>
              ))}
              {!w.batches.length && (
                <div className="op-empty">
                  <p>No payroll runs. Salary data is not supplied.</p>
                  <Button onClick={() => go("Payroll")}>Configure preview payroll</Button>
                </div>
              )}
            </Card>
            <Card
              title="Recent staff activity"
              sub="Simulated changes · not the formal Audit Trail Report"
            >
              {w.staff
                .flatMap((s) => s.history.map((h) => ({ s, h })))
                .slice(-4)
                .reverse()
                .map(({ s, h }, i) => (
                  <button className="op-list-row" key={i} onClick={() => profileOpen(s)}>
                    <span>
                      <b>
                        {s.name} · {h.to}
                      </b>
                      <small>
                        {h.actor} · {h.reason}
                      </small>
                    </span>
                    <Icon name="arrow" size={14} />
                  </button>
                ))}
              {!w.staff.some((s) => s.history.length) && (
                <div className="op-empty">No staff changes recorded in this preview.</div>
              )}
            </Card>
            <div className="wf-wide">
              <Card title="Quick actions">
                <div className="op-shortcut-grid">
                  {[
                    "Staff Directory",
                    "Staff Attendance",
                    "Apply Leave",
                    "Approve Leave Request",
                    "Payroll",
                    "Department",
                  ].map((p) => (
                    <button key={p} onClick={() => go(p)}>
                      <Icon name="arrow" />
                      <b>{p}</b>
                      <small>Open operational workspace</small>
                    </button>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        </>
      ) : page === "Staff Directory" || page === "Disabled Staff" ? (
        <>
          <div className="op-notice">
            <Icon name="shield" />
            <span>
              {w.staff.filter((s) => s.source.startsWith("Provided CSV")).length} imported staff
              names. Employment status and operational activity are illustrative; phone, email,
              birth date and salaries were not supplied.
            </span>
          </div>
          <Card
            title={page === "Disabled Staff" ? "Inactive staff registry" : "Staff registry"}
            sub="Disabling retains attendance, leave, evaluation and payroll history"
            action={
              <Button
                disabled={!hrEdit}
                icon="download"
                onClick={() =>
                  exportCsv(
                    (selection.length
                      ? staffRows.filter((s) => selection.includes(s.id))
                      : staffRows
                    ).map((s) => ({
                      id: s.id,
                      name: s.name,
                      department: s.department,
                      designation: s.designation,
                      employment: s.employment,
                      phone: hrEdit ? s.phone : "Restricted",
                      email: hrEdit ? s.email : "Restricted",
                      status: s.status,
                    })),
                  )
                }
              >
                Export CSV
              </Button>
            }
          >
            {toolbar()}
            {selection.length > 0 && (
              <div className="op-selection">
                <b>{selection.length} selected</b>
                <Button
                  disabled={!hrEdit}
                  onClick={() => {
                    setConfirm("");
                    setForm({ reason: "" });
                    setDrawer({
                      type: "staff-status",
                      title: page === "Disabled Staff" ? "Reactivate staff" : "Disable staff",
                    });
                  }}
                >
                  {page === "Disabled Staff" ? "Reactivate" : "Disable selected"}
                </Button>
                <Button onClick={() => setSelection([])}>Clear</Button>
              </div>
            )}
            {table(
              [
                <input
                  type="checkbox"
                  aria-label="Select filtered staff"
                  checked={staffRows.length > 0 && staffRows.every((s) => selection.includes(s.id))}
                  onChange={(e) => setSelection(e.target.checked ? staffRows.map((s) => s.id) : [])}
                />,
                "Staff ID",
                "Staff",
                ...[
                  "Department",
                  "Designation",
                  "Employment type",
                  "Phone",
                  "Email",
                  "Joining date",
                  "Status",
                ].filter((h) => !hidden.includes(h)),
                "",
              ],
              staffRows.map((s) => (
                <tr key={s.id}>
                  <td>
                    <input
                      aria-label={"Select " + s.id}
                      type="checkbox"
                      checked={selection.includes(s.id)}
                      onChange={() => tick(s.id)}
                    />
                  </td>
                  <td className="op-mono">{s.id}</td>
                  <td>
                    <button className="op-person" onClick={() => profileOpen(s)}>
                      <span className="op-avatar">
                        {s.name
                          .split(" ")
                          .slice(0, 2)
                          .map((n) => n[0])
                          .join("")}
                      </span>
                      <span>
                        {s.name}
                        <small>{s.role}</small>
                      </span>
                    </button>
                  </td>
                  {!hidden.includes("Department") && <td>{s.department}</td>}
                  {!hidden.includes("Designation") && <td>{s.designation}</td>}
                  {!hidden.includes("Employment type") && <td>{s.employment}</td>}
                  {!hidden.includes("Phone") && (
                    <td>{hrEdit || s.id === w.actor ? s.phone || "Not supplied" : "Restricted"}</td>
                  )}
                  {!hidden.includes("Email") && (
                    <td>{hrEdit || s.id === w.actor ? s.email || "Not supplied" : "Restricted"}</td>
                  )}
                  {!hidden.includes("Joining date") && <td>{s.joined || "Not supplied"}</td>}
                  {!hidden.includes("Status") && (
                    <td>
                      <Badge>{s.status}</Badge>
                    </td>
                  )}
                  <td>
                    <div className="op-inline">
                      <Button onClick={() => profileOpen(s)}>View</Button>
                      <Button disabled={!hrEdit} onClick={() => editStaff(s)}>
                        Edit
                      </Button>
                    </div>
                  </td>
                </tr>
              )),
            )}
          </Card>
        </>
      ) : page === "Staff Attendance" ? (
        <>
          {stats([
            [
              "Present",
              String(staffRows.filter((s) => w.attendanceFor(s.id) === "Present").length),
            ],
            ["Absent", String(staffRows.filter((s) => w.attendanceFor(s.id) === "Absent").length)],
            [
              "On approved leave",
              String(staffRows.filter((s) => w.attendanceFor(s.id) === "On Leave").length),
            ],
            [
              "Unmarked",
              String(staffRows.filter((s) => w.attendanceFor(s.id) === "Unmarked").length),
            ],
          ])}
          <Card
            title="Daily staff attendance"
            sub="Manual entry only · approved leave is excluded from ordinary absences"
            action={
              <input
                aria-label="Staff attendance date"
                type="date"
                value={w.date}
                onChange={(e) => {
                  if (dirty && !window.confirm("Discard unsaved attendance?")) return;
                  w.setDate(e.target.value);
                  setAttendanceDraft({});
                  setDirty(false);
                }}
              />
            }
          >
            {toolbar()}
            <div className="op-selection">
              <Button
                disabled={!hrEdit}
                onClick={() => {
                  setAttendanceDraft(
                    Object.fromEntries(
                      staffRows
                        .filter((s) => w.attendanceFor(s.id) !== "On Leave")
                        .map((s) => [s.id, "Present"]),
                    ),
                  );
                  setDirty(true);
                }}
              >
                Mark filtered present
              </Button>
              <Button
                primary
                disabled={!hrEdit || !w.date || !Object.keys(attendanceDraft).length}
                onClick={() =>
                  setDrawer({ type: "attendance-review", title: "Review staff attendance" })
                }
              >
                Review & save
              </Button>
              <Button onClick={() => open("staff-attendance-history", "Staff attendance history")}>
                History
              </Button>
            </div>
            {table(
              [
                "Staff ID",
                "Staff",
                "Department",
                "Designation",
                "Check-in / out",
                "Status",
                "Remarks",
              ],
              staffRows
                .filter((s) => status === "All statuses" || w.attendanceFor(s.id) === status)
                .map((s) => (
                  <tr key={s.id}>
                    <td>{s.id}</td>
                    <td>
                      <button className="op-row-link" onClick={() => profileOpen(s)}>
                        {s.name}
                      </button>
                    </td>
                    <td>{s.department}</td>
                    <td>{s.designation}</td>
                    <td>
                      <Button
                        disabled={!hrEdit}
                        onClick={() =>
                          open("attendance-note", "Attendance notes", s.id, {
                            note: w.attendanceNotes[w.date + "|" + s.id] || "",
                            checkin: "",
                            checkout: "",
                          })
                        }
                      >
                        Manual times / note
                      </Button>
                    </td>
                    <td>
                      <select
                        aria-label={"Attendance " + s.id}
                        disabled={!hrEdit || w.attendanceFor(s.id) === "On Leave"}
                        value={
                          w.attendanceFor(s.id) === "On Leave"
                            ? "On Leave"
                            : attendanceDraft[s.id] || w.attendanceFor(s.id)
                        }
                        onChange={(e) => {
                          setAttendanceDraft({ ...attendanceDraft, [s.id]: e.target.value });
                          setDirty(true);
                        }}
                      >
                        <option>Unmarked</option>
                        {staffStatuses.map((v) => (
                          <option key={v}>{v}</option>
                        ))}
                      </select>
                    </td>
                    <td>{w.attendanceNotes[w.date + "|" + s.id] || "—"}</td>
                  </tr>
                )),
            )}
          </Card>
        </>
      ) : page === "Payroll" ? (
        <>
          <div className="op-notice">
            <Icon name="shield" />
            <span>
              Illustrative salary inputs only · {currency}. No statutory rates, payment rail, bank
              transfer or payroll expense posting is configured.
            </span>
          </div>
          {stats([
            ["Gross pay", money(eligiblePayroll.reduce((s, r) => s + r.calc!.gross, 0))],
            ["Deductions", money(eligiblePayroll.reduce((s, r) => s + r.salary!.deduction, 0))],
            ["Net payroll", money(eligiblePayroll.reduce((s, r) => s + r.calc!.net, 0))],
            ["Finalized simulations", String(w.batches.filter((b) => b.period === period).length)],
            [
              "Pending payroll",
              String(
                w.staff.filter(
                  (s) =>
                    s.status === "Active" &&
                    !w.batches.some(
                      (b) => b.period === period && b.rows.some((r) => r.staff === s.id),
                    ),
                ).length,
              ) + " staff",
            ],
            ["Paid payroll", "Not connected"],
          ])}
          <Card
            title="Payroll preparation"
            sub="Select staff, configure components, then review and confirm an immutable simulated batch"
            action={
              <input
                aria-label="Payroll period"
                type="month"
                value={period}
                onChange={(e) => {
                  setPeriod(e.target.value);
                  setSelection([]);
                }}
              />
            }
          >
            {toolbar()}
            <div className="op-selection">
              <b>
                {selection.length} selected · {eligiblePayroll.length} eligible
              </b>
              <Button onClick={() => setSelection(staffRows.map((s) => s.id))}>
                Select filtered
              </Button>
              <Button
                primary
                disabled={!payrollAccess || !eligiblePayroll.length || !period}
                onClick={() => {
                  setConfirm("");
                  setDrawer({ type: "payroll-review", title: "Payroll batch review" });
                }}
              >
                Review payroll batch
              </Button>
            </div>
            {table(
              [
                "",
                "Staff",
                "Department",
                "Basic salary",
                "Allowances",
                "Deductions",
                "Gross",
                "Net",
                "Status",
                "",
              ],
              staffRows.map((s) => {
                const sal = w.salaries[s.id];
                let calc = null;
                try {
                  if (sal) calc = payrollTotals(sal);
                } catch {}
                const finalized = w.batches.some(
                  (b) => b.period === period && b.rows.some((r) => r.staff === s.id),
                );
                return (
                  <tr key={s.id}>
                    <td>
                      <input
                        aria-label={"Payroll select " + s.id}
                        type="checkbox"
                        checked={selection.includes(s.id)}
                        onChange={() => tick(s.id)}
                      />
                    </td>
                    <td>{s.name}</td>
                    <td>{s.department}</td>
                    <td>{sal ? money(sal.basic) : "Not configured"}</td>
                    <td>{sal ? money(sal.allowance) : "—"}</td>
                    <td>{sal ? money(sal.deduction) : "—"}</td>
                    <td>{calc ? money(calc.gross) : "—"}</td>
                    <td>{calc ? money(calc.net) : "—"}</td>
                    <td>
                      <Badge>
                        {finalized
                          ? "Finalized (simulation)"
                          : sal
                            ? "Ready for review"
                            : "Missing salary"}
                      </Badge>
                    </td>
                    <td>
                      <Button
                        onClick={() =>
                          open("salary", "Salary components · illustrative", s.id, {
                            basic: sal ? String(sal.basic / 100) : "",
                            allowance: sal ? String(sal.allowance / 100) : "0",
                            deduction: sal ? String(sal.deduction / 100) : "0",
                          })
                        }
                      >
                        Components
                      </Button>
                    </td>
                  </tr>
                );
              }),
            )}
          </Card>
          <Card
            title="Payroll batches"
            sub="No batch is labeled paid without a real payment service"
          >
            {table(
              ["Batch", "Period", "Staff", "Currency", "Status", ""],
              w.batches.map((b) => (
                <tr key={b.id}>
                  <td>{b.id}</td>
                  <td>{b.period}</td>
                  <td>{b.rows.length}</td>
                  <td>{b.currency}</td>
                  <td>
                    <Badge>Finalized (simulation)</Badge>
                  </td>
                  <td>
                    <Button
                      onClick={() =>
                        setDrawer({
                          type: "batch-detail",
                          title: "Payroll batch details",
                          id: b.id,
                        })
                      }
                    >
                      Details / payslips
                    </Button>
                  </td>
                </tr>
              )),
            )}
          </Card>
        </>
      ) : page === "Approve Leave Request" || page === "Apply Leave" ? (
        <>
          {page === "Apply Leave" && (
            <form onSubmit={submitLeave}>
              <Card
                title="Leave application"
                sub="Working days are a Mon–Fri estimate. Entitlements, public holidays and carry-forward rules are not configured."
              >
                <div className="op-form-grid wf-form-pad">
                  <label className="op-field">
                    <span>Staff member *</span>
                    <select
                      required
                      disabled={ownOnly}
                      value={ownOnly ? w.actor : form.staff || w.actor}
                      onChange={(e) => set("staff", e.target.value)}
                    >
                      {w.staff
                        .filter((s) => s.status === "Active")
                        .map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name} · {s.id}
                          </option>
                        ))}
                    </select>
                  </label>
                  <Field
                    label="Leave type"
                    required
                    value={form.type || ""}
                    options={w.leaveTypes.filter((l) => l.status === "Active").map((l) => l.name)}
                    onChange={(v) => set("type", v)}
                  />
                  <Field
                    label="Start date"
                    required
                    type="date"
                    value={form.start || ""}
                    onChange={(v) => set("start", v)}
                  />
                  <Field
                    label="End date"
                    required
                    type="date"
                    value={form.end || ""}
                    onChange={(v) => set("end", v)}
                  />
                  <Field
                    label="Reason"
                    required
                    type="textarea"
                    value={form.reason || ""}
                    onChange={(v) => set("reason", v)}
                  />
                  <Field
                    label="Contact during leave"
                    value={form.contact || ""}
                    onChange={(v) => set("contact", v)}
                  />
                  {fileField()}
                </div>
                <div className="wf-composer-summary">
                  <span>
                    {workingDays(form.start || "", form.end || "")} estimated working days
                  </span>
                  <Badge>Available balance: not configured</Badge>
                </div>
                {error && (
                  <div className="op-form-error" role="alert">
                    {error}
                  </div>
                )}
                <div className="wf-form-footer">
                  <Button
                    onClick={() => {
                      const event = { preventDefault() {} } as React.FormEvent;
                      submitLeave(event, true);
                    }}
                  >
                    Save draft
                  </Button>
                  <Button primary type="submit">
                    Submit request (preview)
                  </Button>
                </div>
              </Card>
            </form>
          )}
          {stats([
            [
              "Pending",
              String(
                w.leaves.filter((l) => ["Submitted", "Under Review"].includes(l.status)).length,
              ),
            ],
            ["Approved", String(w.leaves.filter((l) => l.status === "Approved").length)],
            ["Rejected", String(w.leaves.filter((l) => l.status === "Rejected").length)],
            ["Currently on leave", String(summary.onLeave)],
          ])}
          <Card
            title={page === "Apply Leave" ? "My application history" : "Leave approval queue"}
            sub="Self-approval is blocked in this preview policy"
          >
            {toolbar()}
            {table(
              [
                "Request",
                "Staff",
                "Department",
                "Type",
                "Dates",
                "Working days",
                "Submitted",
                "Status",
                "",
              ],
              leaveRows.map((l) => (
                <tr key={l.id}>
                  <td>{l.id}</td>
                  <td>{staffById(l.staff)?.name}</td>
                  <td>{staffById(l.staff)?.department}</td>
                  <td>{l.type}</td>
                  <td>
                    {l.start} → {l.end}
                  </td>
                  <td>{workingDays(l.start, l.end)}</td>
                  <td>{l.history[0]?.at.slice(0, 10)}</td>
                  <td>
                    <Badge>{l.status}</Badge>
                  </td>
                  <td>
                    <Button onClick={() => open("leave", "Leave request details", l.id)}>
                      Review
                    </Button>
                  </td>
                </tr>
              )),
            )}
          </Card>
        </>
      ) : ["Leave Type", "Department", "Designation"].includes(page) ? (
        <Card
          title={page}
          sub="Institution-configurable reference values; historical staff records are retained"
          action={
            <Button
              primary
              disabled={!hrEdit}
              onClick={() =>
                open("reference", "Add " + page.toLowerCase(), undefined, {
                  name: "",
                  description: "",
                  status: "Active",
                  allocation: "Not configured",
                  paid: "Unpaid (illustrative)",
                  approval: "Required",
                  document: "Optional",
                  carry: "Not configured",
                  period: "Not configured",
                })
              }
            >
              Add new
            </Button>
          }
        >
          {table(
            page === "Leave Type"
              ? [
                  "Leave type",
                  "Default allocation",
                  "Paid / unpaid",
                  "Approval",
                  "Carry forward",
                  "Usage",
                  "Status",
                  "",
                ]
              : ["Name", "Department / head", "Description", "Staff count", "Status", ""],
            (page === "Leave Type"
              ? w.leaveTypes
              : (page === "Department" ? w.departments : w.designations).map(
                  (name) =>
                    ({ name, ...w.referenceDetails[page + "|" + name] }) as Record<string, string>,
                )
            ).map((r) => (
              <tr key={r.name}>
                <td>
                  <b>{r.name}</b>
                </td>
                {page === "Leave Type" ? (
                  <>
                    <td>
                      {r.allocation} · {r.period}
                    </td>
                    <td>{r.paid}</td>
                    <td>{r.approval}</td>
                    <td>{r.carry}</td>
                    <td>{w.leaves.filter((l) => l.type === r.name).length}</td>
                  </>
                ) : (
                  <>
                    <td>{r.head || r.department || "Not assigned"}</td>
                    <td>{r.description || "Not provided"}</td>
                    <td>
                      <button
                        className="op-row-link"
                        onClick={() => {
                          go("Staff Directory");
                          setTimeout(
                            () =>
                              page === "Department"
                                ? setDepartment(r.name)
                                : setDesignation(r.name),
                            0,
                          );
                        }}
                      >
                        {
                          w.staff.filter((s) =>
                            page === "Department"
                              ? s.department === r.name
                              : s.designation === r.name,
                          ).length
                        }{" "}
                        staff
                      </button>
                    </td>
                  </>
                )}
                <td>
                  <Badge>{r.status || "Active"}</Badge>
                </td>
                <td>
                  <Button
                    disabled={!hrEdit}
                    onClick={() =>
                      open("reference", "Edit " + page.toLowerCase(), r.name, {
                        ...r,
                        status: r.status || "Active",
                      })
                    }
                  >
                    Edit / deactivate
                  </Button>
                </td>
              </tr>
            )),
          )}
        </Card>
      ) : page === "Teachers Rating" ? (
        <>
          <div className="op-notice">
            <Icon name="shield" />
            <span>
              Restricted evaluations. Scores below are manually entered, explicitly illustrative
              feedback—not verified performance of imported staff.
            </span>
          </div>
          {stats([
            ["Teachers evaluated", String(new Set(w.evaluations.map((e) => e.teacher)).size)],
            ["Draft evaluations", String(w.evaluations.filter((e) => e.status === "Draft").length)],
            [
              "Average illustrative score",
              w.evaluations.length
                ? (
                    w.evaluations.reduce(
                      (s, e) =>
                        s +
                        Object.values(e.scores).reduce((a, b) => a + b, 0) /
                          Math.max(1, Object.keys(e.scores).length),
                      0,
                    ) / w.evaluations.length
                  ).toFixed(1)
                : "—",
            ],
            ["Reviewed", String(w.evaluations.filter((e) => e.status === "Reviewed").length)],
          ])}
          <Card
            title="Teacher evaluations"
            sub="Configurable criteria and rating scale · role-restricted preview"
            action={
              <div className="op-inline">
                <Button
                  onClick={() =>
                    open("criteria", "Evaluation criteria", undefined, {
                      criteria: w.criteria.join("\n"),
                      scale: String(w.scale),
                    })
                  }
                >
                  Configure criteria
                </Button>
                <Button
                  primary
                  onClick={() => {
                    setCriterionScores({});
                    open("evaluation", "New illustrative evaluation", undefined, {
                      teacher: focused || w.staff.find((s) => s.role === "Teacher")?.id || "",
                      evaluator: w.actor,
                      period,
                      comments: "",
                      strengths: "",
                      improve: "",
                      recommendation: "",
                    });
                  }}
                >
                  New evaluation
                </Button>
              </div>
            }
          >
            {toolbar()}
            {table(
              ["Teacher", "Department", "Period", "Evaluator", "Score", "Status", ""],
              w.evaluations
                .filter((e) =>
                  [staffById(e.teacher)?.name || "", e.period].some((v) =>
                    v.toLowerCase().includes(q.toLowerCase()),
                  ),
                )
                .map((e) => (
                  <tr key={e.id}>
                    <td>{staffById(e.teacher)?.name}</td>
                    <td>{staffById(e.teacher)?.department}</td>
                    <td>{e.period}</td>
                    <td>{staffById(e.evaluator)?.name}</td>
                    <td>
                      {Object.keys(e.scores).length
                        ? (
                            Object.values(e.scores).reduce((a, b) => a + b, 0) /
                            Object.keys(e.scores).length
                          ).toFixed(1)
                        : "—"}{" "}
                      / {e.max}
                    </td>
                    <td>
                      <Badge>{e.status}</Badge>
                    </td>
                    <td>
                      <Button
                        onClick={() => {
                          setCriterionScores(e.scores);
                          open("evaluation", "Evaluation details · illustrative", e.id, {
                            teacher: e.teacher,
                            evaluator: e.evaluator,
                            period: e.period,
                            comments: e.comments,
                            strengths: e.strengths,
                            improve: e.improve,
                            recommendation: e.recommendation,
                          });
                        }}
                      >
                        View / review
                      </Button>
                    </td>
                  </tr>
                )),
            )}
          </Card>
        </>
      ) : page === "Communicate" ? (
        <>
          {stats([
            [
              "Notices Published",
              String(w.notices.filter((n) => n.status === "Published").length),
              "Notice Board",
            ],
            [
              "Draft Notices",
              String(w.notices.filter((n) => n.status === "Draft").length),
              "Notice Board",
            ],
            ["Emails Sent", "Not available", "Email / SMS Log"],
            ["SMS Sent", "Not available", "Email / SMS Log"],
            ["Failed Messages", String(summary.failed), "Email / SMS Log"],
            ["Pending Messages", String(summary.queued), "Email / SMS Log"],
          ])}
          <div className="op-notice">
            <Icon name="shield" />
            <span>
              No providers are connected. Delivery rates, engagement, costs and provider-confirmed
              sent counts are unavailable—not zero-valued success metrics.
            </span>
          </div>
          <div className="wf-overview-grid">
            <Card
              title="Recent notices"
              sub="Explicit audience and publication state"
              action={<Button onClick={() => go("Notice Board")}>Notice Board</Button>}
            >
              {w.notices.slice(0, 4).map((n) => (
                <button
                  className="op-list-row"
                  key={n.id}
                  onClick={() => {
                    setDrawer({ type: "notice-detail", title: n.title, id: n.id });
                  }}
                >
                  <span>
                    <b>{n.title}</b>
                    <small>
                      {n.audience} · {n.targets.length} selected
                    </small>
                  </span>
                  <Badge>{n.status}</Badge>
                </button>
              ))}
              {!w.notices.length && (
                <div className="op-empty">
                  <p>No notices created.</p>
                  <Button onClick={() => go("Notice Board")}>Create your first notice</Button>
                </div>
              )}
            </Card>
            <Card
              title="Message queue by channel"
              sub="Queued is not sent to provider; delivered data is unavailable"
            >
              {["Email", "SMS"].map((c) => (
                <button
                  className="wf-bar-row"
                  key={c}
                  onClick={() => {
                    go("Email / SMS Log");
                    setTimeout(() => setChannelFilter(c), 0);
                  }}
                >
                  <span>{c}</span>
                  <b>{w.messages.filter((m) => m.channel === c).length} simulated records</b>
                </button>
              ))}
              <div className="op-empty">
                <p>Engagement and delivery trends require provider callbacks.</p>
              </div>
            </Card>
            <div className="wf-wide">
              <Card title="Communication quick actions">
                <div className="op-shortcut-grid">
                  {["Notice Board", "Send Email", "Send SMS", "Email / SMS Log"].map((p) => (
                    <button key={p} onClick={() => go(p)}>
                      <Icon name="mail" />
                      <b>{p}</b>
                      <small>Open communication workspace</small>
                    </button>
                  ))}
                </div>
              </Card>
            </div>
            <Card
              title="Scheduled messages"
              sub="Future queues are illustrative; no background sender runs"
            >
              {w.messages
                .filter((m) => m.schedule)
                .map((m) => (
                  <button
                    className="op-list-row"
                    key={m.id}
                    onClick={() => open("message", "Message details", m.id)}
                  >
                    <span>
                      <b>{m.subject || m.body.slice(0, 40)}</b>
                      <small>{m.schedule}</small>
                    </span>
                    <Badge>{m.status}</Badge>
                  </button>
                ))}
              {!w.messages.some((m) => m.schedule) && (
                <div className="op-empty">No scheduled messages.</div>
              )}
            </Card>
            <Card
              title="Recent communication activity"
              sub="Manual preview operations · provider reference unavailable"
            >
              {w.messages.slice(0, 4).map((m) => (
                <button
                  className="op-list-row"
                  key={m.id}
                  onClick={() => open("message", "Message details", m.id)}
                >
                  <span>
                    <b>
                      {m.channel} · {m.subject || m.body.slice(0, 35)}
                    </b>
                    <small>{m.created}</small>
                  </span>
                  <Badge>{m.status}</Badge>
                </button>
              ))}
              {!w.messages.length && <div className="op-empty">No activity yet.</div>}
            </Card>
          </div>
        </>
      ) : page === "Notice Board" ? (
        <Card
          title="School notices"
          sub="Draft → Scheduled / Published → Archived. Publication is simulated; no delivery or engagement tracking."
        >
          {toolbar(false)}
          {table(
            [
              "Reference",
              "Title",
              "Category",
              "Audience",
              "Publish",
              "Expiry",
              "Creator",
              "Status",
              "",
            ],
            noticeRows.map((n) => (
              <tr key={n.id}>
                <td>{n.id}</td>
                <td>
                  <button
                    className="op-row-link"
                    onClick={() => open("notice-detail", n.title, n.id)}
                  >
                    {n.title}
                  </button>
                </td>
                <td>{n.category}</td>
                <td>
                  {n.audience} · {n.targets.length}
                </td>
                <td>{n.publish || "Not set"}</td>
                <td>{n.expiry || "Not set"}</td>
                <td>{n.history[0]?.actor}</td>
                <td>
                  <Badge>
                    {n.expiry &&
                    n.expiry < new Date().toISOString().slice(0, 10) &&
                    n.status === "Published"
                      ? "Expired"
                      : n.status}
                  </Badge>
                </td>
                <td>
                  <Button onClick={() => open("notice-detail", n.title, n.id)}>View</Button>
                </td>
              </tr>
            )),
          )}
        </Card>
      ) : page === "Send Email" || page === "Send SMS" ? (
        <>
          <div className="op-notice">
            <Icon name="shield" />
            <span>
              {channel} provider not connected. Preview and confirmation only create a simulated
              queue entry. No real message is sent.
            </span>
          </div>
          <form onSubmit={composerPreview}>
            <div className="wf-composer-grid">
              <Card
                title="Choose recipients"
                sub="Imported records have no verified contacts; none will be guessed"
              >
                {audiencePicker()}
                <div className="wf-form-pad">
                  <Field
                    label={
                      channel === "Email"
                        ? "To · explicit preview addresses"
                        : "Phone numbers · explicit preview recipients"
                    }
                    required={!targetIds.length}
                    value={form.to || ""}
                    type="textarea"
                    onChange={(v) => set("to", v)}
                    hint="Separate with commas, semicolons or new lines. Duplicates are removed."
                  />
                  {channel === "Email" && (
                    <>
                      <Field label="CC" value={form.cc || ""} onChange={(v) => set("cc", v)} />
                      <Field label="BCC" value={form.bcc || ""} onChange={(v) => set("bcc", v)} />
                    </>
                  )}
                </div>
              </Card>
              <Card
                title={"Compose " + channel}
                sub={"Sender: " + school + " · preview identity, not an authenticated sender"}
              >
                <div className="op-form-grid wf-form-pad">
                  {channel === "Email" && (
                    <Field
                      label="Subject"
                      required
                      value={form.subject || ""}
                      onChange={(v) => set("subject", v)}
                    />
                  )}
                  <Field
                    label="Message body"
                    required
                    type="textarea"
                    value={form.body || ""}
                    onChange={(v) => set("body", v)}
                  />
                  <Field
                    label="Schedule (optional)"
                    type="datetime-local"
                    value={form.schedule || ""}
                    onChange={(v) => set("schedule", v)}
                  />
                  {fileField("Attachment")}
                  {channel === "SMS" && (
                    <div className="wf-composer-summary">
                      <span>
                        {sms.characters} characters · {sms.segments} segment(s)
                      </span>
                      <Badge>{sms.encoding}</Badge>
                      <small>Length estimate only; no provider cost or delivery promise.</small>
                    </div>
                  )}
                </div>
                {error && (
                  <div className="op-form-error" role="alert">
                    {error}
                  </div>
                )}
                <div className="wf-composer-summary">
                  <b>{new Set([...recipients, ...cc, ...bcc]).size} unique explicit contacts</b>
                  <span>{missingContacts} selected contacts unavailable</span>
                </div>
                <div className="wf-form-footer">
                  <Button
                    onClick={() => {
                      setDrafts((d) => ({ ...d, [page]: { ...form } }));
                      setDirty(false);
                      notify("Composer draft retained in preview memory");
                    }}
                  >
                    Save draft
                  </Button>
                  <Button primary type="submit">
                    Validate & preview
                  </Button>
                </div>
              </Card>
            </div>
          </form>
        </>
      ) : (
        <Card
          title="Email / SMS Log"
          sub="Simulated queue records only · Sent to Provider is never treated as Delivered"
        >
          {toolbar(false)}
          <div className="op-toolbar">
            <select
              aria-label="Message channel filter"
              value={channelFilter}
              onChange={(e) => setChannelFilter(e.target.value)}
            >
              <option>All channels</option>
              <option>Email</option>
              <option>SMS</option>
            </select>
            <select
              aria-label="Delivery status filter"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              {[
                "All statuses",
                "Draft",
                "Queued (simulation)",
                "Processing",
                "Sent to Provider",
                "Delivered",
                "Failed",
                "Cancelled",
                "Unknown",
              ].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
            <input
              aria-label="Log from date"
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
            <input
              aria-label="Log to date"
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>
          {table(
            [
              "Message",
              "Channel",
              "Subject / preview",
              "Recipients",
              "Audience",
              "Created by",
              "Date",
              "Status",
              "Provider reference",
              "",
            ],
            messageRows.map((m) => (
              <tr key={m.id}>
                <td>{m.id}</td>
                <td>
                  <Badge>{m.channel}</Badge>
                </td>
                <td className="wf-message-cell">{m.subject || m.body.slice(0, 55)}</td>
                <td>{m.recipients.length + m.cc.length + m.bcc.length}</td>
                <td>{m.audience}</td>
                <td>{m.history[0]?.actor}</td>
                <td>{m.created.slice(0, 10)}</td>
                <td>
                  <Badge>{m.status}</Badge>
                </td>
                <td>Not connected</td>
                <td>
                  <Button onClick={() => open("message", "Message details", m.id)}>Details</Button>
                </td>
              </tr>
            )),
          )}
        </Card>
      )}
      <div className="op-footnote">
        <span>
          <Icon name="shield" size={13} />
          Imported names · illustrative operations · no backend persistence
        </span>
        <span>{school} · no live payments or delivery</span>
      </div>
      {drawer && (
        <div className="op-overlay" onClick={close}>
          <aside
            className="op-drawer wf-drawer"
            role="dialog"
            aria-modal="true"
            aria-label={drawer.title}
            onClick={(e) => e.stopPropagation()}
          >
            <header>
              <div>
                <small>{isCommunication ? "COMMUNICATION" : "HUMAN RESOURCE"} / PREVIEW ONLY</small>
                <h2>{drawer.title}</h2>
              </div>
              <button aria-label="Close workforce drawer" onClick={close}>
                <Icon name="close" size={21} />
              </button>
            </header>
            <div className="op-drawer-body">
              {drawer.type === "settings" ? (
                <>
                  <div className="op-notice">
                    <Icon name="shield" />
                    These roles are interface previews, not server-enforced authorization. All
                    records reset on reload.
                  </div>
                  <Field label="Preview role" value={w.role} options={roles} onChange={w.setRole} />
                  <label className="op-field">
                    <span>Preview actor (not authenticated)</span>
                    <select value={w.actor} onChange={(e) => w.setActor(e.target.value)}>
                      {w.staff.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} · {s.id}
                        </option>
                      ))}
                    </select>
                  </label>
                  <Field
                    label="School currency display"
                    value={currency}
                    options={["KES", "USD", "GBP", "EUR", "INR"]}
                    onChange={setCurrency}
                    hint="KES is available as illustrative currency; no FX conversion occurs. Existing school currency is preserved."
                  />
                  <Field
                    label="Exception state"
                    value={state}
                    options={["Ready", "Loading", "Empty", "Error", "Restricted"]}
                    onChange={setState}
                  />
                  <Button onClick={close}>Apply preview</Button>
                </>
              ) : drawer.type === "filters" ? (
                <>
                  <Field
                    label="Department"
                    value={department}
                    options={["All departments", ...w.departments]}
                    onChange={(v) => {
                      setDepartment(v);
                      setIndex(1);
                    }}
                  />
                  <Field
                    label="Designation"
                    value={designation}
                    options={["All designations", ...w.designations]}
                    onChange={(v) => {
                      setDesignation(v);
                      setIndex(1);
                    }}
                  />
                  <Field
                    label="Employment type"
                    value={employment}
                    options={[
                      "All employment types",
                      "Full-time",
                      "Part-time",
                      "Contract",
                      "Not supplied",
                    ]}
                    onChange={(v) => {
                      setEmployment(v);
                      setIndex(1);
                    }}
                  />
                  <Field
                    label="Status"
                    value={status}
                    options={[
                      "All statuses",
                      "Active",
                      "Disabled",
                      "Present",
                      "Absent",
                      "Submitted",
                      "Approved",
                      "Rejected",
                      "Draft",
                      "Published",
                      "Scheduled",
                      "Archived",
                    ]}
                    onChange={(v) => {
                      setStatus(v);
                      setIndex(1);
                    }}
                  />
                  <Field
                    label="Sort staff"
                    value={sort}
                    options={["Name", "Staff ID"]}
                    onChange={setSort}
                  />
                  <h3>Visible columns</h3>
                  {[
                    "Department",
                    "Designation",
                    "Employment type",
                    "Phone",
                    "Email",
                    "Joining date",
                    "Status",
                  ].map((h) => (
                    <label className="op-checkbox-row" key={h}>
                      <input
                        type="checkbox"
                        checked={!hidden.includes(h)}
                        onChange={() =>
                          setHidden(
                            hidden.includes(h) ? hidden.filter((n) => n !== h) : [...hidden, h],
                          )
                        }
                      />
                      {h}
                    </label>
                  ))}
                  <Button primary onClick={close}>
                    Apply view
                  </Button>
                </>
              ) : drawer.type === "staff" ? (
                <form onSubmit={saveStaff}>
                  {!hrEdit ? (
                    <div className="op-empty">Staff editing is restricted.</div>
                  ) : (
                    <>
                      <h3>Personal information</h3>
                      <div className="op-form-grid">
                        <Field
                          label="Staff ID"
                          required
                          value={form.id || ""}
                          onChange={(v) => set("id", v)}
                        />
                        <Field
                          label="First name"
                          required
                          value={form.first || ""}
                          onChange={(v) => set("first", v)}
                        />
                        <Field
                          label="Middle name"
                          value={form.middle || ""}
                          onChange={(v) => set("middle", v)}
                        />
                        <Field
                          label="Last name"
                          value={form.last || ""}
                          onChange={(v) => set("last", v)}
                        />
                        <Field
                          label="Gender (optional)"
                          value={form.gender || ""}
                          options={["Not specified", "Female", "Male", "Other"]}
                          onChange={(v) => set("gender", v)}
                        />
                        <Field
                          label="Date of birth"
                          type="date"
                          value={form.dob || ""}
                          onChange={(v) => set("dob", v)}
                        />
                        <Field
                          label="Address"
                          type="textarea"
                          value={form.address || ""}
                          onChange={(v) => set("address", v)}
                        />
                        {fileField("Photo / supporting document")}
                      </div>
                      <h3>Contact information</h3>
                      <div className="op-form-grid">
                        {[
                          ["phone", "Phone number"],
                          ["email", "Email"],
                          ["emergency", "Emergency contact"],
                          ["relationship", "Emergency relationship"],
                        ].map(([k, l]) => (
                          <Field
                            key={k}
                            label={l}
                            value={form[k] || ""}
                            onChange={(v) => set(k, v)}
                          />
                        ))}
                      </div>
                      <h3>Employment information</h3>
                      <div className="op-form-grid">
                        <Field
                          label="Department"
                          required
                          value={form.department || ""}
                          options={w.departments}
                          onChange={(v) => set("department", v)}
                        />
                        <Field
                          label="Designation"
                          required
                          value={form.designation || ""}
                          options={w.designations}
                          onChange={(v) => set("designation", v)}
                        />
                        <Field
                          label="Employment type"
                          value={form.employment || "Full-time"}
                          options={["Full-time", "Part-time", "Contract", "Not supplied"]}
                          onChange={(v) => set("employment", v)}
                        />
                        <Field
                          label="Joining date"
                          type="date"
                          value={form.joined || ""}
                          onChange={(v) => set("joined", v)}
                        />
                        <Field
                          label="Staff role"
                          value={form.role || "Teacher"}
                          options={[
                            ...new Set([...w.staff.map((s) => s.role), "Teacher", "Admin"]),
                          ]}
                          onChange={(v) => set("role", v)}
                        />
                        <Field
                          label="Staff category"
                          value={form.category || ""}
                          onChange={(v) => set("category", v)}
                        />
                        <Field
                          label="Supervisor"
                          value={form.supervisor || ""}
                          options={["Not assigned", ...w.staff.map((s) => s.name)]}
                          onChange={(v) => set("supervisor", v)}
                        />
                      </div>
                      <h3>Additional information</h3>
                      {[
                        ["qualifications", "Qualifications"],
                        ["experience", "Experience"],
                        ["notes", "Notes"],
                      ].map(([k, l]) => (
                        <Field
                          key={k}
                          label={l}
                          type="textarea"
                          value={form[k] || ""}
                          onChange={(v) => set(k, v)}
                        />
                      ))}
                      {error && (
                        <div className="op-form-error" role="alert">
                          {error}
                        </div>
                      )}
                      <div className="op-drawer-actions">
                        <Button onClick={close}>Cancel</Button>
                        <Button primary type="submit">
                          Save staff (preview)
                        </Button>
                      </div>
                    </>
                  )}
                </form>
              ) : drawer.type === "profile" && profile ? (
                <>
                  <div className="op-detail-person">
                    <span className="op-avatar large">{profile.name.slice(0, 2)}</span>
                    <div>
                      <h2>{profile.name}</h2>
                      <p>
                        {profile.id} · {profile.department}
                      </p>
                      <Badge>{profile.status}</Badge>
                    </div>
                  </div>
                  <div className="op-profile-tabs">
                    {["Overview", "Attendance", "Leave", "Payroll", "Evaluations", "History"].map(
                      (t) => (
                        <button
                          key={t}
                          className={profileTab === t ? "active" : ""}
                          onClick={() => setProfileTab(t)}
                        >
                          {t}
                        </button>
                      ),
                    )}
                  </div>
                  {profileTab === "Overview" ? (
                    <>
                      <dl className="op-dl">
                        {[
                          ["Designation", profile.designation],
                          ["Employment", profile.employment],
                          ["Joined", profile.joined || "Not supplied"],
                          [
                            "Contact",
                            hrEdit || profile.id === w.actor
                              ? profile.email || profile.phone || "Not supplied"
                              : "Restricted",
                          ],
                          ["Source", profile.source],
                        ].map(([k, v]) => (
                          <div key={k}>
                            <dt>{k}</dt>
                            <dd>{v}</dd>
                          </div>
                        ))}
                      </dl>
                      <div className="op-drawer-actions">
                        <Button disabled={!hrEdit} onClick={() => editStaff(profile)}>
                          Edit staff
                        </Button>
                        <Button
                          disabled={!hrEdit}
                          onClick={() => {
                            setSelection([profile.id]);
                            setForm({ reason: "" });
                            setConfirm("");
                            setDrawer({
                              type: "staff-status",
                              title:
                                profile.status === "Active" ? "Disable staff" : "Reactivate staff",
                            });
                          }}
                        >
                          {profile.status === "Active" ? "Disable" : "Reactivate"}
                        </Button>
                      </div>
                    </>
                  ) : profileTab === "History" ? (
                    profileHistory(profile.history)
                  ) : (
                    <>
                      <p className="op-description">
                        Open the related workspace for {profile.name}. Payroll and evaluation
                        details remain role-restricted.
                      </p>
                      <Button
                        disabled={
                          (profileTab === "Payroll" && !payrollAccess) ||
                          (profileTab === "Evaluations" && !evaluateAccess)
                        }
                        onClick={() => {
                          setFocused(profile.id);
                          go(
                            profileTab === "Payroll"
                              ? "Payroll"
                              : profileTab === "Evaluations"
                                ? "Teachers Rating"
                                : profileTab === "Attendance"
                                  ? "Staff Attendance"
                                  : "Apply Leave",
                          );
                        }}
                      >
                        Open {profileTab.toLowerCase()} workspace
                      </Button>
                      {profileTab === "Leave" &&
                        w.leaves
                          .filter((l) => l.staff === profile.id)
                          .map((l) => (
                            <div className="op-list-row" key={l.id}>
                              <span>
                                {l.type} · {l.start}
                              </span>
                              <Badge>{l.status}</Badge>
                            </div>
                          ))}
                    </>
                  )}
                </>
              ) : drawer.type === "staff-status" ? (
                <>
                  <div className="op-notice">
                    <Icon name="shield" />
                    This changes preview eligibility only. Attendance, payroll, leave and evaluation
                    history remain intact.
                  </div>
                  <h3>{selectedStaff.length} selected records</h3>
                  {selectedStaff.map((s) => (
                    <div className="op-list-row" key={s.id}>
                      <span>
                        <b>{s.name}</b>
                        <small>{s.id}</small>
                      </span>
                      <Badge>{s.status}</Badge>
                    </div>
                  ))}
                  <Field
                    label="Reason"
                    required
                    type="textarea"
                    value={form.reason || ""}
                    onChange={(v) => set("reason", v)}
                  />
                  <Field
                    label={
                      "Type " + (drawer.title.startsWith("Reactivate") ? "REACTIVATE" : "DISABLE")
                    }
                    value={confirm}
                    onChange={setConfirm}
                  />
                  <Button
                    danger={!drawer.title.startsWith("Reactivate")}
                    primary={drawer.title.startsWith("Reactivate")}
                    disabled={
                      !hrEdit ||
                      !selection.length ||
                      !form.reason?.trim() ||
                      confirm !== (drawer.title.startsWith("Reactivate") ? "REACTIVATE" : "DISABLE")
                    }
                    onClick={() => {
                      const next = drawer.title.startsWith("Reactivate") ? "Active" : "Disabled";
                      w.setStaff(
                        w.staff.map((s) =>
                          selection.includes(s.id)
                            ? {
                                ...s,
                                status: next,
                                history: [...s.history, audit(s.status, next, form.reason)],
                              }
                            : s,
                        ),
                      );
                      setSelection([]);
                      setDirty(false);
                      setDrawer(null);
                      notify("Staff status updated in preview; history retained");
                    }}
                  >
                    Confirm status change
                  </Button>
                </>
              ) : drawer.type === "attendance-review" ? (
                <>
                  <h3>
                    {Object.keys(attendanceDraft).length} explicit marks · {w.date}
                  </h3>
                  {staffStatuses.map((s) => (
                    <div className="wf-bar-row" key={s}>
                      <span>{s}</span>
                      <b>{Object.values(attendanceDraft).filter((v) => v === s).length}</b>
                    </div>
                  ))}
                  <div className="op-notice">
                    Approved leave remains On Leave and cannot be double-counted as Absent. Saving
                    replaces the selected date/staff marks, not a second daily record.
                  </div>
                  <Button
                    primary
                    disabled={!hrEdit}
                    onClick={() => {
                      const values = Object.fromEntries(
                        Object.entries(attendanceDraft)
                          .filter(([, v]) => staffStatuses.includes(v))
                          .map(([id, value]) => [w.date + "|" + id, value]),
                      );
                      w.setAttendance({ ...w.attendance, ...values });
                      setAttendanceDraft({});
                      setDirty(false);
                      setDrawer(null);
                      notify("Staff attendance saved in preview · Pulse updated");
                    }}
                  >
                    Confirm attendance save
                  </Button>
                </>
              ) : drawer.type === "attendance-note" ? (
                <>
                  <Field
                    label="Check-in (manual)"
                    type="time"
                    value={form.checkin || ""}
                    onChange={(v) => set("checkin", v)}
                  />
                  <Field
                    label="Check-out (manual)"
                    type="time"
                    value={form.checkout || ""}
                    onChange={(v) => set("checkout", v)}
                  />
                  <Field
                    label="Remarks"
                    type="textarea"
                    value={form.note || ""}
                    onChange={(v) => set("note", v)}
                  />
                  <Button
                    primary
                    disabled={
                      !hrEdit || (!!form.checkin && !!form.checkout && form.checkout < form.checkin)
                    }
                    onClick={() => {
                      w.setAttendanceNotes({
                        ...w.attendanceNotes,
                        [w.date + "|" + drawer.id]: [
                          form.checkin && "In " + form.checkin,
                          form.checkout && "Out " + form.checkout,
                          form.note,
                        ]
                          .filter(Boolean)
                          .join(" · "),
                      });
                      setDirty(false);
                      setDrawer(null);
                      notify("Manual attendance note saved in preview");
                    }}
                  >
                    Save note
                  </Button>
                </>
              ) : drawer.type === "staff-attendance-history" ? (
                <>
                  {Object.entries(w.attendance)
                    .filter(([key]) => !ownOnly || key.endsWith("|" + w.actor))
                    .slice(-50)
                    .reverse()
                    .map(([key, value]) => (
                      <div className="op-list-row" key={key}>
                        <span>
                          <b>{staffById(key.split("|")[1])?.name}</b>
                          <small>{key.split("|")[0]}</small>
                        </span>
                        <Badge>{value}</Badge>
                      </div>
                    ))}
                  {!Object.keys(w.attendance).length && (
                    <div className="op-empty">No attendance history yet.</div>
                  )}
                </>
              ) : drawer.type === "salary" ? (
                <>
                  <div className="op-notice">
                    Manually entered illustrative components. No salary was imported and no tax or
                    statutory deduction is calculated.
                  </div>
                  {["basic", "allowance", "deduction"].map((k) => (
                    <Field
                      key={k}
                      label={
                        k === "basic"
                          ? "Basic salary"
                          : k === "allowance"
                            ? "Allowances"
                            : "Deductions"
                      }
                      required
                      value={form[k] || ""}
                      onChange={(v) => set(k, v)}
                    />
                  ))}
                  {error && <div className="op-form-error">{error}</div>}
                  <Button
                    primary
                    disabled={!payrollAccess}
                    onClick={() => {
                      try {
                        if (
                          ["basic", "allowance", "deduction"].some(
                            (k) => !/^\d+(\.\d{1,2})?$/.test(form[k] || ""),
                          )
                        )
                          throw Error("Use non-negative amounts with up to two decimals.");
                        const sal = {
                          basic: Math.round(Number(form.basic) * 100),
                          allowance: Math.round(Number(form.allowance) * 100),
                          deduction: Math.round(Number(form.deduction) * 100),
                        };
                        payrollTotals(sal);
                        w.setSalaries({ ...w.salaries, [drawer.id!]: sal });
                        setDirty(false);
                        setDrawer(null);
                        notify("Illustrative salary components saved; no payroll run yet");
                      } catch (e) {
                        setError((e as Error).message);
                      }
                    }}
                  >
                    Save illustrative components
                  </Button>
                </>
              ) : drawer.type === "payroll-review" ? (
                <>
                  <div className="op-notice">
                    No bank transfer will occur. Only eligible rows are finalized; missing, disabled
                    and already finalized rows are excluded.
                  </div>
                  <h3>
                    {period} · {eligiblePayroll.length} eligible / {payrollRows.length} selected
                  </h3>
                  {payrollRows.map((r) => (
                    <div className="op-list-row" key={r.s.id}>
                      <span>
                        <b>{r.s.name}</b>
                        <small>
                          {r.error ||
                            `${money(r.calc!.gross)} gross − ${money(r.salary!.deduction)} deductions`}
                        </small>
                      </span>
                      <Badge>{r.error ? "Excluded" : money(r.calc!.net)}</Badge>
                    </div>
                  ))}
                  <Field
                    label="Type PAYROLL to confirm simulation"
                    value={confirm}
                    onChange={setConfirm}
                  />
                  <Button
                    primary
                    disabled={!payrollAccess || confirm !== "PAYROLL" || !eligiblePayroll.length}
                    onClick={() => {
                      if (
                        w.batches.some(
                          (b) =>
                            b.period === period &&
                            b.rows.some((r) => eligiblePayroll.some((p) => p.s.id === r.staff)),
                        )
                      ) {
                        setError(
                          "A selected record was finalized after review. Re-open payroll review.",
                        );
                        return;
                      }
                      const batch = {
                        id: "PAY-" + Date.now(),
                        period,
                        currency,
                        rows: eligiblePayroll.map((r) => ({
                          staff: r.s.id,
                          salary: { ...r.salary! },
                          ...r.calc!,
                        })),
                        history: [
                          audit(
                            "Draft",
                            "Validated",
                            "Eligible rows calculated from manually configured components",
                          ),
                          audit(
                            "Validated",
                            "Finalized (simulation)",
                            "Confirmed by preview actor; no money transferred",
                          ),
                        ],
                      };
                      w.setBatches([batch, ...w.batches]);
                      setDirty(false);
                      setSelection([]);
                      setDrawer({
                        type: "batch-detail",
                        title: "Payroll batch · simulation",
                        id: batch.id,
                      });
                      notify("Payroll finalized in preview only; no staff paid");
                    }}
                  >
                    Confirm simulated payroll run
                  </Button>
                  {error && <p className="op-form-error">{error}</p>}
                </>
              ) : drawer.type === "batch-detail" ? (
                (() => {
                  const b = w.batches.find((b) => b.id === drawer.id);
                  return b ? (
                    <>
                      <Badge>Finalized simulation · NOT PAID</Badge>
                      <p className="op-description">
                        {b.id} · {b.period} · {b.currency}
                      </p>
                      {b.rows.map((r) => (
                        <button
                          className="op-list-row"
                          key={r.staff}
                          onClick={() =>
                            open("payslip", "Payslip preview", b.id, { staff: r.staff })
                          }
                        >
                          <span>
                            <b>{staffById(r.staff)?.name}</b>
                            <small>
                              Gross{" "}
                              {new Intl.NumberFormat("en", {
                                style: "currency",
                                currency: b.currency,
                              }).format(r.gross / 100)}{" "}
                              · deductions {r.salary.deduction / 100}
                            </small>
                          </span>
                          <Badge>
                            {r.net / 100} {b.currency}
                          </Badge>
                        </button>
                      ))}
                      <h3>Processing history</h3>
                      {profileHistory(b.history)}
                    </>
                  ) : null;
                })()
              ) : drawer.type === "payslip" ? (
                (() => {
                  const b = w.batches.find((b) => b.id === drawer.id),
                    r = b?.rows.find((r) => r.staff === form.staff);
                  if (!b || !r) return null;
                  const fmt = (n: number) =>
                    new Intl.NumberFormat("en", { style: "currency", currency: b.currency }).format(
                      n / 100,
                    );
                  return (
                    <div className="wf-payslip">
                      <Icon name="book" size={28} />
                      <h2>{school}</h2>
                      <Badge>Illustrative payslip · no payment</Badge>
                      <h3>{staffById(r.staff)?.name}</h3>
                      <p>
                        {b.period} · {b.id}
                      </p>
                      {[
                        ["Basic", r.salary.basic],
                        ["Allowances", r.salary.allowance],
                        ["Gross pay", r.gross],
                        ["Deductions", r.salary.deduction],
                        ["Net payroll", r.net],
                      ].map(([name, value]) => (
                        <div className="wf-bar-row" key={name}>
                          <span>{name}</span>
                          <b>{fmt(Number(value))}</b>
                        </div>
                      ))}
                      <p className="op-description">
                        Not evidence of payment. No statutory deduction rates or bank integrations
                        are configured.
                      </p>
                      <Button onClick={() => window.print()}>Print preview</Button>
                    </div>
                  );
                })()
              ) : drawer.type === "leave" ? (
                (() => {
                  const l = w.leaves.find((l) => l.id === drawer.id);
                  return l ? (
                    <>
                      <h3>{staffById(l.staff)?.name}</h3>
                      <Badge>{l.status}</Badge>
                      <dl className="op-dl">
                        <div>
                          <dt>Type</dt>
                          <dd>{l.type}</dd>
                        </div>
                        <div>
                          <dt>Dates</dt>
                          <dd>
                            {l.start} → {l.end}
                          </dd>
                        </div>
                        <div>
                          <dt>Estimated working days</dt>
                          <dd>{workingDays(l.start, l.end)}</dd>
                        </div>
                        <div>
                          <dt>Balance / entitlement</dt>
                          <dd>Not configured</dd>
                        </div>
                        <div>
                          <dt>Reason</dt>
                          <dd>{l.reason}</dd>
                        </div>
                        <div>
                          <dt>Attachment</dt>
                          <dd>{l.attachment || "Not supplied"} · not uploaded</dd>
                        </div>
                      </dl>
                      <Field
                        label="Decision remarks"
                        required
                        type="textarea"
                        value={form.decision || ""}
                        onChange={(v) => set("decision", v)}
                      />
                      {l.staff === w.actor && (
                        <div className="op-notice amber">
                          Self-approval is blocked. Choose another authorized preview actor to
                          demonstrate an approval.
                        </div>
                      )}
                      <div className="op-drawer-actions">
                        {["Approved", "Rejected", "Clarification Requested"].map((next) => (
                          <Button
                            key={next}
                            disabled={
                              !hrApprove ||
                              l.staff === w.actor ||
                              !form.decision?.trim() ||
                              !["Submitted", "Under Review", "Clarification Requested"].includes(
                                l.status,
                              )
                            }
                            onClick={() => {
                              setForm({ ...form, next });
                              setConfirm("");
                              setDrawer({
                                type: "leave-decision",
                                title: "Confirm leave decision",
                                id: l.id,
                              });
                            }}
                          >
                            {next === "Approved"
                              ? "Approve"
                              : next === "Rejected"
                                ? "Reject"
                                : "Request clarification"}
                          </Button>
                        ))}
                        {(l.staff === w.actor || hrEdit) &&
                          [
                            "Submitted",
                            "Under Review",
                            "Draft",
                            "Clarification Requested",
                          ].includes(l.status) && (
                            <Button
                              onClick={() => {
                                if (window.confirm("Withdraw this preview leave request?")) {
                                  w.setLeaves(
                                    w.leaves.map((x) =>
                                      x.id === l.id
                                        ? {
                                            ...x,
                                            status: "Withdrawn",
                                            history: [
                                              ...x.history,
                                              audit(
                                                x.status,
                                                "Withdrawn",
                                                "Applicant withdrew request",
                                              ),
                                            ],
                                          }
                                        : x,
                                    ),
                                  );
                                  setDirty(false);
                                  notify("Preview request withdrawn");
                                }
                              }}
                            >
                              Withdraw request
                            </Button>
                          )}
                        {l.status === "Draft" && (
                          <Button
                            onClick={() => {
                              const err = leaveError(w.leaves, l);
                              if (err) {
                                setError(err);
                                return;
                              }
                              w.setLeaves(
                                w.leaves.map((x) =>
                                  x.id === l.id
                                    ? {
                                        ...x,
                                        status: "Submitted",
                                        history: [
                                          ...x.history,
                                          audit("Draft", "Submitted", "Draft submitted"),
                                        ],
                                      }
                                    : x,
                                ),
                              );
                              notify("Draft submitted");
                            }}
                          >
                            Submit saved draft
                          </Button>
                        )}
                      </div>
                      {error && <div className="op-form-error">{error}</div>}
                      <h3>History</h3>
                      {profileHistory(l.history)}
                    </>
                  ) : null;
                })()
              ) : drawer.type === "leave-decision" ? (
                <>
                  <p className="op-description">
                    Decision: {form.next}. Actor: {actorName}. Remarks: {form.decision}. A simulated
                    history record will be added.
                  </p>
                  <Field label="Type CONFIRM" value={confirm} onChange={setConfirm} />
                  <Button
                    primary
                    disabled={
                      !hrApprove ||
                      confirm !== "CONFIRM" ||
                      w.leaves.find((l) => l.id === drawer.id)?.staff === w.actor
                    }
                    onClick={() => {
                      w.setLeaves(
                        w.leaves.map((l) =>
                          l.id === drawer.id
                            ? {
                                ...l,
                                status: form.next,
                                history: [...l.history, audit(l.status, form.next, form.decision)],
                              }
                            : l,
                        ),
                      );
                      setDirty(false);
                      setDrawer({ type: "leave", title: "Leave decision history", id: drawer.id });
                      notify("Leave decision simulated; approved dates feed staff attendance");
                    }}
                  >
                    Confirm decision
                  </Button>
                </>
              ) : drawer.type === "reference" ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!hrEdit) return;
                    const name = form.name?.trim();
                    if (!name) {
                      setError("Name is required.");
                      return;
                    }
                    const names =
                      page === "Department"
                        ? w.departments
                        : page === "Designation"
                          ? w.designations
                          : w.leaveTypes.map((l) => l.name);
                    if (
                      names.some((n) => n.toLowerCase() === name.toLowerCase() && n !== drawer.id)
                    ) {
                      setError("That name already exists.");
                      return;
                    }
                    if (
                      drawer.id &&
                      drawer.id !== name &&
                      (page === "Department"
                        ? w.staff.some((s) => s.department === drawer.id)
                        : page === "Designation"
                          ? w.staff.some((s) => s.designation === drawer.id)
                          : w.leaves.some((l) => l.type === drawer.id))
                    ) {
                      setError(
                        "This reference is in use. Rename requires a safe reassignment policy; history will not be rewritten.",
                      );
                      return;
                    }
                    if (page === "Leave Type") {
                      const record = { ...form, name };
                      w.setLeaveTypes(
                        drawer.id
                          ? w.leaveTypes.map((l) => (l.name === drawer.id ? record : l))
                          : [...w.leaveTypes, record],
                      );
                    } else {
                      const values = drawer.id
                        ? names.map((n) => (n === drawer.id ? name : n))
                        : [...names, name];
                      if (page === "Department") w.setDepartments(values);
                      else w.setDesignations(values);
                      w.setReferenceDetails({
                        ...w.referenceDetails,
                        [page + "|" + name]: { ...form },
                      });
                    }
                    setDirty(false);
                    setDrawer(null);
                    notify("Reference configuration saved in preview");
                  }}
                >
                  <Field
                    label="Name"
                    required
                    value={form.name || ""}
                    onChange={(v) => set("name", v)}
                  />
                  <Field
                    label="Description"
                    type="textarea"
                    value={form.description || ""}
                    onChange={(v) => set("description", v)}
                  />
                  {page === "Leave Type" ? (
                    <>
                      {[
                        ["allocation", "Default allocation"],
                        ["period", "Allocation period"],
                        ["paid", "Paid / unpaid"],
                        ["approval", "Approval required"],
                        ["document", "Supporting document required"],
                        ["carry", "Carry-forward policy"],
                      ].map(([k, l]) => (
                        <Field
                          key={k}
                          label={l}
                          value={form[k] || "Not configured"}
                          onChange={(v) => set(k, v)}
                        />
                      ))}
                      <p className="op-description">
                        No statutory entitlement is assumed. Leave balance enforcement is not
                        implemented.
                      </p>
                    </>
                  ) : page === "Department" ? (
                    <Field
                      label="Department head"
                      value={form.head || ""}
                      options={["Not assigned", ...w.staff.map((s) => s.name)]}
                      onChange={(v) => set("head", v)}
                    />
                  ) : (
                    <Field
                      label="Department"
                      value={form.department || ""}
                      options={w.departments}
                      onChange={(v) => set("department", v)}
                    />
                  )}
                  <Field
                    label="Status"
                    value={form.status || "Active"}
                    options={["Active", "Inactive"]}
                    onChange={(v) => set("status", v)}
                  />
                  {error && <div className="op-form-error">{error}</div>}
                  <div className="op-drawer-actions">
                    <Button primary type="submit">
                      Save configuration preview
                    </Button>
                  </div>
                </form>
              ) : drawer.type === "criteria" ? (
                <>
                  <Field
                    label="Criteria · one per line"
                    type="textarea"
                    value={form.criteria || ""}
                    onChange={(v) => set("criteria", v)}
                  />
                  <Field
                    label="Rating maximum (2–10)"
                    type="number"
                    value={form.scale || ""}
                    onChange={(v) => set("scale", v)}
                  />
                  <Button
                    primary
                    disabled={!evaluateAccess}
                    onClick={() => {
                      const criteria = [
                          ...new Set(
                            (form.criteria || "")
                              .split("\n")
                              .map((v) => v.trim())
                              .filter(Boolean),
                          ),
                        ],
                        max = Number(form.scale);
                      if (!criteria.length || !Number.isInteger(max) || max < 2 || max > 10) {
                        setError("Add criteria and a whole-number scale from 2 to 10.");
                        return;
                      }
                      w.setCriteria(criteria);
                      w.setScale(max);
                      setDirty(false);
                      setDrawer(null);
                      notify("Criteria updated for future illustrative evaluations");
                    }}
                  >
                    Save criteria
                  </Button>
                  {error && <p className="op-form-error">{error}</p>}
                </>
              ) : drawer.type === "evaluation" ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!evaluateAccess) return;
                    if (
                      !form.evaluator ||
                      !form.teacher ||
                      w.criteria.some((c) => !criterionScores[c])
                    ) {
                      setError("Choose an evaluator, teacher and a score for each criterion.");
                      return;
                    }
                    const existing = w.evaluations.find((e) => e.id === drawer.id);
                    const record = {
                      id: drawer.id || "EV-" + Date.now(),
                      teacher: form.teacher,
                      period: form.period || period,
                      evaluator: form.evaluator,
                      scores: { ...criterionScores },
                      max: existing?.max || w.scale,
                      comments: form.comments || "",
                      strengths: form.strengths || "",
                      improve: form.improve || "",
                      recommendation: form.recommendation || "",
                      status:
                        existing?.status === "Submitted" || existing?.status === "Reviewed"
                          ? "Reviewed"
                          : "Submitted",
                      history: [
                        ...(existing?.history || []),
                        actorName +
                          " · evaluation " +
                          (existing?.status === "Submitted" ? "reviewed" : "submitted") +
                          " · " +
                          new Date().toISOString(),
                      ],
                    };
                    w.setEvaluations(
                      existing
                        ? w.evaluations.map((e) => (e.id === record.id ? record : e))
                        : [record, ...w.evaluations],
                    );
                    setDirty(false);
                    setDrawer(null);
                    notify("Illustrative evaluation saved; not verified staff performance");
                  }}
                >
                  <label className="op-field">
                    <span>Teacher *</span>
                    <select
                      required
                      value={form.teacher || ""}
                      onChange={(e) => set("teacher", e.target.value)}
                    >
                      <option value="">Select teacher</option>
                      {w.staff
                        .filter((s) => s.role === "Teacher")
                        .map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                    </select>
                  </label>
                  <label className="op-field">
                    <span>Evaluator *</span>
                    <select
                      required
                      value={form.evaluator || ""}
                      onChange={(e) => set("evaluator", e.target.value)}
                    >
                      <option value="">Choose evaluator</option>
                      {w.staff.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <Field
                    label="Evaluation period"
                    type="month"
                    value={form.period || period}
                    onChange={(v) => set("period", v)}
                  />
                  {w.criteria.map((c) => (
                    <Field
                      key={c}
                      label={c}
                      required
                      value={criterionScores[c] ? String(criterionScores[c]) : ""}
                      options={Array.from(
                        { length: w.evaluations.find((e) => e.id === drawer.id)?.max || w.scale },
                        (_, i) => String(i + 1),
                      )}
                      onChange={(v) => {
                        setCriterionScores({ ...criterionScores, [c]: Number(v) });
                        setDirty(true);
                      }}
                    />
                  ))}
                  {[
                    ["comments", "Written comments"],
                    ["strengths", "Strengths"],
                    ["improve", "Improvement areas"],
                    ["recommendation", "Development recommendations"],
                  ].map(([k, l]) => (
                    <Field
                      key={k}
                      label={l}
                      type="textarea"
                      value={form[k] || ""}
                      onChange={(v) => set(k, v)}
                    />
                  ))}
                  {error && <p className="op-form-error">{error}</p>}
                  <div className="op-drawer-actions">
                    <Button
                      disabled={
                        !!drawer.id &&
                        w.evaluations.find((e) => e.id === drawer.id)?.status !== "Draft"
                      }
                      onClick={() => {
                        const record = {
                          id: drawer.id || "EV-" + Date.now(),
                          teacher: form.teacher || "",
                          period: form.period || period,
                          evaluator: form.evaluator || "",
                          scores: { ...criterionScores },
                          max: w.scale,
                          comments: form.comments || "",
                          strengths: form.strengths || "",
                          improve: form.improve || "",
                          recommendation: form.recommendation || "",
                          status: "Draft",
                          history: ["Draft saved by " + actorName],
                        };
                        w.setEvaluations(
                          w.evaluations.some((e) => e.id === record.id)
                            ? w.evaluations.map((e) => (e.id === record.id ? record : e))
                            : [record, ...w.evaluations],
                        );
                        setDirty(false);
                        setDrawer(null);
                      }}
                    >
                      Save draft
                    </Button>
                    <Button primary type="submit">
                      Submit / review evaluation
                    </Button>
                  </div>
                  {w.evaluations
                    .find((e) => e.id === drawer.id)
                    ?.history.map((h, i) => (
                      <p className="op-description" key={i}>
                        {h}
                      </p>
                    ))}
                </form>
              ) : drawer.type === "notice" ? (
                <form onSubmit={saveNotice}>
                  <Field
                    label="Notice title"
                    required
                    value={form.title || ""}
                    onChange={(v) => set("title", v)}
                  />
                  <Field
                    label="Notice body"
                    type="textarea"
                    required
                    value={form.body || ""}
                    onChange={(v) => set("body", v)}
                  />
                  <Field
                    label="Category"
                    value={form.category || "General"}
                    options={["General", "Academic", "Events", "Administration"]}
                    onChange={(v) => set("category", v)}
                  />
                  {audiencePicker(true)}
                  <Field
                    label="Publish date"
                    required
                    type="date"
                    value={form.publish || ""}
                    onChange={(v) => set("publish", v)}
                  />
                  <Field
                    label="Expiry date"
                    required
                    type="date"
                    value={form.expiry || ""}
                    onChange={(v) => set("expiry", v)}
                  />
                  <Field
                    label="Priority"
                    value={form.priority || "Normal"}
                    options={["Normal", "Important", "Urgent"]}
                    onChange={(v) => set("priority", v)}
                  />
                  {fileField()}
                  <div className="op-notice">
                    Visibility is limited to the explicitly selected audience in this prototype. No
                    public website or portal publication is connected.
                  </div>
                  {error && <div className="op-form-error">{error}</div>}
                  <div className="op-drawer-actions">
                    <Button
                      onClick={() => saveNotice({ preventDefault() {} } as React.FormEvent, true)}
                    >
                      Save draft
                    </Button>
                    <Button primary type="submit">
                      Preview publication
                    </Button>
                  </div>
                </form>
              ) : drawer.type === "notice-preview" ? (
                <>
                  <Badge>
                    {form.publish > new Date().toISOString().slice(0, 10)
                      ? "Scheduled (preview)"
                      : "Publish (preview)"}
                  </Badge>
                  <h2 className="wf-preview-title">{form.title}</h2>
                  <p className="wf-message-body">{form.body}</p>
                  <div className="op-notice">
                    Audience: {audience} · {targetIds.length} explicitly selected. {form.publish} →{" "}
                    {form.expiry}
                  </div>
                  <Button
                    primary
                    disabled={!communicationsAccess}
                    onClick={() => {
                      const old = w.notices.find((n) => n.id === drawer.id),
                        next =
                          form.publish > new Date().toISOString().slice(0, 10)
                            ? "Scheduled"
                            : "Published";
                      const n: Notice = {
                        id: drawer.id || "NTC-" + Date.now(),
                        title: form.title,
                        body: form.body,
                        category: form.category || "General",
                        audience,
                        targets: [...targetIds],
                        publish: form.publish,
                        expiry: form.expiry,
                        priority: form.priority,
                        status: next,
                        attachments: form.attachment ? [form.attachment] : [],
                        history: [
                          ...(old?.history || []),
                          audit(
                            old?.status || "Draft",
                            next,
                            "Notice publication simulated; no delivery claims",
                          ),
                        ],
                      };
                      w.setNotices(
                        old ? w.notices.map((x) => (x.id === n.id ? n : x)) : [n, ...w.notices],
                      );
                      setDirty(false);
                      setDrawer({ type: "notice-detail", title: n.title, id: n.id });
                      notify("Notice " + next.toLowerCase() + " in preview only");
                    }}
                  >
                    Confirm{" "}
                    {form.publish > new Date().toISOString().slice(0, 10)
                      ? "schedule"
                      : "publication"}{" "}
                    (simulation)
                  </Button>
                </>
              ) : drawer.type === "notice-detail" ? (
                (() => {
                  const n = w.notices.find((n) => n.id === drawer.id);
                  return n ? (
                    <>
                      <Badge>{n.status}</Badge>
                      <h2 className="wf-preview-title">{n.title}</h2>
                      <p className="wf-message-body">{n.body}</p>
                      <dl className="op-dl">
                        <div>
                          <dt>Audience</dt>
                          <dd>
                            {n.audience} · {n.targets.length} selected
                          </dd>
                        </div>
                        <div>
                          <dt>Publication / expiry</dt>
                          <dd>
                            {n.publish} → {n.expiry}
                          </dd>
                        </div>
                        <div>
                          <dt>Priority</dt>
                          <dd>{n.priority}</dd>
                        </div>
                        <div>
                          <dt>Attachment</dt>
                          <dd>{n.attachments.join(", ") || "Not supplied"}</dd>
                        </div>
                      </dl>
                      <h3>Publication history</h3>
                      {profileHistory(n.history)}
                      <div className="op-drawer-actions">
                        {n.status === "Draft" && (
                          <Button
                            disabled={!communicationsAccess}
                            onClick={() => {
                              setAudience(n.audience);
                              setTargetIds(n.targets);
                              open("notice", "Edit draft notice", n.id, {
                                title: n.title,
                                body: n.body,
                                category: n.category,
                                publish: n.publish,
                                expiry: n.expiry,
                                priority: n.priority,
                              });
                            }}
                          >
                            Edit draft
                          </Button>
                        )}
                        <Button
                          disabled={!communicationsAccess || n.status === "Archived"}
                          onClick={() => {
                            if (window.confirm("Archive this preview notice?"))
                              w.setNotices(
                                w.notices.map((x) =>
                                  x.id === n.id
                                    ? {
                                        ...x,
                                        status: "Archived",
                                        history: [
                                          ...x.history,
                                          audit(x.status, "Archived", "Notice archived in preview"),
                                        ],
                                      }
                                    : x,
                                ),
                              );
                          }}
                        >
                          Archive notice
                        </Button>
                      </div>
                    </>
                  ) : null;
                })()
              ) : drawer.type === "message-review" ? (
                <>
                  <div className="op-notice">
                    <Icon name="shield" />
                    No provider is connected. Confirmation creates only a Queued (simulation) log
                    entry—not Sent or Delivered.
                  </div>
                  <h3>
                    {channel} · {new Set([...recipients, ...cc, ...bcc]).size} unique recipient(s)
                  </h3>
                  <p className="op-description">
                    To: {recipients.join(", ")}
                    {cc.length ? " · CC: " + cc.join(", ") : ""}
                    {bcc.length ? " · BCC: " + bcc.join(", ") : ""}
                  </p>
                  <h2 className="wf-preview-title">{form.subject || "SMS preview"}</h2>
                  <p className="wf-message-body">{form.body}</p>
                  <p className="op-description">
                    Attachment: {form.attachment || "None"} · Schedule:{" "}
                    {form.schedule || "Preview queue now"}
                  </p>
                  <Button
                    primary
                    disabled={!communicationsAccess}
                    onClick={() => {
                      const err = messageError(
                        channel,
                        [...recipients, ...cc, ...bcc],
                        form.subject || "",
                        form.body || "",
                      );
                      if (err) {
                        setError(err);
                        return;
                      }
                      const now = new Date().toISOString();
                      const m: Message = {
                        id: "MSG-" + Date.now(),
                        channel,
                        subject: form.subject || "",
                        body: form.body,
                        recipients: [...recipients],
                        cc: [...cc],
                        bcc: [...bcc],
                        audience,
                        created: now,
                        status: "Queued (simulation)",
                        schedule: form.schedule || "",
                        attachments: form.attachment ? [form.attachment] : [],
                        history: [
                          audit(
                            "Draft",
                            "Queued (simulation)",
                            "Explicit confirmation; no provider call made",
                          ),
                        ],
                      };
                      w.setMessages([m, ...w.messages]);
                      setDrafts((d) => ({ ...d, [page]: {} }));
                      setForm({});
                      setTargetIds([]);
                      setDirty(false);
                      setDrawer(null);
                      navigate("Email / SMS Log");
                      notify(channel + " queue simulated · no message sent");
                    }}
                  >
                    Confirm simulated send
                  </Button>
                  {error && <p className="op-form-error">{error}</p>}
                </>
              ) : drawer.type === "message" ? (
                (() => {
                  const m = w.messages.find((m) => m.id === drawer.id);
                  return m ? (
                    <>
                      <Badge>{m.status}</Badge>
                      <h3>
                        {m.channel} · {m.id}
                      </h3>
                      <h2 className="wf-preview-title">{m.subject || "SMS message"}</h2>
                      <p className="wf-message-body">{m.body}</p>
                      <dl className="op-dl">
                        <div>
                          <dt>Recipients</dt>
                          <dd>{m.recipients.join(", ")}</dd>
                        </div>
                        <div>
                          <dt>CC / BCC</dt>
                          <dd>{[...m.cc, ...m.bcc].join(", ") || "None"}</dd>
                        </div>
                        <div>
                          <dt>Provider response / reference</dt>
                          <dd>Not available · no provider connected</dd>
                        </div>
                        <div>
                          <dt>Schedule</dt>
                          <dd>{m.schedule || "No schedule"}</dd>
                        </div>
                        <div>
                          <dt>Attachments</dt>
                          <dd>{m.attachments.join(", ") || "None"} · local only</dd>
                        </div>
                      </dl>
                      <h3>Delivery / activity history</h3>
                      {profileHistory(m.history)}
                      <Button
                        disabled={!communicationsAccess || m.status !== "Queued (simulation)"}
                        onClick={() => {
                          if (window.confirm("Cancel this simulated queue entry?"))
                            w.setMessages(
                              w.messages.map((x) =>
                                x.id === m.id
                                  ? {
                                      ...x,
                                      status: "Cancelled",
                                      history: [
                                        ...x.history,
                                        audit(
                                          x.status,
                                          "Cancelled",
                                          "Preview queue entry cancelled",
                                        ),
                                      ],
                                    }
                                  : x,
                              ),
                            );
                        }}
                      >
                        Cancel simulated queue entry
                      </Button>
                    </>
                  ) : null;
                })()
              ) : null}
            </div>
            <footer>
              <Icon name="shield" size={13} />
              Preview only · no live payroll, messaging or authentication
            </footer>
          </aside>
        </div>
      )}
    </div>
  );
}

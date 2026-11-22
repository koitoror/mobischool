import { useEffect, useState } from "react";
import { useSettings } from "./SettingsContext";
import { Button, Badge, Card, Field } from "./components/OperationsUI";
import { AssessmentDialog as Dialog, AssessmentTable as Table } from "./components/AssessmentUI";
import {
  settingsPages,
  systemSettingPages,
  schoolConfigurationPages,
  identityError,
  sessionError,
  referenceError,
  userError,
  customFieldError,
  moduleDisableError,
  roles,
  uid,
  validDate,
  type SessionConfig,
  type ConfigUser,
  type CustomField,
} from "./settingsModel";
import { gradeError, type Band } from "./examinationModel";
import "./settings.css";
export default function Settings({
  page,
  active,
  navigate,
  notify,
  onDirty,
  modules,
}: {
  page: string;
  active: boolean;
  navigate: (p: string) => void;
  notify: (s: string) => void;
  onDirty: (b: boolean) => void;
  modules: string[];
}) {
  const x = useSettings(),
    [dialog, setDialog] = useState(""),
    [f, setF] = useState<Record<string, string>>({}),
    [reason, setReason] = useState(""),
    [error, setError] = useState(""),
    [dirty, setDirty] = useState(false),
    [pending, setPending] = useState<{ summary: string; execute: () => void }>(),
    [q, setQ] = useState(""),
    [filter, setFilter] = useState("All"),
    [index, setIndex] = useState(1),
    [sort, setSort] = useState("A–Z");
  useEffect(() => {
    setDialog("");
    setPending(undefined);
    setDirty(false);
    setQ("");
    setFilter("All");
    setIndex(1);
  }, [page]);
  useEffect(() => {
    if (active) onDirty(dirty);
    return () => onDirty(false);
  }, [active, dirty, onDirty]);
  const set = (key: string, value: string) => {
    setF((v) => ({ ...v, [key]: value }));
    setDirty(true);
    setPending(undefined);
    setError("");
  };
  const open = (type: string, values: Record<string, string> = {}) => {
    setDialog(type);
    setF(values);
    setReason("");
    setError("");
    setPending(undefined);
    setDirty(false);
  };
  const close = () => {
    if (dirty && !window.confirm("Discard unsaved configuration changes?")) return;
    setDialog("");
    setDirty(false);
  };
  const go = (p: string) => {
    if (dirty && !window.confirm("Discard unsaved configuration changes?")) return;
    setDirty(false);
    navigate(p);
  };
  const done = (message: string) => {
    setDialog("");
    setDirty(false);
    x.setDrafts((old) => {
      const next = { ...old };
      delete next[page];
      return next;
    });
    x.setDraftKinds((old) => {
      const next = { ...old };
      delete next[page];
      return next;
    });
    notify(message);
  };
  const field = (label: string, key: string, options?: string[], type = "text", hint?: string) => (
    <Field
      label={label}
      value={f[key] || ""}
      options={options}
      type={type}
      hint={hint}
      onChange={(v) => set(key, v)}
    />
  );
  const identity = () =>
    open("Institution identity", {
      ...x.metadata,
      name: x.school,
      logo: x.logo,
      motto: x.motto,
      currency: x.finance.currency,
      ...x.drafts["School Identity"],
    });
  const editSession = (s?: SessionConfig) =>
    open(
      "Session editor",
      s
        ? {
            ...s,
            terms: s.terms.map((t) => `${t.name}|${t.start}|${t.end}`).join("\n"),
            history: "",
          }
        : { name: "", start: "", end: "", terms: "", holidays: "", status: "Draft" },
    );
  const editReference = (kind: string, name = "") =>
    open("Structure editor", { kind, name, oldName: name, status: "Active" });
  const primary = () => {
    if (page === "School Identity") identity();
    else if (page === "Academic Sessions") editSession();
    else if (page === "Academic Structure") editReference("Class");
    else if (page === "Curriculum & Subjects") editReference("Subject");
    else if (page === "Payment Methods")
      open("Payment method", {
        active: "true",
        reference: "true",
        order: String(x.finance.paymentMethods.length),
        effective: "2025-02-24",
      });
    else if (page === "Users") open("User editor", { status: "Active", role: "Teacher" });
    else if (page === "Custom Fields")
      open("Custom field", {
        type: "Text",
        entity: "Student",
        required: "Optional",
        visibility: "Administrator",
        status: "Active",
      });
    else if (page === "Grading & Assessment")
      open("Grading editor", {
        name: x.examination.schemeName,
        session: x.session,
        passing: x.examination.passingGrades?.join(",") || "",
        bands: x.examination.bands
          .map((b) => `${b.label}|${b.min}|${b.max}|${b.description}`)
          .join("\n"),
        weight: "100",
        rounding: "2 decimals · source policy",
      });
    else if (page === "Student Profile Update")
      open("Profile request", { student: x.students[0]?.id || "", field: "email", value: "" });
    else if (page === "Module Configuration")
      open("Module availability", { module: modules[0], status: "Enabled" });
    else if (page === "Backup Restore") open("Create backup preview");
    else open("Configuration editor", { ...(x.records[page] || {}), ...x.drafts[page] });
  };
  const check = (error: string) => {
    if (error) throw Error(error);
  };
  const prepare = () => {
    check(!reason.trim() ? "Explain why this configuration is changing." : "");
    let action = () => {},
      summary = "";
    if (dialog === "Institution identity") {
      check(identityError(f));
      summary =
        "Publish school identity to the shell, Pulse and dependent previews. Currency display changes do not convert historical amounts. Renaming a school changes the CMS name-scoped preview context; old CMS state remains under its previous name.";
      action = () => {
        const { name, logo, motto, currency, ...metadata } = f;
        x.setMetadata(metadata);
        x.setIdentity({ name, logo, motto });
        x.finance.setCurrency(currency);
      };
    } else if (dialog === "Session editor") {
      const v: SessionConfig = {
        id: f.id || uid("SESSION"),
        name: f.name || "",
        start: f.start || "",
        end: f.end || "",
        status: f.status || "Draft",
        holidays: f.holidays || "",
        terms: (f.terms || "")
          .split("\n")
          .filter(Boolean)
          .map((line) => {
            const [name, start, end] = line.split("|").map((v) => v.trim());
            return { name, start, end };
          }),
        history: [],
      };
      const old = x.sessions.find((s) => s.id === v.id);
      check(
        old &&
          old.status !== "Draft" &&
          (old.name !== v.name || old.start !== v.start || old.end !== v.end)
          ? "Published/historical session identity and dates are locked. Duplicate as a draft."
          : "",
      );
      check(sessionError(v, x.sessions));
      summary = `${v.status} session ${v.name}. Activation closes the previous active session status and selects the new default. Existing finance, exams and attendance records are not moved or regenerated. Closing requires this confirmation.`;
      action = () => {
        const records = x.sessions.map((s) =>
          s.id === v.id
            ? { ...v, history: [...s.history, reason] }
            : v.status === "Active" && s.status === "Active"
              ? { ...s, status: "Closed" }
              : s,
        );
        if (!old) records.push(v);
        x.setSessionRecords(records);
        x.setSessions([...new Set(records.map((s) => s.name))]);
        if (v.status === "Active") x.setSession(v.name);
      };
    } else if (dialog === "Structure editor") {
      const key = f.kind === "Section" ? "sections" : f.kind === "Subject" ? "subjects" : "classes",
        values = x.academic[key];
      check(referenceError(f.name || "", values, f.oldName));
      check(
        f.oldName && !values.includes(f.oldName)
          ? "The selected reference kind does not own this existing record."
          : "",
      );
      const referenced =
        f.kind === "Subject"
          ? x.academic.slots.some((v) => v.subject === f.oldName) ||
            x.examination.exams.some((v) => v.subject === f.oldName)
          : x.students.some(
              (s) =>
                (f.kind === "Section" ? s.section === f.oldName : s.grade === f.oldName) ||
                Object.values(s.enrollments || {}).some((e) =>
                  f.kind === "Section" ? e.section === f.oldName : e.grade === f.oldName,
                ),
            ) ||
            x.academic.slots.some((v) =>
              f.kind === "Section" ? v.section === f.oldName : v.grade === f.oldName,
            );
      check(
        referenced && f.oldName && (f.name !== f.oldName || f.status !== "Active")
          ? "Dependent records use this value. Destructive rename/deactivation is blocked."
          : "",
      );
      summary = `${f.kind}: ${f.name}. ${referenced ? "Dependent records exist; no identity change allowed." : "No dependent record found in the inspected student/timetable/exam scopes."}`;
      action = () => {
        const next =
          f.status === "Inactive"
            ? values.filter((v) => v !== f.oldName)
            : f.oldName
              ? values.map((v) => (v === f.oldName ? f.name.trim() : v))
              : [...values, f.name.trim()];
        if (key === "classes") x.academic.setClasses(next);
        else if (key === "sections") x.academic.setSections(next);
        else x.academic.setSubjects(next);
      };
    } else if (dialog === "Payment method") {
      const methods = x.finance.paymentMethods,
        old = methods.find((m) => m.code === f.oldCode),
        name = f.name?.trim() || "";
      check(
        referenceError(
          name,
          methods.map((m) => m.name),
          old?.name,
        ),
      );
      check(!/^[A-Z][A-Z0-9_]*$/.test(f.code || "") ? "Use a unique uppercase method code." : "");
      check(
        methods.some((m) => m.code === f.code && m.code !== f.oldCode)
          ? "Duplicate method code."
          : "",
      );
      const used =
        !!old &&
        (x.finance.ledger.payments.some((p) => p.method === old.name) ||
          x.finance.ledger.entries.some((p) => p.method === old.name));
      check(
        used && (f.active !== "true" || name !== old?.name || f.code !== old?.code)
          ? "Historical transactions reference this method. Deactivation/rename is blocked."
          : "",
      );
      check(
        f.reference !== "true"
          ? "The current ledger requires references for all methods. This requirement cannot be disabled."
          : "",
      );
      summary =
        "Update payment selection, not a payment provider. Historical transaction amounts and references remain unchanged.";
      action = () =>
        x.finance.setPaymentMethods((v) => [
          ...v.filter((m) => m.code !== f.oldCode),
          {
            name,
            code: f.code,
            description: f.description || "",
            active: f.active === "true",
            reference: true,
            effective: f.effective || "",
            order: Number(f.order || 0),
          },
        ]);
    } else if (dialog === "User editor") {
      const v: ConfigUser = {
        id: f.id || uid("USER"),
        person: f.person || "",
        name: f.name || "",
        role: f.role,
        status: f.status,
        history: [],
      };
      check(userError(v, x.users));
      summary = `${v.role} / ${v.status}. Permissions are role recommendations only; no authentication or account provisioning. Privileged changes require this confirmation.`;
      action = () =>
        x.setUsers((old) => [
          ...old.filter((u) => u.id !== v.id),
          { ...v, history: [...(old.find((u) => u.id === v.id)?.history || []), reason] },
        ]);
    } else if (dialog === "Custom field") {
      const v: CustomField = {
        id: f.id || uid("FIELD"),
        name: f.name || "",
        key: f.key || "",
        entity: f.entity || "Student",
        type: f.type || "Text",
        required: f.required || "Optional",
        visibility: f.visibility || "Administrator",
        status: f.status || "Active",
        options: f.options || "",
        defaultValue: f.defaultValue || "",
        description: f.description || "",
      };
      check(customFieldError(v, x.customFields));
      summary =
        "Save a reusable field definition and preview. Existing entity forms are not silently migrated. Values are never deleted by archiving the definition.";
      action = () => x.setCustomFields((old) => [...old.filter((v) => v.id !== f.id), v]);
    } else if (dialog === "Grading editor") {
      const bands: Band[] = (f.bands || "")
        .split("\n")
        .filter(Boolean)
        .map((line) => {
          const [label, min, max, description] = line.split("|");
          return {
            label: label?.trim(),
            min: Number(min),
            max: Number(max),
            description: description || "",
          };
        });
      check(gradeError(bands));
      const passed = (f.passing || "")
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean);
      check(
        !f.name?.trim() || !passed.length || passed.some((p) => !bands.some((b) => b.label === p))
          ? "Name the scheme and explicitly choose valid passing grade labels."
          : "",
      );
      check(
        f.session !== x.session
          ? "Select the active session for this prototype's live grading scheme."
          : "",
      );
      check(
        Number(f.weight) !== 100
          ? "The implemented unweighted assessment requires 100% per component. Other weighting is not supported."
          : "",
      );
      summary = `Publish ${f.name} for ${f.session}. All required components must receive a passing grade (${passed.join(", ")}). Existing published scores retain captured bands, rule and version; no grades are recalculated.`;
      action = () => {
        x.examination.setBands(bands);
        x.examination.setScaleVersion((v) => v + 1);
        x.examination.setPassingGrades(passed);
        x.examination.setSchemeName(f.name);
      };
    } else if (dialog === "Profile request") {
      check(
        !x.students.some((s) => s.id === f.student) ||
          !["email", "phone"].includes(f.field) ||
          !f.value?.trim()
          ? "Choose an existing student and email/phone update."
          : "",
      );
      check(
        f.field === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.value)
          ? "Email is invalid."
          : "",
      );
      summary =
        "Record a simulated guardian/student request. No shared record changes until explicit approval.";
      action = () =>
        x.setRequests((old) => [
          ...old,
          {
            id: uid("UPDATE"),
            student: f.student,
            field: f.field,
            value: f.value,
            status: "Submitted",
            reason,
          },
        ]);
    } else if (dialog === "Review profile update") {
      const request = x.requests.find((v) => v.id === f.id)!;
      check(!request || request.status !== "Submitted" ? "This request is not pending." : "");
      summary = `${f.decision} update ${request.id}. Approval changes only ${request.field} on the shared student record; rejection records a reason.`;
      action = () => {
        if (f.decision === "Approved")
          x.setStudents((old) =>
            old.map((s) =>
              s.id === request.student
                ? {
                    ...s,
                    [request.field]: request.value,
                    history: [
                      ...(s.history || []),
                      `Configuration profile update approved: ${request.id}`,
                    ],
                  }
                : s,
            ),
          );
        x.setRequests((old) =>
          old.map((v) => (v.id === request.id ? { ...v, status: f.decision, reason } : v)),
        );
      };
    } else if (dialog === "Create backup preview") {
      summary =
        "Create a settings-metadata snapshot in browser memory only. It excludes student records, finance transactions, uploads and operational data. No external verification is possible.";
      action = () =>
        x.setBackups((old) => [
          ...old,
          {
            id: uid("BACKUP"),
            at: new Date().toISOString(),
            actor: x.role,
            settings: structuredClone(x.records),
          },
        ]);
    } else if (dialog === "Restore preview") {
      check(f.confirm !== "RESTORE SIMULATION" ? "Type RESTORE SIMULATION to confirm." : "");
      const b = x.backups.find((v) => v.id === f.id);
      check(!b ? "Backup not found." : "");
      summary =
        "Replace only the generic configuration metadata settings (print, admission, communication and policy proposals). This does not restore operational records, identity, grading, accounts or academic sessions. Reload discards both snapshot and restore.";
      action = () => x.setRecords(structuredClone(b!.settings));
    } else if (dialog === "Module availability") {
      check(f.status === "Disabled" ? moduleDisableError(f.module, x.disabledModules) : "");
      summary = `${f.module}: ${f.status}. This records an availability recommendation; it does not enforce entitlements or remove working routes.`;
      action = () =>
        x.setDisabledModules((old) =>
          f.status === "Disabled"
            ? [...new Set([...old, f.module])]
            : old.filter((v) => v !== f.module),
        );
    } else {
      if (page === "Online Admission") {
        check(
          !f.session ||
            !f.classes?.trim() ||
            !validDate(f.open || "") ||
            !validDate(f.close || "") ||
            f.close < f.open
            ? "Configure session, class scope and a valid opening period."
            : "",
        );
        check(
          f.classes.split(",").some((c) => !x.academic.classes.includes(c.trim()))
            ? "An admission class is not in shared academic structure."
            : "",
        );
      }
      summary =
        page === "Finance Configuration"
          ? "Update display/policy proposal metadata only. No conversion, new receipt numbering engine, tax calculation or refund service is connected."
          : "Publish configuration metadata. Print, communication and attendance fields are previews/policy proposals unless explicitly described as connected.";
      action = () => x.setRecords((old) => ({ ...old, [page]: { ...f } }));
    }
    return {
      summary,
      execute: () => {
        x.stamp(
          page,
          f.id || f.name || page,
          x.records[page] || "Existing shared configuration",
          f,
          reason,
        );
        action();
        done("Configuration confirmed in browser memory");
      },
    };
  };
  const controls = (
    <>
      <Field
        label="Change reason"
        value={reason}
        onChange={(v) => {
          setReason(v);
          setPending(undefined);
        }}
      />
      {pending ? (
        <>
          <div className="op-notice">{pending.summary}</div>
          <Button
            primary
            onClick={() => {
              try {
                pending.execute();
              } catch (e) {
                setError((e as Error).message);
              }
            }}
          >
            Confirm configuration change
          </Button>
        </>
      ) : (
        <Button
          primary
          onClick={() => {
            try {
              setPending(prepare());
              setError("");
            } catch (e) {
              setError((e as Error).message);
            }
          }}
        >
          Validate & preview impact
        </Button>
      )}
      <Button
        onClick={() => {
          x.setDrafts((old) => ({ ...old, [page]: { ...f } }));
          x.setDraftKinds((old) => ({ ...old, [page]: dialog }));
          setDirty(false);
          notify("Draft retained in this browser session only");
        }}
      >
        Save draft
      </Button>
      {error && (
        <div role="alert" className="op-form-error">
          {error}
        </div>
      )}
    </>
  );
  const visible = <T extends { name?: string; status?: string }>(records: T[]) =>
    [...records]
      .filter(
        (v) =>
          (v.name || JSON.stringify(v)).toLowerCase().includes(q.toLowerCase()) &&
          (filter === "All" || v.status === filter),
      )
      .sort((a, b) => (a.name || "").localeCompare(b.name || "") * (sort === "A–Z" ? 1 : -1));
  const toolbar = (
    <div className="settings-tools">
      <Field
        label="Search configuration"
        value={q}
        onChange={(v) => {
          setQ(v);
          setIndex(1);
        }}
      />
      <Field
        label="Status filter"
        value={filter}
        options={[
          "All",
          "Active",
          "Inactive",
          "Draft",
          "Closed",
          "Submitted",
          "Approved",
          "Rejected",
        ]}
        onChange={(v) => {
          setFilter(v);
          setIndex(1);
        }}
      />
      <Field label="Sort configuration" value={sort} options={["A–Z", "Z–A"]} onChange={setSort} />
      <Button
        onClick={() => {
          setQ("");
          setFilter("All");
          setIndex(1);
        }}
      >
        Clear filters
      </Button>
    </div>
  );
  const identityReady =
    !!x.metadata.address && !!x.metadata.email && x.metadata.country !== "Not configured";
  const health: [string, boolean, string][] = [
    ["School Identity", identityReady, "Address, country and official email"],
    ["Academic Sessions", x.sessions.some((s) => s.status === "Active"), "Active default"],
    [
      "Academic Structure",
      !!x.academic.classes.length && !!x.academic.sections.length,
      "Classes and sections",
    ],
    ["Grading & Assessment", !!x.examination.passingGrades?.length, "Explicit pass/fail rule"],
    ["Payment Methods", x.finance.paymentMethods.some((m) => m.active), "Enabled methods"],
    [
      "Users",
      x.users.every((u) => !!u.role) &&
        x.users.some((u) => u.role === "School Administrator" && u.status === "Active"),
      "Administrator protection",
    ],
    [
      "Online Admission",
      x.records["Online Admission"]?.status === "Published",
      "Admission publication",
    ],
    [
      "Print Header Footer",
      !!x.records["Print Header Footer"]?.header && !!x.records["Print Header Footer"]?.footer,
      "Header and footer",
    ],
  ];
  return (
    <div className="op settings" hidden={!active}>
      <div className="settings-heading">
        <div>
          <div className="op-eyebrow">CONFIGURATION / SCHOOL CONTROL CENTER</div>
          <div className="settings-title" role="heading" aria-level={1}>
            {page}
          </div>
          <p>One institution. Deliberate defaults. Every change explained.</p>
        </div>
        <div className="settings-tools">
          <Button onClick={() => open("Preview access")}>Preview access</Button>
          {x.drafts[page] && x.draftKinds[page] && (
            <Button onClick={() => open(x.draftKinds[page], { ...x.drafts[page] })}>
              Resume saved draft
            </Button>
          )}
          {!["System Settings Overview", "System Fields", "Configuration Audit History"].includes(
            page,
          ) && (
            <Button primary onClick={primary}>
              {page === "Student Profile Update"
                ? "Create update request"
                : page === "Backup Restore"
                  ? "Create backup preview"
                  : "Configure / add"}
            </Button>
          )}
        </div>
      </div>
      <div className="op-context">
        <Field
          label="System settings workspace"
          value={page}
          options={settingsPages}
          onChange={go}
        />
        <Badge>Illustrative Data</Badge>
        <span>
          {x.school} · {x.session}
        </span>
      </div>
      <div className="settings-tabs">
        {systemSettingPages.map((p) => (
          <Button key={p} disabled={p === page} onClick={() => go(p)}>
            {p}
          </Button>
        ))}
      </div>
      <div className="op-notice">
        Frontend administration simulation · resets on reload. No secure authorization, provider
        processing, production backup, file storage, email or public admission service.
      </div>
      {page === "System Settings Overview" ? (
        <>
          <div className="settings-hero">
            <small>INSTITUTIONAL FOUNDATIONS</small>
            <div className="settings-title">
              Configure with confidence.
              <br />
              Operate with clarity.
            </div>
            <p>
              {health.filter(([, ready]) => ready).length} of {health.length} readiness checks
              complete. These are source-derived checks, not certification.
            </p>
          </div>
          <div className="settings-grid">
            {health.map(([label, ready, note]) => (
              <Card
                key={label}
                title={label}
                sub={note}
                action={<Badge>{ready ? "Configured" : "Needs review"}</Badge>}
              >
                <div className="settings-pad">
                  <p>
                    {ready
                      ? "No missing fields in this readiness check."
                      : "Review the configuration requirements before use."}
                  </p>
                  <p>
                    Last change:{" "}
                    {x.audit.find((a) => a.category === label)?.at || "No local changes recorded"}
                  </p>
                  <Button onClick={() => go(label)}>Open {label}</Button>
                </div>
              </Card>
            ))}
          </div>
          <Card title="School Configuration" sub="Shared operational foundations">
            <div className="settings-tools">
              {schoolConfigurationPages.map((p) => (
                <Button key={p} onClick={() => go(p)}>
                  {p}
                </Button>
              ))}
            </div>
          </Card>
          <Card title="Recent configuration activity">
            <Table
              headers={["Actor", "Action / record", "Timestamp", "Reason"]}
              rows={x.audit
                .slice(0, 8)
                .map((a) => [a.actor, `${a.category} / ${a.record}`, a.at, a.reason])}
            />
          </Card>
        </>
      ) : page === "School Identity" ? (
        <Card
          title="Institutional profile"
          sub="Shared name, logo and motto feed the existing shell and previews."
        >
          <div className="settings-identity">
            {x.logo && <img src={x.logo} alt={`${x.school} logo`} />}
            <div>
              <strong>{x.school}</strong>
              <p>{x.motto}</p>
              <p>
                {x.metadata.country} · {x.metadata.timezone} · {x.finance.currency}
              </p>
              <Button onClick={identity}>Edit institutional identity</Button>
              <Button onClick={() => go("Branding Editor")}>Existing logo upload preview</Button>
            </div>
          </div>
        </Card>
      ) : page === "Academic Sessions" ? (
        <Card title="Academic session registry" sub="Historical associations are never rewritten.">
          {toolbar}
          <Table
            headers={["Session", "Dates", "Status", "Terms", "Actions"]}
            rows={visible(x.sessions).map((s) => [
              s.name,
              `${s.start || "Not supplied"} – ${s.end || "Not supplied"}`,
              s.status,
              s.terms.length,
              <div className="settings-tools">
                <Button onClick={() => editSession(s)}>Inspect / manage session</Button>
                <Button
                  onClick={() =>
                    editSession({
                      ...s,
                      id: uid("SESSION"),
                      name: s.name + " copy",
                      status: "Draft",
                      history: [],
                    })
                  }
                >
                  Duplicate draft
                </Button>
              </div>,
            ])}
          />
        </Card>
      ) : page === "Academic Structure" || page === "Curriculum & Subjects" ? (
        <Card
          title={
            page === "Academic Structure" ? "Shared classes and sections" : "Shared subject catalog"
          }
          sub="Changes update the existing Academic provider. Dependent record renames are guarded."
        >
          <div className="settings-tools">
            {(page === "Academic Structure" ? ["Class", "Section"] : ["Subject"]).map((kind) => (
              <Button key={kind} onClick={() => editReference(kind)}>
                Add {kind.toLowerCase()}
              </Button>
            ))}
          </div>
          <Table
            headers={["Name", "Type", "Reference context", "Actions"]}
            rows={(page === "Academic Structure"
              ? [
                  ...x.academic.classes.map((name) => ({ name, kind: "Class" })),
                  ...x.academic.sections.map((name) => ({ name, kind: "Section" })),
                ]
              : x.academic.subjects.map((name) => ({ name, kind: "Subject" }))
            ).map(({ name, kind }, i) => [
              name,
              kind,
              kind === "Class"
                ? `${x.students.filter((s) => s.grade === name).length} students`
                : "Shared academic reference",
              <div className="settings-tools">
                <Button onClick={() => editReference(kind, name)}>Edit reference</Button>
                <Button
                  disabled={i === 0}
                  onClick={() => {
                    try {
                      x.stamp(page, name, "Previous order", "Moved earlier", "Accessible reorder");
                      const values =
                          kind === "Class"
                            ? [...x.academic.classes]
                            : kind === "Section"
                              ? [...x.academic.sections]
                              : [...x.academic.subjects],
                        j = values.indexOf(name);
                      if (j > 0) [values[j], values[j - 1]] = [values[j - 1], values[j]];
                      if (kind === "Class") x.academic.setClasses(values);
                      else if (kind === "Section") x.academic.setSections(values);
                      else x.academic.setSubjects(values);
                    } catch (e) {
                      notify((e as Error).message);
                    }
                  }}
                >
                  Move earlier
                </Button>
              </div>,
            ])}
          />
        </Card>
      ) : page === "Payment Methods" ? (
        <Card
          title="Payment-method configuration"
          sub="Connected to Finance selection and ledger validation, not payment processing."
        >
          <Table
            headers={["Name / code", "Status", "Reference", "Historical usage", "Actions"]}
            rows={[...x.finance.paymentMethods]
              .sort((a, b) => a.order - b.order)
              .map((m) => [
                `${m.name} / ${m.code}`,
                m.active ? "Active" : "Inactive",
                m.reference ? "Required" : "Optional",
                x.finance.ledger.payments.filter((p) => p.method === m.name).length +
                  x.finance.ledger.entries.filter((p) => p.method === m.name).length,
                <Button
                  onClick={() =>
                    open("Payment method", {
                      ...m,
                      oldCode: m.code,
                      active: String(m.active),
                      reference: String(m.reference),
                      order: String(m.order),
                    })
                  }
                >
                  Manage method
                </Button>,
              ])}
          />
        </Card>
      ) : page === "Users" ? (
        <Card
          title="User administration preview"
          sub="No authentication, passwords or external account provisioning."
        >
          {toolbar}
          <Table
            headers={["User", "Shared staff reference", "Role", "Status", "Actions"]}
            rows={visible(x.users)
              .slice((index - 1) * 8, index * 8)
              .map((u) => [
                u.name,
                u.person || "Preview account",
                u.role,
                u.status,
                <Button onClick={() => open("User editor", { ...u, history: "" })}>
                  Manage account preview
                </Button>,
              ])}
          />
          <div className="settings-tools">
            <Button disabled={index === 1} onClick={() => setIndex(index - 1)}>
              Previous users
            </Button>
            <span>Page {index}</span>
            <Button
              disabled={index * 8 >= visible(x.users).length}
              onClick={() => setIndex(index + 1)}
            >
              Next users
            </Button>
          </div>
        </Card>
      ) : page === "Custom Fields" ? (
        <Card
          title="Custom field definitions"
          sub="Definitions and previews only; no silent schema migration."
        >
          <Table
            headers={["Name / key", "Entity", "Type", "Visibility", "Status", "Actions"]}
            rows={x.customFields.map((v) => [
              `${v.name} / ${v.key}`,
              v.entity,
              v.type,
              v.visibility,
              v.status,
              <Button onClick={() => open("Custom field", { ...v })}>Edit / preview field</Button>,
            ])}
          />
        </Card>
      ) : page === "System Fields" ? (
        <Card title="Protected system field registry" sub="Keys and types are not editable.">
          <Table
            headers={["Field", "Key", "Entity", "Type", "Ownership", "Reason"]}
            rows={[
              [
                "Student identifier",
                "id",
                "Student",
                "String",
                "System-managed",
                "Used across fees, attendance and examinations",
              ],
              [
                "Admission reference",
                "admission",
                "Student",
                "String",
                "Controlled operational edit",
                "Retain linked records",
              ],
              [
                "Ledger amount",
                "amount",
                "Finance",
                "Minor-unit integer",
                "Transaction command only",
                "Prevents invalid monetary state",
              ],
              [
                "Published grade",
                "grade",
                "Examinations",
                "Snapshot string",
                "Read-only after publication",
                "Historical grade context",
              ],
            ]}
          />
        </Card>
      ) : page === "Backup Restore" ? (
        <Card
          title="Backup / restore metadata simulations"
          sub="These are not verified or durable backups."
        >
          <Table
            headers={["Reference", "Created", "Actor", "Scope / verification", "Actions"]}
            rows={x.backups.map((b) => [
              b.id,
              b.at,
              b.actor,
              "Generic settings metadata only · external verification unavailable",
              <Button onClick={() => open("Restore preview", { id: b.id, confirm: "" })}>
                Inspect restore preview
              </Button>,
            ])}
          />
        </Card>
      ) : page === "Student Profile Update" ? (
        <Card
          title="Profile update requests"
          sub="Approval edits the existing shared student record."
        >
          {toolbar}
          <Table
            headers={["Student", "Field", "Proposed value", "Status", "Actions"]}
            rows={x.requests
              .filter((v) => filter === "All" || v.status === filter)
              .map((v) => [
                x.students.find((s) => s.id === v.student)?.name || "Missing reference",
                v.field,
                v.value,
                v.status,
                <Button
                  disabled={v.status !== "Submitted"}
                  onClick={() => open("Review profile update", { id: v.id, decision: "Approved" })}
                >
                  Review update
                </Button>,
              ])}
          />
        </Card>
      ) : page === "Configuration Audit History" ? (
        <Card
          title="Configuration activity"
          sub="Read-only frontend history, not an immutable server audit."
        >
          {toolbar}
          <Table
            headers={["Actor", "Category / record", "Timestamp", "Before / after", "Reason"]}
            rows={x.audit
              .filter((a) =>
                `${a.actor} ${a.category} ${a.record} ${a.reason}`
                  .toLowerCase()
                  .includes(q.toLowerCase()),
              )
              .map((a) => [
                a.actor,
                `${a.category} / ${a.record}`,
                a.at,
                <Button onClick={() => open("Audit detail", { ...a })}>Inspect change</Button>,
                a.reason,
              ])}
          />
        </Card>
      ) : page === "Grading & Assessment" ? (
        <Card
          title="Shared grading context"
          sub="Explicit classification is required; new configuration never rewrites published results."
        >
          <div className="settings-pad">
            <strong>{x.examination.schemeName}</strong>
            <p>
              Scale v{x.examination.scaleVersion} · passing grades{" "}
              {x.examination.passingGrades?.join(", ") || "Not configured"}
            </p>
            <Table
              headers={["Grade", "Minimum %", "Maximum %", "Description"]}
              rows={x.examination.bands.map((b) => [b.label, b.min, b.max, b.description])}
            />
          </div>
        </Card>
      ) : page === "Module Configuration" ? (
        <Card
          title="Module availability recommendations"
          sub="Dependencies are checked. This is not subscription or backend access enforcement."
        >
          <Table
            headers={["Module", "Recommendation", "Dependencies", "Actions"]}
            rows={modules.map((name) => [
              name,
              x.disabledModules.includes(name) ? "Disabled recommendation" : "Enabled",
              moduleDisableError(name, x.disabledModules) || "No enabled dependents found",
              <Button
                onClick={() =>
                  open("Module availability", {
                    module: name,
                    status: x.disabledModules.includes(name) ? "Enabled" : "Disabled",
                  })
                }
              >
                Review availability
              </Button>,
            ])}
          />
        </Card>
      ) : (
        <Card title={page} sub="Shared configuration metadata and preview boundaries are explicit.">
          <div className="settings-pad">
            {Object.entries(x.records[page] || {}).map(([k, v]) => (
              <p key={k}>
                <b>{k}: </b>
                {v || "Not configured"}
              </p>
            ))}
            {page === "Finance Configuration" && (
              <>
                <Field
                  label="Display currency"
                  value={x.finance.currency}
                  options={["USD", "KES", "EUR", "GBP", "UGX", "TZS", "INR", "JPY", "ZAR"]}
                  onChange={(currency) =>
                    open("Currency preview", { currency, precision: String(x.finance.precision) })
                  }
                />
                <p>Amounts remain minor-unit values; this does not convert currencies.</p>
              </>
            )}
            {page === "Print Header Footer" && (
              <div className="settings-print">
                {x.logo && <img src={x.logo} alt="School print logo" />}
                <strong>{x.records[page]?.header || x.school}</strong>
                <p>{x.records[page]?.address}</p>
                <hr />
                <p>Illustrative document body · no PDF or printer integration.</p>
                <hr />
                <p>{x.records[page]?.footer}</p>
              </div>
            )}
            {page === "Online Admission" && (
              <>
                <Button
                  onClick={() =>
                    open("Public admission preview", {
                      name: "",
                      guardian: "",
                      grade: x.academic.classes[0] || "",
                    })
                  }
                >
                  Preview public admission form
                </Button>
                <Table
                  headers={["Application", "Applicant", "Class", "State"]}
                  rows={x.applications.map((a) => [a.id, a.name, a.grade, a.status])}
                />
                <Button onClick={() => go("Student Admission")}>
                  Open existing Student Admission workspace
                </Button>
              </>
            )}
          </div>
        </Card>
      )}
      <div className="settings-tools">
        <Button onClick={() => go("System Settings Overview")}>System Settings Overview</Button>
        {schoolConfigurationPages.map((p) => (
          <Button key={p} disabled={p === page} onClick={() => go(p)}>
            {p}
          </Button>
        ))}
      </div>
      {dialog && active && (
        <Dialog title={dialog} onClose={close}>
          {dialog === "Preview access" ? (
            <>
              <Field
                label="Configuration preview role"
                value={x.role}
                options={["School Administrator", "Auditor"]}
                onChange={x.setRole}
              />
              <p>
                UI recommendation only, not authentication. Sensitive publishing requires
                Administrator preview.
              </p>
            </>
          ) : dialog === "Audit detail" ? (
            <>
              {Object.entries(f).map(([k, v]) => (
                <p key={k}>
                  <b>{k}: </b>
                  {v}
                </p>
              ))}
            </>
          ) : dialog === "Public admission preview" ? (
            <>
              <p>{x.records["Online Admission"].instructions}</p>
              {field("Applicant name", "name")}
              {field("Guardian name", "guardian")}
              {field(
                "Requested class",
                "grade",
                x.records["Online Admission"].classes
                  .split(",")
                  .map((c) => c.trim())
                  .filter(Boolean),
              )}
              <p>Prototype admission clock: 2025-02-24. No real public service is running.</p>
              <Button
                primary
                onClick={() => {
                  try {
                    check(
                      x.records["Online Admission"].status !== "Published"
                        ? "Publish the admission configuration before simulating a submission."
                        : "",
                    );
                    check(
                      !f.name?.trim() || !f.guardian?.trim()
                        ? "Applicant and guardian names are required."
                        : "",
                    );
                    check(
                      !x.records["Online Admission"].classes
                        .split(",")
                        .map((c) => c.trim())
                        .includes(f.grade)
                        ? "Choose a class in the published admission scope."
                        : "",
                    );
                    check(
                      "2025-02-24" < x.records["Online Admission"].open ||
                        "2025-02-24" > x.records["Online Admission"].close
                        ? "The simulated application window is closed."
                        : "",
                    );
                    check(
                      x.applications.some(
                        (a) =>
                          a.name.trim().toLowerCase() === f.name.trim().toLowerCase() &&
                          a.guardian.trim().toLowerCase() === f.guardian.trim().toLowerCase(),
                      )
                        ? "Duplicate application prevented."
                        : "",
                    );
                    x.stamp(
                      "Online Admission",
                      "Application preview",
                      "No application",
                      { name: f.name, grade: f.grade },
                      "Explicit simulated submission",
                    );
                    x.setApplications((old) => [
                      ...old,
                      {
                        id: uid(x.records["Online Admission"].reference || "APP"),
                        name: f.name.trim(),
                        guardian: f.guardian.trim(),
                        grade: f.grade,
                        status: "Submitted simulation · manual admission review required",
                      },
                    ]);
                    done("Application metadata recorded; no student was created");
                  } catch (e) {
                    setError((e as Error).message);
                  }
                }}
              >
                Confirm simulated application
              </Button>
              {error && (
                <div role="alert" className="op-form-error">
                  {error}
                </div>
              )}
            </>
          ) : dialog === "Currency preview" ? (
            <>
              {field("Currency", "currency", [
                "USD",
                "KES",
                "EUR",
                "GBP",
                "UGX",
                "TZS",
                "INR",
                "JPY",
                "ZAR",
              ])}
              {field("Display decimal precision", "precision", ["0", "1", "2", "3", "4"])}
              <p>
                Preview only: historical numbers and currency context are not converted. This
                prototype has a global display currency, not per-transaction currencies.
              </p>
              <Field label="Change reason" value={reason} onChange={setReason} />
              <Button
                primary
                onClick={() => {
                  try {
                    x.stamp(page, "Display currency", x.finance.currency, f, reason);
                    x.finance.setCurrency(f.currency);
                    x.finance.setPrecision(Number(f.precision));
                    done("Display format updated; no currency conversion performed");
                  } catch (e) {
                    setError((e as Error).message);
                  }
                }}
              >
                Confirm display currency
              </Button>
              {error && <p role="alert">{error}</p>}
            </>
          ) : (
            <>
              {dialog === "Institution identity" ? (
                <>
                  <div className="settings-fields">
                    {[
                      "name",
                      "shortName",
                      "code",
                      "type",
                      "ownership",
                      "address",
                      "postal",
                      "county",
                      "country",
                      "phone",
                      "email",
                      "website",
                      "motto",
                      "principal",
                      "registration",
                      "timezone",
                      "currency",
                    ].map((k) => (
                      <div key={k}>
                        {field(
                          k === "name"
                            ? "School name"
                            : k === "currency"
                              ? "Default currency"
                              : k[0].toUpperCase() + k.slice(1),
                          k,
                        )}
                      </div>
                    ))}
                  </div>
                  {field(
                    "Logo HTTPS URL or local data preview",
                    "logo",
                    undefined,
                    "textarea",
                    "Existing Branding Editor supports local file previews under 2 MB.",
                  )}
                  <div className="settings-print">
                    {f.logo && <img src={f.logo} alt="Draft identity preview" />}
                    <strong>{f.name}</strong>
                    <p>{f.motto}</p>
                    <p>{f.address}</p>
                  </div>
                </>
              ) : dialog === "Session editor" ? (
                <>
                  {field("Session name", "name")}
                  {field("Session start", "start", undefined, "date")}
                  {field("Session end", "end", undefined, "date")}
                  {field("Session status", "status", ["Draft", "Active", "Closed"])}
                  {field("Terms: name | start | end, one per line", "terms", undefined, "textarea")}
                  {field("Holidays / breaks (notes)", "holidays", undefined, "textarea")}
                  <p>
                    Calendar preview: {f.start || "Start not supplied"} →{" "}
                    {f.end || "End not supplied"} ·{" "}
                    {(f.terms || "").split("\n").filter(Boolean).length} terms.
                  </p>
                </>
              ) : dialog === "Structure editor" ? (
                <>
                  {field("Reference kind", "kind", ["Class", "Section", "Subject"])}
                  {field("Reference name / code", "name")}
                  {field("Reference status", "status", ["Active", "Inactive"])}
                </>
              ) : dialog === "Payment method" ? (
                <>
                  {field("Method name", "name")}
                  {field("Internal method code", "code")}
                  {field("Description", "description")}
                  {field("Active", "active", ["true", "false"])}
                  {field("Reference required", "reference", ["true", "false"])}
                  {field("Display order", "order", undefined, "number")}
                  {field("Effective date (metadata)", "effective", undefined, "date")}
                </>
              ) : dialog === "User editor" ? (
                <>
                  {field("User display name", "name")}
                  {field("Shared staff reference (optional)", "person", [
                    "",
                    ...x.workforce.staff.map((s) => s.id),
                  ])}
                  {field("Assigned role", "role", roles)}
                  {field("Account status", "status", ["Active", "Inactive"])}
                  <p>
                    Illustrative inherited access:{" "}
                    {f.role === "School Administrator"
                      ? "School configuration and administration"
                      : `${f.role} role scope only; server enforcement not connected`}
                    . No password or credential is collected.
                  </p>
                </>
              ) : dialog === "Custom field" ? (
                <>
                  {field("Field display name", "name")}
                  {field("Internal key", "key")}
                  {field("Entity", "entity", ["Student", "Staff", "Admission"])}
                  {field("Field type", "type", [
                    "Text",
                    "Long text",
                    "Number",
                    "Date",
                    "Dropdown",
                    "Multi-select",
                    "Checkbox",
                    "Boolean",
                    "Email",
                    "Telephone",
                  ])}
                  {field("Required", "required", ["Optional", "Required"])}
                  {field("Visibility", "visibility", ["Administrator", "Staff", "Student profile"])}
                  {field("Field status", "status", ["Active", "Inactive"])}
                  {field("Options (comma separated)", "options")}
                  {field("Default value", "defaultValue")}
                  {field("Description / validation notes", "description", undefined, "textarea")}
                  <Field
                    label={`Field preview: ${f.name || "Untitled"}`}
                    value={f.defaultValue || ""}
                    options={f.type === "Dropdown" ? (f.options || "").split(",") : undefined}
                    onChange={(v) => set("defaultValue", v)}
                  />
                </>
              ) : dialog === "Grading editor" ? (
                <>
                  {field("Grading scheme name", "name")}
                  {field("Effective session", "session")}
                  {field(
                    "Grade bands: label | min | max | description",
                    "bands",
                    undefined,
                    "textarea",
                  )}
                  {field("Explicit passing grades (comma separated)", "passing")}
                  {field("Component weight percent", "weight", undefined, "number")}
                  {field("Rounding policy", "rounding", ["2 decimals · source policy"])}
                  <p>
                    All required components must be in a passing grade to pass a complete result.
                    Unconfigured older published records remain unclassifiable.
                  </p>
                </>
              ) : dialog === "Profile request" ? (
                <>
                  {field(
                    "Student reference",
                    "student",
                    x.students.map((s) => s.id),
                  )}
                  {field("Requested field", "field", ["email", "phone"])}
                  {field("Proposed value", "value")}
                </>
              ) : dialog === "Review profile update" ? (
                <>
                  {field("Review decision", "decision", ["Approved", "Rejected"])}
                  <p>
                    {x.requests.find((r) => r.id === f.id)?.field}:{" "}
                    {x.requests.find((r) => r.id === f.id)?.value}
                  </p>
                </>
              ) : dialog === "Module availability" ? (
                <>
                  {field("Module", "module", modules)}
                  {field("Availability recommendation", "status", ["Enabled", "Disabled"])}
                </>
              ) : dialog === "Create backup preview" ? (
                <p>
                  Only generic settings metadata is captured. Snapshot and verification disappear on
                  reload. No external storage, operational backup or file download is performed.
                </p>
              ) : dialog === "Restore preview" ? (
                <>
                  <p>
                    Selected backup: {f.id}. Affected categories:{" "}
                    {Object.keys(x.backups.find((b) => b.id === f.id)?.settings || {}).join(", ")}.
                    This can replace only these metadata settings. Operational rollback is
                    unavailable.
                  </p>
                  {field("Type RESTORE SIMULATION", "confirm")}
                </>
              ) : (
                <>
                  {Object.keys(f).length ? (
                    Object.keys(f).map((k) => (
                      <div key={k}>
                        {field(
                          k === "status" ? "Publication status" : k,
                          k,
                          k === "status" ? ["Draft", "Published"] : undefined,
                          k === "instructions" || k === "footer" ? "textarea" : "text",
                        )}
                      </div>
                    ))
                  ) : (
                    <p>No editable metadata has been seeded for this area.</p>
                  )}
                </>
              )}
              {controls}
            </>
          )}
        </Dialog>
      )}
    </div>
  );
}

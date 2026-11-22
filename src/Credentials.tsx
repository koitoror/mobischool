import { useEffect, useState, type ReactNode } from "react";
import { useCredentials } from "./CredentialsContext";
import { Button, Badge, Card, Field } from "./components/OperationsUI";
import { AssessmentDialog as Dialog, AssessmentTable as Table } from "./components/AssessmentUI";
import { TemplateEditor, GenerationWizard } from "./CredentialWorkflows";
import {
  AlumniEditor,
  AlumniImport,
  AlumniProfile,
  EventEditor,
  EventDetail,
} from "./AlumniWorkflows";
import { IssuedPreview } from "./CredentialPreview";
import {
  certificatePages,
  alumniPages,
  credentialPages,
  effectiveStatus,
  isValid,
  alumniName,
  uid,
  type Kind,
  type Credential,
  type DocumentStatus,
} from "./credentialsModel";
import "./credentials.css";
export default function Credentials({
  page,
  active,
  navigate,
  onDirty,
  notify,
}: {
  page: string;
  active: boolean;
  navigate: (s: string) => void;
  onDirty: (b: boolean) => void;
  notify: (s: string) => void;
}) {
  const x = useCredentials();
  const [dialog, setDialog] = useState(""),
    [record, setRecord] = useState(""),
    [kind, setKind] = useState<Kind>("Certificate"),
    [mode, setMode] = useState("New"),
    [person, setPerson] = useState(""),
    [reason, setReason] = useState(""),
    [error, setError] = useState(""),
    [status, setStatus] = useState<DocumentStatus>("Revoked"),
    [q, setQ] = useState(""),
    [filter, setFilter] = useState("All"),
    [session, setSession] = useState("All"),
    [grade, setGrade] = useState("All"),
    [section, setSection] = useState("All"),
    [type, setType] = useState("All"),
    [from, setFrom] = useState(""),
    [to, setTo] = useState(""),
    [sort, setSort] = useState("Newest"),
    [index, setIndex] = useState(1),
    [detail, setDetail] = useState(true),
    [selected, setSelected] = useState<string[]>([]),
    [dataState, setDataState] = useState("Ready"),
    [back, setBack] = useState(false);
  const isAlumni = alumniPages.includes(page),
    isDesigner = ["Student ID Card", "Staff ID Card"].includes(page),
    isGenerate = page.startsWith("Generate");
  const pageKind: Kind = page.includes("Staff")
    ? "Staff ID"
    : page.includes("ID")
      ? "Student ID"
      : "Certificate";
  const close = () => {
    if (
      ["Generate", "Templates", "Alumni editor", "Import", "Event editor", "Policies"].includes(
        dialog,
      ) &&
      !window.confirm("Discard unsaved document / alumni workflow changes?")
    )
      return;
    setDialog("");
  };
  const open = (name: string, id = "", k: Kind = pageKind) => {
    setDialog(name);
    setRecord(id);
    setKind(k);
    setReason("");
    setError("");
    setBack(false);
  };
  const done = (s: string) => {
    notify(s);
    setDialog("");
  };
  useEffect(() => {
    if (active) onDirty(!!dialog);
    return () => onDirty(false);
  }, [active, dialog, onDirty]);
  useEffect(() => {
    setQ("");
    setFilter("All");
    setSession("All");
    setGrade("All");
    setSection("All");
    setType("All");
    setFrom("");
    setTo("");
    setIndex(1);
    setSelected([]);
  }, [page]);
  const go = (p: string) => {
    if (dialog && !window.confirm("Discard the current workflow?")) return;
    setDialog("");
    navigate(p);
  };
  const tryAction = (fn: () => void, message: string) => {
    try {
      fn();
      done(message);
    } catch (e) {
      setError((e as Error).message);
    }
  };
  const docs = x.documents.filter(
    (d) =>
      (filter === "All" || effectiveStatus(d, x.today) === filter) &&
      (session === "All" || d.session === session) &&
      (grade === "All" || d.identity.grade === grade) &&
      (section === "All" || d.identity.section === section) &&
      (type === "All" || d.type === type) &&
      (!from || d.issue >= from) &&
      (!to || d.issue <= to) &&
      `${d.identity.name} ${d.number} ${d.identity.reference}`
        .toLowerCase()
        .includes(q.toLowerCase()),
  );
  const names = x.alumni.filter(
    (a) =>
      (filter === "All" ||
        a.status === filter ||
        a.year === filter ||
        a.location === filter ||
        (filter === "Complete" && a.location && a.occupation && a.consent !== "Not recorded")) &&
      (grade === "All" || a.grade === grade) &&
      (session === "All" || a.session === session) &&
      `${alumniName(a, x.students)} ${a.year} ${a.location}`
        .toLowerCase()
        .includes(q.toLowerCase()),
  );
  const events = x.events.filter(
    (e) =>
      (filter === "All" || e.status === filter || e.type === filter) &&
      `${e.name} ${e.location}`.toLowerCase().includes(q.toLowerCase()),
  );
  const order = <T,>(rows: T[], name: (v: T) => string) =>
    sort === "Newest"
      ? [...rows].reverse()
      : [...rows].sort((a, b) => name(a).localeCompare(name(b)) * (sort === "A–Z" ? 1 : -1));
  const paged = (headers: string[], rows: ReactNode[][]) => (
    <>
      <Table headers={headers} rows={rows.slice((index - 1) * 8, index * 8)} />
      <div className="cred-actions cred-pad">
        <Button disabled={index === 1} onClick={() => setIndex(index - 1)}>
          Previous page
        </Button>
        <span>
          Page {index} of {Math.max(1, Math.ceil(rows.length / 8))} · {rows.length} records
        </span>
        <Button disabled={index * 8 >= rows.length} onClick={() => setIndex(index + 1)}>
          Next page
        </Button>
      </div>
    </>
  );
  const toolbar = (options: string[]) => (
    <div className="cred-filters cred-pad">
      <Field
        label="Search records"
        value={q}
        onChange={(v) => {
          setQ(v);
          setIndex(1);
        }}
      />
      <Field
        label="Status / group filter"
        value={filter}
        options={["All", ...new Set(options)]}
        onChange={(v) => {
          setFilter(v);
          setIndex(1);
        }}
      />
      <Field
        label="Sort records"
        value={sort}
        options={["Newest", "A–Z", "Z–A"]}
        onChange={setSort}
      />
      <Button onClick={() => setDetail(!detail)}>
        {detail ? "Hide detail columns" : "Show detail columns"}
      </Button>
      <Button
        onClick={() => {
          setQ("");
          setFilter("All");
          setSession("All");
          setGrade("All");
          setSection("All");
          setType("All");
          setFrom("");
          setTo("");
          setIndex(1);
        }}
      >
        Clear filters
      </Button>
    </div>
  );
  const docFilters = (
    <div className="cred-filters cred-pad">
      <Field
        label="Session filter"
        value={session}
        options={["All", x.session, ...new Set(x.documents.map((d) => d.session))].filter(
          (v, i, a) => a.indexOf(v) === i,
        )}
        onChange={(v) => {
          setSession(v);
          setIndex(1);
        }}
      />
      <Field
        label="Class filter"
        value={grade}
        options={["All", ...new Set(x.students.map((s) => s.grade))]}
        onChange={(v) => {
          setGrade(v);
          setIndex(1);
        }}
      />
      <Field
        label="Section filter"
        value={section}
        options={["All", ...new Set(x.students.map((s) => s.section))]}
        onChange={(v) => {
          setSection(v);
          setIndex(1);
        }}
      />
      <Field
        label="Certificate type filter"
        value={type}
        options={["All", ...x.types.map((t) => t.name)]}
        onChange={(v) => {
          setType(v);
          setIndex(1);
        }}
      />
      <Field label="Issued from" type="date" value={from} onChange={setFrom} />
      <Field label="Issued to" type="date" value={to} onChange={setTo} />
    </div>
  );
  const kpis = (items: [string, number, string][]) => (
    <div className="cred-kpis">
      {items.map(([label, value, route]) => (
        <Button key={label} onClick={() => go(route)}>
          <span>
            <small>{label}</small>
            <strong>{value}</strong>
            <small>View shared records →</small>
          </span>
        </Button>
      ))}
    </div>
  );
  const docRows = (records: Credential[]) =>
    order(records, (d) => d.identity.name).map((d) => [
      d.number,
      `${d.identity.name} · ${d.identity.reference}`,
      d.type,
      ...(detail
        ? [d.session, d.issue, `${d.template.name} v${d.template.version}`, d.authority]
        : []),
      <Badge>{effectiveStatus(d, x.today)}</Badge>,
      <div className="cred-actions">
        <Button onClick={() => open("Document detail", d.id, d.kind)}>Details / preview</Button>
        <Button
          disabled={!x.canEdit || !x.policy.allowReissue}
          onClick={() => {
            setMode("Reissue");
            setPerson(d.person);
            open("Generate", "", d.kind);
          }}
        >
          Reissue
        </Button>
        <Button
          disabled={!x.canEdit || !isValid(d, x.today)}
          onClick={() => {
            setStatus("Revoked");
            open("Document status", d.id, d.kind);
          }}
        >
          Revoke
        </Button>
        {d.kind !== "Certificate" && (
          <Button
            disabled={!x.canEdit || !isValid(d, x.today)}
            onClick={() => {
              setStatus("Lost");
              open("Document status", d.id, d.kind);
            }}
          >
            Mark lost
          </Button>
        )}
      </div>,
    ]);
  const docHeaders = [
    "Number",
    "Recipient / reference",
    "Type",
    ...(detail ? ["Session", "Issue date", "Template version", "Authority"] : []),
    "Status",
    "Actions",
  ];
  const current = x.documents.find((d) => d.id === record),
    alumnus = x.alumni.find((a) => a.id === record),
    event = x.events.find((e) => e.id === record);
  return (
    <div className="op credentials" hidden={!active}>
      <div className="cred-heading">
        <div>
          <div className="op-eyebrow">
            OPERATIONS / {isAlumni ? "ALUMNI" : "CERTIFICATES & IDENTIFICATION"}
          </div>
          <div role="heading" aria-level={1} className="cred-title">
            {page}
          </div>
          <p>
            {isAlumni
              ? "School connections, thoughtfully maintained."
              : "Designed once. Reviewed carefully. Issued with a trace."}
          </p>
        </div>
        <div className="cred-actions">
          <Button onClick={() => open("Policies")}>School policies & preview</Button>
          <Button
            primary
            disabled={!x.canEdit}
            onClick={() =>
              isAlumni
                ? open(page === "Events" ? "Event editor" : "Alumni editor")
                : (setMode("New"), setPerson(""), open("Generate", "", pageKind))
            }
          >
            {isAlumni ? (page === "Events" ? "Create event" : "Add Alumni") : "Generate document"}
          </Button>
        </div>
      </div>
      <div className="op-context">
        <Field
          label="Credentials & alumni workspace"
          value={page}
          options={credentialPages}
          onChange={go}
        />
        <span>
          {x.school} · {x.session}
        </span>
        <Badge>Illustrative Data</Badge>
      </div>
      <div className="cred-tabs">
        {(isAlumni ? alumniPages : certificatePages).map((p) => (
          <Button key={p} disabled={page === p} onClick={() => go(p)}>
            {p}
          </Button>
        ))}
      </div>
      <div className="op-notice">
        Browser-memory simulation · resets on reload. No secure signing, cryptographic verification,
        PDF storage, real card printing, alumni messaging, production authorization or real RSVP
        collection.
      </div>
      {dataState !== "Ready" ? (
        <Card title={dataState} sub="Explicit exception preview">
          <div className="op-empty" role="status">
            <strong>
              {dataState === "Restricted"
                ? "Access restricted"
                : dataState === "Loading"
                  ? "Loading preview"
                  : dataState === "Error"
                    ? "Records could not be loaded"
                    : "No records in this preview"}
            </strong>
            <Button onClick={() => setDataState("Ready")}>Recover sample workspace</Button>
          </div>
        </Card>
      ) : page === "Certificates Overview" ? (
        <>
          {toolbar(["Generated", "Active", "Draft", "Revoked", "Voided", "Expired"])}
          {docFilters}
          {kpis([
            [
              "Total certificates issued",
              docs.filter((d) => d.kind === "Certificate").length,
              "Student Certificate",
            ],
            [
              "Certificates this session",
              docs.filter((d) => d.kind === "Certificate" && d.session === x.session).length,
              "Student Certificate",
            ],
            [
              "Draft documents",
              docs.filter((d) => d.status === "Draft").length,
              "Student Certificate",
            ],
            [
              "Pending generation",
              x.batches.flatMap((b) => b.rows).filter((r) => r.status !== "Generated").length,
              "Generate Certificate",
            ],
            [
              "Students active for review",
              x.students.filter((s) => s.status === "Active").length,
              "Generate Certificate",
            ],
            [
              "Student ID cards",
              docs.filter((d) => d.kind === "Student ID").length,
              "Generate ID Card",
            ],
            [
              "Staff ID cards",
              docs.filter((d) => d.kind === "Staff ID").length,
              "Generate Staff ID Card",
            ],
            ["Generation batches", x.batches.length, "Student Certificate"],
          ])}
          <div className="cred-grid">
            <Card title="Recent document activity" sub="Issued snapshots, not live templates">
              {paged(docHeaders, docRows(docs.slice(-8)))}
            </Card>
            <Card title="Certificates by type">
              <Table
                headers={["Type", "Generated records"]}
                rows={x.types.map((t) => [t.name, docs.filter((d) => d.type === t.name).length])}
              />
              <div className="cred-pad">
                <Button onClick={() => open("Templates", "", "Certificate")}>
                  Manage Templates
                </Button>
              </div>
            </Card>
            <Card title="Generation queue / batch outcomes">
              <Table
                headers={["Batch", "Kind", "Generated / skipped / failed"]}
                rows={x.batches.map((b) => [
                  b.id,
                  b.kind,
                  `${b.rows.filter((r) => r.status === "Generated").length} / ${b.rows.filter((r) => r.status === "Skipped").length} / ${b.rows.filter((r) => r.status === "Failed").length}`,
                ])}
              />
            </Card>
            <Card
              title="Eligible student groups"
              sub="Active identities only; document eligibility still requires school review."
            >
              <Table
                headers={["Class", "Students for review"]}
                rows={[...new Set(x.students.map((s) => s.grade))].map((g) => [
                  g,
                  x.students.filter((s) => s.grade === g && s.status === "Active").length,
                ])}
              />
              <div className="cred-actions cred-pad">
                {["Generate Certificate", "Generate ID Card", "Generate Staff ID Card"].map((p) => (
                  <Button key={p} onClick={() => go(p)}>
                    {p}
                  </Button>
                ))}
              </div>
            </Card>
          </div>
        </>
      ) : isDesigner ? (
        <Card
          title={`${pageKind} reusable templates`}
          sub="Versioned design • front / back • privacy-safe defaults"
          action={
            <Button disabled={!x.canEdit} onClick={() => open("Templates", "", pageKind)}>
              Open template designer
            </Button>
          }
        >
          <div className="cred-pad">
            {x.templates
              .filter((t) => t.kind === pageKind)
              .map((t) => (
                <div key={t.id}>
                  <strong>
                    {t.name} · v{t.version}
                  </strong>
                  <p>
                    {t.dimensions} {t.orientation} · {t.fields.join(", ")}
                  </p>
                </div>
              ))}
          </div>
        </Card>
      ) : isGenerate ? (
        <>
          <Card
            title={`${pageKind} generation workspace`}
            sub="Setup → recipients → reviewed data → preview → confirmation → results"
            action={
              <Button
                primary
                disabled={!x.canEdit}
                onClick={() => {
                  setMode("New");
                  setPerson("");
                  open("Generate", "", pageKind);
                }}
              >
                Start guided generation
              </Button>
            }
          >
            <div className="cred-pad">
              <p>
                Inactive recipients and duplicate valid credentials are skipped. Explicit reissue
                retains historical snapshots. Missing photo placeholders require school policy and
                acknowledgement.
              </p>
            </div>
          </Card>
          <Card title={`${pageKind} issued records`}>
            {toolbar(["Active", "Generated", "Expired", "Reissued", "Lost", "Revoked"])}
            {paged(docHeaders, docRows(docs.filter((d) => d.kind === pageKind)))}
          </Card>
        </>
      ) : page === "Student Certificate" ? (
        <Card
          title="Student certificate registry"
          sub="Revoked and voided records are retained but never presented as valid credentials."
          action={
            <Button onClick={() => open("Templates", "", "Certificate")}>Manage Templates</Button>
          }
        >
          {toolbar(["Generated", "Active", "Draft", "Reissued", "Revoked", "Voided", "Expired"])}
          {docFilters}
          {paged(docHeaders, docRows(docs.filter((d) => d.kind === "Certificate")))}
        </Card>
      ) : page === "Alumni Overview" ? (
        <>
          {kpis([
            ["Total alumni records", x.alumni.length, "Manage Alumni"],
            [
              "Recent reviewed additions",
              x.alumni.filter((a) =>
                a.history.some((h) => h.at.slice(0, 10) === new Date().toISOString().slice(0, 10)),
              ).length,
              "Manage Alumni",
            ],
            [
              "Registered alumni",
              x.alumni.filter((a) => a.status === "Registered").length,
              "Manage Alumni",
            ],
            [
              "Upcoming events",
              x.events.filter((e) => e.status === "Published" && e.date >= x.today).length,
              "Events",
            ],
            [
              "Simulated participation",
              x.rsvps.filter((r) => !["Cancelled", "Declined"].includes(r.status)).length,
              "Events",
            ],
            [
              "Contact preference recorded",
              x.alumni.filter((a) => a.consent !== "Not recorded").length,
              "Manage Alumni",
            ],
            [
              "Profile complete",
              x.alumni.filter((a) => a.location && a.occupation && a.consent !== "Not recorded")
                .length,
              "Manage Alumni",
            ],
            [
              "Recently updated",
              x.alumni.filter((a) => a.history.length > 1).length,
              "Manage Alumni",
            ],
          ])}
          <div className="cred-grid">
            <Card title="Graduation-year distribution">
              <Table
                headers={["Year", "Reviewed alumni"]}
                rows={[...new Set(x.alumni.map((a) => a.year))]
                  .sort()
                  .map((y) => [y, x.alumni.filter((a) => a.year === y).length])}
              />
            </Card>
            <Card title="Recent alumni additions">
              <Table
                headers={["Identity", "Year", "Status"]}
                rows={x.alumni.slice(-5).map((a) => [alumniName(a, x.students), a.year, a.status])}
              />
            </Card>
            <Card title="Alumni events">
              <Table
                headers={["Event", "Date", "Status"]}
                rows={x.events.map((e) => [e.name, e.date, e.status])}
              />
            </Card>
            <Card title="Engagement summary" sub="Simulation only; no messages sent.">
              <div className="cred-pad">
                <p>
                  {x.rsvps.length} participation records ·{" "}
                  {x.rsvps.filter((r) => r.status === "Attendance marked").length} attendance
                  simulations.
                </p>
                <Button onClick={() => open("Import")}>Import Alumni</Button>
              </div>
            </Card>
          </div>
        </>
      ) : page === "Manage Alumni" ? (
        <Card
          title="Alumni registry"
          sub="Contacts are private by default; shared student identities are referenced, not duplicated."
          action={
            <Button disabled={!x.canEdit} onClick={() => open("Import")}>
              Import Alumni
            </Button>
          }
        >
          {toolbar([
            ...x.policy.statuses,
            ...x.alumni.map((a) => a.year),
            ...x.alumni.map((a) => a.location).filter(Boolean),
            "Complete",
          ])}
          <div className="cred-filters cred-pad">
            <Field
              label="Alumni session filter"
              value={session}
              options={["All", ...new Set(x.alumni.map((a) => a.session))]}
              onChange={(v) => {
                setSession(v);
                setIndex(1);
              }}
            />
            <Field
              label="Alumni class filter"
              value={grade}
              options={["All", ...new Set(x.alumni.map((a) => a.grade))]}
              onChange={(v) => {
                setGrade(v);
                setIndex(1);
              }}
            />
            <Button disabled={!selected.length || !x.canEdit} onClick={() => open("Bulk alumni")}>
              Bulk status ({selected.length})
            </Button>
          </div>
          {paged(
            [
              "Select",
              "Alumnus",
              "Graduation",
              "Status",
              ...(detail ? ["Class / session", "Location / completeness"] : []),
              "Actions",
            ],
            order(names, (a) => alumniName(a, x.students)).map((a) => [
              <Button
                onClick={() =>
                  setSelected(
                    selected.includes(a.id)
                      ? selected.filter((id) => id !== a.id)
                      : [...selected, a.id],
                  )
                }
              >
                {selected.includes(a.id) ? "Selected" : "Select"}
              </Button>,
              alumniName(a, x.students),
              a.year,
              a.status,
              ...(detail
                ? [
                    `${a.grade} / ${a.session}`,
                    `${a.location || "Not supplied"} / ${a.location && a.occupation && a.consent !== "Not recorded" ? "Complete" : "Partial"}`,
                  ]
                : []),
              <div className="cred-actions">
                <Button onClick={() => open("Alumni profile", a.id)}>Alumni 360</Button>
                <Button disabled={!x.canEdit} onClick={() => open("Alumni editor", a.id)}>
                  Edit alumni
                </Button>
              </div>,
            ]),
          )}
        </Card>
      ) : (
        <Card
          title="Alumni events"
          sub="Publishing and participation are simulations; no invitations are delivered."
        >
          {toolbar([
            "Draft",
            "Published",
            "Unpublished",
            "Cancelled",
            "Archived",
            ...x.policy.eventTypes,
          ])}
          {paged(
            ["Event", "Date / time", "Audience", "Capacity / registrations", "Status", "Actions"],
            order(events, (e) => e.name).map((e) => [
              e.name,
              `${e.date} ${e.start}–${e.end}`,
              `${e.years.join(", ") || "All years"} / ${e.grades.join(", ") || "All classes"}`,
              `${e.capacity || "Unlimited"} / ${x.rsvps.filter((r) => r.event === e.id && ["Registered", "Attending", "Attendance marked"].includes(r.status)).length}`,
              <Badge>{e.status}</Badge>,
              <div className="cred-actions">
                <Button onClick={() => open("Event detail", e.id)}>Details / participation</Button>
                <Button disabled={!x.canEdit} onClick={() => open("Event editor", e.id)}>
                  Edit / publish
                </Button>
                <Button
                  disabled={!x.canEdit}
                  onClick={() => {
                    const copy = {
                      ...e,
                      id: uid("EV"),
                      name: e.name + " copy",
                      status: "Draft",
                      history: [],
                    };
                    tryAction(() => x.saveEvent(copy), "Draft event duplicated");
                  }}
                >
                  Duplicate event
                </Button>
              </div>,
            ]),
          )}
        </Card>
      )}
      <div className="op-footnote">
        <span>Local prototype state · {x.role}</span>
        <span>Credentials are not identity verification or access-control tokens.</span>
      </div>
      {dialog && active && (
        <Dialog title={dialog} onClose={close}>
          {dialog === "Generate" ? (
            <GenerationWizard kind={kind} initialMode={mode} initialPerson={person} done={notify} />
          ) : dialog === "Templates" ? (
            <TemplateEditor kind={kind} done={done} />
          ) : dialog === "Alumni editor" ? (
            <AlumniEditor record={alumnus} done={done} />
          ) : dialog === "Import" ? (
            <AlumniImport done={notify} />
          ) : dialog === "Alumni profile" && alumnus ? (
            <AlumniProfile record={alumnus} />
          ) : dialog === "Event editor" ? (
            <EventEditor record={event} done={done} />
          ) : dialog === "Event detail" ? (
            <EventDetail id={record} notify={notify} />
          ) : dialog === "Bulk alumni" ? (
            <>
              <Field
                label="Bulk alumni status"
                value={filter === "All" ? "Registered" : filter}
                options={x.policy.statuses}
                onChange={setFilter}
              />
              <Field label="Bulk change reason" value={reason} onChange={setReason} />
              <p>
                {selected.length} records selected. Archive retains historical identities and
                participation.
              </p>
              <Button
                danger
                onClick={() =>
                  tryAction(
                    () =>
                      x.bulkAlumni(
                        selected,
                        x.policy.statuses.includes(filter) ? filter : "Registered",
                        reason,
                      ),
                    "Bulk alumni status updated",
                  )
                }
              >
                Confirm bulk status
              </Button>
            </>
          ) : dialog === "Document status" && current ? (
            <>
              <p>
                {current.number} → {status}. Previous snapshots and generation history are retained.
              </p>
              <Field
                label="Document status action"
                value={status}
                options={
                  current.kind === "Certificate" ? ["Revoked", "Voided"] : ["Revoked", "Lost"]
                }
                onChange={(v) => setStatus(v as DocumentStatus)}
              />
              <Field label="Lifecycle reason" value={reason} onChange={setReason} />
              <Button
                danger
                onClick={() =>
                  tryAction(
                    () => x.transition(current.id, status, reason),
                    `Document ${status.toLowerCase()}`,
                  )
                }
              >
                Confirm document status
              </Button>
            </>
          ) : dialog === "Document detail" && current ? (
            <>
              <p>
                <Badge>{effectiveStatus(current, x.today)}</Badge> · {current.number} · document v
                {current.version} · template v{current.template.version}
              </p>
              <p>
                Authority: {current.authority} · {current.issuedAt} · {current.actor}
              </p>
              <p>
                Reissue of {current.reissueOf || "None"} · Replaced by{" "}
                {current.replacedBy || "None"}. {current.override}
              </p>
              <div className="cred-actions">
                <Button onClick={() => setBack(!back)}>{back ? "Show front" : "Show back"}</Button>
                {["Reprint preview", "Download simulation", "Verification simulation"].map(
                  (action) => (
                    <Button
                      key={action}
                      onClick={() => {
                        x.logDocument(current.id, action);
                        notify(
                          action === "Verification simulation"
                            ? isValid(current, x.today)
                              ? "Local record is active; this is NOT secure verification."
                              : "NOT VALID: " + effectiveStatus(current, x.today)
                            : action === "Download simulation"
                              ? "Download simulated; no PDF file or storage created."
                              : "Reprint preview only; no new credential issued.",
                        );
                      }}
                    >
                      {action}
                    </Button>
                  ),
                )}
              </div>
              <IssuedPreview
                document={{ ...current, status: effectiveStatus(current, x.today) }}
                back={back}
              />
              {current.history.map((h, i) => (
                <p key={i}>
                  {h.at} · {h.action}
                </p>
              ))}
            </>
          ) : dialog === "Policies" ? (
            <Policies dataState={dataState} setDataState={setDataState} done={done} />
          ) : null}
          {error && (
            <div role="alert" className="op-form-error">
              {error}
            </div>
          )}
        </Dialog>
      )}
    </div>
  );
}
function Policies({
  dataState,
  setDataState,
  done,
}: {
  dataState: string;
  setDataState: (s: string) => void;
  done: (s: string) => void;
}) {
  const x = useCredentials(),
    [p, setP] = useState(structuredClone(x.policy)),
    [types, setTypes] = useState(x.types.map((t) => t.name).join("\n")),
    [error, setError] = useState("");
  return (
    <>
      <Field
        label="Preview role"
        value={x.role}
        options={["School Administrator", "Document Officer", "Alumni Officer", "Auditor"]}
        onChange={x.setRole}
      />
      <Field
        label="Data state"
        value={dataState}
        options={["Ready", "Loading", "Empty", "Error", "Restricted"]}
        onChange={setDataState}
      />
      <p>Preview roles are recommendations only, not authentication or secure authorization.</p>
      {x.canPrivate ? (
        <>
          <Field
            label="Certificate types (one per line)"
            type="textarea"
            value={types}
            onChange={setTypes}
          />
          {(["authority", "signatory", "expiry", "graduation"] as const).map((key) => (
            <Field
              key={key}
              label={`Policy ${key}`}
              value={p[key]}
              onChange={(v) => setP({ ...p, [key]: v })}
            />
          ))}
          <Field
            label="Photo policy"
            value={p.photo}
            options={["Required", "Placeholder with acknowledgement"]}
            onChange={(v) => setP({ ...p, photo: v })}
          />
          {(["allowReissue", "allowSensitive", "waitlist"] as const).map((key) => (
            <Field
              key={key}
              label={`Policy ${key}`}
              value={p[key] ? "Enabled" : "Disabled"}
              options={["Disabled", "Enabled"]}
              onChange={(v) => setP({ ...p, [key]: v === "Enabled" })}
            />
          ))}
          <Field
            label="Alumni statuses (comma separated)"
            value={p.statuses.join(",")}
            onChange={(v) =>
              setP({
                ...p,
                statuses: v
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean),
              })
            }
          />
          <Field
            label="Event types (comma separated)"
            value={p.eventTypes.join(",")}
            onChange={(v) =>
              setP({
                ...p,
                eventTypes: v
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean),
              })
            }
          />
          <Button
            primary
            onClick={() => {
              const names = [
                ...new Set(
                  types
                    .split("\n")
                    .map((v) => v.trim())
                    .filter(Boolean),
                ),
              ];
              if (
                !names.length ||
                !p.authority.trim() ||
                !p.eventTypes.length ||
                !p.statuses.length
              ) {
                setError("Types, authority, alumni statuses and event types cannot be empty.");
                return;
              }
              x.setPolicy(p);
              x.setTypes(names.map((name) => ({ name, guidance: p.graduation })));
              done("Illustrative school policies saved");
            }}
          >
            Save school policies
          </Button>
        </>
      ) : (
        <p>Only School Administrator preview can configure sensitive fields and policies.</p>
      )}
      {error && <p role="alert">{error}</p>}
    </>
  );
}

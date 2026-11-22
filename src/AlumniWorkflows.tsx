import { useState } from "react";
import { useCredentials } from "./CredentialsContext";
import { Field, Button, Card } from "./components/OperationsUI";
import { AssessmentTable as Table } from "./components/AssessmentUI";
import { alumniError, alumniName, uid, type Alumni, type AlumniEvent } from "./credentialsModel";
export function AlumniEditor({ record, done }: { record?: Alumni; done: (s: string) => void }) {
  const x = useCredentials();
  const [f, setF] = useState<Alumni>(
      record
        ? structuredClone(record)
        : {
            id: uid("AL"),
            student: "",
            externalName: "",
            year: "",
            session: x.session,
            grade: "",
            section: "",
            status: "Registered",
            email: "",
            phone: "",
            occupation: "",
            organization: "",
            location: "",
            education: "",
            notes: "",
            consent: "Not recorded",
            review: "",
            academicRefs: [],
            history: [],
          },
    ),
    [review, setReview] = useState(false),
    [error, setError] = useState("");
  const field = (label: string, key: keyof Alumni, options?: string[]) => (
    <Field
      label={label}
      value={String(f[key])}
      options={options}
      onChange={(v) => {
        setF({ ...f, [key]: v });
        setReview(false);
      }}
    />
  );
  return (
    <>
      <p>
        Creation does not change enrollment or certify graduation. The manual review is an explicit
        override, not a verified academic outcome.
      </p>
      <Field
        label="Create from shared student (optional)"
        value={f.student || "External historical record"}
        options={["External historical record", ...x.students.map((s) => s.id)]}
        onChange={(id) => {
          const s = x.students.find((s) => s.id === id);
          setF({
            ...f,
            student: s?.id || "",
            grade: s?.grade || "",
            section: s?.section || "",
            externalName: "",
          });
          setReview(false);
        }}
      />
      <div className="cred-fields">
        {!f.student && field("External alumnus name", "externalName")}
        {field("Graduation year", "year")}
        {field("Graduation session", "session")}
        {field("Last known class", "grade")}
        {field("Last known section", "section")}
        {field("Alumni status", "status", x.policy.statuses)}
        {field("Location", "location")}
        {field("Occupation", "occupation")}
        {field("Organization", "organization")}
        {field("Higher education", "education")}
        {x.canPrivate && field("Private email (optional)", "email")}
        {x.canPrivate && field("Private phone (optional)", "phone")}
        {field("Communication preference", "consent", ["Not recorded", "Opted in", "Opted out"])}
      </div>
      {field("Manual graduation review / override reason", "review")}
      {field("Profile notes", "notes")}
      <Card
        title="Academic and document references"
        sub="Published results are references only, not proof of graduation."
      >
        <div className="cred-pad">
          <p>
            Published scores:{" "}
            {x.examination?.scores.filter(
              (s) => s.student === f.student && s.status === "Published",
            ).length || 0}
            . Issued documents: {x.documents.filter((d) => d.person === f.student).length}.
          </p>
        </div>
      </Card>
      {review ? (
        <>
          <p>
            Confirm reviewed alumni record for{" "}
            {f.student ? x.students.find((s) => s.id === f.student)?.name : f.externalName},
            graduation year {f.year}. No automatic student status change.
          </p>
          <Button
            primary
            onClick={() => {
              try {
                x.saveAlumni(f);
                done("Reviewed alumni record saved");
              } catch (e) {
                setError((e as Error).message);
              }
            }}
          >
            Confirm alumni record
          </Button>
        </>
      ) : (
        <Button
          primary
          onClick={() => {
            const error = alumniError(f, x.alumni, x.students);
            if (error) setError(error);
            else {
              setError("");
              setReview(true);
            }
          }}
        >
          Review alumni record
        </Button>
      )}
      {error && (
        <div className="op-form-error" role="alert">
          {error}
        </div>
      )}
    </>
  );
}
export function AlumniImport({ done }: { done: (s: string) => void }) {
  const x = useCredentials(),
    [text, setText] = useState(""),
    [reason, setReason] = useState(""),
    [preview, setPreview] = useState(false),
    [error, setError] = useState(""),
    [result, setResult] = useState("");
  const rows = text
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const [name, year, grade, session] = line.split("|").map((v) => v.trim());
      return {
        id: uid("AL"),
        student: "",
        externalName: name || "",
        year: year || "",
        grade: grade || "",
        session: session || "",
        section: "",
        status: "Registered",
        email: "",
        phone: "",
        occupation: "",
        organization: "",
        location: "",
        education: "",
        notes: "Imported preview; external historical record",
        consent: "Not recorded",
        review: reason,
        academicRefs: [],
        history: [],
      } satisfies Alumni;
    });
  const seen: Alumni[] = [];
  const errors = rows.map((a) => {
    const error = alumniError(a, [...x.alumni, ...seen], x.students);
    if (!error) seen.push(a);
    return error;
  });
  return (
    <>
      <Field
        label="Pipe-delimited alumni import"
        type="textarea"
        value={text}
        onChange={(v) => {
          setText(v);
          setPreview(false);
        }}
        hint="One external historical record per line: Full name | Graduation year | Class | Session. Shared student identities must use Create from shared student instead."
      />
      <Field
        label="Import manual graduation review"
        value={reason}
        onChange={(v) => {
          setReason(v);
          setPreview(false);
        }}
      />
      <Button onClick={() => setPreview(true)}>Preview import</Button>
      {preview && (
        <>
          <Table
            headers={["Name", "Year", "Validation"]}
            rows={rows.map((a, i) => [a.externalName, a.year, errors[i] || "Ready"])}
          />
          <Button
            primary
            disabled={!rows.length || errors.some(Boolean)}
            onClick={() => {
              try {
                rows.forEach((a) => x.saveAlumni(a));
                setResult(`${rows.length} alumni imported in browser memory`);
                done("Import simulation completed");
              } catch (e) {
                setError((e as Error).message);
              }
            }}
          >
            Confirm alumni import
          </Button>
        </>
      )}
      {result && <p role="status">{result}</p>}
      {error && <p role="alert">{error}</p>}
    </>
  );
}
export function AlumniProfile({ record: a }: { record: Alumni }) {
  const x = useCredentials(),
    [tab, setTab] = useState("Overview");
  return (
    <>
      <strong className="cred-title">{alumniName(a, x.students)}</strong>
      <div className="cred-tabs">
        {["Overview", "Education / career", "Participation", "Timeline"].map((t) => (
          <Button key={t} disabled={t === tab} onClick={() => setTab(t)}>
            {t}
          </Button>
        ))}
      </div>
      {tab === "Overview" ? (
        <>
          <p>
            {a.year} · {a.session} · {a.grade} {a.section} · {a.status}
          </p>
          <p>
            Shared student: {a.student || "External historical record"}. Manual graduation review:{" "}
            {a.review}
          </p>
          <p>
            Contact preference: {a.consent}.{" "}
            {x.canPrivate
              ? `Private email: ${a.email || "Not supplied"} · Private phone: ${a.phone || "Not supplied"}`
              : "Contacts hidden by privacy preview."}
          </p>
          <p>
            Certificate references:{" "}
            {x.documents
              .filter((d) => d.person === a.student && d.kind === "Certificate")
              .map((d) => `${d.number} (${d.status})`)
              .join(", ") || "None"}
          </p>
          <p>
            Academic references:{" "}
            {a.academicRefs.join(", ") || "No verified completion references recorded"}
          </p>
        </>
      ) : tab === "Education / career" ? (
        <p>
          {a.education || "Education not supplied"} · {a.occupation || "Occupation not supplied"} ·{" "}
          {a.organization || "Organization not supplied"} · {a.location || "Location not supplied"}
        </p>
      ) : tab === "Participation" ? (
        <>
          <Table
            headers={["Event", "Participation"]}
            rows={x.rsvps
              .filter((r) => r.alumni === a.id)
              .map((r) => [x.events.find((e) => e.id === r.event)?.name, r.status])}
          />
          <p>
            Communication history: no real invitations or messages sent. RSVP data is simulated.
          </p>
        </>
      ) : (
        a.history.map((h, i) => (
          <p key={i}>
            {h.at} · {h.actor} · {h.action}
          </p>
        ))
      )}
    </>
  );
}
export function EventEditor({ record, done }: { record?: AlumniEvent; done: (s: string) => void }) {
  const x = useCredentials(),
    [f, setF] = useState<AlumniEvent>(
      record
        ? structuredClone(record)
        : {
            id: uid("EV"),
            name: "",
            type: x.policy.eventTypes[0],
            description: "",
            date: x.today,
            start: "10:00",
            end: "12:00",
            location: "",
            organizer: x.policy.authority,
            years: [],
            grades: [],
            registration: "Required",
            deadline: x.today,
            capacity: 0,
            status: "Draft",
            image: "",
            notes: "",
            history: [],
          },
    ),
    [reason, setReason] = useState(""),
    [confirm, setConfirm] = useState(false),
    [error, setError] = useState("");
  const field = (label: string, key: keyof AlumniEvent, type = "text", options?: string[]) => (
    <Field
      label={label}
      type={type}
      value={String(f[key])}
      options={options}
      onChange={(v) => {
        setConfirm(false);
        setF({ ...f, [key]: key === "capacity" ? Number(v) : v });
      }}
    />
  );
  return (
    <>
      <div className="cred-fields">
        {field("Event name", "name")}
        {field("Event type", "type", "text", x.policy.eventTypes)}
        {field("Event date", "date", "date")}
        {field("Start time", "start", "time")}
        {field("End time", "end", "time")}
        {field("Location", "location")}
        {field("Organizer", "organizer")}
        {field("Registration", "registration", "text", ["Required", "Optional"])}
        {field("Registration deadline", "deadline", "date")}
        {field("Capacity (0 = unlimited)", "capacity", "number")}
        {field("Event status", "status", "text", [
          "Draft",
          "Published",
          "Unpublished",
          "Cancelled",
          "Archived",
        ])}
      </div>
      <Field
        label="Graduation-year audience (comma separated)"
        value={f.years.join(",")}
        onChange={(v) => {
          setConfirm(false);
          setF({
            ...f,
            years: v
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean),
          });
        }}
      />
      <Field
        label="Class audience (comma separated)"
        value={f.grades.join(",")}
        onChange={(v) => {
          setConfirm(false);
          setF({
            ...f,
            grades: v
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean),
          });
        }}
      />
      {field("Event description", "description", "textarea")}
      {field("Event image filename (metadata only)", "image")}
      {field("Event notes", "notes", "textarea")}
      <Field
        label="Publication / capacity / cancellation reason"
        value={reason}
        onChange={(v) => {
          setReason(v);
          setConfirm(false);
        }}
      />
      {confirm ? (
        <>
          <p>
            Confirm {f.status} event · capacity {f.capacity || "Unlimited"} · audience{" "}
            {f.years.join(", ") || "All years"} / {f.grades.join(", ") || "All classes"}.
            Cancellation also cancels RSVP simulations.
          </p>
          <Button
            primary
            onClick={() => {
              try {
                if (record && record.capacity !== f.capacity && !reason.trim())
                  throw Error("Explain the capacity change.");
                x.saveEvent(f, reason);
                done("Event saved");
              } catch (e) {
                setError((e as Error).message);
              }
            }}
          >
            Confirm event change
          </Button>
        </>
      ) : (
        <Button primary onClick={() => setConfirm(true)}>
          Review event
        </Button>
      )}
      {error && (
        <div role="alert" className="op-form-error">
          {error}
        </div>
      )}
    </>
  );
}
export function EventDetail({ id, notify }: { id: string; notify: (s: string) => void }) {
  const x = useCredentials(),
    e = x.events.find((e) => e.id === id)!;
  const [alumni, setAlumni] = useState(
      x.alumni.find((a) => !["Inactive", "Archived"].includes(a.status))?.id || "",
    ),
    [status, setStatus] = useState("Registered"),
    [error, setError] = useState(""),
    [confirm, setConfirm] = useState(false);
  const rows = x.rsvps.filter((r) => r.event === id);
  return (
    <>
      <strong className="cred-title">{e.name}</strong>
      <BadgeText text={`${e.status} · ${e.date} ${e.start}–${e.end} · ${e.location}`} />
      <p>{e.description}</p>
      <p>
        Audience: {e.years.join(", ") || "All years"} · {e.grades.join(", ") || "All classes"}.
        Deadline {e.deadline || "Event date"}. Capacity {e.capacity || "Unlimited"}.
      </p>
      <p>
        {
          rows.filter((r) => ["Registered", "Attending", "Attendance marked"].includes(r.status))
            .length
        }{" "}
        occupied · {rows.filter((r) => r.status === "Waitlisted").length} waitlisted ·{" "}
        {rows.filter((r) => r.status === "Attendance marked").length} attended.
      </p>
      <Field
        label="Alumnus RSVP"
        value={alumni}
        options={x.alumni.map((a) => a.id)}
        onChange={(v) => {
          setAlumni(v);
          setConfirm(false);
        }}
      />
      <p>
        {x.alumni.find((a) => a.id === alumni) &&
          alumniName(
            x.alumni.find((a) => a.id === alumni)!,
            x.students,
          )}
      </p>
      <Field
        label="Participation status"
        value={status}
        options={[
          "Registered",
          "Attending",
          "Declined",
          "Waitlisted",
          "Cancelled",
          "Attendance marked",
        ]}
        onChange={(v) => {
          setStatus(v);
          setConfirm(false);
        }}
      />
      <Button disabled={!x.canEdit} onClick={() => setConfirm(true)}>
        Preview RSVP / attendance
      </Button>
      {confirm && (
        <>
          <p>
            Confirm {status}. Capacity, audience, deadlines and existing registrations will be
            checked. No real RSVP is collected.
          </p>
          <Button
            primary
            onClick={() => {
              try {
                x.rsvp(id, alumni, status);
                setError("");
                setConfirm(false);
                notify("Participation simulation updated");
              } catch (e) {
                setError((e as Error).message);
              }
            }}
          >
            Confirm participation
          </Button>
        </>
      )}
      <Table
        headers={["Alumnus", "Status", "Updated", "History"]}
        rows={rows.map((r) => [
          alumniName(
            x.alumni.find((a) => a.id === r.alumni)!,
            x.students,
          ),
          r.status,
          r.at,
          r.history.map((h) => h.action).join(" · "),
        ])}
      />
      <Button
        onClick={() =>
          notify(`Export simulation: ${rows.length} participation records. No file was created.`)
        }
      >
        Export participation simulation
      </Button>
      {e.history.map((h, i) => (
        <p key={i}>
          {h.at} · {h.action}
        </p>
      ))}
      {error && (
        <div role="alert" className="op-form-error">
          {error}
        </div>
      )}
    </>
  );
}
function BadgeText({ text }: { text: string }) {
  return <p>{text}</p>;
}

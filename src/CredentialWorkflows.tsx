import { useState } from "react";
import { useCredentials } from "./CredentialsContext";
import { Button, Card, Field, Badge } from "./components/OperationsUI";
import { AssessmentTable as Table } from "./components/AssessmentUI";
import CredentialPreview from "./CredentialPreview";
import {
  generationError,
  recipientError,
  sampleTemplate,
  uid,
  type Kind,
  type Template,
  type GenerationInput,
  type Batch,
} from "./credentialsModel";
export function TemplateEditor({ kind, done }: { kind: Kind; done: (s: string) => void }) {
  const x = useCredentials(),
    templates = x.templates.filter((t) => t.kind === kind);
  const [t, setT] = useState<Template>(() =>
      structuredClone(templates[0] || sampleTemplate(kind, uid("TPL"))),
    ),
    [back, setBack] = useState(false),
    [error, setError] = useState("");
  const set = (key: keyof Template, v: string) => setT({ ...t, [key]: v });
  const field = (label: string, key: keyof Template, options?: string[]) => (
    <Field label={label} value={String(t[key])} options={options} onChange={(v) => set(key, v)} />
  );
  return (
    <>
      <Field
        label="Saved template"
        value={t.id}
        options={templates.map((v) => v.id)}
        onChange={(id) => setT(structuredClone(templates.find((v) => v.id === id)!))}
      />
      <div className="cred-actions">
        {templates.map((v) => (
          <Button key={v.id} onClick={() => setT(structuredClone(v))}>
            {v.name} · v{v.version}
          </Button>
        ))}
        <Button
          onClick={() =>
            setT({
              ...structuredClone(t),
              id: uid("TPL"),
              name: t.name + " copy",
              version: 1,
              history: [],
            })
          }
        >
          Duplicate template
        </Button>
      </div>
      <div className="cred-fields">
        {field("Template name", "name")}
        {field("Document title", "title")}
        {field("Orientation", "orientation", ["Portrait", "Landscape"])}
        {field("Dimensions", "dimensions", ["CR80", "A4", "A5"])}
        {field("Layout", "layout", ["Centered", "Left"])}
        {field("Font", "font", ["School sans", "School serif"])}
        {field("Palette", "palette", ["School", "Ink", "Forest"])}
        {field("Logo placement", "logo", ["Top", "Left", "Right"])}
        {field("Photo placement", "photo", ["Left", "Top", "Right"])}
        {field("Signatory", "signature")}
        {field("School contact / address", "schoolContact")}
      </div>
      <Field
        label="Template wording"
        type="textarea"
        value={t.body}
        onChange={(v) => set("body", v)}
        hint="Supported placeholders: {name} and {text}. Generated records retain a version snapshot."
      />
      <Field
        label="Back instructions"
        type="textarea"
        value={t.back}
        onChange={(v) => set("back", v)}
      />
      <Card
        title="Field visibility and positioning"
        sub="Name and reference are mandatory. Sensitive fields are off by default."
      >
        <div className="cred-pad">
          {[
            "Name",
            "Reference",
            ...(kind === "Staff ID"
              ? ["Department", "Designation"]
              : ["Class", "Section", "Session"]),
            "Expiry",
            ...(x.canPrivate && x.policy.allowSensitive
              ? ["DOB", "Emergency information", "Joining date"]
              : []),
          ].map((f) => (
            <div key={f} className="cred-actions">
              <Button
                disabled={["Name", "Reference"].includes(f)}
                onClick={() =>
                  setT({
                    ...t,
                    fields: t.fields.includes(f)
                      ? t.fields.filter((v) => v !== f)
                      : [...t.fields, f],
                  })
                }
              >
                {t.fields.includes(f) ? "Visible" : "Hidden"}: {f}
              </Button>
              {t.fields.includes(f) && (
                <Field
                  label={`${f} position`}
                  value={t.positions[f] || "Body"}
                  options={["Top", "Body", "Footer"]}
                  onChange={(v) => setT({ ...t, positions: { ...t.positions, [f]: v } })}
                />
              )}
            </div>
          ))}
        </div>
      </Card>
      <div className="cred-actions">
        <Button onClick={() => setBack(false)}>Front card</Button>
        <Button onClick={() => setBack(true)}>Back card</Button>
      </div>
      <CredentialPreview template={t} school={x.school} session={x.session} back={back} />
      <p>
        Saved template version {t.version}. Prior versions:{" "}
        {x.versions
          .filter((v) => v.id === t.id)
          .map((v) => `v${v.version}`)
          .join(", ") || "None"}
        . Template changes never alter issued snapshots.
      </p>
      <Button
        primary
        disabled={!x.canEdit}
        onClick={() => {
          try {
            x.saveTemplate(t);
            done("Template version saved");
          } catch (e) {
            setError((e as Error).message);
          }
        }}
      >
        Save template version
      </Button>
      {error && (
        <div role="alert" className="op-form-error">
          {error}
        </div>
      )}
    </>
  );
}
export function GenerationWizard({
  kind,
  done,
  initialMode = "New",
  initialPerson = "",
}: {
  kind: Kind;
  done: (s: string) => void;
  initialMode?: string;
  initialPerson?: string;
}) {
  const x = useCredentials(),
    people = x.people(kind === "Staff ID");
  const [step, setStep] = useState(1),
    [q, setQ] = useState(""),
    [grade, setGrade] = useState("All"),
    [section, setSection] = useState("All"),
    [department, setDepartment] = useState("All"),
    [designation, setDesignation] = useState("All"),
    [preview, setPreview] = useState(initialPerson),
    [error, setError] = useState(""),
    [batch, setBatch] = useState<Batch>();
  const [f, setF] = useState({
    type: kind === "Certificate" ? x.types[0]?.name || "" : kind,
    template: x.templates.find((t) => t.kind === kind)?.id || "",
    session: x.session,
    authority: x.policy.authority,
    issue: x.today,
    expiry: kind === "Certificate" ? "" : x.policy.expiry,
    text: "",
    review: "",
    acknowledgePhoto: false,
    mode: initialMode,
    reason: "",
    selected: initialPerson ? [initialPerson] : [],
    overrides: {} as Record<string, string>,
  });
  const input: GenerationInput = {
    ...f,
    kind,
    school: x.school,
    people,
    template: x.templates.find((t) => t.id === f.template),
  };
  const filtered = people.filter(
    (p) =>
      `${p.name} ${p.reference}`.toLowerCase().includes(q.toLowerCase()) &&
      (grade === "All" || p.grade === grade) &&
      (section === "All" || p.section === section) &&
      (department === "All" || p.department === department) &&
      (designation === "All" || p.designation === designation),
  );
  const update = (key: string, value: unknown) => setF((v) => ({ ...v, [key]: value }));
  const selected = people.filter((p) => f.selected.includes(p.id));
  const active = selected.find((p) => p.id === preview) || selected[0];
  const toggle = (id: string) =>
    update(
      "selected",
      f.selected.includes(id) ? f.selected.filter((v) => v !== id) : [...f.selected, id],
    );
  const warnings = selected.map((p) => ({
    p,
    error: recipientError(p, input, x.documents, x.policy, x.today),
  }));
  const next = () => {
    setError("");
    if (step === 2 && !selected.length) {
      setError("Select at least one recipient.");
      return;
    }
    if (step === 3) {
      const err = generationError(input);
      if (err) {
        setError(err);
        return;
      }
    }
    setStep(step + 1);
  };
  return (
    <>
      <div className="cred-step" role="status">
        Step {step} of 6 ·{" "}
        {
          [
            "",
            "Document setup",
            "Recipient selection",
            "School-reviewed data",
            "Individual / batch preview",
            "Review and confirm",
            "Generation results",
          ][step]
        }
      </div>
      {step === 1 && (
        <div className="cred-fields">
          <Field
            label="Document type"
            value={f.type}
            options={kind === "Certificate" ? x.types.map((t) => t.name) : [kind]}
            onChange={(v) => update("type", v)}
          />
          <Field
            label="Academic session"
            value={f.session}
            onChange={(v) => update("session", v)}
          />
          <Field
            label="Template"
            value={f.template}
            options={x.templates.filter((t) => t.kind === kind).map((t) => t.id)}
            onChange={(v) => update("template", v)}
          />
          <Field
            label="Issuing authority"
            value={f.authority}
            onChange={(v) => update("authority", v)}
          />
          <Field
            label="Generation mode"
            value={f.mode}
            options={
              kind === "Certificate" ? ["New", "Reissue"] : ["New", "Reissue", "Lost replacement"]
            }
            onChange={(v) => update("mode", v)}
          />
          {f.mode !== "New" && (
            <Field
              label="Reissue / replacement reason"
              value={f.reason}
              onChange={(v) => update("reason", v)}
            />
          )}
        </div>
      )}
      {step === 2 && (
        <>
          <div className="cred-filters">
            <Field label="Search recipients" value={q} onChange={setQ} />
            <Field
              label={kind === "Staff ID" ? "Department" : "Class"}
              value={kind === "Staff ID" ? department : grade}
              options={[
                "All",
                ...new Set(
                  people
                    .map((p) => (kind === "Staff ID" ? p.department || "" : p.grade || ""))
                    .filter(Boolean),
                ),
              ]}
              onChange={kind === "Staff ID" ? setDepartment : setGrade}
            />
            <Field
              label={kind === "Staff ID" ? "Designation" : "Section"}
              value={kind === "Staff ID" ? designation : section}
              options={[
                "All",
                ...new Set(
                  people
                    .map((p) => (kind === "Staff ID" ? p.designation || "" : p.section || ""))
                    .filter(Boolean),
                ),
              ]}
              onChange={kind === "Staff ID" ? setDesignation : setSection}
            />
          </div>
          <div className="cred-actions">
            <Button
              onClick={() =>
                update("selected", [
                  ...new Set([
                    ...f.selected,
                    ...filtered.filter((p) => p.status === "Active").map((p) => p.id),
                  ]),
                ])
              }
            >
              Select eligible filtered
            </Button>
            <Button onClick={() => update("selected", [])}>Deselect all</Button>
            <Badge>{selected.length} selected</Badge>
          </div>
          <Table
            headers={["Select", "Shared identity", "Reference", "Status", "Missing data"]}
            rows={filtered.map((p) => [
              <Button onClick={() => toggle(p.id)}>
                {f.selected.includes(p.id) ? "Selected" : "Select"}: {p.name}
              </Button>,
              p.name,
              p.reference,
              <Badge>{p.status}</Badge>,
              kind !== "Certificate" && !p.photo ? "Photo missing" : "No required photo",
            ])}
          />
        </>
      )}
      {step === 3 && (
        <>
          <p>
            No grades, achievements or completion status are inferred. Review the school criteria
            before confirming. Historical session selection does not imply verified enrollment.
          </p>
          <div className="cred-fields">
            <Field
              label="Issue date"
              type="date"
              value={f.issue}
              onChange={(v) => update("issue", v)}
            />
            <Field
              label="Card expiry / optional certificate expiry"
              type="date"
              value={f.expiry}
              onChange={(v) => update("expiry", v)}
            />
          </div>
          <Field
            label="School-reviewed certificate text"
            type="textarea"
            value={f.text}
            onChange={(v) => update("text", v)}
          />
          <Field
            label="Manual eligibility review and evidence"
            type="textarea"
            value={f.review}
            onChange={(v) => update("review", v)}
            hint={x.policy.graduation}
          />
          {kind !== "Certificate" && (
            <Field
              label="Acknowledge missing-photo placeholders"
              value={f.acknowledgePhoto ? "Acknowledged" : "Not acknowledged"}
              options={["Not acknowledged", "Acknowledged"]}
              onChange={(v) => update("acknowledgePhoto", v === "Acknowledged")}
            />
          )}
          <Card
            title="Optional display-name overrides"
            sub="Overrides are recorded on the issued document; shared student/staff identities are not edited."
          >
            <div className="cred-pad">
              {selected.map((p) => (
                <Field
                  key={p.id}
                  label={`Display name for ${p.name}`}
                  value={f.overrides[p.id] || ""}
                  onChange={(v) => update("overrides", { ...f.overrides, [p.id]: v })}
                />
              ))}
            </div>
          </Card>
        </>
      )}
      {step === 4 && (
        <>
          <Field
            label="Preview recipient"
            value={active?.id || ""}
            options={selected.map((p) => p.id)}
            onChange={setPreview}
          />
          {input.template && (
            <CredentialPreview
              template={input.template}
              person={
                active ? { ...active, name: f.overrides[active.id] || active.name } : undefined
              }
              school={x.school}
              session={f.session}
              body={input.template.body
                .split("{name}")
                .join(active?.name || "")
                .split("{text}")
                .join(f.text)}
              date={f.issue}
              expiry={f.expiry}
            />
          )}
          <Table
            headers={["Batch recipient", "Eligibility / warning"]}
            rows={warnings.map((v) => [v.p.name, v.error || "Ready after manual school review"])}
          />
        </>
      )}
      {step === 5 && (
        <>
          <Card
            title="Generation review"
            sub="Explicit confirmation required. No real PDF, storage, signing, verification or printing."
          >
            <div className="cred-pad">
              <p>
                {selected.length} recipients · {f.type} · {input.template?.name} v
                {input.template?.version} · {f.session}
              </p>
              <p>
                {warnings.filter((v) => !v.error).length} ready ·{" "}
                {warnings.filter((v) => v.error).length} will be skipped. Reissue supersedes
                previous matching credentials; reprinting does not.
              </p>
              <Table
                headers={["Recipient", "Result preview"]}
                rows={warnings.map((v) => [v.p.name, v.error || "Ready"])}
              />
            </div>
          </Card>
          <Button
            primary
            disabled={!x.canEdit}
            onClick={() => {
              try {
                setBatch(x.generate(input));
                setStep(6);
                done("Generation simulation completed");
              } catch (e) {
                setError((e as Error).message);
              }
            }}
          >
            Confirm generation (simulation)
          </Button>
        </>
      )}
      {step === 6 && batch && (
        <>
          <p role="status">
            Generated {batch.rows.filter((r) => r.status === "Generated").length} · Skipped{" "}
            {batch.rows.filter((r) => r.status === "Skipped").length} · Failed{" "}
            {batch.rows.filter((r) => r.status === "Failed").length}
          </p>
          <Table
            headers={["Recipient", "Result", "Reason", "Document number"]}
            rows={batch.rows.map((r) => [
              people.find((p) => p.id === r.person)?.name || r.person,
              r.status,
              r.reason,
              x.documents.find((d) => d.id === r.document)?.number || "—",
            ])}
          />
          <Button
            onClick={() => {
              setStep(1);
              setBatch(undefined);
            }}
          >
            Start another batch
          </Button>
        </>
      )}
      <div className="cred-actions">
        {step > 1 && step < 6 && <Button onClick={() => setStep(step - 1)}>Back</Button>}
        {step < 5 && (
          <Button primary onClick={next}>
            Continue
          </Button>
        )}
      </div>
      {error && (
        <div role="alert" className="op-form-error">
          {error}
        </div>
      )}
    </>
  );
}

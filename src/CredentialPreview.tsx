import type { Credential, Template, Person } from "./credentialsModel";
export default function CredentialPreview({
  template,
  person,
  school,
  session,
  body = "",
  number = "Assigned on generation",
  date = "",
  expiry = "",
  status = "PREVIEW",
  back = false,
}: {
  template: Template;
  person?: Person;
  school: string;
  session: string;
  body?: string;
  number?: string;
  date?: string;
  expiry?: string;
  status?: string;
  back?: boolean;
}) {
  const values: Record<string, string> = {
    Name: person?.name || "Recipient name",
    Reference: person?.reference || "Admission / staff reference",
    Class: person?.grade || "Not supplied",
    Section: person?.section || "Not supplied",
    Session: session,
    Department: person?.department || "Not supplied",
    Designation: person?.designation || "Not supplied",
    Expiry: expiry || "Not configured",
    DOB: "Sensitive · not supplied",
    "Emergency information": "Sensitive · not supplied",
    "Joining date": "Sensitive · not supplied",
  };
  return (
    <div
      className={`cred-preview palette-${template.palette.toLowerCase()} font-${template.font === "School serif" ? "serif" : "sans"} orientation-${template.orientation.toLowerCase()} layout-${template.layout.toLowerCase()}`}
      aria-label={back ? "Back document preview" : "Front document preview"}
    >
      <div className="cred-watermark">
        PROTOTYPE · {status.toUpperCase()} · NOT AN OFFICIAL CREDENTIAL
      </div>
      <div className={`cred-logo placement-${template.logo.toLowerCase()}`}>SCHOOL SEAL / LOGO</div>
      <strong className="cred-school">{school}</strong>
      <div>{template.schoolContact || "School contact not configured"}</div>
      <div className="cred-document-title">{back ? "Card information" : template.title}</div>
      {back ? (
        <p>{template.back}</p>
      ) : (
        <>
          {template.kind !== "Certificate" && (
            <div className={`cred-photo placement-${template.photo.toLowerCase()}`}>
              Photo unavailable
              <br />
              PLACEHOLDER
            </div>
          )}
          {["Top", "Body", "Footer"].map((zone) => (
            <div className={`cred-zone zone-${zone.toLowerCase()}`} key={zone}>
              {template.fields
                .filter((f) => (template.positions[f] || "Body") === zone)
                .map((f) => (
                  <div key={f}>
                    <small>{f}</small>
                    <strong>{values[f] || "Not supplied"}</strong>
                  </div>
                ))}
            </div>
          ))}
          {template.kind === "Certificate" && (
            <p className="cred-body">
              {body ||
                template.body
                  .split("{name}")
                  .join(person?.name || "Recipient name")
                  .split("{text}")
                  .join("School-reviewed wording will appear here.")}
            </p>
          )}
        </>
      )}
      <div className="cred-signatures">
        <span>
          {date || "Issue date"}
          <br />
          {number}
        </span>
        <span>
          {template.signature}
          <br />
          Signature placeholder
        </span>
      </div>
      <small>
        QR / barcode placeholder · no cryptographic verification · {template.dimensions}{" "}
        {template.orientation}
      </small>
    </div>
  );
}
export function IssuedPreview({
  document: d,
  back = false,
}: {
  document: Credential;
  back?: boolean;
}) {
  return (
    <CredentialPreview
      template={d.template}
      person={d.identity}
      school={d.school}
      session={d.session}
      body={d.body}
      number={d.number}
      date={d.issue}
      expiry={d.expiry}
      status={d.status}
      back={back}
    />
  );
}

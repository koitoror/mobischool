import type { Student } from "./Lifecycle";
export const certificatePages = [
  "Certificates Overview",
  "Student Certificate",
  "Generate Certificate",
  "Student ID Card",
  "Generate ID Card",
  "Staff ID Card",
  "Generate Staff ID Card",
];
export const alumniPages = ["Alumni Overview", "Manage Alumni", "Events"];
export const credentialPages = [...certificatePages, ...alumniPages];
export type Kind = "Certificate" | "Student ID" | "Staff ID";
export type Audit = { at: string; actor: string; action: string };
export type Template = {
  id: string;
  name: string;
  kind: Kind;
  version: number;
  title: string;
  body: string;
  orientation: string;
  dimensions: string;
  palette: string;
  font: string;
  layout: string;
  logo: string;
  photo: string;
  fields: string[];
  positions: Record<string, string>;
  back: string;
  signature: string;
  schoolContact: string;
  history: Audit[];
};
export type CertificateType = { name: string; guidance: string };
export const sampleTypes: CertificateType[] = [
  "Academic Achievement",
  "Completion Certificate",
  "Participation Certificate",
  "Appreciation Certificate",
  "Transfer Certificate",
  "Character Certificate",
  "School Leaving Certificate",
  "Custom Certificate",
].map((name) => ({
  name,
  guidance: "Manual school review required. Do not infer attainment or completion.",
}));
export const sampleTemplate = (kind: Kind, id: string): Template => ({
  id,
  name: `Illustrative ${kind} template`,
  kind,
  version: 1,
  title: kind === "Certificate" ? "Certificate of Recognition" : `${kind} Card`,
  body: "This document is presented to {name}. {text}",
  orientation: kind === "Certificate" ? "Landscape" : "Portrait",
  dimensions: kind === "Certificate" ? "A4" : "CR80",
  palette: "School",
  font: "School sans",
  layout: "Centered",
  logo: "Top",
  photo: "Left",
  fields:
    kind === "Staff ID"
      ? ["Name", "Reference", "Department", "Designation", "Expiry"]
      : ["Name", "Reference", "Class", "Section", "Session", "Expiry"],
  positions: {},
  back: "If found, please return this card to the school office. This prototype is not an access credential.",
  signature: "Authorized signatory",
  schoolContact: "",
  history: [],
});
export type Person = {
  id: string;
  name: string;
  reference: string;
  status: string;
  grade?: string;
  section?: string;
  department?: string;
  designation?: string;
  photo?: string;
};
export type DocumentStatus =
  | "Draft"
  | "Generated"
  | "Active"
  | "Expired"
  | "Reissued"
  | "Lost"
  | "Revoked"
  | "Voided";
export type Credential = {
  id: string;
  number: string;
  kind: Kind;
  type: string;
  person: string;
  identity: Person;
  session: string;
  school: string;
  authority: string;
  issue: string;
  expiry: string;
  status: DocumentStatus;
  template: Template;
  version: number;
  body: string;
  manualText: string;
  override: string;
  issuedAt: string;
  actor: string;
  batch: string;
  reissueOf: string;
  replacedBy: string;
  history: Audit[];
};
export type GenerationInput = {
  kind: Kind;
  type: string;
  template: Template | undefined;
  people: Person[];
  selected: string[];
  session: string;
  school: string;
  authority: string;
  issue: string;
  expiry: string;
  text: string;
  review: string;
  acknowledgePhoto: boolean;
  mode: string;
  reason: string;
  overrides: Record<string, string>;
};
export type BatchRow = {
  person: string;
  status: "Generated" | "Skipped" | "Failed";
  reason: string;
  document: string;
};
export type Batch = {
  id: string;
  kind: Kind;
  session: string;
  at: string;
  actor: string;
  rows: BatchRow[];
};
export type Alumni = {
  id: string;
  student: string;
  externalName: string;
  year: string;
  session: string;
  grade: string;
  section: string;
  status: string;
  email: string;
  phone: string;
  occupation: string;
  organization: string;
  location: string;
  education: string;
  notes: string;
  consent: string;
  review: string;
  academicRefs: string[];
  history: Audit[];
};
export type AlumniEvent = {
  id: string;
  name: string;
  type: string;
  description: string;
  date: string;
  start: string;
  end: string;
  location: string;
  organizer: string;
  years: string[];
  grades: string[];
  registration: string;
  deadline: string;
  capacity: number;
  status: string;
  image: string;
  notes: string;
  history: Audit[];
};
export type RSVP = {
  id: string;
  event: string;
  alumni: string;
  status: string;
  at: string;
  history: Audit[];
};
export type Policy = {
  authority: string;
  signatory: string;
  expiry: string;
  allowReissue: boolean;
  allowSensitive: boolean;
  photo: string;
  graduation: string;
  statuses: string[];
  eventTypes: string[];
  waitlist: boolean;
};
export const defaultPolicy: Policy = {
  authority: "School office · preview",
  signatory: "Authorized signatory",
  expiry: "2025-12-31",
  allowReissue: true,
  allowSensitive: false,
  photo: "Placeholder with acknowledgement",
  graduation: "Manual review; no automatic completion criteria configured",
  statuses: ["Registered", "Unregistered", "Inactive", "Archived"],
  eventTypes: [
    "Reunion",
    "Networking",
    "Mentorship",
    "Career event",
    "Fundraising",
    "School celebration",
    "Alumni meeting",
    "Other",
  ],
  waitlist: true,
};
export const uid = (prefix: string) => `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
export const validDate = (value: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  !Number.isNaN(Date.parse(value)) &&
  new Date(value).toISOString().slice(0, 10) === value;
const required = (s?: string) => !!s?.trim();
export function effectiveStatus(d: Credential, today: string): DocumentStatus {
  return ["Active", "Generated"].includes(d.status) && d.expiry && d.expiry < today
    ? "Expired"
    : d.status;
}
export const isValid = (d: Credential, today: string) =>
  ["Active", "Generated"].includes(effectiveStatus(d, today));
export function generationError(input: GenerationInput) {
  if (!input.template || input.template.kind !== input.kind)
    return "Choose a matching saved template.";
  if (!input.selected.length) return "Select at least one recipient.";
  if (
    !required(input.type) ||
    !required(input.session) ||
    !required(input.school) ||
    !required(input.authority)
  )
    return "Type, session, school and issuing authority are required.";
  if (
    !validDate(input.issue) ||
    (input.expiry && (!validDate(input.expiry) || input.expiry < input.issue))
  )
    return "Provide a valid issue date and expiry on or after issue.";
  if (input.kind !== "Certificate" && !input.expiry) return "An ID card expiry is required.";
  if (!required(input.review))
    return "Record your manual eligibility review. No achievement or completion is inferred.";
  if (input.mode !== "New" && !required(input.reason))
    return "Explain the reissue or lost-card replacement.";
  return "";
}
export function recipientError(
  p: Person | undefined,
  input: GenerationInput,
  records: Credential[],
  policy: Policy,
  today: string,
) {
  if (!p) return "Recipient no longer exists in the shared registry.";
  if (p.status !== "Active") return "Inactive or disabled recipient: active generation blocked.";
  if (!required(p.name) || !required(p.reference))
    return "Missing name or admission/staff reference.";
  if (input.kind !== "Staff ID" && (!p.grade || !p.section)) return "Missing class or section.";
  if (
    input.kind !== "Certificate" &&
    !p.photo &&
    (policy.photo === "Required" || !input.acknowledgePhoto)
  )
    return "Missing photograph. Add a photo or explicitly acknowledge the placeholder policy.";
  const prior = records.filter(
    (d) =>
      d.person === p.id &&
      d.kind === input.kind &&
      (input.kind !== "Certificate" || (d.type === input.type && d.session === input.session)),
  );
  const current = prior.find((d) => isValid(d, today));
  if (input.mode === "New" && current)
    return "Duplicate valid document. Use explicit reissue instead.";
  if (input.mode !== "New" && !policy.allowReissue)
    return "Reissue is disabled by the school preview policy.";
  if (input.mode !== "New" && !prior.length) return "No previous matching document to reissue.";
  if (input.mode === "Lost replacement" && !prior.some((d) => effectiveStatus(d, today) === "Lost"))
    return "Mark the previous card Lost before requesting replacement.";
  return "";
}
export function generateBatch(
  input: GenerationInput,
  records: Credential[],
  policy: Policy,
  today: string,
  actor: string,
  at = new Date().toISOString(),
): { records: Credential[]; batch: Batch } {
  const error = generationError(input);
  if (error) throw Error(error);
  const batch: Batch = {
    id: uid("BATCH"),
    kind: input.kind,
    session: input.session,
    at,
    actor,
    rows: [],
  };
  let next = records.map((d) => ({ ...d, history: [...d.history] }));
  for (const id of [...new Set(input.selected)]) {
    const person = input.people.find((p) => p.id === id),
      reason = recipientError(person, input, next, policy, today);
    if (reason) {
      batch.rows.push({ person: id, status: person ? "Skipped" : "Failed", reason, document: "" });
      continue;
    }
    const p = person!;
    const previous =
      input.mode !== "New"
        ? [...next]
            .reverse()
            .find(
              (d) =>
                d.person === id &&
                d.kind === input.kind &&
                (input.kind !== "Certificate" ||
                  (d.type === input.type && d.session === input.session)),
            )
        : undefined;
    const documentId = uid("DOC");
    const number = `${input.kind === "Certificate" ? "CERT" : input.kind === "Student ID" ? "SID" : "HRID"}-${at.slice(0, 4)}-${String(next.length + 1).padStart(6, "0")}`;
    if (next.some((d) => d.number === number)) {
      batch.rows.push({
        person: id,
        status: "Failed",
        reason: "Duplicate document number; retry after reconciliation.",
        document: "",
      });
      continue;
    }
    if (previous) {
      // Any currently valid predecessor is superseded; prior immutable snapshots remain retained.
      next = next.map((d) =>
        d.person === id &&
        d.kind === input.kind &&
        (input.kind !== "Certificate" || (d.type === input.type && d.session === input.session)) &&
        (isValid(d, today) || d.id === previous.id)
          ? {
              ...d,
              status: "Reissued",
              replacedBy: documentId,
              history: [
                ...d.history,
                { at, actor, action: `Superseded by ${documentId}: ${input.reason}` },
              ],
            }
          : d,
      );
    }
    const name = input.overrides[id]?.trim() || p.name;
    const template = structuredClone(input.template!);
    const doc: Credential = {
      id: documentId,
      number,
      kind: input.kind,
      type: input.type,
      person: id,
      identity: { ...p, name },
      session: input.session,
      school: input.school,
      authority: input.authority,
      issue: input.issue,
      expiry: input.expiry,
      status: input.kind === "Certificate" ? "Generated" : "Active",
      template,
      version: 1,
      body: template.body.split("{name}").join(name).split("{text}").join(input.text),
      manualText: input.text,
      override: input.overrides[id]
        ? `Display-name override from shared name ${p.name}; reviewed: ${input.review}`
        : "",
      issuedAt: at,
      actor,
      batch: batch.id,
      reissueOf: previous?.id || "",
      replacedBy: "",
      history: [
        {
          at,
          actor,
          action: `Generated simulation. Manual review: ${input.review}${previous ? `. ${input.mode}: ${input.reason}` : ""}`,
        },
      ],
    };
    next.push(doc);
    batch.rows.push({
      person: id,
      status: "Generated",
      reason: "Prototype document; not an official credential.",
      document: documentId,
    });
  }
  return { records: next, batch };
}
export function transitionDocument(
  d: Credential,
  status: DocumentStatus,
  reason: string,
  actor: string,
  at: string,
): Credential {
  if (!reason.trim()) throw Error("A reason is required.");
  if (["Revoked", "Voided", "Reissued"].includes(d.status))
    throw Error("This historical document cannot be changed. Use the linked replacement.");
  if (!["Revoked", "Voided", "Lost", "Active"].includes(status))
    throw Error("Unsupported document transition.");
  if (status === "Lost" && d.kind === "Certificate") throw Error("Lost applies to ID cards only.");
  if (status === "Active" && !["Generated", "Draft"].includes(d.status))
    throw Error("Only draft/generated cards may be activated.");
  return {
    ...d,
    status,
    history: [...d.history, { at, actor, action: `${d.status} → ${status}: ${reason}` }],
  };
}
export function templateError(t: Template, templates: Template[], allowSensitive: boolean) {
  if (![t.name, t.title, t.body, t.signature].every(required))
    return "Template name, title, wording and signatory are required.";
  if (
    templates.some(
      (v) =>
        v.id !== t.id &&
        v.kind === t.kind &&
        v.name.trim().toLowerCase() === t.name.trim().toLowerCase(),
    )
  )
    return "Template name already exists for this document type.";
  if (!t.fields.includes("Name") || !t.fields.includes("Reference"))
    return "Name and Reference must remain visible.";
  if (
    !allowSensitive &&
    t.fields.some((f) => ["DOB", "Emergency information", "Joining date"].includes(f))
  )
    return "Sensitive fields require the restricted school preview policy.";
  return "";
}
export const alumniName = (a: Alumni, students: Student[]) =>
  a.student
    ? students.find((s) => s.id === a.student)?.name || "Shared student unavailable"
    : a.externalName;
export function alumniError(a: Alumni, records: Alumni[], students: Student[]) {
  if (!a.student && !a.externalName.trim())
    return "Choose a shared student or provide an external alumnus name.";
  if (a.student && !students.some((s) => s.id === a.student))
    return "Shared student reference is unavailable.";
  if (!/^\d{4}$/.test(a.year) || Number(a.year) < 1900 || Number(a.year) > new Date().getFullYear())
    return "Provide a valid graduation year, not a future year.";
  if (!a.session.trim() || !a.grade.trim())
    return "Graduation session and last known class are required.";
  if (!a.review.trim())
    return "Manual graduation review with a reason is required. No verified completion criteria are configured.";
  if (
    records.some(
      (r) =>
        r.id !== a.id &&
        ((a.student && r.student === a.student) ||
          (!a.student &&
            !r.student &&
            r.externalName.trim().toLowerCase() === a.externalName.trim().toLowerCase() &&
            r.year === a.year) ||
          (a.email && r.email.toLowerCase() === a.email.toLowerCase())),
    )
  )
    return "Duplicate alumni identity or email. Edit the existing record.";
  if (a.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(a.email))
    return "Use a valid email address or leave it blank.";
  return "";
}
export function eventError(e: AlumniEvent, records: AlumniEvent[], rsvps: RSVP[], today: string) {
  if (![e.name, e.type, e.location, e.organizer].every(required))
    return "Event name, type, location and organizer are required.";
  if (
    !validDate(e.date) ||
    !/^\d{2}:\d{2}$/.test(e.start) ||
    !/^\d{2}:\d{2}$/.test(e.end) ||
    e.start >= e.end ||
    [e.start, e.end].some((t) => Number(t.slice(0, 2)) > 23 || Number(t.slice(3)) > 59)
  )
    return "Provide a valid event date and end time after start.";
  if (e.status === "Published" && e.date < today) return "Past events cannot be newly published.";
  if (e.deadline && (!validDate(e.deadline) || e.deadline > e.date))
    return "Registration deadline must be a valid date on or before the event.";
  if (!Number.isSafeInteger(e.capacity) || e.capacity < 0)
    return "Capacity must be a non-negative whole number; zero means unlimited.";
  const count = rsvps.filter(
    (r) => r.event === e.id && ["Registered", "Attending", "Attendance marked"].includes(r.status),
  ).length;
  if (e.capacity && e.capacity < count)
    return "Capacity cannot be reduced below existing registrations.";
  if (
    records.some(
      (r) =>
        r.id !== e.id &&
        r.name.trim().toLowerCase() === e.name.trim().toLowerCase() &&
        r.date === e.date,
    )
  )
    return "An event with this name and date already exists.";
  return "";
}
export function rsvpError(
  e: AlumniEvent | undefined,
  a: Alumni | undefined,
  rsvps: RSVP[],
  status: string,
  today: string,
) {
  if (!e || !a || ["Inactive", "Archived"].includes(a.status))
    return "Choose an active alumni record.";
  if (e.status !== "Published") return "Registration is available only for published events.";
  if (status === "Attendance marked") {
    if (e.date > today) return "Attendance cannot be marked before the event date.";
    if (
      !rsvps.some(
        (r) =>
          r.event === e.id && r.alumni === a.id && ["Registered", "Attending"].includes(r.status),
      )
    )
      return "Attendance requires an existing registered/attending RSVP.";
  } else if (e.date < today || (e.deadline && e.deadline < today)) return "Registration is closed.";
  if (e.years.length && !e.years.includes(a.year))
    return "Alumnus is outside the graduation-year audience.";
  if (e.grades.length && !e.grades.includes(a.grade))
    return "Alumnus is outside the class audience.";
  if (rsvps.some((r) => r.event === e.id && r.alumni === a.id && r.status === status))
    return "Duplicate RSVP status. The existing registration is unchanged.";
  return "";
}
export function registerRSVP(
  e: AlumniEvent,
  a: Alumni,
  rsvps: RSVP[],
  requested: string,
  today: string,
  waitlist: boolean,
  actor: string,
): RSVP[] {
  const error = rsvpError(e, a, rsvps, requested, today);
  if (error) throw Error(error);
  const existing = rsvps.find((r) => r.event === e.id && r.alumni === a.id);
  const occupied = rsvps.filter(
    (r) =>
      r.event === e.id &&
      r.id !== existing?.id &&
      ["Registered", "Attending", "Attendance marked"].includes(r.status),
  ).length;
  const full =
    e.capacity > 0 && occupied >= e.capacity && ["Registered", "Attending"].includes(requested);
  if (full && !waitlist)
    throw Error("Event capacity reached. Enable waitlist or increase capacity.");
  const status = full ? "Waitlisted" : requested,
    at = new Date().toISOString();
  const row: RSVP = {
    id: existing?.id || uid("RSVP"),
    event: e.id,
    alumni: a.id,
    status,
    at,
    history: [
      ...(existing?.history || []),
      { at, actor, action: `${existing?.status || "New"} → ${status}` },
    ],
  };
  return [...rsvps.filter((r) => r.id !== row.id), row];
}

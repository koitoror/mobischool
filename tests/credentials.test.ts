import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { WorkforceProvider } from "../src/WorkforceContext";
import { CredentialsProvider } from "../src/CredentialsContext";
import Credentials from "../src/Credentials";
import {
  credentialPages,
  sampleTemplate,
  defaultPolicy,
  generationError,
  generateBatch,
  recipientError,
  transitionDocument,
  effectiveStatus,
  templateError,
  alumniError,
  eventError,
  registerRSVP,
  type GenerationInput,
  type Alumni,
  type AlumniEvent,
} from "../src/credentialsModel";
const person = {
  id: "S",
  name: "Student",
  reference: "ADM-1",
  status: "Active",
  grade: "Grade 8",
  section: "A",
};
const input: GenerationInput = {
  kind: "Certificate",
  type: "Participation",
  template: sampleTemplate("Certificate", "T"),
  people: [person],
  selected: ["S"],
  session: "2024 – 2025",
  school: "School",
  authority: "Office",
  issue: "2025-02-24",
  expiry: "",
  text: "Manually supplied",
  review: "Reviewed illustrative participation",
  acknowledgePhoto: false,
  mode: "New",
  reason: "",
  overrides: {},
};
const today = "2025-02-24",
  at = "2025-02-24T10:00:00.000Z";
const generate = () => generateBatch(input, [], defaultPolicy, today, "Preview", at);
test("issuance creates immutable template snapshot", () => {
  const { records } = generate();
  input.template!.title = "Edited";
  assert.notEqual(records[0].template.title, input.template!.title);
});
test("duplicate valid credential skipped", () => {
  const r = generate();
  assert.equal(
    generateBatch(input, r.records, defaultPolicy, today, "Preview", at).batch.rows[0].status,
    "Skipped",
  );
});
test("mixed batch has generated skipped failed results", () => {
  const output = generateBatch(
    {
      ...input,
      selected: ["S", "I", "M"],
      people: [person, { ...person, id: "I", status: "Inactive" }],
    },
    [],
    defaultPolicy,
    today,
    "Preview",
    at,
  );
  assert.deepEqual(
    output.batch.rows.map((r) => r.status),
    ["Generated", "Skipped", "Failed"],
  );
});
test("explicit reissue supersedes predecessor", () => {
  const r = generate();
  const n = generateBatch(
    { ...input, mode: "Reissue", reason: "Correction" },
    r.records,
    defaultPolicy,
    today,
    "Preview",
    at,
  );
  assert.equal(n.records[0].status, "Reissued");
  assert.equal(n.records[1].reissueOf, r.records[0].id);
});
for (const [name, patch] of [
  ["no recipients", { selected: [] }],
  ["missing template", { template: undefined }],
  ["invalid date", { issue: "2025-02-30" }],
  ["missing authority", { authority: "" }],
  ["unreviewed", { review: "" }],
] as const)
  test(name, () => assert.ok(generationError({ ...input, ...patch })));
test("missing admission reference rejected", () =>
  assert.match(
    recipientError({ ...person, reference: "" }, input, [], defaultPolicy, today),
    /reference/,
  ));
test("disabled staff rejected", () =>
  assert.match(
    recipientError({ ...person, status: "Disabled" }, input, [], defaultPolicy, today),
    /disabled/,
  ));
test("missing photo requires acknowledgment", () =>
  assert.match(
    recipientError(person, { ...input, kind: "Student ID" }, [], defaultPolicy, today),
    /photograph/,
  ));
test("strict photo policy cannot be bypassed", () =>
  assert.match(
    recipientError(
      person,
      { ...input, kind: "Student ID", acknowledgePhoto: true },
      [],
      { ...defaultPolicy, photo: "Required" },
      today,
    ),
    /photograph/,
  ));
test("revocation reason required", () =>
  assert.throws(
    () => transitionDocument(generate().records[0], "Revoked", "", "actor", at),
    /reason/,
  ));
test("revoked credential retained invalid", () => {
  const d = transitionDocument(generate().records[0], "Revoked", "Wrong data", "actor", at);
  assert.equal(effectiveStatus(d, today), "Revoked");
  assert.throws(() => transitionDocument(d, "Active", "retry", "actor", at));
});
test("expiry is derived", () =>
  assert.equal(
    effectiveStatus({ ...generate().records[0], expiry: "2025-02-23" }, today),
    "Expired",
  ));
test("sensitive template fields blocked", () =>
  assert.match(
    templateError(
      { ...sampleTemplate("Student ID", "T"), fields: ["Name", "Reference", "DOB"] },
      [],
      false,
    ),
    /Sensitive/,
  ));
const a: Alumni = {
  id: "A",
  student: "",
  externalName: "Example Alumnus",
  year: "2024",
  session: "2023 – 2024",
  grade: "Grade 12",
  section: "A",
  status: "Registered",
  email: "",
  phone: "",
  occupation: "",
  organization: "",
  location: "",
  education: "",
  notes: "",
  consent: "Not recorded",
  review: "Manual historical review",
  academicRefs: [],
  history: [],
};
test("manual alumni without contacts accepted", () => assert.equal(alumniError(a, [], []), ""));
test("unreviewed graduation rejected", () =>
  assert.match(alumniError({ ...a, review: "" }, [], []), /review/));
test("graduation year required", () =>
  assert.match(alumniError({ ...a, year: "" }, [], []), /year/));
test("duplicate alumni import blocked", () =>
  assert.match(alumniError({ ...a, id: "B" }, [a], []), /Duplicate/));
const event: AlumniEvent = {
  id: "E",
  name: "Reunion",
  type: "Reunion",
  description: "",
  date: today,
  start: "10:00",
  end: "12:00",
  location: "School",
  organizer: "Office",
  years: [],
  grades: [],
  registration: "Required",
  deadline: today,
  capacity: 1,
  status: "Published",
  image: "",
  notes: "",
  history: [],
};
test("event time order validated", () =>
  assert.match(eventError({ ...event, end: "09:00" }, [], [], today), /time/));
test("past publication blocked", () =>
  assert.match(eventError({ ...event, date: "2024-01-01" }, [], [], today), /Past/));
test("RSVP capacity creates waitlist", () => {
  const r = registerRSVP(event, a, [], "Registered", today, true, "actor");
  assert.equal(
    registerRSVP(event, { ...a, id: "B" }, r, "Registered", today, true, "actor")[1].status,
    "Waitlisted",
  );
});
test("capacity hard guard", () => {
  const r = registerRSVP(event, a, [], "Registered", today, false, "actor");
  assert.throws(
    () => registerRSVP(event, { ...a, id: "B" }, r, "Registered", today, false, "actor"),
    /capacity/,
  );
});
test("duplicate RSVP rejected", () => {
  const r = registerRSVP(event, a, [], "Registered", today, true, "actor");
  assert.throws(() => registerRSVP(event, a, r, "Registered", today, true, "actor"), /Duplicate/);
});
test("cancelled event rejected", () =>
  assert.throws(
    () =>
      registerRSVP({ ...event, status: "Cancelled" }, a, [], "Registered", today, true, "actor"),
    /published/,
  ));
test("audience restriction enforced", () =>
  assert.throws(
    () => registerRSVP({ ...event, years: ["2000"] }, a, [], "Registered", today, true, "actor"),
    /audience/,
  ));
test("attendance requires registration", () =>
  assert.throws(
    () => registerRSVP(event, a, [], "Attendance marked", today, true, "actor"),
    /requires/,
  ));
test("attendance cannot precede event", () =>
  assert.throws(
    () =>
      registerRSVP(
        { ...event, date: "2025-02-25" },
        a,
        [],
        "Attendance marked",
        today,
        true,
        "actor",
      ),
    /before/,
  ));
const student = { ...person, guardian: "", phone: "", date: "" };
for (const page of credentialPages)
  test("SSR route " + page, () => {
    const html = renderToStaticMarkup(
      h(WorkforceProvider, {
        children: h(CredentialsProvider, {
          students: [student],
          session: input.session,
          school: "School",
          children: h(Credentials, {
            page,
            active: true,
            navigate: () => {},
            onDirty: () => {},
            notify: () => {},
          }),
        }),
      }),
    );
    assert.ok(html.includes("Illustrative Data"));
    assert.ok(!html.includes("NaN"));
  });

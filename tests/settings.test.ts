import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { WorkforceProvider } from "../src/WorkforceContext";
import { AcademicProvider } from "../src/AcademicContext";
import { FinanceProvider } from "../src/FinanceContext";
import { ExaminationProvider } from "../src/ExaminationContext";
import { SettingsProvider } from "../src/SettingsContext";
import Settings from "../src/Settings";
import {
  settingsPages,
  systemSettingPages,
  identityError,
  sessionError,
  referenceError,
  userError,
  customFieldError,
  moduleDisableError,
  type SessionConfig,
  type ConfigUser,
  type CustomField,
} from "../src/settingsModel";
import { gradeError, sampleBands } from "../src/examinationModel";
const identity = {
  name: "School",
  code: "SCH",
  country: "Kenya",
  currency: "KES",
  timezone: "Africa/Nairobi",
  email: "office@example.org",
};
test("eight exact original submenus plus overview", () => {
  assert.equal(systemSettingPages.length, 9);
  for (const label of [
    "Payment Methods",
    "Print Header Footer",
    "Backup Restore",
    "Users",
    "Custom Fields",
    "System Fields",
    "Student Profile Update",
    "Online Admission",
  ])
    assert.ok(systemSettingPages.includes(label));
});
test("identity with explicit country/currency/timezone valid", () =>
  assert.equal(identityError(identity), ""));
test("invalid email blocked", () =>
  assert.match(identityError({ ...identity, email: "bad" }), /email/));
test("invalid timezone blocked", () =>
  assert.match(identityError({ ...identity, timezone: "Not a zone" }), /timezone/));
test("invalid currency blocked", () =>
  assert.match(identityError({ ...identity, currency: "money" }), /Currency/));
test("unsafe logo URL blocked", () =>
  assert.match(identityError({ ...identity, logo: "javascript:alert(1)" }), /logo/));
const session: SessionConfig = {
  id: "S",
  name: "2025",
  start: "2025-01-01",
  end: "2025-12-31",
  status: "Draft",
  terms: [],
  holidays: "",
  history: [],
};
test("reversed session blocked", () =>
  assert.match(sessionError({ ...session, end: "2024-01-01" }, []), /end/));
test("session term overlap blocked", () =>
  assert.match(
    sessionError(
      {
        ...session,
        terms: [
          { name: "T1", start: "2025-01-01", end: "2025-04-01" },
          { name: "T2", start: "2025-03-01", end: "2025-07-01" },
        ],
      },
      [],
    ),
    /overlap/,
  ));
test("term outside dates blocked", () =>
  assert.match(
    sessionError(
      { ...session, terms: [{ name: "T", start: "2024-01-01", end: "2025-04-01" }] },
      [],
    ),
    /within/,
  ));
test("duplicate session blocked", () =>
  assert.match(sessionError({ ...session, id: "N" }, [session]), /exists/));
test("duplicate classes and subjects blocked", () =>
  assert.match(referenceError("grade 8", ["Grade 8"]), /Duplicate/));
const admin: ConfigUser = {
  id: "A",
  person: "",
  name: "Admin",
  role: "School Administrator",
  status: "Active",
  history: [],
};
test("last administrator deactivation blocked", () =>
  assert.match(userError({ ...admin, status: "Inactive" }, [admin]), /final/));
test("last administrator demotion blocked", () =>
  assert.match(userError({ ...admin, role: "Teacher" }, [admin]), /final/));
test("another admin makes guarded deactivation valid", () =>
  assert.equal(userError({ ...admin, status: "Inactive" }, [admin, { ...admin, id: "B" }]), ""));
const field: CustomField = {
  id: "F",
  name: "Choice",
  key: "choice",
  entity: "Student",
  type: "Text",
  required: "Optional",
  visibility: "Administrator",
  status: "Active",
  options: "",
  defaultValue: "",
  description: "",
};
test("protected system key blocked", () =>
  assert.match(customFieldError({ ...field, key: "id" }, []), /reserved/));
test("duplicate field blocked", () =>
  assert.match(customFieldError({ ...field, id: "N" }, [field]), /Duplicate/));
test("incompatible field type change blocked", () =>
  assert.match(customFieldError({ ...field, type: "Number" }, [field]), /immutable/));
test("dependent module disable blocked", () =>
  assert.match(moduleDisableError("Student Information", []), /depend/));
test("existing grading validator rejects overlap", () =>
  assert.ok(
    gradeError([
      { ...sampleBands[0], min: 0, max: 60 },
      { ...sampleBands[1], min: 50, max: 100 },
    ]),
  ));
const students = [
    {
      id: "S",
      name: "Student",
      grade: "Grade 8",
      section: "A",
      guardian: "",
      phone: "",
      date: "2025-02-24",
      status: "Active",
    },
  ],
  sessionName = "2024 – 2025";
for (const page of settingsPages)
  test("settings route " + page, () => {
    let element = h(Settings, {
      page,
      active: true,
      navigate: () => {},
      notify: () => {},
      onDirty: () => {},
      modules: ["Student Information", "Academics", "Reports"],
    });
    element = h(SettingsProvider, {
      school: "School",
      session: sessionName,
      logo: "",
      motto: "Motto",
      students,
      sessions: [sessionName],
      setIdentity: () => {},
      setSession: () => {},
      setSessions: () => {},
      setStudents: () => {},
      children: element,
    });
    element = h(ExaminationProvider, { students, session: sessionName, children: element });
    element = h(FinanceProvider, { ids: ["S"], session: sessionName, children: element });
    element = h(AcademicProvider, { students, session: sessionName, children: element });
    element = h(WorkforceProvider, { children: element });
    const html = renderToStaticMarkup(element);
    assert.ok(html.includes("System settings workspace"));
    assert.ok(!html.includes("NaN"));
  });

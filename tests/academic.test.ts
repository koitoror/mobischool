import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AcademicProvider } from "../src/AcademicContext";
import Academic from "../src/Academic";
import {
  attendanceKey,
  summarizeAttendance,
  timetableError,
  syllabusSummary,
  promotionError,
  academicPages,
  type Slot,
} from "../src/academicModel";
const session = "2024 – 2025";
const date = "2025-02-24";
test("attendance partitions expected roster without counting other students/sessions", () => {
  const records = {
    [attendanceKey(session, date, "a")]: "Present",
    [attendanceKey(session, date, "b")]: "Late",
    [attendanceKey(session, date, "c")]: "Excused",
    [attendanceKey("other", date, "d")]: "Present",
  } as const;
  const s = summarizeAttendance(["a", "b", "c", "d"], records, session, date);
  assert.equal(s.expected, 4);
  assert.equal(s.Present + s.Absent + s.Late + s.Excused + s.Unmarked, 4);
  assert.equal(s.rate, 50);
  assert.equal(s.Unmarked, 1);
});
test("no roster has no percentage rather than zero trend", () =>
  assert.equal(summarizeAttendance([], {}, session, date).rate, null));
const slot: Slot = {
  id: "a",
  session,
  day: "Monday",
  start: "09:00",
  end: "10:00",
  grade: "Grade 8",
  section: "A",
  teacher: "Teacher A",
  subject: "Mathematics",
  room: "Room 1",
};
for (const property of ["teacher", "room", "grade"] as const)
  test("clash detection checks " + property, () => {
    const candidate = {
      ...slot,
      id: "b",
      teacher: "Teacher B",
      room: "Room 2",
      grade: "Grade 9",
      start: "09:30",
      end: "10:30",
      [property]: slot[property],
    };
    assert.match(timetableError([slot], candidate), /Clash/);
  });
test("adjacent timetable periods do not overlap", () =>
  assert.equal(timetableError([slot], { ...slot, id: "b", start: "10:00", end: "11:00" }), ""));
test("period updates ignore themselves and other sessions", () => {
  assert.equal(timetableError([slot], slot), "");
  assert.equal(timetableError([slot], { ...slot, id: "b", session: "2025 – 2026" }), "");
});
test("reversed time and missing teacher fail validation", () => {
  assert.match(timetableError([], { ...slot, start: "11:00" }), /start/);
  assert.match(timetableError([], { ...slot, teacher: "" }), /required/);
});
test("syllabus completion is topic-derived with empty-state semantics", () => {
  assert.equal(syllabusSummary([]).percent, null);
  assert.equal(syllabusSummary([{ completed: true }, { completed: false }] as any).percent, 50);
});
test("promotion blocks inactive/unassigned/same-session/same-class records", () => {
  assert.match(
    promotionError({ status: "Inactive", grade: "8" }, "9", "A", "next", session),
    /Inactive/,
  );
  assert.match(
    promotionError({ status: "Active", grade: "" }, "9", "A", "next", session),
    /current class/,
  );
  assert.match(
    promotionError({ status: "Active", grade: "8" }, "9", "A", session, session),
    /different/,
  );
  assert.match(
    promotionError({ status: "Active", grade: "8" }, "8", "A", "next", session),
    /matches/,
  );
  assert.equal(promotionError({ status: "Active", grade: "8" }, "9", "A", "next", session), "");
});
const student = {
  id: "a",
  name: "Illustrative Learner",
  grade: "Grade 8",
  section: "A",
  guardian: "Not linked",
  phone: "Not supplied",
  date: "2024-08-12",
  status: "Active",
};
for (const page of academicPages)
  test("renders academic route: " + page, () => {
    const html = renderToStaticMarkup(
      createElement(AcademicProvider, {
        students: [student],
        session,
        children: createElement(Academic, {
          page,
          session,
          students: [student],
          setStudents: () => {},
          navigate: () => {},
          notify: () => {},
          active: true,
          onDirty: () => {},
          onStudent: () => {},
        }),
      }),
    );
    assert.ok(html.includes("Illustrative Data"));
    assert.ok(html.includes("Academic workspace"));
    assert.ok(!html.includes("NaN"));
  });

import { importedStaff, importedGuardians } from "../src/peopleData";
test("provided people retain all rows without private contacts or inferred links", () => {
  assert.equal(importedStaff.length, 44);
  assert.equal(importedGuardians.length, 278);
  assert.deepEqual(
    Object.keys(importedStaff[0]).sort(),
    ["id", "name", "role", "department", "designation"].sort(),
  );
});

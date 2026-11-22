import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AcademicProvider } from "../src/AcademicContext";
import { ExaminationProvider } from "../src/ExaminationContext";
import Examinations from "../src/Examinations";
import {
  assessmentPages,
  gradeError,
  gradeFor,
  sampleBands,
  scheduleError,
  scoreError,
  groupError,
  questionError,
  onlineError,
  attemptError,
  evaluationError,
  type ExamGroup,
  type Exam,
  type Sitting,
  type Question,
  type OnlineExam,
  type Attempt,
} from "../src/examinationModel";
const group: ExamGroup = {
  id: "G",
  name: "Sample",
  session: "2024 – 2025",
  term: "Term",
  grade: "Grade 8",
  start: "2025-02-24",
  end: "2025-03-07",
  status: "Active",
  description: "",
};
const exam: Exam = {
  id: "E",
  group: "G",
  name: "Test",
  subject: "Mathematics",
  section: "A",
  maximum: 10,
  component: "Written",
};
const sitting: Sitting = {
  id: "S",
  exam: "E",
  date: "2025-02-25",
  start: "09:00",
  end: "10:00",
  room: "R",
  teacher: "T",
};
test("grade scale covers exact two-decimal boundaries", () => {
  assert.equal(gradeError(sampleBands), "");
  assert.equal(gradeFor(79.995, 100, sampleBands).grade, "A");
  assert.equal(gradeFor(39.99, 100, sampleBands).grade, "F");
});
test("grade overlaps and gaps rejected", () => {
  assert.match(
    gradeError([
      { label: "A", min: 0, max: 50 },
      { label: "B", min: 50, max: 100 },
    ]),
    /overlap/,
  );
});
test("marks missing negative above maximum rejected", () => {
  for (const v of ["", "-1", "11", "NaN"]) assert.ok(scoreError(v, 10));
  assert.equal(scoreError("0", 10), "");
});
test("group duplicate and invalid dates rejected", () => {
  assert.match(groupError({ ...group, id: "other" }, [group]), /exists/);
  assert.match(groupError({ ...group, end: "2025-02-30" }, []), /date/);
});
test("schedule outside group period rejected", () =>
  assert.match(scheduleError({ ...sitting, date: "2025-04-01" }, [], [exam], [group]), /inside/));
test("schedule conflict rejected and adjacent time allowed", () => {
  assert.match(scheduleError({ ...sitting, id: "S2" }, [sitting], [exam], [group]), /Conflict/);
  assert.equal(
    scheduleError(
      { ...sitting, id: "S2", start: "10:00", end: "11:00" },
      [sitting],
      [exam],
      [group],
    ),
    "",
  );
});
test("reversed schedule blocked", () =>
  assert.match(scheduleError({ ...sitting, end: "08:00" }, [], [exam], [group]), /start/));
const question: Question = {
  id: "Q",
  subject: "Mathematics",
  grade: "Grade 8",
  topic: "Arithmetic",
  difficulty: "Standard",
  type: "Single choice",
  text: "Two plus two?",
  options: ["1", "2", "3", "4"],
  answer: "4",
  guide: "",
  marks: 10,
  status: "Active",
};
test("question answers and options validated", () => {
  assert.equal(questionError(question), "");
  assert.match(questionError({ ...question, answer: "5" }), /options/);
  assert.match(questionError({ ...question, type: "Essay" }), /guide/);
});
const online: OnlineExam = {
  id: "O",
  exam: "E",
  name: "Test",
  questions: [question],
  duration: 30,
  start: "2025-02-25T09:00",
  end: "2025-02-25T10:00",
  attempts: 1,
  instructions: "",
  status: "Scheduled",
};
test("online exam requires matching subject and time window", () => {
  assert.equal(onlineError(online, exam), "");
  assert.match(onlineError({ ...online, end: "2025-02-25T09:10" }, exam), /window/);
});
test("attempt eligibility window and limits enforced", () => {
  assert.match(attemptError(online, "S", [], [], online.start), /eligible/);
  assert.equal(attemptError(online, "S", ["S"], [], online.start), "");
  assert.match(attemptError(online, "S", ["S"], [], online.end), /window/);
});
test("evaluation requires submitted attempt and every mark", () => {
  const t: Attempt = {
    id: "A",
    online: "O",
    student: "S",
    started: "",
    responses: {},
    flagged: [],
    status: "Submitted",
    marks: {},
    history: [],
  };
  assert.ok(evaluationError(t, online));
  assert.equal(evaluationError({ ...t, marks: { Q: "0" } }, online), "");
});
const students = [
  {
    id: "S",
    name: "Illustrative Student",
    grade: "Grade 8",
    section: "A",
    guardian: "Not supplied",
    phone: "",
    date: "",
    status: "Active",
  },
];
for (const page of assessmentPages)
  test("renders assessment route " + page, () => {
    const html = renderToStaticMarkup(
      h(AcademicProvider, {
        students,
        session: group.session,
        children: h(ExaminationProvider, {
          students,
          session: group.session,
          children: h(Examinations, {
            page,
            active: true,
            school: "Sample School",
            navigate: () => {},
            onStudent: () => {},
            onDirty: () => {},
            notify: () => {},
          }),
        }),
      }),
    );
    assert.ok(html.includes("Illustrative Data"));
    assert.ok(!html.includes("NaN"));
    assert.ok(html.includes("Examination workspace"));
  });

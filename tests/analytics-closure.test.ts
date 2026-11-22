import { test } from "node:test";
import assert from "node:assert/strict";
import { assessPopulation, classifyResults, type ExamScope } from "../src/examAnalytics";
import { metricContributors, calculationEvidence } from "../src/reportTraceability";
import type { Student } from "../src/Lifecycle";
import type { Score } from "../src/examinationModel";
import type { ReportRow } from "../src/reportsModel";
const student: Student = {
  id: "S",
  name: "Student",
  grade: "G",
  section: "A",
  status: "Active",
  date: "",
  phone: "",
  guardian: "",
};
const group = {
  id: "EG",
  name: "Group",
  session: "Y",
  grade: "G",
  term: "T",
  start: "2025-01-01",
  end: "2025-03-01",
  status: "Active",
  description: "",
};
const exam = {
  id: "E",
  name: "Exam",
  group: "EG",
  subject: "Math",
  section: "A",
  maximum: 100,
  component: "Written",
};
const scope: ExamScope = {
  session: "Y",
  group: "All",
  grade: "All",
  section: "All",
  subject: "All",
  context: "All recorded states",
  from: "",
  to: "",
};
const score: Score = {
  exam: "E",
  student: "S",
  value: "0",
  remark: "",
  status: "Draft",
  history: [],
};
const run = (scores: Score[] = []) => assessPopulation([student], [group], [exam], scores, scope);
test("no entry is missing, not zero", () => {
  assert.equal(run().missing, 1);
  assert.equal(run().assessed, 0);
  assert.equal(run().pairs[0].value, null);
});
test("explicit zero is a valid assessment", () => {
  assert.equal(run([score]).complete, 1);
  assert.equal(run([score]).low, 0);
});
test("invalid out-of-range is excluded from mean", () => {
  const a = run([{ ...score, value: "101" }]);
  assert.equal(a.invalid, 1);
  assert.equal(a.mean, null);
});
test("blank draft remains missing", () => assert.equal(run([{ ...score, value: "" }]).missing, 1));
test("duplicate score key is invalid, not double-counted", () => {
  const a = run([score, score]);
  assert.equal(a.eligible, 1);
  assert.equal(a.invalid, 1);
});
test("duplicate shared students deduplicated", () =>
  assert.equal(assessPopulation([student, student], [group], [exam], [], scope).eligible, 1));
test("disabled student not eligible", () =>
  assert.equal(
    assessPopulation([{ ...student, status: "Inactive" }], [group], [exam], [], scope).eligible,
    0,
  ));
test("partial required components are distinct from complete", () => {
  const a = assessPopulation(
    [student],
    [group],
    [exam, { ...exam, id: "E2", component: "Practical" }],
    [score],
    scope,
  );
  assert.equal(a.assessed, 1);
  assert.equal(a.partial, 1);
  assert.equal(a.complete, 0);
  assert.equal(a.missing, 1);
});
test("session enrollment is used", () =>
  assert.equal(
    assessPopulation(
      [{ ...student, grade: "Other", enrollments: { Y: { grade: "G", section: "A" } } }],
      [group],
      [exam],
      [],
      scope,
    ).eligible,
    1,
  ));
test("subject filter constrains eligible population", () =>
  assert.equal(
    assessPopulation([student], [group], [exam], [], { ...scope, subject: "Science" }).eligible,
    0,
  ));
test("date scope uses group end", () =>
  assert.equal(
    assessPopulation([student], [group], [exam], [], { ...scope, from: "2026-01-01" }).eligible,
    0,
  ));
test("unpublished marks excluded from published context", () =>
  assert.equal(
    assessPopulation([student], [group], [exam], [score], { ...scope, context: "Published" })
      .assessed,
    0,
  ));
test("published snapshot percentage retained", () => {
  const a = run([
    {
      ...score,
      status: "Published",
      value: "90",
      percentage: 87.5,
      grade: "Old band",
      scaleVersion: 1,
    },
  ]);
  assert.equal(a.mean, 87.5);
  assert.equal(a.pairs[0].gradeSnapshot, "Old band");
});
test("pass threshold is never invented", () =>
  assert.equal(classifyResults(["A"], undefined, true).classification, "Unavailable"));
test("explicit school grade rule classifies complete results", () =>
  assert.equal(classifyResults(["A"], ["A", "B"], true).classification, "Passed"));
test("explicit failed grade stays failed", () =>
  assert.equal(classifyResults(["F"], ["A", "B"], true).classification, "Failed"));
test("incomplete result not failed", () =>
  assert.equal(classifyResults(["F"], ["A"], false).denominator, 0));
const base: ReportRow = {
  id: "1",
  label: "One",
  date: "",
  session: "Y",
  grade: "G",
  section: "A",
  category: "Fee obligation",
  status: "Recorded",
  actor: "",
  value: 100,
  detail: "",
  route: "Search Due Fees",
};
test("finance KPI contributors exclude general income", () => {
  const rows = [base, { ...base, id: "2", category: "Income" }];
  assert.deepEqual(
    metricContributors("Outstanding (due cohort)", rows).map((r) => r.id),
    ["1"],
  );
});
test("attendance formula exposes numerator and denominator", () => {
  const a = calculationEvidence("Attendance rate", [
    { ...base, category: "Marked attendance", status: "Present" },
    { ...base, id: "2", category: "Marked attendance", status: "Absent" },
  ]);
  assert.equal(a.numerator, 1);
  assert.equal(a.denominator, 2);
});
test("inventory low-stock drilldown excludes movement rows", () =>
  assert.equal(
    metricContributors("Low stock items", [
      { ...base, category: "Stock snapshot", status: "Low stock" },
      { ...base, id: "2", category: "Issue", status: "Low stock" },
    ]).length,
    1,
  ));
test("unavailable utilization contributes no fabricated passengers", () =>
  assert.equal(metricContributors("Passenger utilization", [base]).length, 0));

import type { Student } from "./Lifecycle";
import type { Exam, ExamGroup, Score } from "./examinationModel";
export type ExamScope = {
  session: string;
  group: string;
  grade: string;
  section: string;
  subject: string;
  context: string;
  from: string;
  to: string;
  query?: string;
};
export type Assessment = {
  id: string;
  student: string;
  name: string;
  reference: string;
  grade: string;
  section: string;
  group: string;
  subject: string;
  exam: string;
  component: string;
  maximum: number;
  status: string;
  state: string;
  value: number | null;
  percentage: number | null;
  gradeSnapshot: string;
  scale: string;
  publishedAt: string;
  history: string[];
};
export function assessPopulation(
  students: Student[],
  groups: ExamGroup[],
  exams: Exam[],
  scores: Score[],
  scope: ExamScope,
) {
  const selected = exams.filter((e) => {
    const g = groups.find((g) => g.id === e.group);
    return (
      !!g &&
      (scope.session === "All" || g.session === scope.session) &&
      (scope.group === "All" || g.id === scope.group) &&
      (scope.grade === "All" || g.grade === scope.grade) &&
      (scope.section === "All" || e.section === scope.section) &&
      (scope.subject === "All" || e.subject === scope.subject) &&
      (!scope.from || g.end >= scope.from) &&
      (!scope.to || g.end <= scope.to)
    );
  });
  const pairs: Assessment[] = [];
  for (const e of selected) {
    const g = groups.find((g) => g.id === e.group)!;
    for (const student of [...new Map(students.map((s) => [s.id, s])).values()]) {
      const s = { ...student, ...student.enrollments?.[g.session] };
      if (
        s.status !== "Active" ||
        s.grade !== g.grade ||
        s.section !== e.section ||
        (scope.query &&
          !`${s.name} ${s.id} ${s.admission || ""}`
            .toLowerCase()
            .includes(scope.query.toLowerCase()))
      )
        continue;
      const entries = scores.filter((v) => v.exam === e.id && v.student === s.id);
      const score = entries[0],
        usable =
          score && (scope.context === "All recorded states" || scope.context === score.status);
      const value = usable && score.value.trim() ? Number(score.value) : null;
      const invalid =
        entries.length > 1 ||
        (value !== null && (!Number.isFinite(value) || value < 0 || value > e.maximum)) ||
        !Number.isFinite(e.maximum) ||
        e.maximum <= 0;
      pairs.push({
        id: e.id + "|" + s.id,
        student: s.id,
        name: s.name,
        reference: s.admission || s.id,
        grade: s.grade,
        section: s.section,
        group: g.name,
        subject: e.subject,
        exam: e.id,
        component: e.component,
        maximum: e.maximum,
        status: invalid ? "Invalid" : value === null ? "Not entered" : "Complete",
        state: score?.status || "No result",
        value: invalid ? null : value,
        percentage: invalid
          ? null
          : score?.status === "Published" && usable
            ? (score.percentage ?? null)
            : value === null
              ? null
              : (100 * value) / e.maximum,
        gradeSnapshot:
          score?.status === "Published" && usable
            ? score.grade || "Unavailable"
            : "Not a published grade",
        scale: score?.scaleVersion ? String(score.scaleVersion) : "Not captured",
        publishedAt: score?.publishedAt || "Not captured",
        history: score?.history || [],
      });
    }
  }
  const ids = [...new Set(pairs.map((p) => p.student))];
  const complete = ids.filter((id) =>
    pairs.filter((p) => p.student === id).every((p) => p.status === "Complete"),
  );
  const assessed = ids.filter((id) =>
    pairs.some((p) => p.student === id && p.status === "Complete"),
  );
  const values = pairs
    .filter((p) => p.status === "Complete" && p.percentage !== null)
    .map((p) => p.percentage!);
  return {
    pairs,
    selected,
    eligible: ids.length,
    assessed: assessed.length,
    complete: complete.length,
    incomplete: ids.length - complete.length,
    partial: ids.filter((id) => assessed.includes(id) && !complete.includes(id)).length,
    missing: pairs.filter((p) => p.status === "Not entered").length,
    invalid: pairs.filter((p) => p.status === "Invalid").length,
    mean: values.length ? values.reduce((a, b) => a + b, 0) / values.length : null,
    high: values.length ? Math.max(...values) : null,
    low: values.length ? Math.min(...values) : null,
  };
}
export function classifyResults(
  grades: string[],
  passingGrades: string[] | undefined,
  complete: boolean,
) {
  if (!complete) return { classification: "Incomplete", denominator: 0 };
  if (
    !passingGrades?.length ||
    grades.some((g) => !g || g === "Unavailable" || g === "Not a published grade")
  )
    return { classification: "Unavailable", denominator: 0 };
  return {
    classification: grades.every((g) => passingGrades.includes(g)) ? "Passed" : "Failed",
    denominator: 1,
  };
}

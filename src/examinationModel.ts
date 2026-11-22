export const examinationPages = [
  "Examinations",
  "Exam Group",
  "Exam Schedule",
  "Exam Result",
  "Design Admit Card",
  "Print Admit Card",
  "Design Marksheet",
  "Print Marksheet",
  "Marks Grade",
];
export const onlinePages = ["Online Examinations", "Online Exam", "Question Bank"];
export const assessmentPages = [...examinationPages, ...onlinePages];
export type ExamGroup = {
  id: string;
  name: string;
  session: string;
  term: string;
  grade: string;
  start: string;
  end: string;
  status: string;
  description: string;
};
export type Exam = {
  id: string;
  name: string;
  group: string;
  subject: string;
  section: string;
  maximum: number;
  component: string;
};
export type Sitting = {
  id: string;
  exam: string;
  date: string;
  start: string;
  end: string;
  room: string;
  teacher: string;
};
export type Band = { label: string; min: number; max: number; description: string };
export const sampleBands: Band[] = [
  { label: "A", min: 80, max: 100, description: "Excellent" },
  { label: "B", min: 70, max: 79.99, description: "Very good" },
  { label: "C", min: 60, max: 69.99, description: "Good" },
  { label: "D", min: 50, max: 59.99, description: "Satisfactory" },
  { label: "E", min: 40, max: 49.99, description: "Basic" },
  { label: "F", min: 0, max: 39.99, description: "Needs improvement" },
];
export type Score = {
  exam: string;
  student: string;
  value: string;
  remark: string;
  status: "Draft" | "Reviewed" | "Published";
  grade?: string;
  percentage?: number;
  scaleVersion?: number;
  publishedAt?: string;
  gradingSnapshot?: Band[];
  passingGradesSnapshot?: string[] | null;
  schemeNameSnapshot?: string;
  history: string[];
};
export const questionTypes = ["Single choice", "True / False", "Short Answer", "Essay"] as const;
export type Question = {
  id: string;
  subject: string;
  grade: string;
  topic: string;
  difficulty: string;
  type: string;
  text: string;
  options: string[];
  answer: string;
  guide: string;
  marks: number;
  status: string;
};
export type OnlineExam = {
  id: string;
  exam: string;
  name: string;
  questions: Question[];
  duration: number;
  start: string;
  end: string;
  attempts: number;
  instructions: string;
  status: "Draft" | "Scheduled" | "Closed";
};
export type Attempt = {
  id: string;
  online: string;
  student: string;
  started: string;
  submitted?: string;
  responses: Record<string, string>;
  flagged: string[];
  status: "In Progress" | "Submitted" | "Evaluated";
  marks: Record<string, string>;
  history: string[];
};
export type DocTemplate = {
  version: number;
  title: string;
  footer: string;
  instructions: string;
  showSchedule: boolean;
  showSignatures: boolean;
  paper: string;
  alignment: string;
  density: string;
};
export type Generation = {
  id: string;
  kind: string;
  exam: string;
  student: string;
  template: DocTemplate;
  created: string;
  score?: Score;
  schedule: Sitting[];
};
export function validDate(value: string) {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(value)) &&
    new Date(value).toISOString().slice(0, 10) === value
  );
}
export function groupError(group: ExamGroup, groups: ExamGroup[]) {
  if (!group.name.trim() || !group.session || !group.grade || !group.term.trim())
    return "Name, session, term and class are required.";
  if (!validDate(group.start) || !validDate(group.end) || group.start > group.end)
    return "Choose a valid group date range.";
  if (
    groups.some(
      (g) =>
        g.id !== group.id &&
        g.session === group.session &&
        g.name.toLowerCase() === group.name.trim().toLowerCase(),
    )
  )
    return "This group name already exists in the session.";
  return "";
}
export function scheduleError(
  sitting: Sitting,
  sittings: Sitting[],
  exams: Exam[],
  groups: ExamGroup[],
) {
  const exam = exams.find((e) => e.id === sitting.exam),
    group = groups.find((g) => g.id === exam?.group);
  if (!exam || !group || group.status !== "Active") return "Choose an exam in an active group.";
  if (!validDate(sitting.date) || sitting.date < group.start || sitting.date > group.end)
    return "Schedule must fall inside the exam group dates.";
  const time = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
  if (!time.test(sitting.start) || !time.test(sitting.end) || sitting.start >= sitting.end)
    return "Choose a valid start time before the end time.";
  if (!sitting.teacher || !sitting.room.trim()) return "Invigilator and room are required.";
  const conflict = sittings.find((s) => {
    if (
      s.id === sitting.id ||
      s.date !== sitting.date ||
      s.start >= sitting.end ||
      sitting.start >= s.end
    )
      return false;
    const other = exams.find((e) => e.id === s.exam),
      otherGroup = groups.find((g) => g.id === other?.group);
    return (
      s.exam === sitting.exam ||
      s.room === sitting.room ||
      s.teacher === sitting.teacher ||
      (group.session === otherGroup?.session &&
        group.grade === otherGroup.grade &&
        exam.section === other?.section)
    );
  });
  return conflict
    ? `Conflict with ${conflict.id}: class, room, invigilator or duplicate exam overlaps.`
    : "";
}
export function gradeError(bands: Band[]) {
  const sorted = [...bands].sort((a, b) => a.min - b.min);
  if (!sorted.length || sorted[0].min !== 0 || sorted.at(-1)?.max !== 100)
    return "The scale must cover 0 through 100.";
  for (let i = 0; i < sorted.length; i++) {
    const b = sorted[i];
    if (
      !b.label.trim() ||
      !Number.isFinite(b.min) ||
      !Number.isFinite(b.max) ||
      b.min < 0 ||
      b.max > 100 ||
      b.min > b.max
    )
      return "Each band needs a label and valid 0–100 boundaries.";
    if (i && Math.round((b.min - sorted[i - 1].max) * 100) !== 1)
      return "Grade bands must not overlap or leave gaps at two-decimal precision.";
  }
  if (new Set(bands.map((b) => b.label.toLowerCase())).size !== bands.length)
    return "Grade labels must be unique.";
  return "";
}
export function gradeFor(value: number, maximum: number, bands: Band[]) {
  const percentage = Math.round((value / maximum) * 10000) / 100;
  return {
    percentage,
    grade: bands.find((b) => percentage >= b.min && percentage <= b.max)?.label || "",
  };
}
export function scoreError(value: string, maximum: number) {
  if (!value.trim()) return "Missing score";
  if (!Number.isFinite(Number(value)) || Number(value) < 0 || Number(value) > maximum)
    return `Score must be between 0 and ${maximum}.`;
  return "";
}
export function questionError(q: Question) {
  if (!q.text.trim() || !q.subject || !q.grade || !q.topic.trim())
    return "Subject, class, topic and question text are required.";
  if (!questionTypes.includes(q.type as (typeof questionTypes)[number]))
    return "Unsupported question type.";
  if (!Number.isFinite(q.marks) || q.marks <= 0) return "Marks must be positive.";
  if (
    q.type === "Single choice" &&
    (q.options.length !== 4 ||
      q.options.some((o) => !o.trim()) ||
      new Set(q.options).size !== 4 ||
      !q.options.includes(q.answer))
  )
    return "Supply four distinct options and select a correct answer.";
  if (q.type === "True / False" && !["True", "False"].includes(q.answer))
    return "Select True or False.";
  if (q.type === "Short Answer" && !q.answer.trim()) return "An expected answer is required.";
  if (q.type === "Essay" && !q.guide.trim()) return "An essay marking guide is required.";
  return "";
}
export function onlineError(online: OnlineExam, exam: Exam | undefined) {
  if (!exam || !online.name.trim()) return "Select an exam and supply a name.";
  if (!online.questions.length || online.questions.some((q) => questionError(q)))
    return "Select at least one valid question.";
  if (online.questions.some((q) => q.subject !== exam.subject))
    return "Questions must match the assessment subject.";
  if (
    !Number.isInteger(online.duration) ||
    online.duration < 1 ||
    !Number.isInteger(online.attempts) ||
    online.attempts < 1
  )
    return "Duration and attempts must be positive whole numbers.";
  if (
    !Number.isFinite(Date.parse(online.start)) ||
    !Number.isFinite(Date.parse(online.end)) ||
    online.start >= online.end ||
    Date.parse(online.end) - Date.parse(online.start) < online.duration * 60000
  )
    return "The access window must contain the exam duration.";
  return "";
}
export function attemptError(
  online: OnlineExam,
  student: string,
  eligible: string[],
  attempts: Attempt[],
  now: string,
) {
  if (!eligible.includes(student)) return "Student is not eligible.";
  if (online.status !== "Scheduled" || now < online.start || now >= online.end)
    return "Exam is outside its scheduled access window.";
  if (
    attempts.filter((a) => a.online === online.id && a.student === student).length >=
    online.attempts
  )
    return "Attempt limit reached.";
  return "";
}
export function evaluationError(attempt: Attempt, online: OnlineExam) {
  if (attempt.status !== "Submitted") return "Only submitted attempts can be evaluated.";
  return online.questions.some((q) => scoreError(attempt.marks[q.id] || "", q.marks))
    ? "Enter a valid mark for every question, including zero for unanswered questions."
    : "";
}

import { createContext, useContext, useState, type ReactNode } from "react";
import { useAcademic } from "./AcademicContext";
import type { Student } from "./Lifecycle";
import {
  sampleBands,
  type ExamGroup,
  type Exam,
  type Sitting,
  type Score,
  type Question,
  type OnlineExam,
  type Attempt,
  type DocTemplate,
  type Generation,
} from "./examinationModel";
function useStore(students: Student[], session: string) {
  const academic = useAcademic();
  const [groups, setGroups] = useState<ExamGroup[]>([
    {
      id: "EG-1",
      name: "Illustrative midterm",
      session,
      term: "School-defined assessment period",
      grade: academic.classes[0] || "",
      start: "2025-02-24",
      end: "2025-03-07",
      status: "Active",
      description: "Illustrative assessment setup; no scores invented.",
    },
  ]);
  const [exams, setExams] = useState<Exam[]>([
    {
      id: "EX-1",
      group: "EG-1",
      name: "Mathematics · written assessment",
      subject: academic.subjects[0] || "",
      section: students[0]?.section || "",
      maximum: 100,
      component: "Written",
    },
  ]);
  const [sittings, setSittings] = useState<Sitting[]>([]);
  const [scores, setScores] = useState<Score[]>([]);
  const [bands, setBands] = useState(sampleBands);
  const [scaleVersion, setScaleVersion] = useState(1);
  const [passingGrades, setPassingGrades] = useState<string[] | null>(null);
  const [schemeName, setSchemeName] = useState(
    "Illustrative grade bands · classification not configured",
  );
  const [questions, setQuestions] = useState<Question[]>([]);
  const [online, setOnline] = useState<OnlineExam[]>([]);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const defaults: DocTemplate = {
    version: 1,
    title: "Admit Card",
    footer: "Illustrative document · not an official school record",
    instructions: "Arrive before the scheduled start. Follow school instructions.",
    showSchedule: true,
    showSignatures: true,
    paper: "A4 Portrait",
    alignment: "Left",
    density: "Comfortable",
  };
  const [templates, setTemplates] = useState<Record<string, DocTemplate>>({
    "Admit Card": defaults,
    Marksheet: { ...defaults, title: "Marksheet" },
  });
  const [templateHistory, setTemplateHistory] = useState<Record<string, DocTemplate[]>>({});
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [history, setHistory] = useState<string[]>([]);
  const [selectedExam, setSelectedExam] = useState("EX-1");
  const [role, setRole] = useState("School Administrator");
  const actor = `${role} (unauthenticated preview actor)`;
  const stamp = (action: string) => `${new Date().toISOString()} · ${actor} · ${action}`;
  const audit = (action: string) => setHistory((h) => [stamp(action), ...h]);
  const candidates = (exam: Exam) => {
    const group = groups.find((g) => g.id === exam.group);
    return students.filter(
      (s) => s.status === "Active" && s.grade === group?.grade && s.section === exam.section,
    );
  };
  const sessionExams = exams.filter(
    (e) => groups.find((g) => g.id === e.group)?.session === session,
  );
  const metrics = () => {
    const ids = new Set(sessionExams.map((e) => e.id));
    const expected = sessionExams.reduce((n, e) => n + candidates(e).length, 0);
    const entered = scores.filter((s) => ids.has(s.exam) && s.value.trim()).length;
    const published = scores.filter((s) => ids.has(s.exam) && s.status === "Published");
    return {
      total: sessionExams.length,
      upcoming: sittings.filter((s) => ids.has(s.exam) && s.date >= academic.day).length,
      registered: new Set(sessionExams.flatMap((e) => candidates(e).map((s) => s.id))).size,
      pending: expected - published.length,
      published: published.length,
      completion: expected ? Math.round((entered / expected) * 100) : null,
      average: published.length
        ? published.reduce((n, s) => n + (s.percentage || 0), 0) / published.length
        : null,
    };
  };
  return {
    students,
    session,
    academic,
    groups,
    setGroups,
    exams,
    setExams,
    sittings,
    setSittings,
    scores,
    setScores,
    bands,
    setBands,
    scaleVersion,
    setScaleVersion,
    passingGrades,
    setPassingGrades,
    schemeName,
    setSchemeName,
    questions,
    setQuestions,
    online,
    setOnline,
    attempts,
    setAttempts,
    templates,
    setTemplates,
    templateHistory,
    setTemplateHistory,
    generations,
    setGenerations,
    history,
    audit,
    stamp,
    selectedExam,
    setSelectedExam,
    role,
    setRole,
    actor,
    candidates,
    sessionExams,
    metrics,
  };
}
const Context = createContext<ReturnType<typeof useStore> | null>(null);
export function ExaminationProvider({
  students,
  session,
  children,
}: {
  students: Student[];
  session: string;
  children: ReactNode;
}) {
  const store = useStore(students, session);
  return <Context.Provider value={store}>{children}</Context.Provider>;
}
export function useExamination() {
  const store = useContext(Context);
  if (!store) throw Error("ExaminationProvider required");
  return store;
}
export function useExaminationOptional() {
  return useContext(Context);
}

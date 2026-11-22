import { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";
import type { Student } from "./Lifecycle";
import { useWorkforceOptional } from "./WorkforceContext";
import { importedStaff } from "./peopleData";
import {
  attendanceKey,
  summarizeAttendance,
  syllabusSummary,
  type AttendanceStatus,
  type Slot,
  type Topic,
  type Plan,
  type Leave,
} from "./academicModel";

function useAcademicStore(students: Student[], initialSession: string) {
  const workforce = useWorkforceOptional();
  const teachers = (
    workforce ? workforce.staff.filter((s) => s.status === "Active") : importedStaff
  ).filter((s) => s.role === "Teacher");
  const [day, setDay] = useState("2025-02-24");
  const [classes, setClasses] = useState([
    ...new Set(students.map((s) => s.grade).filter(Boolean)),
  ]);
  const [sections, setSections] = useState(["A", "B", "C"]);
  const [subjects, setSubjects] = useState([
    "Mathematics",
    "English language",
    "Science",
    "History",
  ]);
  const [groups, setGroups] = useState(["Core subjects", "Languages", "Sciences"]);
  const [groupSubjects, setGroupSubjects] = useState<Record<string, string[]>>({
    "Core subjects": ["Mathematics", "English language", "Science", "History"],
    Languages: ["English language"],
    Sciences: ["Science"],
  });
  const [capacities, setCapacities] = useState<Record<string, number>>({});
  const [inactive, setInactive] = useState<string[]>([]);
  const [classTeachers, setClassTeachers] = useState<Record<string, string>>({});
  const [records, setRecords] = useState<Record<string, AttendanceStatus>>(() =>
    Object.fromEntries(
      students
        .filter((s) => s.status === "Active")
        .map((s, i) => [
          attendanceKey(initialSession, "2025-02-24", s.id),
          i === 2 ? "Absent" : i === 4 ? "Late" : "Present",
        ]),
    ),
  );
  const [slots, setSlots] = useState<Slot[]>([
    {
      id: "TT-001",
      session: initialSession,
      day: "Monday",
      start: "09:00",
      end: "09:45",
      grade: students[0]?.grade || "Grade 8",
      section: "A",
      teacher: teachers[0]?.name || "Teacher unassigned",
      subject: "Mathematics",
      room: "Room 101",
    },
    {
      id: "TT-002",
      session: initialSession,
      day: "Monday",
      start: "10:00",
      end: "10:45",
      grade: students[0]?.grade || "Grade 8",
      section: "A",
      teacher: teachers[1]?.name || "Teacher unassigned",
      subject: "English language",
      room: "Room 101",
    },
  ]);
  const [topics, setTopics] = useState<Topic[]>(
    [
      "Linear equations",
      "Quadratic expressions",
      "Graphs & coordinates",
      "Reading comprehension",
      "Writing with purpose",
      "Scientific investigation",
    ].map((name, i) => ({
      id: "TOP-" + (i + 1),
      name,
      subject: i < 3 ? "Mathematics" : i < 5 ? "English language" : "Science",
      grade: students[0]?.grade || "Grade 8",
      session: initialSession,
      completed: i < 2,
      due: "2025-02-" + (20 + i),
      history: [],
    })),
  );
  const [lessons, setLessons] = useState([
    "Algebra foundations",
    "Language & expression",
    "Scientific enquiry",
  ]);
  const [plans, setPlans] = useState<Plan[]>([
    {
      id: "LP-001",
      session: initialSession,
      teacher: teachers[0]?.name || "",
      grade: students[0]?.grade || "Grade 8",
      subject: "Mathematics",
      topic: "TOP-1",
      date: "2025-02-24",
      objectives: "Solve and explain linear equations using real-world examples.",
      resources: "Workbook · classroom board",
      status: "Delivered",
    },
  ]);
  const [leaves, setLeaves] = useState<Leave[]>([
    {
      id: "LV-001",
      student: students[0]?.id || "",
      session: initialSession,
      from: "2025-02-25",
      to: "2025-02-26",
      reason: "Family request · illustrative leave application",
      status: "Pending",
      history: ["Submitted in the illustrative dataset"],
    },
  ]);
  const summary = (session: string, date = day) =>
    summarizeAttendance(
      students.filter((s) => s.status === "Active").map((s) => s.id),
      records,
      session,
      date,
    );
  return {
    day,
    setDay,
    classes,
    setClasses,
    sections,
    setSections,
    subjects,
    setSubjects,
    groups,
    setGroups,
    groupSubjects,
    setGroupSubjects,
    capacities,
    setCapacities,
    inactive,
    setInactive,
    classTeachers,
    setClassTeachers,
    records,
    setRecords,
    slots,
    setSlots,
    topics,
    setTopics,
    lessons,
    setLessons,
    plans,
    setPlans,
    leaves,
    setLeaves,
    teachers,
    summary,
    syllabus: (session: string) => syllabusSummary(topics.filter((t) => t.session === session)),
  };
}
const Context = createContext<ReturnType<typeof useAcademicStore> | null>(null);
export function AcademicProvider({
  students,
  session,
  children,
}: {
  students: Student[];
  session: string;
  children: ReactNode;
}) {
  const store = useAcademicStore(students, session);
  return <Context.Provider value={store}>{children}</Context.Provider>;
}
export function useAcademic() {
  const value = useContext(Context);
  if (!value) throw Error("AcademicProvider required");
  return value;
}

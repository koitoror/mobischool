import { createContext, useContext, useState, useRef, type ReactNode } from "react";
import { useAcademic } from "./AcademicContext";
import { useWorkforce } from "./WorkforceContext";
import type { Student } from "./Lifecycle";
import {
  defaultPolicy,
  type Assignment,
  type Submission,
  type Resource,
  type LibraryState,
} from "./learningModel";
function useStore(students: Student[], session: string) {
  const academic = useAcademic(),
    workforce = useWorkforce();
  const [assignments, setAssignments] = useState<Assignment[]>([]),
    [submissions, setSubmissions] = useState<Submission[]>([]),
    [resources, setResources] = useState<Resource[]>([]);
  const [library, renderLibrary] = useState<LibraryState>({ books: [], members: [], loans: [] });
  const libraryRef = useRef(library);
  const setLibrary = (change: (state: LibraryState) => LibraryState) => {
    const next = change(libraryRef.current);
    libraryRef.current = next;
    renderLibrary(next);
  };
  const [policy, setPolicy] = useState(defaultPolicy),
    [fileLimit, setFileLimit] = useState(20),
    [role, setRole] = useState("Administrator");
  const stamp = (action: string) =>
    `${new Date().toISOString()} · ${role} (unauthenticated preview) · ${action}`;
  const people = (kind: string) => (kind === "Student" ? students : workforce.staff);
  const person = (kind: string, id: string) => people(kind).find((p) => p.id === id);
  const recipients = (assignment: Assignment) =>
    students.filter(
      (s) =>
        s.status === "Active" && s.grade === assignment.grade && s.section === assignment.section,
    );
  const metrics = () => {
    const work = assignments.filter((h) => h.session === session && h.status === "Published"),
      ids = new Set(work.map((h) => h.id)),
      sent = submissions.filter((s) => ids.has(s.assignment));
    return {
      active: work.length,
      pending: sent.filter((s) => s.status === "Submitted").length,
      shared: resources.filter((r) => r.session === session && r.status === "Published").length,
      issued: library.loans.filter((l) => !l.returned).length,
      overdue: library.loans.filter((l) => !l.returned && l.due < academic.day).length,
    };
  };
  return {
    students,
    session,
    academic,
    workforce,
    assignments,
    setAssignments,
    submissions,
    setSubmissions,
    resources,
    setResources,
    library,
    setLibrary,
    policy,
    setPolicy,
    fileLimit,
    setFileLimit,
    role,
    setRole,
    stamp,
    people,
    person,
    recipients,
    metrics,
  };
}
const Context = createContext<ReturnType<typeof useStore> | null>(null);
export function LearningProvider({
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
export function useLearning() {
  const store = useContext(Context);
  if (!store) throw Error("LearningProvider required");
  return store;
}
export function useLearningOptional() {
  return useContext(Context);
}

import { createContext, useContext, useRef, useState, type ReactNode } from "react";
import type { Student } from "./Lifecycle";
import { useWorkforce } from "./WorkforceContext";
import { useExaminationOptional } from "./ExaminationContext";
import {
  sampleTemplate,
  sampleTypes,
  defaultPolicy,
  generateBatch,
  transitionDocument,
  templateError,
  alumniError,
  eventError,
  registerRSVP,
  uid,
  type Template,
  type Credential,
  type Batch,
  type Alumni,
  type AlumniEvent,
  type RSVP,
  type Policy,
  type GenerationInput,
  type Person,
  type DocumentStatus,
} from "./credentialsModel";
type State = {
  templates: Template[];
  versions: Template[];
  documents: Credential[];
  batches: Batch[];
  alumni: Alumni[];
  events: AlumniEvent[];
  rsvps: RSVP[];
};
function useStore(students: Student[], session: string, school: string) {
  const workforce = useWorkforce(),
    examination = useExaminationOptional();
  const [state, render] = useState<State>({
    templates: [
      sampleTemplate("Certificate", "TPL-C"),
      sampleTemplate("Student ID", "TPL-S"),
      sampleTemplate("Staff ID", "TPL-H"),
    ],
    versions: [],
    documents: [],
    batches: [],
    alumni: [],
    events: [],
    rsvps: [],
  });
  const ref = useRef(state);
  const update = (fn: (s: State) => State) => {
    const next = fn(ref.current);
    ref.current = next;
    render(next);
  };
  const [policy, setPolicy] = useState<Policy>(defaultPolicy),
    [types, setTypes] = useState(sampleTypes),
    [role, setRole] = useState("School Administrator");
  const today = "2025-02-24",
    actor = `${role} (unauthenticated preview)`,
    canEdit = role !== "Auditor",
    canPrivate = role === "School Administrator";
  const audit = (action: string) => ({ at: new Date().toISOString(), actor, action });
  const people = (staff = false): Person[] =>
    staff
      ? workforce.staff.map((s) => ({
          id: s.id,
          name: s.name,
          reference: s.id,
          status: s.status,
          department: s.department,
          designation: s.designation,
          photo: s.details.photo || "",
        }))
      : students.map((s) => ({
          id: s.id,
          name: s.name,
          reference: s.admission || s.id,
          status: s.status,
          grade: s.enrollments?.[session]?.grade || s.grade,
          section: s.enrollments?.[session]?.section || s.section,
          photo: "",
        }));
  const guard = () => {
    if (!canEdit) throw Error("Read-only preview role. Ask a school administrator.");
  };
  return {
    ...state,
    students,
    session,
    school,
    workforce,
    examination,
    policy,
    setPolicy,
    types,
    setTypes,
    role,
    setRole,
    canEdit,
    canPrivate,
    today,
    actor,
    people,
    saveTemplate: (t: Template) => {
      guard();
      const error = templateError(t, ref.current.templates, policy.allowSensitive && canPrivate);
      if (error) throw Error(error);
      update((s) => {
        const old = s.templates.find((v) => v.id === t.id);
        return {
          ...s,
          templates: [
            ...s.templates.filter((v) => v.id !== t.id),
            {
              ...structuredClone(t),
              version: old ? old.version + 1 : 1,
              history: [...(old?.history || []), audit("Template saved")],
            },
          ],
          versions: old ? [...s.versions, old] : s.versions,
        };
      });
    },
    generate: (input: GenerationInput) => {
      guard();
      let result: Batch | undefined;
      update((s) => {
        const output = generateBatch(input, s.documents, policy, today, actor);
        result = output.batch;
        return { ...s, documents: output.records, batches: [output.batch, ...s.batches] };
      });
      return result!;
    },
    transition: (id: string, status: DocumentStatus, reason: string) => {
      guard();
      update((s) => ({
        ...s,
        documents: s.documents.map((d) =>
          d.id === id ? transitionDocument(d, status, reason, actor, new Date().toISOString()) : d,
        ),
      }));
    },
    logDocument: (id: string, action: string) =>
      update((s) => ({
        ...s,
        documents: s.documents.map((d) =>
          d.id === id ? { ...d, history: [...d.history, audit(action)] } : d,
        ),
      })),
    saveAlumni: (a: Alumni) => {
      guard();
      update((s) => {
        const error = alumniError(a, s.alumni, students);
        if (error) throw Error(error);
        const old = s.alumni.find((v) => v.id === a.id);
        return {
          ...s,
          alumni: [
            ...s.alumni.filter((v) => v.id !== a.id),
            {
              ...a,
              history: [
                ...(old?.history || []),
                audit(
                  "Manually reviewed alumni profile saved; not an academic completion decision",
                ),
              ],
            },
          ],
        };
      });
    },
    saveEvent: (e: AlumniEvent, reason = "") => {
      guard();
      update((s) => {
        const error = eventError(e, s.events, s.rsvps, today);
        if (error) throw Error(error);
        const old = s.events.find((v) => v.id === e.id);
        if (
          old?.status !== e.status &&
          ["Published", "Cancelled", "Archived"].includes(e.status) &&
          !reason.trim()
        )
          throw Error("A publication/cancellation/archive reason is required.");
        return {
          ...s,
          events: [
            ...s.events.filter((v) => v.id !== e.id),
            {
              ...e,
              history: [...(old?.history || []), audit(`Event saved: ${e.status}. ${reason}`)],
            },
          ],
          rsvps:
            e.status === "Cancelled"
              ? s.rsvps.map((r) =>
                  r.event === e.id
                    ? {
                        ...r,
                        status: "Cancelled",
                        history: [...r.history, audit("Event cancelled")],
                      }
                    : r,
                )
              : s.rsvps,
        };
      });
    },
    rsvp: (event: string, alumni: string, status: string) => {
      guard();
      update((s) => {
        const e = s.events.find((v) => v.id === event),
          a = s.alumni.find((v) => v.id === alumni);
        if (!e || !a) throw Error("Choose an event and alumnus.");
        return { ...s, rsvps: registerRSVP(e, a, s.rsvps, status, today, policy.waitlist, actor) };
      });
    },
    bulkAlumni: (ids: string[], status: string, reason: string) => {
      guard();
      if (!reason.trim()) throw Error("A bulk change reason is required.");
      update((s) => ({
        ...s,
        alumni: s.alumni.map((a) =>
          ids.includes(a.id)
            ? { ...a, status, history: [...a.history, audit(`Bulk ${status}: ${reason}`)] }
            : a,
        ),
      }));
    },
    uid,
  };
}
const Context = createContext<ReturnType<typeof useStore> | null>(null);
export function CredentialsProvider({
  students,
  session,
  school,
  children,
}: {
  students: Student[];
  session: string;
  school: string;
  children: ReactNode;
}) {
  return (
    <Context.Provider value={useStore(students, session, school)}>{children}</Context.Provider>
  );
}
export function useCredentialsOptional() {
  return useContext(Context);
}
export function useCredentials() {
  const x = useContext(Context);
  if (!x) throw Error("CredentialsProvider required");
  return x;
}

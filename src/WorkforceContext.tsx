import { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";
import { importedStaff } from "./peopleData";
import {
  effectiveStaffAttendance,
  type Staff,
  type StaffLeave,
  type Salary,
  type PayrollBatch,
  type Notice,
  type Message,
} from "./workforceModel";
function useStore() {
  const [staff, setStaff] = useState<Staff[]>(() =>
    importedStaff.map((s) => ({
      ...s,
      status: "Active",
      employment: "Not supplied",
      phone: "",
      email: "",
      joined: "",
      source: "Provided CSV name; employment status illustrative",
      details: {},
      history: [],
    })),
  );
  const [attendance, setAttendance] = useState<Record<string, string>>({});
  const [attendanceNotes, setAttendanceNotes] = useState<Record<string, string>>({});
  const [date, setDate] = useState("2025-02-24");
  const [leaves, setLeaves] = useState<StaffLeave[]>([]);
  const [salaries, setSalaries] = useState<Record<string, Salary>>({});
  const [batches, setBatches] = useState<PayrollBatch[]>([]);
  const [departments, setDepartments] = useState([
    ...new Set(importedStaff.map((s) => s.department).filter(Boolean)),
  ]);
  const [designations, setDesignations] = useState([
    ...new Set(importedStaff.map((s) => s.designation).filter(Boolean)),
  ]);
  const [leaveTypes, setLeaveTypes] = useState<Record<string, string>[]>([
    {
      name: "Personal leave",
      allocation: "Not configured",
      period: "Not configured",
      paid: "Unpaid (illustrative)",
      approval: "Required",
      document: "Optional",
      carry: "Not configured",
      status: "Active",
    },
  ]);
  const [referenceDetails, setReferenceDetails] = useState<Record<string, Record<string, string>>>(
    {},
  );
  const [notices, setNotices] = useState<Notice[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [criteria, setCriteria] = useState([
    "Lesson Preparation",
    "Classroom Management",
    "Subject Knowledge",
    "Student Engagement",
    "Professional Conduct",
    "Punctuality",
    "Administrative Responsibilities",
  ]);
  const [scale, setScale] = useState(5);
  const [evaluations, setEvaluations] = useState<
    {
      id: string;
      teacher: string;
      period: string;
      evaluator: string;
      scores: Record<string, number>;
      max: number;
      comments: string;
      strengths: string;
      improve: string;
      recommendation: string;
      status: string;
      history: string[];
    }[]
  >([]);
  const [actor, setActor] = useState(
    importedStaff.find((s) => s.role === "Admin")?.id || importedStaff[0].id,
  );
  const [role, setRole] = useState("School Administrator");
  const attendanceFor = (id: string, d = date) =>
    effectiveStaffAttendance(id, d, attendance, leaves);
  const summary = () => {
    const active = staff.filter((s) => s.status === "Active");
    return {
      total: staff.length,
      active: active.length,
      present: active.filter(
        (s) => attendanceFor(s.id) === "Present" || attendanceFor(s.id) === "Late",
      ).length,
      absent: active.filter((s) => attendanceFor(s.id) === "Absent").length,
      onLeave: active.filter((s) => attendanceFor(s.id) === "On Leave").length,
      pending: leaves.filter((l) => ["Submitted", "Under Review"].includes(l.status)).length,
      disabled: staff.length - active.length,
      queued: messages.filter((m) => m.status === "Queued (simulation)").length,
      failed: messages.filter((m) => m.status === "Failed").length,
    };
  };
  return {
    staff,
    setStaff,
    attendance,
    setAttendance,
    attendanceNotes,
    setAttendanceNotes,
    date,
    setDate,
    leaves,
    setLeaves,
    salaries,
    setSalaries,
    batches,
    setBatches,
    departments,
    setDepartments,
    designations,
    setDesignations,
    leaveTypes,
    setLeaveTypes,
    referenceDetails,
    setReferenceDetails,
    notices,
    setNotices,
    messages,
    setMessages,
    criteria,
    setCriteria,
    scale,
    setScale,
    evaluations,
    setEvaluations,
    actor,
    setActor,
    role,
    setRole,
    attendanceFor,
    summary,
  };
}
const Context = createContext<ReturnType<typeof useStore> | null>(null);
export function WorkforceProvider({ children }: { children: ReactNode }) {
  const store = useStore();
  return <Context.Provider value={store}>{children}</Context.Provider>;
}
export function useWorkforce() {
  const s = useContext(Context);
  if (!s) throw Error("WorkforceProvider required");
  return s;
}

export function useWorkforceOptional() {
  return useContext(Context);
}

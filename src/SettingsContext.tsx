import { createContext, useContext, useRef, useState, type ReactNode } from "react";
import { useAcademic } from "./AcademicContext";
import { useFinance } from "./FinanceContext";
import { useExamination } from "./ExaminationContext";
import { useWorkforce } from "./WorkforceContext";
import type { Student } from "./Lifecycle";
import {
  uid,
  type SettingAudit,
  type SessionConfig,
  type ConfigUser,
  type CustomField,
} from "./settingsModel";
type Bridge = {
  school: string;
  session: string;
  logo: string;
  motto: string;
  students: Student[];
  sessions: string[];
  setIdentity: (s: { name: string; logo: string; motto: string }) => void;
  setSession: (s: string) => void;
  setSessions: (s: string[]) => void;
  setStudents: React.Dispatch<React.SetStateAction<Student[]>>;
};
function useStore(bridge: Bridge) {
  const academic = useAcademic(),
    finance = useFinance(),
    examination = useExamination(),
    workforce = useWorkforce();
  const [metadata, setMetadata] = useState<Record<string, string>>({
    shortName: "",
    code: "SAMPLE",
    type: "School",
    ownership: "Not configured",
    address: "",
    postal: "",
    county: "",
    country: "Not configured",
    phone: "",
    email: "",
    website: "",
    principal: "",
    registration: "",
    timezone: "UTC",
  });
  const [drafts, setDrafts] = useState<Record<string, Record<string, string>>>({});
  const [draftKinds, setDraftKinds] = useState<Record<string, string>>({});
  const [sessions, setSessionRecords] = useState<SessionConfig[]>(() =>
    bridge.sessions.map((name, i) => ({
      id: uid("SESSION"),
      name,
      start: i === 0 ? "2024-08-01" : "",
      end: i === 0 ? "2025-07-31" : "",
      status: i === 0 ? "Active" : "Historical · dates not supplied",
      terms: [],
      holidays: "",
      history: [],
    })),
  );
  const [users, setUsers] = useState<ConfigUser[]>([
    {
      id: "USR-ADMIN",
      person: "",
      name: "Preview administrator",
      role: "School Administrator",
      status: "Active",
      history: [],
    },
  ]);
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [audit, setAudit] = useState<SettingAudit[]>([]);
  const [role, setRole] = useState("School Administrator");
  const [records, setRecords] = useState<Record<string, Record<string, string>>>({
    "Print Header Footer": {
      header: bridge.school,
      footer: "Illustrative school document · not proof of an institutional transaction",
      address: "",
      contact: "",
      signatory: "Authorized signatory",
      profile: "School documents",
    },
    "Attendance Configuration": {
      categories: "Present,Absent,Late,Excused",
      cutoff: "09:00",
      schoolDays: "Monday,Tuesday,Wednesday,Thursday,Friday",
      denominator: "Existing source definitions",
      approval: "Required",
      effective: "2025-02-25",
    },
    "Communication Defaults": {
      sender: "School office",
      replyTo: "",
      language: "English",
      consent: "Opt-in required",
    },
    "Online Admission": {
      session: bridge.session,
      classes: "",
      open: "2025-02-24",
      close: "2025-07-31",
      required: "Applicant name,Guardian name,Class",
      documents: "Metadata only",
      instructions: "Illustrative application preview. No public submission is collected.",
      reference: "APP",
      status: "Draft",
    },
    "Student Profile Update": {
      fields: "email,phone",
      approval: "Required",
      documents: "Metadata only",
    },
    "Finance Configuration": {
      year: "School-defined",
      allocation: "Existing displayed obligation order",
      reference: "Required",
      discount: "Review required",
      refund: "Not supported by ledger",
      tax: "Not configured",
    },
  });
  const [backups, setBackups] = useState<
    { id: string; at: string; actor: string; settings: typeof records }[]
  >([]);
  const [requests, setRequests] = useState<
    { id: string; student: string; field: string; value: string; status: string; reason: string }[]
  >([]);
  const [applications, setApplications] = useState<
    { id: string; name: string; guardian: string; grade: string; status: string }[]
  >([]);
  const [disabledModules, setDisabledModules] = useState<string[]>([]);
  const sequence = useRef(0);
  const stamp = (
    category: string,
    record: string,
    before: unknown,
    after: unknown,
    reason: string,
  ) => {
    if (role !== "School Administrator")
      throw Error("School Administrator preview role is required.");
    if (!reason.trim()) throw Error("A change reason is required.");
    setAudit((a) => [
      {
        id: `CFG-${++sequence.current}`,
        at: new Date().toISOString(),
        actor: `${role} (unauthenticated preview)`,
        category,
        record,
        before: JSON.stringify(before),
        after: JSON.stringify(after),
        reason,
      },
      ...a,
    ]);
  };
  return {
    ...bridge,
    academic,
    finance,
    examination,
    workforce,
    metadata,
    setMetadata,
    drafts,
    setDrafts,
    draftKinds,
    setDraftKinds,
    sessions,
    setSessionRecords,
    users,
    setUsers,
    customFields,
    setCustomFields,
    audit,
    stamp,
    role,
    setRole,
    records,
    setRecords,
    backups,
    setBackups,
    requests,
    setRequests,
    applications,
    setApplications,
    disabledModules,
    setDisabledModules,
  };
}
const Context = createContext<ReturnType<typeof useStore> | null>(null);
export function SettingsProvider({ children, ...bridge }: Bridge & { children: ReactNode }) {
  return <Context.Provider value={useStore(bridge)}>{children}</Context.Provider>;
}
export function useSettings() {
  const value = useContext(Context);
  if (!value) throw Error("SettingsProvider required");
  return value;
}

export const attendancePages = [
  "Attendance",
  "Student Attendance",
  "Approve Leave",
  "Attendance By Date",
];
export const academicsPages = [
  "Academics",
  "Class Timetable",
  "Teachers Timetable",
  "Assign Class Teacher",
  "Promote Students",
  "Subject Group",
  "Subjects",
  "Class",
  "Sections",
];
export const lessonPages = [
  "Lesson Plan",
  "Manage Lesson Plan",
  "Manage Syllabus Status",
  "Lesson",
  "Topic",
];
export const academicPages = [...attendancePages, ...academicsPages, ...lessonPages];
export const attendanceStatuses = ["Present", "Absent", "Late", "Excused"] as const;
export type AttendanceStatus = (typeof attendanceStatuses)[number];
export type Slot = {
  id: string;
  session: string;
  day: string;
  start: string;
  end: string;
  grade: string;
  section: string;
  teacher: string;
  subject: string;
  room: string;
};
export type Topic = {
  id: string;
  name: string;
  subject: string;
  grade: string;
  session: string;
  completed: boolean;
  due: string;
  history: string[];
};
export type Plan = {
  id: string;
  session: string;
  teacher: string;
  grade: string;
  subject: string;
  topic: string;
  date: string;
  objectives: string;
  resources: string;
  status: string;
};
export type Leave = {
  id: string;
  student: string;
  session: string;
  from: string;
  to: string;
  reason: string;
  status: string;
  history: string[];
};
export function attendanceKey(session: string, date: string, id: string) {
  return [session, date, id].join("|");
}
export function summarizeAttendance(
  ids: string[],
  records: Record<string, AttendanceStatus>,
  session: string,
  date: string,
) {
  const counts = { Present: 0, Absent: 0, Late: 0, Excused: 0, Unmarked: 0 };
  ids.forEach((id) => {
    const s = records[attendanceKey(session, date, id)];
    if (s) counts[s]++;
    else counts.Unmarked++;
  });
  return {
    ...counts,
    expected: ids.length,
    rate: ids.length ? ((counts.Present + counts.Late) / ids.length) * 100 : null,
  };
}
export function timetableError(slots: Slot[], candidate: Slot) {
  if (
    !candidate.teacher ||
    !candidate.grade ||
    !candidate.section ||
    !candidate.subject ||
    !candidate.room
  )
    return "Teacher, class, section, subject and room are required.";
  if (
    !/^\d{2}:\d{2}$/.test(candidate.start) ||
    !/^\d{2}:\d{2}$/.test(candidate.end) ||
    candidate.start >= candidate.end
  )
    return "Choose a start time before the end time.";
  const conflict = slots.find(
    (s) =>
      s.id !== candidate.id &&
      s.session === candidate.session &&
      s.day === candidate.day &&
      s.start < candidate.end &&
      candidate.start < s.end &&
      (s.teacher === candidate.teacher ||
        s.room === candidate.room ||
        (s.grade === candidate.grade && s.section === candidate.section)),
  );
  return conflict ? "Clash: teacher, room or class already has an overlapping period." : "";
}
export function syllabusSummary(topics: Topic[]) {
  const complete = topics.filter((t) => t.completed).length;
  return {
    total: topics.length,
    complete,
    percent: topics.length ? Math.round((complete / topics.length) * 100) : null,
  };
}
export function promotionError(
  student: { status: string; grade: string },
  destination: string,
  section: string,
  targetSession: string,
  currentSession: string,
) {
  if (student.status !== "Active") return "Inactive record · excluded";
  if (!student.grade) return "No current class · review required";
  if (!destination || !section) return "Destination class and section required";
  if (!targetSession || targetSession === currentSession)
    return "Choose a different destination session";
  if (destination === student.grade) return "Destination matches current class · review required";
  return "";
}

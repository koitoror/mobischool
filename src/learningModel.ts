export const homeworkPages = ["Homework", "Add Homework"];
export const downloadPages = ["Download Center", "Upload/Share Content", "Content Share List"];
export const libraryPages = [
  "Library",
  "Book List",
  "Issue - Return",
  "Add Student",
  "Add Staff Member",
];
export const learningPages = [...homeworkPages, ...downloadPages, ...libraryPages];
export type Assignment = {
  id: string;
  session: string;
  title: string;
  instructions: string;
  grade: string;
  section: string;
  subject: string;
  teacher: string;
  date: string;
  due: string;
  type: string;
  maximum: string;
  method: string;
  resource: string;
  late: string;
  resubmit: string;
  status: string;
  history: string[];
};
export type Submission = {
  id: string;
  assignment: string;
  student: string;
  text: string;
  submitted: string;
  marks: string;
  feedback: string;
  status: string;
  history: string[];
};
export type Resource = {
  id: string;
  session: string;
  title: string;
  description: string;
  category: string;
  subject: string;
  grade: string;
  section: string;
  scope: string;
  filename: string;
  size: string;
  uploader: string;
  date: string;
  status: string;
  history: string[];
};
export type Book = {
  id: string;
  title: string;
  isbn: string;
  author: string;
  category: string;
  subject: string;
  shelf: string;
  copies: number;
  unavailable: number;
  status: string;
  description: string;
  history: string[];
};
export type Member = { id: string; kind: string; person: string; status: string };
export type Loan = {
  id: string;
  book: string;
  member: string;
  issued: string;
  due: string;
  returned: string;
  condition: string;
  renewals: number;
  history: string[];
};
export type LibraryState = { books: Book[]; members: Member[]; loans: Loan[] };
export type LibraryPolicy = { days: number; renewals: number; limit: number; fine: number };
export const defaultPolicy: LibraryPolicy = { days: 14, renewals: 1, limit: 3, fine: 0 };
export function validDate(v: string) {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(v) &&
    Number.isFinite(Date.parse(v)) &&
    new Date(v).toISOString().slice(0, 10) === v
  );
}
export function available(state: LibraryState, book: Book) {
  return (
    book.copies -
    book.unavailable -
    state.loans.filter((l) => l.book === book.id && !l.returned).length
  );
}
export function assignmentError(v: Assignment) {
  if (
    !v.title.trim() ||
    !v.instructions.trim() ||
    !v.session ||
    !v.grade ||
    !v.section ||
    !v.subject ||
    !v.teacher
  )
    return "Title, instructions, session, class, section, subject and teacher are required.";
  if (!validDate(v.date) || !Number.isFinite(Date.parse(v.due)) || v.due < v.date + "T00:00")
    return "Choose a valid assignment date and a later due date/time.";
  if (v.maximum && (!Number.isFinite(Number(v.maximum)) || Number(v.maximum) <= 0))
    return "Optional maximum marks must be positive.";
  return "";
}
export function resourceError(r: Resource, limit: number) {
  if (!r.title.trim() || !r.subject || !r.uploader || !validDate(r.date))
    return "Title, subject, uploader and valid date are required.";
  if (!/\.(pdf|docx?|pptx?|png|jpe?g|mp3|mp4|txt)$/i.test(r.filename))
    return "Unsupported file type. Use PDF, DOC/DOCX, PPT/PPTX, PNG/JPG, MP3, MP4 or TXT.";
  if (!Number.isFinite(Number(r.size)) || Number(r.size) <= 0 || Number(r.size) > limit)
    return `Illustrative file size must be greater than zero and at most ${limit} MB.`;
  if (
    !r.scope ||
    (r.scope === "Selected class" && !r.grade) ||
    (r.scope === "Selected section" && (!r.grade || !r.section))
  )
    return "Choose a valid sharing scope and its target class/section.";
  return "";
}
export function bookError(book: Book, state: LibraryState) {
  if (!book.title.trim() || !book.author.trim() || !book.category.trim())
    return "Title, author and category are required.";
  if (book.isbn && state.books.some((b) => b.id !== book.id && b.isbn === book.isbn.trim()))
    return "This ISBN already exists.";
  if (!Number.isInteger(book.copies) || book.copies < 0)
    return "Copies must be a non-negative whole number.";
  const active = state.loans.filter((l) => l.book === book.id && !l.returned).length;
  if (book.copies < active + book.unavailable)
    return "Cannot remove copies that are issued, lost or damaged.";
  if (book.status === "Archived" && active)
    return "Resolve active loans before archiving this book.";
  return "";
}
export function register(state: LibraryState, member: Member, active: boolean) {
  if (!active) throw Error("Inactive or disabled person cannot register.");
  if (state.members.some((m) => m.kind === member.kind && m.person === member.person))
    throw Error("Already registered; duplicate membership prevented.");
  return { ...state, members: [...state.members, member] };
}
export function issue(state: LibraryState, loan: Loan, active: boolean, policy: LibraryPolicy) {
  const book = state.books.find((b) => b.id === loan.book),
    member = state.members.find((m) => m.id === loan.member);
  if (!book || book.status !== "Active" || available(state, book) <= 0)
    throw Error("No available copies of this active book.");
  if (!member || member.status !== "Active" || !active)
    throw Error("Borrower is not registered, inactive or ineligible.");
  if (state.loans.filter((l) => l.member === loan.member && !l.returned).length >= policy.limit)
    throw Error("Configured loan limit reached.");
  if (!validDate(loan.issued) || !validDate(loan.due) || loan.due < loan.issued)
    throw Error("Return date must be on or after a valid issue date.");
  return { ...state, loans: [loan, ...state.loans] };
}
export function returnLoan(
  state: LibraryState,
  id: string,
  date: string,
  condition: string,
  stamp: string,
) {
  const loan = state.loans.find((l) => l.id === id);
  if (!loan || loan.returned) throw Error("Loan is missing or already returned.");
  if (!validDate(date) || date < loan.issued) throw Error("Return date cannot precede issue date.");
  if (!["Good", "Damaged", "Lost"].includes(condition)) throw Error("Choose a return condition.");
  return {
    ...state,
    books: state.books.map((b) =>
      b.id === loan.book && condition !== "Good" ? { ...b, unavailable: b.unavailable + 1 } : b,
    ),
    loans: state.loans.map((l) =>
      l.id === id ? { ...l, returned: date, condition, history: [...l.history, stamp] } : l,
    ),
  };
}
export function overdueDays(due: string, today: string) {
  return Math.max(0, Math.floor((Date.parse(today) - Date.parse(due)) / 86400000));
}
export function resourceVisible(r: Resource, student: { grade: string; section: string }) {
  return (
    r.status === "Published" &&
    r.scope !== "Staff only" &&
    (r.scope !== "Selected class" || r.grade === student.grade) &&
    (r.scope !== "Selected section" || (r.grade === student.grade && r.section === student.section))
  );
}

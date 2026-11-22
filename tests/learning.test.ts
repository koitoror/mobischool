import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AcademicProvider } from "../src/AcademicContext";
import { WorkforceProvider } from "../src/WorkforceContext";
import { LearningProvider } from "../src/LearningContext";
import Learning from "../src/Learning";
import {
  available,
  bookError,
  register,
  issue,
  returnLoan,
  defaultPolicy,
  resourceError,
  assignmentError,
  learningPages,
  type Book,
  type LibraryState,
  type Loan,
  type Assignment,
  type Resource,
} from "../src/learningModel";
const book: Book = {
  id: "B",
  title: "Test Book",
  isbn: "123",
  author: "Sample Author",
  category: "General",
  subject: "Science",
  shelf: "A",
  copies: 1,
  unavailable: 0,
  status: "Active",
  description: "",
  history: [],
};
const seed = (): LibraryState => ({
  books: [book],
  members: [{ id: "M", kind: "Student", person: "S", status: "Active" }],
  loans: [],
});
const loan: Loan = {
  id: "L",
  book: "B",
  member: "M",
  issued: "2025-02-24",
  due: "2025-03-10",
  returned: "",
  condition: "Good",
  renewals: 0,
  history: [],
};
test("issue and return reconcile inventory without mutating input", () => {
  const s = seed(),
    issued = issue(s, loan, true, defaultPolicy);
  assert.equal(available(issued, book), 0);
  assert.equal(available(s, book), 1);
  assert.equal(available(returnLoan(issued, "L", "2025-03-10", "Good", "Returned"), book), 1);
});
test("unavailable copy and inactive borrower blocked", () => {
  assert.throws(() => issue(seed(), loan, false, defaultPolicy), /ineligible/);
  const s = issue(seed(), loan, true, defaultPolicy);
  assert.throws(() => issue(s, { ...loan, id: "L2" }, true, defaultPolicy), /available/);
});
test("lost book stays unavailable and double return blocked", () => {
  const s = returnLoan(issue(seed(), loan, true, defaultPolicy), "L", "2025-03-10", "Lost", "Lost");
  assert.equal(available(s, s.books[0]), 0);
  assert.throws(() => returnLoan(s, "L", "2025-03-10", "Good", ""), /already/);
});
test("duplicate registration and disabled person blocked", () => {
  assert.throws(
    () => register(seed(), { id: "N", kind: "Student", person: "S", status: "Active" }, true),
    /duplicate/,
  );
  assert.throws(
    () => register(seed(), { id: "N", kind: "Staff", person: "P", status: "Active" }, false),
    /Inactive/,
  );
});
test("active loans prevent unsafe inventory changes", () => {
  const s = issue(seed(), loan, true, defaultPolicy);
  assert.ok(bookError({ ...book, copies: 0 }, s));
  assert.ok(bookError({ ...book, status: "Archived" }, s));
  assert.ok(bookError({ ...book, id: "Other" }, s));
});
test("invalid loan dates rejected", () =>
  assert.throws(() => issue(seed(), { ...loan, due: "2025-02-30" }, true, defaultPolicy), /date/));
test("resource extension scope and size validated", () => {
  const r = {
    title: "Resource",
    subject: "Science",
    uploader: "Sample",
    date: "2025-02-24",
    filename: "test.pdf",
    size: "1",
    scope: "Entire school",
  } as Resource;
  assert.equal(resourceError(r, 20), "");
  assert.ok(resourceError({ ...r, filename: "x.exe" }, 20));
  assert.ok(resourceError({ ...r, size: "21" }, 20));
  assert.ok(resourceError({ ...r, scope: "Selected class", grade: "" }, 20));
});
test("incomplete homework blocked", () =>
  assert.ok(assignmentError({ title: "", instructions: "" } as Assignment)));
const students = [
  {
    id: "S",
    name: "Sample Student",
    grade: "Grade 8",
    section: "A",
    guardian: "Not supplied",
    phone: "",
    date: "",
    status: "Active",
  },
];
for (const page of learningPages)
  test("renders learning route " + page, () => {
    const html = renderToStaticMarkup(
      h(WorkforceProvider, {
        children: h(AcademicProvider, {
          students,
          session: "2024 – 2025",
          children: h(LearningProvider, {
            students,
            session: "2024 – 2025",
            children: h(Learning, {
              page,
              active: true,
              school: "Sample School",
              navigate: () => {},
              onDirty: () => {},
              notify: () => {},
            }),
          }),
        }),
      }),
    );
    assert.ok(html.includes("Illustrative Data"));
    assert.ok(!html.includes("NaN"));
  });

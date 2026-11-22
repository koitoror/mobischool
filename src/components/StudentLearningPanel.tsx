import { useLearningOptional } from "../LearningContext";
import { Card, Button } from "./OperationsUI";
import { resourceVisible } from "../learningModel";
export default function StudentLearningPanel({
  student,
  tab,
  navigate,
}: {
  student: string;
  tab: string;
  navigate: (p: string) => void;
}) {
  const x = useLearningOptional(),
    person = x?.students.find((s) => s.id === student);
  if (!x || !person)
    return (
      <Card title={tab}>
        <p>Shared learning records unavailable.</p>
      </Card>
    );
  const member = x.library.members.find((m) => m.kind === "Student" && m.person === student);
  return (
    <Card
      title={`Student ${tab.toLowerCase()}`}
      sub="Shared prototype records · not an authenticated student portal"
    >
      <div className="learn-pad">
        {tab === "Homework" ? (
          <>
            {x.assignments
              .filter(
                (h) =>
                  h.session === x.session &&
                  h.status === "Published" &&
                  h.grade === person.grade &&
                  h.section === person.section,
              )
              .map((h) => {
                const s = x.submissions.find((s) => s.assignment === h.id && s.student === student);
                return (
                  <div key={h.id}>
                    <strong>{h.title}</strong>
                    <p>
                      Due {h.due} · {s?.status || "Not submitted"} ·{" "}
                      {s?.submitted && s.submitted > h.due ? "Late" : ""} · marks{" "}
                      {s?.marks || "Ungraded"} · {s?.feedback || "No feedback"}
                    </p>
                  </div>
                );
              })}
            <Button onClick={() => navigate("Add Homework")}>Open Homework</Button>
          </>
        ) : tab === "Download Center" ? (
          <>
            {x.resources
              .filter((r) => r.session === x.session && resourceVisible(r, person))
              .map((r) => (
                <div key={r.id}>
                  <strong>{r.title}</strong>
                  <p>
                    {r.subject} · {r.category} · {r.filename} · {r.date} · metadata preview only
                  </p>
                </div>
              ))}
            <Button onClick={() => navigate("Content Share List")}>View resource previews</Button>
          </>
        ) : (
          <>
            <p>Membership: {member ? `${member.id} · ${member.status}` : "Not registered"}</p>
            {x.library.loans
              .filter((l) => l.member === member?.id)
              .map((l) => (
                <div key={l.id}>
                  <strong>{x.library.books.find((b) => b.id === l.book)?.title}</strong>
                  <p>
                    Due {l.due} ·{" "}
                    {l.returned
                      ? `Returned ${l.returned} · ${l.condition}`
                      : l.due < x.academic.day
                        ? "Overdue"
                        : "Issued"}
                  </p>
                </div>
              ))}
            <Button onClick={() => navigate("Issue - Return")}>Open circulation history</Button>
          </>
        )}
      </div>
    </Card>
  );
}

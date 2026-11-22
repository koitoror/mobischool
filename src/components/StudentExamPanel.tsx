import { useExaminationOptional } from "../ExaminationContext";
import { Card, Button } from "./OperationsUI";
import { AssessmentTable } from "./AssessmentUI";
export default function StudentExamPanel({
  student,
  navigate,
}: {
  student: string;
  navigate: (p: string) => void;
}) {
  const x = useExaminationOptional();
  if (!x)
    return (
      <Card title="Examinations">
        <p>Examination provider is unavailable.</p>
      </Card>
    );
  const exams = x.sessionExams.filter(
    (e) =>
      x.candidates(e).some((s) => s.id === student) ||
      x.scores.some((s) => s.exam === e.id && s.student === student),
  );
  return (
    <Card
      title="Shared examination history"
      sub="Same results as the examination register · draft results are not official"
    >
      <AssessmentTable
        headers={[
          "Exam",
          "Subject",
          "Score",
          "Maximum",
          "Percentage",
          "Grade",
          "Status",
          "Actions",
        ]}
        rows={exams.map((e) => {
          const s = x.scores.find((s) => s.exam === e.id && s.student === student);
          return [
            e.name,
            e.subject,
            s?.value || "Missing",
            e.maximum,
            s?.percentage === undefined ? "Unpublished" : s.percentage + "%",
            s?.grade || "Unpublished",
            s?.status || "Incomplete",
            <Button
              onClick={() => {
                x.setSelectedExam(e.id);
                navigate("Exam Result");
              }}
            >
              View result
            </Button>,
          ];
        })}
      />
      <div className="op-inline">
        {["Exam Schedule", "Print Admit Card", "Print Marksheet"].map((p) => (
          <Button
            key={p}
            onClick={() => {
              if (exams[0]) x.setSelectedExam(exams[0].id);
              navigate(p);
            }}
          >
            {p}
          </Button>
        ))}
      </div>
    </Card>
  );
}

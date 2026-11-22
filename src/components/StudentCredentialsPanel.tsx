import { useState } from "react";
import { useCredentialsOptional } from "../CredentialsContext";
import { Button, Card, Badge } from "./OperationsUI";
import { AssessmentDialog } from "./AssessmentUI";
import { IssuedPreview } from "../CredentialPreview";
import { effectiveStatus } from "../credentialsModel";
export default function StudentCredentialsPanel({
  student,
  navigate,
}: {
  student: string;
  navigate: (p: string) => void;
}) {
  const x = useCredentialsOptional(),
    [id, setId] = useState("");
  const doc = x?.documents.find((d) => d.id === id),
    alumni = x?.alumni.find((a) => a.student === student);
  return (
    <Card
      title="Credentials / Documents"
      sub="Shared document snapshots · browser-memory simulations only"
    >
      <div className="cred-pad">
        {!x?.documents.some((d) => d.person === student) && (
          <p>No generated credentials for this student.</p>
        )}
        {x?.documents
          .filter((d) => d.person === student)
          .map((d) => (
            <div key={d.id}>
              <strong>
                {d.type} · {d.number}
              </strong>
              <p>
                {d.issue} · <Badge>{effectiveStatus(d, x.today)}</Badge> · Expiry{" "}
                {d.expiry || "Not configured"} · reissue of {d.reissueOf || "None"}
              </p>
              <Button onClick={() => setId(d.id)}>Preview credential</Button>
            </div>
          ))}
        {alumni && (
          <p>
            Manually reviewed alumni record: {alumni.year} · {alumni.status}. This is not a verified
            graduation decision.
          </p>
        )}
        <div className="cred-actions">
          <Button onClick={() => navigate("Student Certificate")}>Open certificate registry</Button>
          <Button onClick={() => navigate("Generate ID Card")}>Open student ID register</Button>
        </div>
        {doc && x && (
          <AssessmentDialog title="Student credential preview" onClose={() => setId("")}>
            <IssuedPreview document={{ ...doc, status: effectiveStatus(doc, x.today) }} />
          </AssessmentDialog>
        )}
      </div>
    </Card>
  );
}

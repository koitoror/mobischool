import { useFinance } from "../FinanceContext";
import { AS_OF, totals, balanceFor, paidFor } from "../financeModel";
import { Card, Button, Badge } from "./OperationsUI";
import type { Student } from "../Lifecycle";
export default function StudentFeePanel({
  student,
  session,
  onNavigate,
}: {
  student: Student;
  session: string;
  onNavigate: (p: string) => void;
}) {
  const { ledger, money, setSelectedStudent } = useFinance();
  const fees = ledger.obligations.filter((o) => o.student === student.id && o.session === session);
  const payments = ledger.payments.filter(
    (payment) => payment.student === student.id && payment.session === session,
  );
  const t = totals(ledger, fees);
  const overdue = fees
    .filter((fee) => fee.due < AS_OF)
    .reduce((sum, fee) => sum + balanceFor(ledger, fee), 0);
  return (
    <Card
      title="Student fee account"
      sub={`Illustrative ledger · ${session} · confirmed preview payments only`}
      action={
        <Button
          onClick={() => {
            setSelectedStudent(student.id);
            onNavigate("Collect Fees");
          }}
        >
          Collect fees
        </Button>
      }
    >
      <div className="op-record-metrics">
        <div>
          <small>Expected after discounts</small>
          <strong>{money(t.expected)}</strong>
        </div>
        <div>
          <small>Paid (simulation)</small>
          <strong>{money(t.paid)}</strong>
        </div>
        <div>
          <small>Outstanding</small>
          <strong>{money(t.outstanding)}</strong>
        </div>
        <div>
          <small>Overdue as of {AS_OF}</small>
          <strong>{money(overdue)}</strong>
        </div>
      </div>
      <div className="op-table-wrap">
        <table>
          <thead>
            <tr>
              {["Receipt", "Payment date", "Method", "Reference", "Amount", "Status"].map((h) => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {payments.map((payment) => (
              <tr key={payment.id}>
                <td>{payment.id}</td>
                <td>{payment.date}</td>
                <td>{payment.method}</td>
                <td>{payment.reference || "Cash · no external reference"}</td>
                <td>{money(payment.amount)}</td>
                <td>
                  <Badge>Confirmed (simulation)</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!payments.length && (
          <div className="op-empty">
            <h3>No payment history</h3>
            <p>No receipt exists until a simulated payment is confirmed.</p>
          </div>
        )}
      </div>
      <p className="op-description">
        Discounts applied: {money(t.discount)} · reminder history is managed in the Finance
        workspace and is not provider-confirmed.
      </p>
      <div className="op-table-wrap">
        <table>
          <thead>
            <tr>
              {["Fee obligation", "Due date", "Expected", "Paid", "Balance", "Status"].map((h) => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {fees.map((o) => (
              <tr key={o.id}>
                <td>{o.item}</td>
                <td>{o.due}</td>
                <td>{money(o.amount - o.discount)}</td>
                <td>{money(paidFor(ledger, o.id))}</td>
                <td>{money(balanceFor(ledger, o))}</td>
                <td>
                  <Badge>
                    {balanceFor(ledger, o) === 0
                      ? "Paid"
                      : paidFor(ledger, o.id) > 0
                        ? "Part-paid"
                        : "Unpaid"}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!fees.length && (
          <div className="op-empty">
            <h3>No fees assigned for this session</h3>
            <p>Fee schedule creation does not automatically assign obligations.</p>
            <Button onClick={() => onNavigate("Fees Master")}>View fee schedules</Button>
          </div>
        )}
      </div>
      <div className="fn-inline-actions">
        <Button
          onClick={() => {
            setSelectedStudent(student.id);
            onNavigate("Search Fees Payment");
          }}
        >
          Payment records & receipts
        </Button>
        <Button
          onClick={() => {
            setSelectedStudent(student.id);
            onNavigate("Search Due Fees");
          }}
        >
          View due fees
        </Button>
      </div>
    </Card>
  );
}

import { createContext, useContext, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  seedLedger,
  postPayment,
  financeSummary,
  type Ledger,
  type PaymentInput,
  methods,
} from "./financeModel";
export type PaymentMethodConfig = {
  name: string;
  code: string;
  description: string;
  active: boolean;
  reference: boolean;
  effective: string;
  order: number;
};
const Context = createContext<ReturnType<typeof useStore> | null>(null);
function useStore(ids: string[], session: string) {
  const [ledger, setLedger] = useState(() => seedLedger(ids, session));
  const ref = useRef(ledger);
  const [currency, setCurrency] = useState("USD");
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodConfig[]>(() =>
    methods.map((name, order) => ({
      name,
      code: name.toUpperCase().replace(/ /g, "_"),
      description: "Illustrative configured method; no provider connection",
      active: true,
      reference: true,
      effective: "2025-01-01",
      order,
    })),
  );
  const [precision, setPrecision] = useState(2);
  const [selectedStudent, setSelectedStudent] = useState(ids[0] || "");
  const update = (fn: (l: Ledger) => Ledger) => {
    const next = fn(ref.current);
    ref.current = next;
    setLedger(next);
  };
  const commit = (input: PaymentInput) => {
    const result = postPayment(
      ref.current,
      input,
      paymentMethods.filter((m) => m.active).map((m) => m.name),
    );
    ref.current = result.ledger;
    setLedger(result.ledger);
    return result.payment;
  };
  const money = (cents: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: precision,
      maximumFractionDigits: precision,
    }).format(cents / 100);
  const summary = () => financeSummary(ref.current, session);
  return {
    ledger,
    update,
    commit,
    money,
    currency,
    setCurrency,
    paymentMethods,
    setPaymentMethods,
    precision,
    setPrecision,
    selectedStudent,
    setSelectedStudent,
    summary,
  };
}
export function FinanceProvider({
  ids,
  session,
  children,
}: {
  ids: string[];
  session: string;
  children: ReactNode;
}) {
  const store = useStore(ids, session);
  return <Context.Provider value={store}>{children}</Context.Provider>;
}
export function useFinance() {
  const c = useContext(Context);
  if (!c) throw Error("FinanceProvider is required");
  return c;
}

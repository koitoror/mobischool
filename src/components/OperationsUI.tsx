import Icon from "./Icon";
import { useId } from "react";
export function Button({
  children,
  onClick,
  primary = false,
  danger = false,
  icon,
  disabled = false,
  type = "button",
  ariaLabel,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  primary?: boolean;
  danger?: boolean;
  icon?: string;
  disabled?: boolean;
  type?: "button" | "submit";
  ariaLabel?: string;
}) {
  return (
    <button
      type={type}
      aria-label={ariaLabel}
      onClick={onClick}
      disabled={disabled}
      className={"op-btn " + (primary ? "op-primary " : "") + (danger ? "op-danger" : "")}
    >
      {icon && <Icon name={icon} size={15} />} {children}
    </button>
  );
}
export function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span
      className={
        "op-badge " +
        (["Active", "Approved", "Verified", "Checked out", "Resolved", "Converted"].includes(
          String(children),
        )
          ? "good"
          : ["Rejected", "Disabled", "High", "Blocked"].includes(String(children))
            ? "bad"
            : [
                  "New",
                  "Received",
                  "Awaiting Information",
                  "Follow-up",
                  "On campus",
                  "Pending",
                  "Unassigned",
                ].includes(String(children))
              ? "warn"
              : "")
      }
    >
      {children}
    </span>
  );
}
export function Card({
  title,
  sub,
  children,
  action,
}: {
  title: string;
  sub?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section className="op-card">
      <header>
        <div>
          <h2>{title}</h2>
          {sub && <p>{sub}</p>}
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}
export function Field({
  label,
  value,
  onChange,
  options,
  required = false,
  type = "text",
  hint,
  error,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options?: string[];
  required?: boolean;
  type?: string;
  hint?: string;
  error?: string;
}) {
  const description = useId();
  const accessibility = {
    "aria-describedby": hint || error ? description : undefined,
    "aria-invalid": error ? true : undefined,
  };
  return (
    <label className="op-field">
      <span>
        {label}
        {required && <b> *</b>}
      </span>
      {options ? (
        <select
          {...accessibility}
          value={value}
          required={required}
          onChange={(e) => onChange(e.target.value)}
        >
          {!value && <option value="">Select…</option>}
          {options.map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
      ) : type === "textarea" ? (
        <textarea
          {...accessibility}
          value={value}
          required={required}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input
          {...accessibility}
          type={type}
          value={value}
          required={required}
          onChange={(e) => onChange(e.target.value)}
        />
      )}{" "}
      {(hint || error) && <small id={description}>{error || hint}</small>}
    </label>
  );
}

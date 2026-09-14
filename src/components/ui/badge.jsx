import { cn } from "@/lib/utils/cn";
import {
  PRIORITY_COLORS,
  PRIORITY_LABELS,
  REQUIREMENT_STATUS_COLORS,
  REQUIREMENT_STATUS_LABELS,
} from "@/lib/constants/statuses";

export function TypeBadge({ type, className }) {
  const isRF = type === "RF";
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center px-2.5 py-0.5 rounded text-xs font-semibold uppercase tracking-wider",
        isRF
          ? "bg-blue-50 text-blue-600 border border-blue-200"
          : "bg-indigo-50 text-indigo-600 border border-indigo-200",
        className
      )}
    >
      {type}
    </span>
  );
}

export function PriorityBadge({ priority, className }) {
  const config = PRIORITY_COLORS[priority] || PRIORITY_COLORS.medium;
  const label = PRIORITY_LABELS[priority] || priority;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border",
        config.bg,
        config.text,
        config.border,
        className
      )}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full", config.dot)} />
      {label}
    </span>
  );
}

export function StatusBadge({ status, className }) {
  const style = REQUIREMENT_STATUS_COLORS[status] || "bg-slate-100 text-slate-700 border-slate-200";
  const label = REQUIREMENT_STATUS_LABELS[status] || status;

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border",
        style,
        className
      )}
    >
      {label}
    </span>
  );
}

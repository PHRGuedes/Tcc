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
        "inline-flex items-center justify-center px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider",
        isRF
          ? "bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/80"
          : "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/80",
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
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border",
        config.bg,
        config.text,
        config.border,
        className
      )}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", config.dot)} />
      {label}
    </span>
  );
}

export function StatusBadge({ status, className }) {
  const style =
    REQUIREMENT_STATUS_COLORS[status] ||
    "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700";
  const label = REQUIREMENT_STATUS_LABELS[status] || status;

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border",
        style,
        className
      )}
    >
      {label}
    </span>
  );
}

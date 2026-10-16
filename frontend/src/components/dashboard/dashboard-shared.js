import { parseWallClockDate, formatWallClockDateShort } from "@/lib/date-helpers";

export function getDueMeta(dueAt) {
  if (!dueAt) {
    return { label: "No due date", className: "bg-muted text-muted-foreground" };
  }

  const due = parseWallClockDate(dueAt);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfDue = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  const diffDays = Math.round((startOfDue - startOfToday) / 86400000);

  if (diffDays < 0) {
    return {
      label: formatWallClockDateShort(dueAt),
      className: "bg-destructive/10 text-destructive",
    };
  }
  if (diffDays === 0) {
    return { label: "Due today", className: "bg-destructive/10 text-destructive" };
  }
  if (diffDays === 1) {
    return {
      label: "Due tomorrow",
      className: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
    };
  }
  if (diffDays <= 3) {
    return {
      label: `In ${diffDays} days`,
      className: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
    };
  }

  return { label: formatWallClockDateShort(dueAt), className: "bg-secondary text-secondary-foreground" };
}

export function EmptyState({ icon: Icon, message }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-10 text-center text-muted-foreground">
      <Icon className="h-8 w-8 opacity-40" />
      <p className="text-sm">{message}</p>
    </div>
  );
}

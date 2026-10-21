"use client";

import { Progress } from "@/components/ui/progress";
import { parseWallClockDate } from "@/lib/date-helpers";

export function SemesterProgress({ semester }) {
  if (!semester || !semester.start_date || !semester.end_date) {
    return null;
  }

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const start = parseWallClockDate(semester.start_date);
  const end = parseWallClockDate(semester.end_date);

  let progress;
  if (now < start) {
    progress = 0;
  } else if (now > end) {
    progress = 100;
  } else {
    const totalDuration = end.getTime() - start.getTime();
    const elapsed = now.getTime() - start.getTime();
    progress = totalDuration > 0 ? Math.min(100, Math.max(0, (elapsed / totalDuration) * 100)) : 100;
  }

  return (
    <div className="mb-6">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-lg font-semibold">{semester.name}</h2>
        <span className="text-sm font-medium">{Math.round(progress)}% complete</span>
      </div>
      <Progress value={progress} className="h-2" indicatorclassname="bg-lime-400" />
      <div className="flex justify-between text-xs text-muted-foreground mt-1">
        <span>{start.toLocaleDateString()}</span>
        <span>{end.toLocaleDateString()}</span>
      </div>
    </div>
  );
}

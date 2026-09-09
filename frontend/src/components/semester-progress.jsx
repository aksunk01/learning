"use client";

import { Progress } from "@/components/ui/progress";
import { CURRENT_SEMESTER } from "@/lib/semester";

// Helper function to parse date strings as local calendar dates
function parseLocalDate(dateString) {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function SemesterProgress() {
  // Get current date at start of day (local time)
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  
  // Parse semester dates as local calendar dates
  const start = parseLocalDate(CURRENT_SEMESTER.startDate);
  const end = parseLocalDate(CURRENT_SEMESTER.endDate);
  
  // Calculate progress
  let progress;
  if (now < start) {
    progress = 0;
  } else if (now > end) {
    progress = 100;
  } else {
    // Calculate progress between start and end dates
    const totalDuration = end.getTime() - start.getTime();
    const elapsed = now.getTime() - start.getTime();
    progress = Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));
  }

  return (
    <div className="mb-6">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-lg font-semibold">{CURRENT_SEMESTER.name}</h2>
        <span className="text-sm font-medium">{Math.round(progress)}% complete</span>
      </div>
      <Progress value={progress} className="h-2" indicatorclassname="bg-lime-400" />
      <div className="flex justify-between text-xs text-muted-foreground mt-1">
        <span>{parseLocalDate(CURRENT_SEMESTER.startDate).toLocaleDateString()}</span>
        <span>{parseLocalDate(CURRENT_SEMESTER.endDate).toLocaleDateString()}</span>
      </div>
    </div>
  );
}

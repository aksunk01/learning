"use client";

import { Progress } from "@/components/ui/progress";
import { DEFAULT_COURSE_COLOR, courseProgressIndicatorStyle } from "@/lib/colors";

// Assignment-completion progress bar for a single course, styled the same
// way as the dashboard's SemesterProgress bar but colored by the course.
export function CourseProgress({ assignments, color }) {
  if (!assignments || assignments.length === 0) {
    return null;
  }

  const total = assignments.length;
  const completed = assignments.filter((a) => a.is_completed).length;
  const progress = (completed / total) * 100;
  const courseColor = color || DEFAULT_COURSE_COLOR;

  return (
    <div className="mt-4">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium">Progress</span>
        <span className="text-sm font-medium">{Math.round(progress)}% complete</span>
      </div>
      <Progress
        value={progress}
        className="h-2"
        indicatorStyle={courseProgressIndicatorStyle(courseColor)}
      />
      <div className="flex justify-between text-xs text-muted-foreground mt-1">
        <span>{completed} completed</span>
        <span>{total} total</span>
      </div>
    </div>
  );
}

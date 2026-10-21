"use client";

import { Card, CardContent } from "@/components/ui/card";
import { DayHourGrid } from "@/components/calendar/day-hour-grid";
import { formatDateKey } from "@/lib/date-helpers";

// Today's schedule (assignments due today + recurring in-person class
// meetings) as an hour-by-hour grid, meant to sit in a right-hand sidebar
// next to the main dashboard content and stretch to match its height.
export function DayScheduleSidebar({
  assignmentsByDay,
  courseMeetingsByDay,
  coursesById,
  intensityFactor,
  onAssignmentClick,
  onCourseClick,
}) {
  const today = new Date();
  const todayKey = formatDateKey(today);

  return (
    <Card className="h-[500px] lg:h-[var(--sidebar-height,500px)] min-h-0 flex flex-col overflow-hidden py-0 gap-0">
      {/* Plain div, not CardHeader: CardHeader has a built-in rule
          ([.border-b]:pb-(--card-spacing)) that forces a 24px bottom
          padding whenever `border-b` is present, overriding py-3 and
          making the header taller than intended. */}
      <div className="border-b px-6 py-3 shrink-0">
        <p className="font-heading text-base font-medium">
          {today.toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}
        </p>
      </div>
      <CardContent className="flex-1 min-h-0 p-0">
        <DayHourGrid
          days={[today]}
          assignmentsByDay={assignmentsByDay}
          courseMeetingsByDay={courseMeetingsByDay}
          coursesById={coursesById}
          intensityFactor={intensityFactor}
          todayKey={todayKey}
          onAssignmentClick={onAssignmentClick}
          onCourseClick={onCourseClick}
          className="h-full"
        />
      </CardContent>
    </Card>
  );
}

"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DEFAULT_COURSE_COLOR, hexToRgba, courseAccentColor } from "@/lib/colors";
import { formatDateKey, parseWallClockDate } from "@/lib/date-helpers";
import { DayHourGrid, GUTTER_WIDTH_CLASS } from "@/components/calendar/day-hour-grid";

const MAX_VISIBLE_SUMMARY = 3;

// A single bordered week calendar: a day-header/due-summary row sitting
// directly on top of an hour-by-hour grid, sharing the same day columns so
// the two read as one item (Google Calendar/Teams style) rather than two
// separate stacked boxes.
export function WeekView({
  gridDays,
  assignmentsByDay,
  courseMeetingsByDay = {},
  coursesById,
  intensityFactor,
  todayKey,
  onAssignmentClick,
  onCourseClick,
}) {
  const [activeDayKey, setActiveDayKey] = useState(null);

  return (
    <div className="relative mt-4 border rounded-md overflow-hidden">
      {activeDayKey && (
        <div className="fixed inset-0 z-10" onClick={() => setActiveDayKey(null)} />
      )}

      {/* Day header + "due today" summary row - shares the same day columns as the hour grid below it */}
      <div className="flex border-b bg-muted/30">
        <div className={`${GUTTER_WIDTH_CLASS} shrink-0`} />
        {gridDays.map((day) => {
          const key = formatDateKey(day);
          const isToday = key === todayKey;
          const dayAssignments = assignmentsByDay[key] || [];
          const hasAssignments = dayAssignments.length > 0;
          const hasExam = dayAssignments.some((assignment) =>
            /exam|test/i.test(assignment.assignment_type || "")
          );

          return (
            <div
              key={key}
              className={`relative flex-1 min-w-0 border-l p-2 transition-colors ${
                isToday ? "bg-primary/5" : ""
              } ${hasAssignments ? "cursor-pointer hover:bg-muted/50" : ""} ${
                activeDayKey === key ? "z-20" : ""
              }`}
              onMouseEnter={() => hasAssignments && setActiveDayKey(key)}
              onMouseLeave={() =>
                setActiveDayKey((current) => (current === key ? null : current))
              }
              onClick={() =>
                hasAssignments &&
                setActiveDayKey((current) => (current === key ? null : key))
              }
            >
              <div className="flex items-center justify-between gap-1">
                <p className={`text-xs sm:text-sm font-medium ${isToday ? "text-primary" : ""}`}>
                  {day.toLocaleDateString("en-US", { weekday: "short" })} {day.getDate()}
                </p>
                {hasExam && (
                  <span
                    className="h-1.5 w-1.5 rounded-full bg-red-500 shrink-0"
                    title="Exam due this day"
                  />
                )}
              </div>

              {hasAssignments && (
                <div className="mt-1 flex flex-col gap-0.5">
                  {dayAssignments.slice(0, MAX_VISIBLE_SUMMARY).map((assignment) => {
                    const courseColor =
                      coursesById[assignment.course_id]?.color || DEFAULT_COURSE_COLOR;

                    return (
                      <span
                        key={assignment.id}
                        className={`text-[10px] sm:text-xs truncate px-1 rounded ${
                          assignment.is_completed
                            ? "line-through text-muted-foreground bg-muted"
                            : ""
                        }`}
                        style={
                          assignment.is_completed
                            ? undefined
                            : {
                                backgroundColor: hexToRgba(courseColor, 0.15 * intensityFactor),
                                color: courseColor,
                              }
                        }
                      >
                        {assignment.title}
                      </span>
                    );
                  })}
                  {dayAssignments.length > MAX_VISIBLE_SUMMARY && (
                    <span className="text-[10px] sm:text-xs text-muted-foreground">
                      +{dayAssignments.length - MAX_VISIBLE_SUMMARY} more
                    </span>
                  )}
                </div>
              )}

              {activeDayKey === key && (
                <div
                  className="absolute z-20 left-1/2 -translate-x-1/2 top-full mt-1 w-64 max-w-[80vw]"
                  onClick={(event) => event.stopPropagation()}
                >
                  <Card className="shadow-lg py-0">
                    <CardContent className="p-3">
                      <p className="font-medium text-sm mb-2">
                        {day.toLocaleDateString("en-US", {
                          weekday: "long",
                          month: "long",
                          day: "numeric",
                        })}
                      </p>
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {dayAssignments.map((assignment) => {
                          const courseColor =
                            coursesById[assignment.course_id]?.color || DEFAULT_COURSE_COLOR;

                          return (
                            <div
                              key={assignment.id}
                              className="flex items-center justify-between gap-2 p-2 rounded border cursor-pointer hover:bg-muted/50 transition-colors"
                              style={{
                                borderLeft: `3px solid ${courseAccentColor(courseColor, intensityFactor)}`,
                              }}
                              onClick={() => onAssignmentClick(assignment.id)}
                            >
                              <div className="min-w-0 flex items-start gap-2">
                                <span
                                  className="h-2 w-2 rounded-full shrink-0 mt-1"
                                  style={{ backgroundColor: courseAccentColor(courseColor, intensityFactor) }}
                                />
                                <div className="min-w-0">
                                  <p
                                    className={`text-sm font-medium truncate ${
                                      assignment.is_completed
                                        ? "line-through text-muted-foreground"
                                        : ""
                                    }`}
                                  >
                                    {assignment.title}
                                  </p>
                                  <p className="text-xs text-muted-foreground truncate">
                                    {coursesById[assignment.course_id]?.name || "Unknown course"}
                                    {assignment.assignment_type ? ` · ${assignment.assignment_type}` : ""}
                                  </p>
                                </div>
                              </div>
                              <Badge
                                variant={assignment.is_completed ? "secondary" : "outline"}
                                className="shrink-0 text-xs"
                              >
                                {parseWallClockDate(assignment.due_at).toLocaleTimeString("en-US", {
                                  hour: "numeric",
                                  minute: "2-digit",
                                })}
                              </Badge>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Hour-by-hour grid, scrolling as one unit beneath the header row above */}
      <DayHourGrid
        days={gridDays}
        assignmentsByDay={assignmentsByDay}
        courseMeetingsByDay={courseMeetingsByDay}
        coursesById={coursesById}
        intensityFactor={intensityFactor}
        todayKey={todayKey}
        onAssignmentClick={onAssignmentClick}
        onCourseClick={onCourseClick}
      />
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { DEFAULT_COURSE_COLOR, DEFAULT_EVENT_COLOR, hexToRgba, courseAccentColor } from "@/lib/colors";
import { formatDateKey, parseWallClockDate } from "@/lib/date-helpers";
import { formatTime12h, getDayOfWeekValue } from "@/lib/course-schedule";

export const HOUR_HEIGHT_PX = 48;
const HOURS = Array.from({ length: 24 }, (_, i) => i);
// Assignments are an instant due time, not a span - treat each as this long
// purely for layout purposes (sizing the block, detecting overlaps).
const EVENT_LAYOUT_MINUTES = 45;
const DEFAULT_SCROLL_HOUR = 7;
export const GUTTER_WIDTH_CLASS = "w-14 sm:w-16";

function formatHourLabel(hour) {
  if (hour === 0) return "12 AM";
  if (hour === 12) return "12 PM";
  return hour < 12 ? `${hour} AM` : `${hour - 12} PM`;
}

function timeToMinutes(time24h) {
  const [hour, minute] = time24h.split(":").map(Number);
  return hour * 60 + minute;
}

// Side-by-side layout for same-day items (assignment due-times padded to a
// fixed length, or real-duration recurring course meetings) whose times
// overlap, the same way Google Calendar/Teams lay out concurrent events.
function layoutDayItems(items) {
  const sorted = [...items].sort((a, b) => a.start - b.start);

  const placed = [];
  let clusterItems = [];
  let clusterEnd = -Infinity;
  let columnEndTimes = [];

  const flushCluster = () => {
    if (clusterItems.length === 0) return;
    const totalColumns = columnEndTimes.length || 1;
    for (const item of clusterItems) {
      placed.push({ ...item, totalColumns });
    }
    clusterItems = [];
    columnEndTimes = [];
  };

  for (const item of sorted) {
    if (item.start >= clusterEnd) {
      flushCluster();
    }
    clusterEnd = Math.max(clusterEnd, item.end);

    let columnIndex = columnEndTimes.findIndex((endTime) => endTime <= item.start);
    if (columnIndex === -1) {
      columnIndex = columnEndTimes.length;
      columnEndTimes.push(item.end);
    } else {
      columnEndTimes[columnIndex] = item.end;
    }
    clusterItems.push({ ...item, columnIndex });
  }
  flushCluster();

  return placed;
}

// Merge a day's due assignments, recurring (non-online) course meetings, and
// timed personal calendar events into one positioned list for the hour grid.
// Meetings for courses whose semester has already ended by `dayKey` are
// dropped; assignments and events are never filtered by semester.
function buildDayItems(dayAssignments, dayMeetings, dayEvents, dayKey) {
  const assignmentItems = dayAssignments.map((assignment) => {
    const due = parseWallClockDate(assignment.due_at);
    const start = due.getHours() * 60 + due.getMinutes();
    return {
      kind: "assignment",
      key: `assignment-${assignment.id}`,
      start,
      end: start + EVENT_LAYOUT_MINUTES,
      assignment,
    };
  });

  const meetingItems = dayMeetings
    .filter(({ course }) => {
      const endDate = course.semester?.end_date;
      return !endDate || dayKey <= endDate;
    })
    .map(({ course, meeting }) => ({
      kind: "meeting",
      key: `meeting-${course.id}`,
      start: timeToMinutes(meeting.start_time),
      end: timeToMinutes(meeting.end_time),
      course,
      meeting,
    }));

  // All-day events show in the header strip above, not here. Timed events
  // are clamped to this day's 0-24h window in case they cross midnight.
  const eventItems = dayEvents
    .filter((event) => !event.all_day)
    .map((event) => {
      const start = new Date(event.start_at);
      const startMinutes = start.getHours() * 60 + start.getMinutes();
      let endMinutes = startMinutes + EVENT_LAYOUT_MINUTES;

      if (event.end_at) {
        const end = new Date(event.end_at);
        const sameDay = formatDateKey(end) === formatDateKey(start);
        endMinutes = sameDay ? end.getHours() * 60 + end.getMinutes() : 24 * 60;
      }

      return {
        kind: "event",
        key: `event-${event.id}`,
        start: startMinutes,
        end: Math.max(endMinutes, startMinutes + 15),
        event,
      };
    });

  return layoutDayItems([...assignmentItems, ...meetingItems, ...eventItems]);
}

// An hour-by-hour grid (Google Calendar/Teams style) for one or more day
// columns: assignment due-times and recurring course meetings positioned by
// time of day, with a live "now" line on today's column. Used both as the
// body of the week calendar and standalone for a single-day view.
export function DayHourGrid({
  days,
  assignmentsByDay,
  courseMeetingsByDay = {},
  eventsByDay = {},
  coursesById,
  intensityFactor,
  todayKey,
  onAssignmentClick,
  onCourseClick,
  onEventClick,
  className = "max-h-[600px]",
}) {
  const scrollRef = useRef(null);
  const [nowOffset, setNowOffset] = useState(null);

  useEffect(() => {
    const updateNowOffset = () => {
      const now = new Date();
      setNowOffset(((now.getHours() * 60 + now.getMinutes()) / 60) * HOUR_HEIGHT_PX);
    };

    updateNowOffset();
    const interval = setInterval(updateNowOffset, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: DEFAULT_SCROLL_HOUR * HOUR_HEIGHT_PX });
  }, []);

  return (
    <div ref={scrollRef} className={`relative overflow-y-auto ${className}`}>
      <div className="flex" style={{ height: `${24 * HOUR_HEIGHT_PX}px` }}>
        <div className={`${GUTTER_WIDTH_CLASS} shrink-0 relative`}>
          {HOURS.map((hour) => (
            <div
              key={hour}
              className="absolute right-2 -translate-y-1/2 text-[10px] sm:text-xs text-muted-foreground"
              style={{ top: `${hour * HOUR_HEIGHT_PX}px` }}
            >
              {hour > 0 && formatHourLabel(hour)}
            </div>
          ))}
        </div>

        {days.map((day) => {
          const key = formatDateKey(day);
          const dayAssignments = assignmentsByDay[key] || [];
          const dayMeetings = courseMeetingsByDay[getDayOfWeekValue(day)] || [];
          const dayEvents = eventsByDay[key] || [];
          const items = buildDayItems(dayAssignments, dayMeetings, dayEvents, key);
          const isToday = key === todayKey;

          return (
            <div
              key={key}
              className={`flex-1 relative border-l min-w-0 ${isToday ? "bg-primary/5" : ""}`}
            >
              {HOURS.map((hour) => (
                <div
                  key={hour}
                  className="absolute left-0 right-0 border-t border-border"
                  style={{ top: `${hour * HOUR_HEIGHT_PX}px` }}
                />
              ))}

              {isToday && nowOffset != null && (
                <div
                  className="absolute left-0 right-0 h-px bg-red-500 z-10"
                  style={{ top: `${nowOffset}px` }}
                >
                  <div className="absolute -left-1 -top-1 h-2 w-2 rounded-full bg-red-500" />
                </div>
              )}

              {items.map((item) => {
                if (item.kind === "meeting") {
                  const { course, meeting, start, end, totalColumns, columnIndex } = item;
                  const courseColor = course.color || DEFAULT_COURSE_COLOR;

                  return (
                    <div
                      key={item.key}
                      className="absolute rounded px-1 py-0.5 text-[10px] sm:text-xs truncate cursor-pointer hover:brightness-95"
                      style={{
                        top: `${(start / 60) * HOUR_HEIGHT_PX}px`,
                        height: `${((end - start) / 60) * HOUR_HEIGHT_PX - 2}px`,
                        left: `calc(${(columnIndex / totalColumns) * 100}% + 2px)`,
                        width: `calc(${100 / totalColumns}% - 4px)`,
                        backgroundColor: hexToRgba(courseColor, 0.3 * intensityFactor),
                        color: courseColor,
                        border: `1px solid ${courseAccentColor(courseColor, intensityFactor)}`,
                      }}
                      onClick={() => onCourseClick(course.id)}
                      title={`${course.name}${meeting.location ? ` · ${meeting.location}` : ""}`}
                    >
                      {course.name}
                      <span className="hidden sm:inline">
                        {" "}· {formatTime12h(meeting.start_time)}
                      </span>
                    </div>
                  );
                }

                if (item.kind === "event") {
                  const { event, start, end, totalColumns, columnIndex } = item;
                  const eventColor =
                    event.color ||
                    (event.course_id && coursesById[event.course_id]?.color) ||
                    DEFAULT_EVENT_COLOR;

                  return (
                    <div
                      key={item.key}
                      className="absolute rounded px-1 py-0.5 text-[10px] sm:text-xs truncate cursor-pointer hover:brightness-95"
                      style={{
                        top: `${(start / 60) * HOUR_HEIGHT_PX}px`,
                        height: `${((end - start) / 60) * HOUR_HEIGHT_PX - 2}px`,
                        left: `calc(${(columnIndex / totalColumns) * 100}% + 2px)`,
                        width: `calc(${100 / totalColumns}% - 4px)`,
                        backgroundColor: hexToRgba(eventColor, 0.25 * intensityFactor),
                        color: eventColor,
                        border: `1px dashed ${courseAccentColor(eventColor, intensityFactor)}`,
                      }}
                      onClick={() => onEventClick(event)}
                      title={`${event.title}${event.location ? ` · ${event.location}` : ""}`}
                    >
                      {event.title}
                    </div>
                  );
                }

                const { assignment, start, totalColumns, columnIndex } = item;
                const courseColor =
                  coursesById[assignment.course_id]?.color || DEFAULT_COURSE_COLOR;

                return (
                  <div
                    key={item.key}
                    className={`absolute rounded px-1 py-0.5 text-[10px] sm:text-xs truncate cursor-pointer hover:brightness-95 ${
                      assignment.is_completed ? "line-through opacity-60" : ""
                    }`}
                    style={{
                      top: `${(start / 60) * HOUR_HEIGHT_PX}px`,
                      height: `${(EVENT_LAYOUT_MINUTES / 60) * HOUR_HEIGHT_PX - 2}px`,
                      left: `calc(${(columnIndex / totalColumns) * 100}% + 2px)`,
                      width: `calc(${100 / totalColumns}% - 4px)`,
                      backgroundColor: hexToRgba(courseColor, 0.18 * intensityFactor),
                      color: courseColor,
                      borderLeft: `3px solid ${courseAccentColor(courseColor, intensityFactor)}`,
                    }}
                    onClick={() => onAssignmentClick(assignment.id)}
                    title={assignment.title}
                  >
                    {assignment.title}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchAssignmentsInRange } from "@/lib/assignments-api";
import { fetchCourses } from "@/lib/courses-api";
import { formatDateKey, parseWallClockDate } from "@/lib/date-helpers";
import { DEFAULT_COURSE_COLOR, hexToRgba, courseAccentColor } from "@/lib/colors";
import { buildCourseMeetingsByDay } from "@/lib/course-schedule";
import { useColorIntensity } from "@/components/providers/color-intensity-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { AddMenu } from "@/components/navigation/add-menu";
import { WeekView } from "@/components/calendar/week-view";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function startOfWeek(date) {
  const start = new Date(date);
  start.setDate(start.getDate() - start.getDay());
  return start;
}

export default function CalendarPage() {
  const { intensityFactor } = useColorIntensity();
  const router = useRouter();
  const [token, setToken] = useState(null);
  const [viewMode, setViewMode] = useState("month");
  const [cursorDate, setCursorDate] = useState(() => new Date());
  const [assignments, setAssignments] = useState([]);
  const [courses, setCourses] = useState([]);
  const [coursesById, setCoursesById] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeDayKey, setActiveDayKey] = useState(null);

  useEffect(() => {
    const storedToken = localStorage.getItem("access_token");

    if (!storedToken) {
      router.push("/login");
      return;
    }

    Promise.resolve().then(() => setToken(storedToken));
  }, [router]);

  const gridDays = useMemo(() => {
    if (viewMode === "week") {
      const weekStart = startOfWeek(cursorDate);

      return Array.from({ length: 7 }, (_, i) => {
        const day = new Date(weekStart);
        day.setDate(weekStart.getDate() + i);
        return day;
      });
    }

    const gridStart = startOfWeek(startOfMonth(cursorDate));

    return Array.from({ length: 42 }, (_, i) => {
      const day = new Date(gridStart);
      day.setDate(gridStart.getDate() + i);
      return day;
    });
  }, [viewMode, cursorDate]);

  const loadAssignments = useCallback(
    async ({ silent = false } = {}) => {
      if (!token) return;

      if (!silent) {
        setIsLoading(true);
        setActiveDayKey(null);
      }
      setError("");

      try {
        const start = formatDateKey(gridDays[0]);
        const end = formatDateKey(gridDays[gridDays.length - 1]);

        const [assignmentsData, coursesData] = await Promise.all([
          fetchAssignmentsInRange(start, end, token, { includeCompleted: true }),
          fetchCourses(token),
        ]);

        setAssignments(assignmentsData);
        setCourses(coursesData);
        setCoursesById(
          Object.fromEntries(
            coursesData.map((course) => [
              course.id,
              { name: course.name, color: course.color || DEFAULT_COURSE_COLOR },
            ])
          )
        );
      } catch (err) {
        if (err.status === 401 || err.status === 403) {
          localStorage.removeItem("access_token");
          router.push("/login");
          return;
        }

        setError("Failed to load calendar assignments");
      } finally {
        if (!silent) setIsLoading(false);
      }
    },
    [token, gridDays, router]
  );

  useEffect(() => {
    loadAssignments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, gridDays, router]);

  const assignmentsByDay = useMemo(() => {
    const map = {};

    for (const assignment of assignments) {
      if (!assignment.due_at) continue;

      const key = formatDateKey(parseWallClockDate(assignment.due_at));
      (map[key] ||= []).push(assignment);
    }

    for (const key of Object.keys(map)) {
      map[key].sort(
        (a, b) => parseWallClockDate(a.due_at) - parseWallClockDate(b.due_at)
      );
    }

    return map;
  }, [assignments]);

  const courseMeetingsByDay = useMemo(() => buildCourseMeetingsByDay(courses), [courses]);

  const goToPrev = () =>
    setCursorDate((current) => {
      if (viewMode === "week") {
        const prev = new Date(current);
        prev.setDate(prev.getDate() - 7);
        return prev;
      }
      return new Date(current.getFullYear(), current.getMonth() - 1, 1);
    });

  const goToNext = () =>
    setCursorDate((current) => {
      if (viewMode === "week") {
        const next = new Date(current);
        next.setDate(next.getDate() + 7);
        return next;
      }
      return new Date(current.getFullYear(), current.getMonth() + 1, 1);
    });

  const goToToday = () => setCursorDate(new Date());

  const handleAssignmentClick = (assignmentId) => {
    router.push(`/assignments/${assignmentId}`);
  };

  const handleCourseClick = (courseId) => {
    router.push(`/courses/${courseId}`);
  };

  const todayKey = formatDateKey(new Date());

  const headerTitle =
    viewMode === "week"
      ? (() => {
          const start = gridDays[0];
          const end = gridDays[gridDays.length - 1];
          const sameMonth = start.getMonth() === end.getMonth();
          const startLabel = start.toLocaleDateString("en-US", { month: "short", day: "numeric" });
          const endLabel = end.toLocaleDateString(
            "en-US",
            sameMonth
              ? { day: "numeric", year: "numeric" }
              : { month: "short", day: "numeric", year: "numeric" }
          );
          return `${startLabel} – ${endLabel}`;
        })()
      : cursorDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <div className="flex-1 p-6 pb-24 md:pb-6">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Calendar</h1>
          <p className="text-muted-foreground mt-2">
            Hover or tap a day to see what&apos;s due
          </p>
        </div>
        <div className="flex items-center gap-2">
          <AddMenu
            token={token}
            onCourseCreated={() => loadAssignments({ silent: true })}
            onAssignmentCreated={() => loadAssignments({ silent: true })}
            onMaterialUploaded={() => loadAssignments({ silent: true })}
          />
          <ThemeToggle />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={goToPrev} aria-label={viewMode === "week" ? "Previous week" : "Previous month"}>
            <ChevronLeftIcon className="h-4 w-4" />
          </Button>

          <h2 className="text-lg sm:text-xl font-semibold min-w-[160px] text-center">
            {headerTitle}
          </h2>

          <Button variant="outline" size="icon" onClick={goToNext} aria-label={viewMode === "week" ? "Next week" : "Next month"}>
            <ChevronRightIcon className="h-4 w-4" />
          </Button>

          <Button variant="ghost" size="sm" onClick={goToToday}>
            Today
          </Button>
        </div>

        <div className="flex items-center gap-1 rounded-md border p-1">
          <Button
            size="sm"
            variant={viewMode === "month" ? "default" : "ghost"}
            onClick={() => setViewMode("month")}
          >
            Month
          </Button>
          <Button
            size="sm"
            variant={viewMode === "week" ? "default" : "ghost"}
            onClick={() => setViewMode("week")}
          >
            Week
          </Button>
        </div>
      </div>

      {error && (
        <div className="text-sm text-destructive mb-4">{error}</div>
      )}

      {viewMode === "week" ? (
        isLoading ? (
          <Skeleton className="h-[400px] sm:h-[500px] rounded-md" />
        ) : (
          <WeekView
            gridDays={gridDays}
            assignmentsByDay={assignmentsByDay}
            courseMeetingsByDay={courseMeetingsByDay}
            coursesById={coursesById}
            intensityFactor={intensityFactor}
            todayKey={todayKey}
            onAssignmentClick={handleAssignmentClick}
            onCourseClick={handleCourseClick}
          />
        )
      ) : (
        <>
          <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2 text-center text-xs sm:text-sm font-medium text-muted-foreground">
            {WEEKDAY_LABELS.map((label) => (
              <div key={label}>{label}</div>
            ))}
          </div>

          {isLoading ? (
            <div className="grid grid-cols-7 gap-1 sm:gap-2">
              {Array.from({ length: gridDays.length }).map((_, i) => (
                <Skeleton key={i} className="h-20 sm:h-24 rounded-md" />
              ))}
            </div>
          ) : (
            <div className="relative grid grid-cols-7 gap-1 sm:gap-2">
              {activeDayKey && (
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setActiveDayKey(null)}
                />
              )}

              {gridDays.map((day, index) => {
                const key = formatDateKey(day);
                const isCurrentMonth = day.getMonth() === cursorDate.getMonth();
                const isToday = key === todayKey;
                const dayAssignments = assignmentsByDay[key] || [];
                const hasAssignments = dayAssignments.length > 0;
                const hasExam = dayAssignments.some((assignment) =>
                  /exam|test/i.test(assignment.assignment_type || "")
                );
                const rowIndex = Math.floor(index / 7);
                const totalRows = gridDays.length / 7;
                const anchorAbove = rowIndex >= Math.ceil(totalRows / 2);

                return (
                  <div
                    key={key}
                    className={`relative rounded-md p-2 min-h-[80px] sm:min-h-[100px] flex flex-col transition-colors ${
                      isCurrentMonth ? "" : "opacity-40"
                    } ${
                      hasExam
                        ? "border-2 border-red-500 dark:border-red-400"
                        : isToday
                        ? "border border-primary"
                        : "border border-border"
                    } ${
                      hasAssignments ? "cursor-pointer hover:bg-muted/50" : ""
                    } ${activeDayKey === key ? "z-20" : ""}`}
                    onMouseEnter={() => hasAssignments && setActiveDayKey(key)}
                    onMouseLeave={() =>
                      setActiveDayKey((current) => (current === key ? null : current))
                    }
                    onClick={() =>
                      hasAssignments &&
                      setActiveDayKey((current) => (current === key ? null : key))
                    }
                  >
                    <span className={`text-sm font-medium ${isToday ? "text-primary" : ""}`}>
                      {day.getDate()}
                    </span>

                    {hasAssignments && (
                      <div className="mt-1 flex-1 flex flex-col gap-1 overflow-hidden">
                        {dayAssignments.slice(0, 2).map((assignment) => {
                          const courseColor =
                            coursesById[assignment.course_id]?.color || DEFAULT_COURSE_COLOR;

                          return (
                            <span
                              key={assignment.id}
                              className={`text-xs truncate px-1 rounded ${
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
                        {dayAssignments.length > 2 && (
                          <span className="text-xs text-muted-foreground">
                            +{dayAssignments.length - 2} more
                          </span>
                        )}
                      </div>
                    )}

                    {activeDayKey === key && (
                      <div
                        className={`absolute z-20 left-1/2 -translate-x-1/2 w-64 max-w-[80vw] ${
                          anchorAbove ? "bottom-full mb-1" : "top-full mt-1"
                        }`}
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
                                  coursesById[assignment.course_id]?.color ||
                                  DEFAULT_COURSE_COLOR;

                                return (
                                  <div
                                    key={assignment.id}
                                    className="flex items-center justify-between gap-2 p-2 rounded border cursor-pointer hover:bg-muted/50 transition-colors"
                                    style={{ borderLeft: `3px solid ${courseAccentColor(courseColor, intensityFactor)}` }}
                                    onClick={() => handleAssignmentClick(assignment.id)}
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
                                          {coursesById[assignment.course_id]?.name ||
                                            "Unknown course"}
                                          {assignment.assignment_type
                                            ? ` · ${assignment.assignment_type}`
                                            : ""}
                                        </p>
                                      </div>
                                    </div>
                                    <Badge
                                      variant={assignment.is_completed ? "secondary" : "outline"}
                                      className="shrink-0 text-xs"
                                    >
                                      {parseWallClockDate(assignment.due_at).toLocaleTimeString(
                                        "en-US",
                                        { hour: "numeric", minute: "2-digit" }
                                      )}
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
          )}
        </>
      )}
    </div>
  );
}

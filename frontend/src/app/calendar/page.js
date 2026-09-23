"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { fetchAssignmentsInRange } from "@/lib/assignments-api";
import { fetchCourses } from "@/lib/courses-api";
import { parseWallClockDate } from "@/lib/date-helpers";
import { ThemeToggle } from "@/components/theme-toggle";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeftIcon, ChevronRightIcon, LayoutDashboardIcon } from "lucide-react";

function DashboardToggleButton() {
  return (
    <Link href="/dashboard">
      <Button variant="ghost" size="icon" aria-label="Dashboard">
        <LayoutDashboardIcon className="h-5 w-5" />
      </Button>
    </Link>
  );
}

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function formatDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export default function CalendarPage() {
  const router = useRouter();
  const [token, setToken] = useState(null);
  const [monthCursor, setMonthCursor] = useState(() => startOfMonth(new Date()));
  const [assignments, setAssignments] = useState([]);
  const [courseNames, setCourseNames] = useState({});
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
    const gridStart = new Date(monthCursor);
    gridStart.setDate(gridStart.getDate() - gridStart.getDay());

    return Array.from({ length: 42 }, (_, i) => {
      const day = new Date(gridStart);
      day.setDate(gridStart.getDate() + i);
      return day;
    });
  }, [monthCursor]);

  useEffect(() => {
    if (!token) return;

    const loadAssignments = async () => {
      setIsLoading(true);
      setError("");
      setActiveDayKey(null);

      try {
        const start = formatDateKey(gridDays[0]);
        const end = formatDateKey(gridDays[gridDays.length - 1]);

        const [assignmentsData, coursesData] = await Promise.all([
          fetchAssignmentsInRange(start, end, token, { includeCompleted: true }),
          fetchCourses(token),
        ]);

        setAssignments(assignmentsData);
        setCourseNames(
          Object.fromEntries(coursesData.map((course) => [course.id, course.name]))
        );
      } catch (err) {
        if (err.status === 401 || err.status === 403) {
          localStorage.removeItem("access_token");
          router.push("/login");
          return;
        }

        setError("Failed to load calendar assignments");
      } finally {
        setIsLoading(false);
      }
    };

    loadAssignments();
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

  const goToPrevMonth = () =>
    setMonthCursor((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1));
  const goToNextMonth = () =>
    setMonthCursor((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1));
  const goToToday = () => setMonthCursor(startOfMonth(new Date()));

  const handleAssignmentClick = (assignmentId) => {
    router.push(`/assignments/${assignmentId}`);
  };

  const todayKey = formatDateKey(new Date());

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
          <DashboardToggleButton />
          <ThemeToggle />
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <Button variant="outline" size="icon" onClick={goToPrevMonth} aria-label="Previous month">
          <ChevronLeftIcon className="h-4 w-4" />
        </Button>

        <div className="flex items-center gap-3">
          <h2 className="text-lg sm:text-xl font-semibold">
            {monthCursor.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
          </h2>
          <Button variant="ghost" size="sm" onClick={goToToday}>
            Today
          </Button>
        </div>

        <Button variant="outline" size="icon" onClick={goToNextMonth} aria-label="Next month">
          <ChevronRightIcon className="h-4 w-4" />
        </Button>
      </div>

      {error && (
        <div className="text-sm text-destructive mb-4">{error}</div>
      )}

      <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2 text-center text-xs sm:text-sm font-medium text-muted-foreground">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label}>{label}</div>
        ))}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {Array.from({ length: 42 }).map((_, i) => (
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
            const isCurrentMonth = day.getMonth() === monthCursor.getMonth();
            const isToday = key === todayKey;
            const dayAssignments = assignmentsByDay[key] || [];
            const hasAssignments = dayAssignments.length > 0;
            const rowIndex = Math.floor(index / 7);
            const totalRows = gridDays.length / 7;
            const anchorAbove = rowIndex >= Math.ceil(totalRows / 2);

            return (
              <div
                key={key}
                className={`relative border rounded-md p-2 min-h-[80px] sm:min-h-[100px] flex flex-col transition-colors ${
                  isCurrentMonth ? "" : "opacity-40"
                } ${isToday ? "border-primary" : "border-border"} ${
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
                    {dayAssignments.slice(0, 2).map((assignment) => (
                      <span
                        key={assignment.id}
                        className={`text-xs truncate px-1 rounded ${
                          assignment.is_completed
                            ? "line-through text-muted-foreground bg-muted"
                            : "bg-primary/10 text-primary"
                        }`}
                      >
                        {assignment.title}
                      </span>
                    ))}
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
                          {dayAssignments.map((assignment) => (
                            <div
                              key={assignment.id}
                              className="flex items-center justify-between gap-2 p-2 rounded border cursor-pointer hover:bg-muted/50 transition-colors"
                              onClick={() => handleAssignmentClick(assignment.id)}
                            >
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
                                  {courseNames[assignment.course_id] || "Unknown course"}
                                  {assignment.assignment_type
                                    ? ` · ${assignment.assignment_type}`
                                    : ""}
                                </p>
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
                          ))}
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
    </div>
  );
}

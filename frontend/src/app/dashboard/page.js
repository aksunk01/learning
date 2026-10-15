"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SemesterHeading } from "@/components/semesters/semester-heading";
import { SemesterProgress } from "@/components/semester-progress";
import {
  AlertTriangleIcon,
  BookOpenIcon,
  BriefcaseIcon,
  CalendarIcon,
  CheckCircle2Icon,
  ChevronDownIcon,
  ClockIcon,
  GraduationCapIcon,
  InboxIcon,
  ListChecksIcon,
  TargetIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { fetchDashboard } from "@/lib/dashboard-api";
import { fetchSemesters } from "@/lib/semesters-api";
import { fetchCourses } from "@/lib/courses-api";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { ThemeToggle } from "@/components/theme-toggle";
import { formatWallClockDateShort, parseWallClockDate } from "@/lib/date-helpers";
import { PlannerPanel } from "@/components/planner/planner-panel";
import { DEFAULT_COURSE_COLOR, courseGlowStyle } from "@/lib/colors";

function CalendarToggleButton() {
  return (
    <Link href="/calendar">
      <Button variant="ghost" size="icon" aria-label="Calendar">
        <CalendarIcon className="h-5 w-5" />
      </Button>
    </Link>
  );
}

function PlannerToggleButton({ onClick }) {
  return (
    <Button variant="ghost" size="icon" aria-label="Planner" onClick={onClick}>
      <ListChecksIcon className="h-5 w-5" />
    </Button>
  );
}

function EmptyState({ icon: Icon, message }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-10 text-center text-muted-foreground">
      <Icon className="h-8 w-8 opacity-40" />
      <p className="text-sm">{message}</p>
    </div>
  );
}

function getDueMeta(dueAt) {
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

export default function DashboardPage() {
  const [dashboardData, setDashboardData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedSemesterId, setSelectedSemesterId] = useState(null);
  const [semesters, setSemesters] = useState([]);
  const [showOverdue, setShowOverdue] = useState(false);
  const [token, setToken] = useState(null);
  const [plannerOpen, setPlannerOpen] = useState(false);
  const [coursesById, setCoursesById] = useState({});
  const router = useRouter();

  useEffect(() => {
    const storedToken = localStorage.getItem("access_token");

    if (!storedToken) {
      router.push("/login");
      return;
    }

    Promise.resolve().then(() => setToken(storedToken));
  }, [router]);

  useEffect(() => {
    if (!token) return;

    const fetchDashboardData = async () => {
      setIsLoading(true);

      try {
        const data = await fetchDashboard(token, selectedSemesterId);
        setDashboardData(data);
      } catch (err) {
        if (err.message.includes("401") || err.message.includes("403")) {
          // Authentication error
          localStorage.removeItem("access_token");
          router.push("/login");
        } else {
          setError("Failed to load dashboard data");
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, [router, token, selectedSemesterId]);

  useEffect(() => {
    if (!token) return;

    let isCancelled = false;

    fetchSemesters(token)
      .then((data) => {
        if (!isCancelled) setSemesters(data);
      })
      .catch(() => {
        // Progress bar just stays hidden if this fails
      });

    return () => {
      isCancelled = true;
    };
  }, [token]);

  useEffect(() => {
    if (!token) return;

    let isCancelled = false;

    fetchCourses(token)
      .then((data) => {
        if (isCancelled) return;
        setCoursesById(
          Object.fromEntries(
            data.map((course) => [
              course.id,
              { name: course.name, color: course.color || DEFAULT_COURSE_COLOR },
            ])
          )
        );
      })
      .catch(() => {
        // Glow just stays off if this fails
      });

    return () => {
      isCancelled = true;
    };
  }, [token]);

  // Helper function to get course name by ID
  const getCourseName = (courseId) => {
    if (!course_summaries) return null;
    const summary = course_summaries.find(s => s.course_id === courseId);
    return summary ? summary.course_name : null;
  };

  const getCourseColor = (courseId) => coursesById[courseId]?.color || DEFAULT_COURSE_COLOR;

  // Handle navigation to assignment detail page
  const handleAssignmentClick = (assignmentId) => {
    router.push(`/assignments/${assignmentId}?from=dashboard`);
  };

  // Handle navigation to exam detail page
  const handleExamClick = (examId) => {
    router.push(`/assignments/${examId}?from=dashboard`);
  };

  // Handle navigation to project detail page
  const handleProjectClick = (projectId) => {
    router.push(`/assignments/${projectId}?from=dashboard`);
  };

  if (isLoading) {
    return (
      <div className="flex-1 p-6 pb-24 md:pb-6">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground mt-2">
              Your academic overview and upcoming work
            </p>
          </div>
          <div className="flex items-center gap-2">
            <CalendarToggleButton />
            <PlannerToggleButton onClick={() => setPlannerOpen(true)} />
            <ThemeToggle />
          </div>
        </div>

        {/* Summary Metrics Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {[1, 2, 3].map((item) => (
            <Card key={item}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  <Skeleton className="h-4 w-20" />
                </CardTitle>
                <Skeleton className="h-9 w-9 rounded-full" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-12 mb-1" />
                <Skeleton className="h-3 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Upcoming Work Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>
                  <Skeleton className="h-6 w-32" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                {[1, 2, 3].map((item) => (
                  <div key={item} className="flex items-center justify-between p-3 border rounded-lg mb-3">
                    <div>
                      <Skeleton className="h-4 w-24 mb-2" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                    <Skeleton className="h-6 w-16" />
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Upcoming Exams and Upcoming Projects Skeleton */}
          <div>
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>
                  <Skeleton className="h-6 w-24" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                {[1, 2, 3].map((item) => (
                  <div key={item} className="flex items-center justify-between p-3 border rounded-lg mb-3">
                    <div>
                      <Skeleton className="h-4 w-20 mb-2" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                    <Skeleton className="h-6 w-16" />
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>
                  <Skeleton className="h-6 w-24" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                {[1, 2, 3].map((item) => (
                  <div key={item} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <Skeleton className="h-4 w-20 mb-2" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                    <Skeleton className="h-6 w-16" />
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Course Overview Skeleton */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>
              <Skeleton className="h-6 w-32" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((course) => (
                <div key={course} className="p-4 border rounded-lg">
                  <Skeleton className="h-5 w-16 mb-2" />
                  <Skeleton className="h-3 w-20 mb-2" />
                  <div className="flex justify-between items-center">
                    <Skeleton className="h-5 w-16" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <PlannerPanel open={plannerOpen} onOpenChange={setPlannerOpen} token={token} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 p-6 pb-24 md:pb-6">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground mt-2">
              Your academic overview and upcoming work
            </p>
          </div>
          <div className="flex items-center gap-2">
            <CalendarToggleButton />
            <PlannerToggleButton onClick={() => setPlannerOpen(true)} />
            <ThemeToggle />
          </div>
        </div>
        <div className="text-destructive">{error}</div>
        <PlannerPanel open={plannerOpen} onOpenChange={setPlannerOpen} token={token} />
      </div>
    );
  }

  if (!dashboardData) {
    return null;
  }

  const now = new Date();
  const activeSemester = selectedSemesterId
    ? semesters.find((semester) => semester.id === selectedSemesterId)
    : semesters.find((semester) => {
        if (!semester.start_date || !semester.end_date) return false;
        return now >= parseWallClockDate(semester.start_date) && now <= parseWallClockDate(semester.end_date);
      });

  const {
    upcoming,
    overdue,
    upcoming_exams,
    upcoming_projects,
    counts,
    course_summaries,
    completed
  } = dashboardData;

  const renderWorkItem = (item, onClick, { completedStyle = false } = {}) => {
    const courseName = getCourseName(item.course_id);
    const courseColor = getCourseColor(item.course_id);
    const dueMeta = getDueMeta(item.due_at);

    return (
      <div
        key={item.id}
        className={`group flex items-center gap-3 p-3 border rounded-lg transition-all ${
          completedStyle ? "bg-muted/40" : "cursor-pointer hover:shadow-md hover:-translate-y-px"
        }`}
        style={courseGlowStyle(courseColor)}
        onClick={onClick}
      >
        <span
          className="h-2 w-2 rounded-full shrink-0"
          style={{ backgroundColor: courseColor }}
        />
        <div className="min-w-0 flex-1">
          <h3 className={`font-medium truncate ${completedStyle ? "line-through text-muted-foreground" : ""}`}>
            {item.title}
          </h3>
          {courseName && item.assignment_type ? (
            <p className="text-sm text-muted-foreground truncate">
              {courseName} · {item.assignment_type}
            </p>
          ) : courseName ? (
            <p className="text-sm text-muted-foreground truncate">{courseName}</p>
          ) : item.assignment_type ? (
            <p className="text-sm text-muted-foreground truncate">{item.assignment_type}</p>
          ) : null}
        </div>
        {completedStyle ? (
          <div className="flex flex-col items-end gap-1 shrink-0">
            {item.completed_at && (
              <span className="text-xs text-muted-foreground">
                {new Date(item.completed_at).toLocaleDateString()}
              </span>
            )}
            <CheckCircle2Icon className="h-4 w-4 text-emerald-500" />
          </div>
        ) : (
          <Badge className={`shrink-0 border-transparent ${dueMeta.className}`}>
            {dueMeta.label}
          </Badge>
        )}
      </div>
    );
  };

  return (
    <div className="flex-1 p-6 pb-24 md:pb-6">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <SemesterHeading
            token={token}
            value={selectedSemesterId}
            onChange={setSelectedSemesterId}
            onSemesterUpdated={(updated) =>
              setSemesters((current) =>
                current.map((semester) => (semester.id === updated.id ? updated : semester))
              )
            }
          />
          <p className="text-muted-foreground mt-2">
            Your academic overview and upcoming work
          </p>
        </div>
        <div className="flex items-center gap-2">
          <CalendarToggleButton />
          <PlannerToggleButton onClick={() => setPlannerOpen(true)} />
          <ThemeToggle />
        </div>
      </div>

      <SemesterProgress semester={activeSemester} />

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="border-t-4 border-t-blue-500 transition-shadow hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Upcoming</CardTitle>
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-500/10 text-blue-500">
              <TargetIcon className="h-4 w-4" />
            </span>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{counts.upcoming}</div>
            <p className="text-xs text-muted-foreground mt-1">assignments due soon</p>
          </CardContent>
        </Card>

        <Card className="border-t-4 border-t-amber-500 transition-shadow hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Due Soon</CardTitle>
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-500/10 text-amber-500">
              <CalendarIcon className="h-4 w-4" />
            </span>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{counts.due_next_7_days}</div>
            <p className="text-xs text-muted-foreground mt-1">assignments due this week</p>
          </CardContent>
        </Card>

        <Card
          role="button"
          tabIndex={0}
          aria-expanded={showOverdue}
          onClick={() => setShowOverdue((current) => !current)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              setShowOverdue((current) => !current);
            }
          }}
          className={`cursor-pointer border-t-4 border-t-destructive transition-all hover:shadow-md ${
            counts.overdue > 0 ? "hover:bg-destructive/5" : "hover:bg-muted/50"
          }`}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Overdue</CardTitle>
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <ClockIcon className="h-4 w-4" />
            </span>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="text-3xl font-bold text-destructive">{counts.overdue}</div>
              {counts.overdue > 0 && (
                <ChevronDownIcon
                  className={`h-4 w-4 text-muted-foreground transition-transform ${
                    showOverdue ? "rotate-180" : ""
                  }`}
                />
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">assignments past due date</p>
          </CardContent>
        </Card>
      </div>

      {showOverdue && (
        <Card className="mb-8 border-destructive/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangleIcon className="h-4 w-4" />
              Overdue Assignments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-[320px] overflow-y-auto">
              {overdue && overdue.length > 0 ? (
                overdue.map((assignment) =>
                  renderWorkItem(assignment, () => handleAssignmentClick(assignment.id))
                )
              ) : (
                <EmptyState icon={CheckCircle2Icon} message="No overdue assignments — you're all caught up" />
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TargetIcon className="h-4 w-4 text-blue-500" />
              Upcoming Work
              {upcoming?.length > 0 && (
                <Badge variant="secondary" className="ml-auto">{upcoming.length}</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-[320px] overflow-y-auto">
              {upcoming && upcoming.length > 0 ? (
                upcoming.map((assignment) =>
                  renderWorkItem(assignment, () => handleAssignmentClick(assignment.id))
                )
              ) : (
                <EmptyState icon={InboxIcon} message="No upcoming assignments" />
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCapIcon className="h-4 w-4 text-violet-500" />
              Upcoming Exams
              {upcoming_exams?.length > 0 && (
                <Badge variant="secondary" className="ml-auto">{upcoming_exams.length}</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-[320px] overflow-y-auto">
              {upcoming_exams && upcoming_exams.length > 0 ? (
                upcoming_exams.map((exam) => renderWorkItem(exam, () => handleExamClick(exam.id)))
              ) : (
                <EmptyState icon={GraduationCapIcon} message="No upcoming exams" />
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BriefcaseIcon className="h-4 w-4 text-teal-500" />
              Upcoming Projects
              {upcoming_projects?.length > 0 && (
                <Badge variant="secondary" className="ml-auto">{upcoming_projects.length}</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-[320px] overflow-y-auto">
              {upcoming_projects && upcoming_projects.length > 0 ? (
                upcoming_projects.map((project) =>
                  renderWorkItem(project, () => handleProjectClick(project.id))
                )
              ) : (
                <EmptyState icon={BriefcaseIcon} message="No upcoming projects" />
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Assignments Completed and Course Overview */}
      {completed && completed.length > 0 && course_summaries && course_summaries.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2Icon className="h-4 w-4 text-emerald-500" />
                Assignments Completed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-[320px] overflow-y-auto">
                {completed.map((assignment) => renderWorkItem(assignment, undefined, { completedStyle: true }))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpenIcon className="h-4 w-4 text-indigo-500" />
                Course Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-h-[320px] overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {course_summaries.map((summary) => {
                    const courseColor = getCourseColor(summary.course_id);
                    return (
                      <div
                        key={summary.course_id}
                        className="p-4 border rounded-lg transition-shadow hover:shadow-md"
                        style={{ borderTop: `3px solid ${courseColor}` }}
                      >
                        <h3 className="font-medium truncate">{summary.course_name}</h3>
                        <p className="text-sm text-muted-foreground mb-2">{summary.course_code}</p>
                        {summary.semester && (
                          <p className="text-xs text-muted-foreground mb-2">{summary.semester}</p>
                        )}
                        <div className="flex justify-between items-center">
                          <Badge variant="secondary">{summary.upcoming_count} assignments</Badge>
                          {summary.next_assignment && summary.next_assignment.due_at && (
                            <span className="text-xs text-muted-foreground">
                              Due: {formatWallClockDateShort(summary.next_assignment.due_at)}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <PlannerPanel open={plannerOpen} onOpenChange={setPlannerOpen} token={token} />
    </div>
  );
}

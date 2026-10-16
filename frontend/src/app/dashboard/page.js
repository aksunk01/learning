"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SemesterHeading } from "@/components/semesters/semester-heading";
import { SemesterProgress } from "@/components/semester-progress";
import { CalendarIcon, ListChecksIcon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { fetchDashboard } from "@/lib/dashboard-api";
import { fetchSemesters } from "@/lib/semesters-api";
import { fetchCourses } from "@/lib/courses-api";
import { getCurrentUser, updateProfile } from "@/lib/auth-api";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { ThemeToggle } from "@/components/theme-toggle";
import { parseWallClockDate } from "@/lib/date-helpers";
import { PlannerPanel } from "@/components/planner/planner-panel";
import { DEFAULT_COURSE_COLOR } from "@/lib/colors";
import { StandardDashboard } from "@/components/dashboard/standard-dashboard";
import { CompactDashboard } from "@/components/dashboard/compact-dashboard";
import { BoardDashboard } from "@/components/dashboard/board-dashboard";
import { KanbanDashboard } from "@/components/dashboard/kanban-dashboard";

const DASHBOARD_LAYOUTS = {
  standard: StandardDashboard,
  compact: CompactDashboard,
  board: BoardDashboard,
  kanban: KanbanDashboard,
};

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
  const [layout, setLayout] = useState("standard");
  const [favoriteSemesterId, setFavoriteSemesterId] = useState(null);
  const [userLoaded, setUserLoaded] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const storedToken = localStorage.getItem("access_token");

    if (!storedToken) {
      router.push("/login");
      return;
    }

    Promise.resolve().then(() => setToken(storedToken));
  }, [router]);

  const loadDashboardData = useCallback(
    async ({ silent = false } = {}) => {
      if (!silent) setIsLoading(true);

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
        if (!silent) setIsLoading(false);
      }
    },
    [router, token, selectedSemesterId]
  );

  useEffect(() => {
    if (!token || !userLoaded) return;
    loadDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, selectedSemesterId, userLoaded]);

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

  useEffect(() => {
    if (!token) return;

    let isCancelled = false;

    getCurrentUser(token)
      .then((user) => {
        if (isCancelled) return;
        if (user?.dashboard_layout) setLayout(user.dashboard_layout);
        setFavoriteSemesterId(user?.favorite_semester_id ?? null);
        setSelectedSemesterId((current) => current ?? user?.favorite_semester_id ?? null);
      })
      .catch(() => {
        // Layout/favorite preference just stays at the default if this fails
      })
      .finally(() => {
        if (!isCancelled) setUserLoaded(true);
      });

    return () => {
      isCancelled = true;
    };
  }, [token]);

  const handleToggleFavorite = async (semesterId) => {
    if (!token) return;

    try {
      const updated = await updateProfile(token, { favorite_semester_id: semesterId });
      setFavoriteSemesterId(updated.favorite_semester_id ?? null);
    } catch {
      // Favorite star just doesn't update if this fails
    }
  };

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

  const DashboardLayout = DASHBOARD_LAYOUTS[layout] || StandardDashboard;

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
            favoriteSemesterId={favoriteSemesterId}
            onToggleFavorite={handleToggleFavorite}
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

      <DashboardLayout
        counts={counts}
        upcoming={upcoming}
        overdue={overdue}
        upcoming_exams={upcoming_exams}
        upcoming_projects={upcoming_projects}
        completed={completed}
        course_summaries={course_summaries}
        showOverdue={showOverdue}
        setShowOverdue={setShowOverdue}
        getCourseName={getCourseName}
        getCourseColor={getCourseColor}
        onAssignmentClick={handleAssignmentClick}
        onExamClick={handleExamClick}
        onProjectClick={handleProjectClick}
        onCourseClick={(courseId) => router.push(`/courses/${courseId}`)}
        token={token}
        onDataChanged={() => loadDashboardData({ silent: true })}
      />

      <PlannerPanel open={plannerOpen} onOpenChange={setPlannerOpen} token={token} />
    </div>
  );
}

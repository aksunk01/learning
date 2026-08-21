"use client";

"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, ClockIcon, TargetIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { fetchDashboard } from "@/lib/dashboard-api";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { ThemeToggle } from "@/components/theme-toggle";

export default function DashboardPage() {
  const [dashboardData, setDashboardData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    
    if (!token) {
      router.push("/login");
      return;
    }

    const fetchDashboardData = async () => {
      try {
        const data = await fetchDashboard(token);
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
  }, [router]);

  // Helper function to get course name by ID
  const getCourseName = (courseId) => {
    if (!course_summaries) return null;
    const summary = course_summaries.find(s => s.course_id === courseId);
    return summary ? summary.course_name : null;
  };

  if (isLoading) {
    return (
      <div className="flex-1 p-6 md:pb-6">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground mt-2">
              Your academic overview and upcoming work
            </p>
          </div>
          <ThemeToggle />
        </div>

        {/* Summary Metrics Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {[1, 2, 3].map((item) => (
            <Card key={item}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  <Skeleton className="h-4 w-20" />
                </CardTitle>
                <Skeleton className="h-4 w-4" />
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

        {/* Workload Skeleton */}
        <Card>
          <CardHeader>
            <CardTitle>
              <Skeleton className="h-6 w-40" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between h-32 gap-2">
              {[1, 2, 3, 4, 5, 6, 7].map((day) => (
                <div key={day} className="flex flex-col items-center flex-1">
                  <Skeleton className="h-3 w-4 mb-1" />
                  <div className="w-full bg-secondary rounded-t-md h-20"></div>
                  <Skeleton className="h-3 w-4 mt-1" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 p-6 md:pb-6">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground mt-2">
              Your academic overview and upcoming work
            </p>
          </div>
          <ThemeToggle />
        </div>
        <div className="text-destructive">{error}</div>
      </div>
    );
  }

  if (!dashboardData) {
    return null;
  }

  const { 
    upcoming, 
    next_exam, 
    next_project, 
    upcoming_exams,
    upcoming_projects,
    counts, 
    workload_next_7_days, 
    course_summaries 
  } = dashboardData;

  return (
    <div className="flex-1 p-6 md:pb-6">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Your academic overview and upcoming work
          </p>
        </div>
        <ThemeToggle />
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming</CardTitle>
            <TargetIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{counts.upcoming}</div>
            <p className="text-xs text-muted-foreground mt-1">assignments due soon</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Due Soon</CardTitle>
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{counts.due_next_7_days}</div>
            <p className="text-xs text-muted-foreground mt-1">assignments due this week</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <ClockIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{counts.overdue}</div>
            <p className="text-xs text-muted-foreground mt-1">assignments past due date</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Work</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-[320px] overflow-y-auto">
              {upcoming && upcoming.length > 0 ? (
                upcoming.map((assignment) => {
                  const courseName = getCourseName(assignment.course_id);
                  return (
                    <div key={assignment.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <h3 className="font-medium">{assignment.title}</h3>
                        {courseName && assignment.assignment_type ? (
                          <p className="text-sm text-muted-foreground">
                            {courseName} · {assignment.assignment_type}
                          </p>
                        ) : courseName ? (
                          <p className="text-sm text-muted-foreground">
                            {courseName}
                          </p>
                        ) : assignment.assignment_type ? (
                          <p className="text-sm text-muted-foreground">
                            {assignment.assignment_type}
                          </p>
                        ) : null}
                      </div>
                      <Badge variant="secondary">
                        {assignment.due_at ? new Date(assignment.due_at).toLocaleDateString() : 'No due date'}
                      </Badge>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  No upcoming assignments
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Upcoming Exams</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-[320px] overflow-y-auto">
              {upcoming_exams && upcoming_exams.length > 0 ? (
                upcoming_exams.map((exam) => {
                  const courseName = getCourseName(exam.course_id);
                  return (
                    <div key={exam.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <h3 className="font-medium">{exam.title}</h3>
                        {courseName && exam.assignment_type ? (
                          <p className="text-sm text-muted-foreground">
                            {courseName} · {exam.assignment_type}
                          </p>
                        ) : courseName ? (
                          <p className="text-sm text-muted-foreground">
                            {courseName}
                          </p>
                        ) : exam.assignment_type ? (
                          <p className="text-sm text-muted-foreground">
                            {exam.assignment_type}
                          </p>
                        ) : null}
                      </div>
                      <Badge variant="secondary">
                        {exam.due_at ? new Date(exam.due_at).toLocaleDateString() : 'No date'}
                      </Badge>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  No upcoming exams
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Upcoming Projects</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-[320px] overflow-y-auto">
              {upcoming_projects && upcoming_projects.length > 0 ? (
                upcoming_projects.map((project) => {
                  const courseName = getCourseName(project.course_id);
                  return (
                    <div key={project.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <h3 className="font-medium">{project.title}</h3>
                        {courseName && project.assignment_type ? (
                          <p className="text-sm text-muted-foreground">
                            {courseName} · {project.assignment_type}
                          </p>
                        ) : courseName ? (
                          <p className="text-sm text-muted-foreground">
                            {courseName}
                          </p>
                        ) : project.assignment_type ? (
                          <p className="text-sm text-muted-foreground">
                            {project.assignment_type}
                          </p>
                        ) : null}
                      </div>
                      <Badge variant="secondary">
                        {project.due_at ? new Date(project.due_at).toLocaleDateString() : 'No date'}
                      </Badge>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  No upcoming projects
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Course Overview */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Course Overview</CardTitle>
        </CardHeader>
        <CardContent>
          {course_summaries && course_summaries.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {course_summaries.map((summary) => (
                <div key={summary.course_id} className="p-4 border rounded-lg">
                  <h3 className="font-medium">{summary.course_name}</h3>
                  <p className="text-sm text-muted-foreground mb-2">{summary.course_code}</p>
                  {summary.semester && (
                    <p className="text-xs text-muted-foreground mb-2">{summary.semester}</p>
                  )}
                  <div className="flex justify-between items-center">
                    <Badge variant="secondary">{summary.upcoming_count} assignments</Badge>
                    {summary.next_assignment && summary.next_assignment.due_at && (
                      <span className="text-xs text-muted-foreground">Due: {new Date(summary.next_assignment.due_at).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 text-muted-foreground">
              No courses found
            </div>
          )}
        </CardContent>
      </Card>

      {/* Workload */}
      <Card>
        <CardHeader>
          <CardTitle>Workload Next 7 Days</CardTitle>
        </CardHeader>
        <CardContent>
          {workload_next_7_days && workload_next_7_days.length > 0 ? (
            <div className="flex items-end justify-between h-32 gap-2">
              {workload_next_7_days.map((dayData) => (
                <div key={dayData.date} className="flex flex-col items-center flex-1">
                  <div className="text-xs text-muted-foreground mb-1">
                    {new Date(dayData.date).toLocaleDateString('en-US', { weekday: 'short' })}
                  </div>
                  <div 
                    className="w-full bg-secondary rounded-t-md"
                    style={{ height: `${Math.max(20, dayData.count * 10)}%` }}
                  ></div>
                  <div className="text-xs mt-1">{dayData.count}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 text-muted-foreground">
              No workload data available
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

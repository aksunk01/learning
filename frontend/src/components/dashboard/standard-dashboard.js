"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  TargetIcon,
} from "lucide-react";
import { formatWallClockDateShort } from "@/lib/date-helpers";
import { courseGlowStyle, courseAccentColor } from "@/lib/colors";
import { getDueMeta, EmptyState } from "@/components/dashboard/dashboard-shared";
import { useColorIntensity } from "@/components/providers/color-intensity-provider";

export function StandardDashboard({
  counts,
  upcoming,
  overdue,
  upcoming_exams,
  upcoming_projects,
  completed,
  course_summaries,
  showOverdue,
  setShowOverdue,
  getCourseName,
  getCourseColor,
  onAssignmentClick,
  onExamClick,
  onProjectClick,
  onCourseClick,
}) {
  const { intensityFactor } = useColorIntensity();

  const renderWorkItem = (item, onClick, { completedStyle = false } = {}) => {
    const courseName = getCourseName(item.course_id);
    const courseColor = getCourseColor(item.course_id);
    const dueMeta = getDueMeta(item.due_at);

    return (
      <div
        key={item.id}
        className={`group flex items-center gap-3 p-3 border rounded-lg transition-all ${
          completedStyle ? "bg-muted/40" : ""
        } ${onClick ? "cursor-pointer hover:shadow-md hover:-translate-y-px" : ""}`}
        style={courseGlowStyle(courseColor, intensityFactor)}
        onClick={onClick}
      >
        <span
          className="h-2 w-2 rounded-full shrink-0"
          style={{ backgroundColor: courseAccentColor(courseColor, intensityFactor) }}
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
    <>
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
                  renderWorkItem(assignment, () => onAssignmentClick(assignment.id))
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
                  renderWorkItem(assignment, () => onAssignmentClick(assignment.id))
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
                upcoming_exams.map((exam) => renderWorkItem(exam, () => onExamClick(exam.id)))
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
                  renderWorkItem(project, () => onProjectClick(project.id))
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
                {completed.map((assignment) =>
                  renderWorkItem(assignment, () => onAssignmentClick(assignment.id), {
                    completedStyle: true,
                  })
                )}
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
                        role="button"
                        tabIndex={0}
                        onClick={() => onCourseClick(summary.course_id)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            onCourseClick(summary.course_id);
                          }
                        }}
                        className="cursor-pointer p-4 border rounded-lg transition-all hover:shadow-md hover:-translate-y-px"
                        style={{ borderTop: `3px solid ${courseAccentColor(courseColor, intensityFactor)}` }}
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
    </>
  );
}

"use client";

import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BriefcaseIcon,
  CheckCircle2Icon,
  ClockIcon,
  GraduationCapIcon,
  InboxIcon,
  TargetIcon,
} from "lucide-react";
import { formatWallClockDateShort, parseWallClockDate } from "@/lib/date-helpers";
import { getDueMeta, EmptyState } from "@/components/dashboard/dashboard-shared";
import { courseAccentColor } from "@/lib/colors";
import { useColorIntensity } from "@/components/providers/color-intensity-provider";

const TYPE_META = {
  exam: { icon: GraduationCapIcon, label: "Exam" },
  project: { icon: BriefcaseIcon, label: "Project" },
};

function StatPill({ icon: Icon, label, value, tone }) {
  return (
    <div className="flex items-center gap-2 rounded-full border px-3 py-1.5">
      <Icon className={`h-3.5 w-3.5 ${tone}`} />
      <span className="text-sm font-semibold">{value}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}

export function CompactDashboard({
  counts,
  upcoming,
  overdue,
  upcoming_exams,
  upcoming_projects,
  completed,
  course_summaries,
  getCourseName,
  getCourseColor,
  onAssignmentClick,
  onExamClick,
  onProjectClick,
  onCourseClick,
}) {
  const { intensityFactor } = useColorIntensity();

  const timeline = useMemo(() => {
    const items = [
      ...(overdue || []).map((item) => ({ item, kind: "overdue", onClick: onAssignmentClick })),
      ...(upcoming || []).map((item) => ({
        item,
        kind: item.assignment_type === "exam" ? "exam" : item.assignment_type === "project" ? "project" : "assignment",
        onClick:
          item.assignment_type === "exam"
            ? onExamClick
            : item.assignment_type === "project"
              ? onProjectClick
              : onAssignmentClick,
      })),
      ...(upcoming_exams || [])
        .filter((exam) => !(upcoming || []).some((u) => u.id === exam.id))
        .map((item) => ({ item, kind: "exam", onClick: onExamClick })),
      ...(upcoming_projects || [])
        .filter((project) => !(upcoming || []).some((u) => u.id === project.id))
        .map((item) => ({ item, kind: "project", onClick: onProjectClick })),
    ];

    return items.sort((a, b) => {
      const dateA = a.item.due_at ? parseWallClockDate(a.item.due_at) : null;
      const dateB = b.item.due_at ? parseWallClockDate(b.item.due_at) : null;
      if (!dateA && !dateB) return 0;
      if (!dateA) return 1;
      if (!dateB) return -1;
      return dateA - dateB;
    });
  }, [overdue, upcoming, upcoming_exams, upcoming_projects, onAssignmentClick, onExamClick, onProjectClick]);

  return (
    <>
      {/* Slim stat strip */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <StatPill icon={TargetIcon} label="upcoming" value={counts.upcoming} tone="text-blue-500" />
        <StatPill icon={ClockIcon} label="due this week" value={counts.due_next_7_days} tone="text-amber-500" />
        <StatPill icon={InboxIcon} label="overdue" value={counts.overdue} tone="text-destructive" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6">
        {/* Chronological timeline */}
        <Card>
          <CardContent className="pt-6">
            <h2 className="text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wide">
              Timeline
            </h2>
            {timeline.length === 0 ? (
              <EmptyState icon={CheckCircle2Icon} message="Nothing on your plate right now" />
            ) : (
              <ol className="relative border-l pl-4 space-y-4 max-h-[560px] overflow-y-auto">
                {timeline.map(({ item, kind, onClick }) => {
                  const courseName = getCourseName(item.course_id);
                  const courseColor = getCourseColor(item.course_id);
                  const dueMeta = getDueMeta(item.due_at);
                  const meta = TYPE_META[kind];
                  const TypeIcon = meta?.icon;

                  return (
                    <li key={`${kind}-${item.id}`} className="relative">
                      <span
                        className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full ring-2 ring-background"
                        style={{
                          backgroundColor:
                            kind === "overdue"
                              ? "var(--destructive)"
                              : courseAccentColor(courseColor, intensityFactor),
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => onClick(item.id)}
                        className="w-full text-left flex items-center gap-3 rounded-md p-2 -ml-2 transition-colors hover:bg-muted/60"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            {TypeIcon && <TypeIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
                            <h3 className="font-medium truncate">{item.title}</h3>
                          </div>
                          {courseName && (
                            <p className="text-sm text-muted-foreground truncate">{courseName}</p>
                          )}
                        </div>
                        <Badge className={`shrink-0 border-transparent ${dueMeta.className}`}>
                          {dueMeta.label}
                        </Badge>
                      </button>
                    </li>
                  );
                })}
              </ol>
            )}
          </CardContent>
        </Card>

        {/* Courses + recently completed */}
        <div className="flex flex-col gap-6">
          <Card>
            <CardContent className="pt-6">
              <h2 className="text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wide">
                Courses
              </h2>
              {course_summaries && course_summaries.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {course_summaries.map((summary) => {
                    const courseColor = getCourseColor(summary.course_id);
                    return (
                      <button
                        key={summary.course_id}
                        type="button"
                        onClick={() => onCourseClick(summary.course_id)}
                        className="flex items-center justify-between gap-2 rounded-md border p-2.5 text-left transition-colors hover:bg-muted/60"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="h-2 w-2 rounded-full shrink-0"
                            style={{ backgroundColor: courseAccentColor(courseColor, intensityFactor) }}
                          />
                          <span className="truncate text-sm font-medium">{summary.course_name}</span>
                        </div>
                        <Badge variant="secondary" className="shrink-0">{summary.upcoming_count}</Badge>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <EmptyState icon={InboxIcon} message="No courses yet" />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <h2 className="text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wide">
                Recently Completed
              </h2>
              {completed && completed.length > 0 ? (
                <div className="flex flex-col gap-2 max-h-[220px] overflow-y-auto">
                  {completed.slice(0, 8).map((assignment) => (
                    <div key={assignment.id} className="flex items-center gap-2 text-sm">
                      <CheckCircle2Icon className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                      <span className="truncate text-muted-foreground line-through">{assignment.title}</span>
                      {assignment.completed_at && (
                        <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                          {formatWallClockDateShort(assignment.completed_at)}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState icon={CheckCircle2Icon} message="Nothing completed yet" />
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

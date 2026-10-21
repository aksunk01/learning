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
import { parseWallClockDate } from "@/lib/date-helpers";
import { getDueMeta, EmptyState } from "@/components/dashboard/dashboard-shared";
import { courseAccentColor, courseGlowStyle } from "@/lib/colors";
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

export function BoardDashboard({
  counts,
  upcoming,
  overdue,
  upcoming_exams,
  upcoming_projects,
  course_summaries,
  getCourseColor,
  onAssignmentClick,
  onExamClick,
  onProjectClick,
  onCourseClick,
}) {
  const { intensityFactor } = useColorIntensity();

  const itemsByCourse = useMemo(() => {
    const map = new Map();

    const addItem = (item, kind, onClick) => {
      if (!item.course_id) return;
      const existing = map.get(item.course_id) || [];
      if (existing.some((entry) => entry.item.id === item.id)) return;
      existing.push({ item, kind, onClick });
      map.set(item.course_id, existing);
    };

    (overdue || []).forEach((item) => addItem(item, "overdue", onAssignmentClick));
    (upcoming || []).forEach((item) => {
      const kind =
        item.assignment_type === "exam"
          ? "exam"
          : item.assignment_type === "project"
            ? "project"
            : "assignment";
      const onClick =
        item.assignment_type === "exam"
          ? onExamClick
          : item.assignment_type === "project"
            ? onProjectClick
            : onAssignmentClick;
      addItem(item, kind, onClick);
    });
    (upcoming_exams || []).forEach((item) => addItem(item, "exam", onExamClick));
    (upcoming_projects || []).forEach((item) => addItem(item, "project", onProjectClick));

    for (const entries of map.values()) {
      entries.sort((a, b) => {
        if (a.kind === "overdue" && b.kind !== "overdue") return -1;
        if (b.kind === "overdue" && a.kind !== "overdue") return 1;

        const dateA = a.item.due_at ? parseWallClockDate(a.item.due_at) : null;
        const dateB = b.item.due_at ? parseWallClockDate(b.item.due_at) : null;
        if (!dateA && !dateB) return 0;
        if (!dateA) return 1;
        if (!dateB) return -1;
        return dateA - dateB;
      });
    }

    return map;
  }, [overdue, upcoming, upcoming_exams, upcoming_projects, onAssignmentClick, onExamClick, onProjectClick]);

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <StatPill icon={TargetIcon} label="upcoming" value={counts.upcoming} tone="text-blue-500" />
        <StatPill icon={ClockIcon} label="due this week" value={counts.due_next_7_days} tone="text-amber-500" />
        <StatPill icon={InboxIcon} label="overdue" value={counts.overdue} tone="text-destructive" />
      </div>

      {course_summaries && course_summaries.length > 0 ? (
        <div className="flex gap-4 overflow-x-auto pb-2">
          {course_summaries.map((summary) => {
            const courseColor = getCourseColor(summary.course_id);
            const items = itemsByCourse.get(summary.course_id) || [];

            return (
              <Card
                key={summary.course_id}
                className="w-72 shrink-0 self-start"
                style={{ borderTop: `3px solid ${courseAccentColor(courseColor, intensityFactor)}` }}
              >
                <CardContent className="pt-5">
                  <button
                    type="button"
                    onClick={() => onCourseClick(summary.course_id)}
                    className="w-full text-left mb-4"
                  >
                    <h2 className="font-semibold truncate hover:underline">{summary.course_name}</h2>
                    <p className="text-xs text-muted-foreground truncate">{summary.course_code}</p>
                  </button>

                  {items.length === 0 ? (
                    <div className="py-6 text-center">
                      <CheckCircle2Icon className="h-5 w-5 mx-auto mb-2 text-muted-foreground opacity-40" />
                      <p className="text-xs text-muted-foreground">All caught up</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[480px] overflow-y-auto">
                      {items.map(({ item, kind, onClick }) => {
                        const dueMeta = getDueMeta(item.due_at);
                        const meta = TYPE_META[kind];
                        const TypeIcon = meta?.icon;

                        return (
                          <button
                            key={`${kind}-${item.id}`}
                            type="button"
                            onClick={() => onClick(item.id)}
                            className={`w-full text-left rounded-md border p-2.5 transition-colors hover:bg-muted/60 ${
                              kind === "overdue" ? "border-destructive/30" : ""
                            }`}
                            style={kind !== "overdue" ? courseGlowStyle(courseColor, intensityFactor) : undefined}
                          >
                            <div className="flex items-center gap-1.5 mb-1.5">
                              {TypeIcon && <TypeIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
                              <h3 className="text-sm font-medium truncate flex-1">{item.title}</h3>
                            </div>
                            <Badge className={`border-transparent text-xs ${dueMeta.className}`}>
                              {dueMeta.label}
                            </Badge>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <EmptyState icon={InboxIcon} message="No courses yet" />
      )}
    </>
  );
}

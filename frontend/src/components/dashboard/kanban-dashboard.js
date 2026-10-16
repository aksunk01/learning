"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangleIcon,
  BriefcaseIcon,
  CheckCircle2Icon,
  ClockIcon,
  GraduationCapIcon,
  GripVerticalIcon,
  Loader2Icon,
  TargetIcon,
} from "lucide-react";
import { formatWallClockDateShort, parseWallClockDate } from "@/lib/date-helpers";
import { EmptyState, getDueMeta } from "@/components/dashboard/dashboard-shared";
import { courseAccentColor, hexToRgba } from "@/lib/colors";
import { useColorIntensity } from "@/components/providers/color-intensity-provider";
import { useKanbanColumns, DEFAULT_KANBAN_COLUMNS } from "@/components/providers/kanban-columns-provider";
import { updateAssignmentCompletion } from "@/lib/assignments-api";

const STORAGE_KEY = "kanban_board_placement";

const TYPE_META = {
  exam: { icon: GraduationCapIcon, label: "Exam" },
  project: { icon: BriefcaseIcon, label: "Project" },
};

const COLUMN_META = {
  overdue: { label: "Overdue", icon: AlertTriangleIcon, tone: "text-destructive" },
  in_progress: { label: "In Progress", icon: Loader2Icon, tone: "text-violet-500" },
  upcoming: { label: "Upcoming", icon: TargetIcon, tone: "text-blue-500" },
  completed: { label: "Done", icon: CheckCircle2Icon, tone: "text-emerald-500" },
};

function isDueSoon(item, isCompleted) {
  if (isCompleted || !item.due_at) return false;

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const due = parseWallClockDate(item.due_at);
  const startOfDue = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  const diffDays = Math.round((startOfDue - startOfToday) / 86400000);

  return diffDays >= 0 && diffDays <= 7;
}

function loadStoredBoard() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!parsed || typeof parsed !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
}

function persistBoard(board) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(board));
}

function autoColumnFor(item, isCompleted) {
  if (isCompleted) return "completed";
  if (!item.due_at) return "upcoming";

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const due = parseWallClockDate(item.due_at);
  const startOfDue = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  const diffDays = Math.round((startOfDue - startOfToday) / 86400000);

  if (diffDays < 0) return "overdue";
  return "upcoming";
}

function isRecentlyCompleted(item) {
  if (!item.completed_at) return true;

  const completedAt = new Date(item.completed_at);
  const diffDays = (Date.now() - completedAt.getTime()) / 86400000;

  return diffDays <= 7;
}

function kindFor(assignmentType) {
  if (assignmentType === "exam") return "exam";
  if (assignmentType === "project") return "project";
  return "assignment";
}

export function KanbanDashboard({
  upcoming,
  overdue,
  upcoming_exams,
  upcoming_projects,
  completed,
  getCourseName,
  getCourseColor,
  onAssignmentClick,
  onExamClick,
  onProjectClick,
  token,
  onDataChanged,
}) {
  const { intensityFactor } = useColorIntensity();
  const { visibleOrder } = useKanbanColumns();
  const [board, setBoard] = useState(null);
  const [draggingId, setDraggingId] = useState(null);
  const boardRef = useRef(null);
  const justDraggedRef = useRef(false);

  const recentlyCompleted = useMemo(
    () => (completed || []).filter(isRecentlyCompleted),
    [completed]
  );

  const itemsById = useMemo(() => {
    const map = new Map();
    const completedIds = new Set(recentlyCompleted.map((item) => item.id));

    const add = (item) => {
      if (!item?.id || map.has(item.id)) return;
      map.set(item.id, { item, kind: kindFor(item.assignment_type), isCompleted: completedIds.has(item.id) });
    };

    (overdue || []).forEach(add);
    (upcoming || []).forEach(add);
    (upcoming_exams || []).forEach(add);
    (upcoming_projects || []).forEach(add);
    recentlyCompleted.forEach(add);

    return map;
  }, [overdue, upcoming, upcoming_exams, upcoming_projects, recentlyCompleted]);

  useEffect(() => {
    const stored = loadStoredBoard();
    const next = Object.fromEntries(DEFAULT_KANBAN_COLUMNS.map((key) => [key, []]));
    const placed = new Set();

    if (stored) {
      for (const key of DEFAULT_KANBAN_COLUMNS) {
        for (const id of stored[key] || []) {
          if (placed.has(id) || !itemsById.has(id)) continue;
          const { isCompleted } = itemsById.get(id);
          const column = isCompleted && key !== "completed" ? "completed" : key;
          if (!isCompleted && key === "completed") continue;
          next[column].push(id);
          placed.add(id);
        }
      }
    }

    for (const [id, { item, isCompleted }] of itemsById) {
      if (placed.has(id)) continue;
      next[autoColumnFor(item, isCompleted)].push(id);
      placed.add(id);
    }

    boardRef.current = next;
    setBoard(next);
    persistBoard(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemsById]);

  const markComplete = async (itemId, isCompleted) => {
    if (!token) return;

    try {
      await updateAssignmentCompletion(itemId, isCompleted, token);
      onDataChanged?.();
    } catch {
      // Card stays where the user dropped it even if the sync fails
    }
  };

  const moveItem = (itemId, targetColumn, targetIndex) => {
    const current = boardRef.current;
    if (!current) return;

    const sourceColumn = DEFAULT_KANBAN_COLUMNS.find((col) => current[col].includes(itemId));
    if (!sourceColumn) return;

    const next = {};
    for (const col of DEFAULT_KANBAN_COLUMNS) {
      next[col] = current[col].filter((id) => id !== itemId);
    }

    const insertAt = targetIndex == null ? next[targetColumn].length : targetIndex;
    next[targetColumn].splice(insertAt, 0, itemId);

    boardRef.current = next;
    setBoard(next);
    persistBoard(next);

    if (sourceColumn !== targetColumn) {
      if (targetColumn === "completed") {
        markComplete(itemId, true);
      } else if (sourceColumn === "completed") {
        markComplete(itemId, false);
      }
    }
  };

  const handleCardDrop = (event, column, index) => {
    event.preventDefault();
    event.stopPropagation();
    const itemId = event.dataTransfer.getData("text/plain");
    if (!itemId) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const isLowerHalf = event.clientY - rect.top > rect.height / 2;
    moveItem(itemId, column, isLowerHalf ? index + 1 : index);
  };

  const handleColumnDrop = (event, column) => {
    event.preventDefault();
    const itemId = event.dataTransfer.getData("text/plain");
    if (!itemId) return;
    moveItem(itemId, column, null);
  };

  if (!board) return null;

  if (visibleOrder.length === 0) {
    return (
      <EmptyState
        icon={CheckCircle2Icon}
        message="No columns are visible — enable some in Settings > Kanban columns"
      />
    );
  }

  const hasAnyItems = DEFAULT_KANBAN_COLUMNS.some((key) => board[key].length > 0);
  if (!hasAnyItems) {
    return <EmptyState icon={CheckCircle2Icon} message="Nothing on your board right now" />;
  }

  const onClickFor = (kind) =>
    kind === "exam" ? onExamClick : kind === "project" ? onProjectClick : onAssignmentClick;

  return (
    <div className="flex gap-4 overflow-x-auto pb-2">
      {visibleOrder.map((key) => {
        const meta = COLUMN_META[key];
        const ColumnIcon = meta.icon;
        const ids = board[key];

        return (
          <div key={key} className="w-72 shrink-0">
            <div className="flex items-center gap-2 mb-3 px-1">
              <ColumnIcon className={`h-4 w-4 ${meta.tone}`} />
              <h2 className="text-sm font-semibold">{meta.label}</h2>
              <Badge variant="secondary" className="ml-auto">{ids.length}</Badge>
            </div>

            <div
              className="flex flex-col gap-2 min-h-[480px] rounded-lg bg-muted/30 p-2"
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => handleColumnDrop(event, key)}
            >
              {ids.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6 pointer-events-none">
                  Drop cards here
                </p>
              ) : (
                ids.map((id, index) => {
                  const entry = itemsById.get(id);
                  if (!entry) return null;
                  const { item, kind } = entry;
                  const courseName = getCourseName(item.course_id);
                  const courseColor = getCourseColor(item.course_id);
                  const typeMeta = TYPE_META[kind];
                  const TypeIcon = typeMeta?.icon;
                  const isCompleted = key === "completed";
                  const onClick = onClickFor(kind);
                  const dueSoon = isDueSoon(item, isCompleted);
                  const dueMeta = dueSoon ? getDueMeta(item.due_at) : null;

                  return (
                    <Card
                      key={id}
                      draggable
                      onDragStart={(event) => {
                        event.dataTransfer.setData("text/plain", id);
                        event.dataTransfer.effectAllowed = "move";
                        setDraggingId(id);
                        justDraggedRef.current = true;
                      }}
                      onDragEnd={() => {
                        setDraggingId(null);
                        setTimeout(() => {
                          justDraggedRef.current = false;
                        }, 0);
                      }}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={(event) => handleCardDrop(event, key, index)}
                      onClick={() => {
                        if (justDraggedRef.current) return;
                        onClick?.(item.id);
                      }}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          onClick?.(item.id);
                        }
                      }}
                      className={`cursor-grab active:cursor-grabbing transition-shadow hover:shadow-md py-0 ${
                        dueSoon ? "border-amber-500/40" : ""
                      } ${draggingId === id ? "opacity-40" : ""}`}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-center gap-1.5 mb-2">
                          <GripVerticalIcon className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
                          {TypeIcon && <TypeIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
                          <h3
                            className={`text-sm font-medium truncate flex-1 ${
                              isCompleted ? "line-through text-muted-foreground" : ""
                            }`}
                          >
                            {item.title}
                          </h3>
                          {dueSoon && (
                            <ClockIcon className="h-3.5 w-3.5 text-amber-500 shrink-0" aria-label="Due soon" />
                          )}
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          {courseName && (
                            <span
                              className="text-xs truncate px-1.5 py-0.5 rounded"
                              style={{
                                backgroundColor: hexToRgba(courseColor, 0.15 * intensityFactor),
                                color: courseAccentColor(courseColor, Math.max(intensityFactor, 0.6)),
                              }}
                            >
                              {courseName}
                            </span>
                          )}
                          {item.due_at && (
                            dueSoon ? (
                              <Badge className={`shrink-0 ml-auto border-transparent text-xs ${dueMeta.className}`}>
                                {dueMeta.label}
                              </Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground shrink-0 ml-auto">
                                {formatWallClockDateShort(item.due_at)}
                              </span>
                            )
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

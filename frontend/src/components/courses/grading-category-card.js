"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronDownIcon, ChevronRightIcon, TrashIcon } from "lucide-react";
import { AssignmentScoreRow } from "@/components/courses/assignment-score-row";

function formatPercent(value) {
  return value == null ? "—" : `${value.toFixed(1)}%`;
}

function draftsFromAssignments(categoryAssignments) {
  return Object.fromEntries(
    categoryAssignments.map((assignment) => [
      assignment.id,
      {
        score: assignment.score_earned != null ? String(assignment.score_earned) : "",
        points: assignment.points != null ? String(assignment.points) : "",
        error: "",
      },
    ])
  );
}

// One grading category: editable name/weight, and an expandable list of its
// assignments where scores and points can be updated together, saved with a
// single "Save Scores" button for the whole category.
export function GradingCategoryCard({
  category,
  categoryGrade,
  categoryAssignments,
  onSaveCategory,
  onDeleteCategory,
  onSaveAssignmentScores,
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(category.name);
  const [editWeight, setEditWeight] = useState(String(category.weight_percent));
  const [isExpanded, setIsExpanded] = useState(false);
  const [drafts, setDrafts] = useState(() => draftsFromAssignments(categoryAssignments));
  const [isSavingScores, setIsSavingScores] = useState(false);
  const [scoresError, setScoresError] = useState("");

  // Re-sync drafts whenever the server data changes (after a save, or when
  // the assignment list itself changes) - discards any unsaved edits, same
  // as the rest of this page's "reload after save" pattern.
  useEffect(() => {
    setDrafts(draftsFromAssignments(categoryAssignments));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryAssignments]);

  const handleDraftChange = (assignmentId, field, value) => {
    setDrafts((current) => ({
      ...current,
      [assignmentId]: { ...current[assignmentId], [field]: value, error: "" },
    }));
  };

  const handleSaveScores = async () => {
    const updates = {};
    const nextDrafts = { ...drafts };
    let hasError = false;

    for (const assignment of categoryAssignments) {
      const draft = nextDrafts[assignment.id] || { score: "", points: "" };
      const parsedScore = draft.score.trim() === "" ? null : parseFloat(draft.score);
      const parsedPoints = draft.points.trim() === "" ? null : parseFloat(draft.points);

      if (draft.score.trim() !== "" && Number.isNaN(parsedScore)) {
        nextDrafts[assignment.id] = { ...draft, error: "Score must be a number" };
        hasError = true;
        continue;
      }

      if (draft.points.trim() !== "" && (Number.isNaN(parsedPoints) || parsedPoints < 0)) {
        nextDrafts[assignment.id] = { ...draft, error: "Points must be a number greater than or equal to 0" };
        hasError = true;
        continue;
      }

      updates[assignment.id] = { score_earned: parsedScore, points: parsedPoints };
    }

    if (hasError) {
      setDrafts(nextDrafts);
      return;
    }

    setScoresError("");
    setIsSavingScores(true);

    try {
      await onSaveAssignmentScores(category.id, updates);
    } catch (err) {
      setScoresError(err.message || "Failed to save scores");
    } finally {
      setIsSavingScores(false);
    }
  };

  const startEditing = () => {
    setEditName(category.name);
    setEditWeight(String(category.weight_percent));
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    const weight = parseFloat(editWeight);
    if (!editName.trim() || Number.isNaN(weight)) return;

    try {
      await onSaveCategory(category.id, { name: editName.trim(), weight_percent: weight });
      setIsEditing(false);
    } catch {
      // Error is surfaced by the parent; stay in edit mode so the user can retry.
    }
  };

  return (
    <Card>
      <CardContent className="p-4">
        {isEditing ? (
          <div className="flex flex-wrap items-center gap-2">
            <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="w-40" />
            <Input
              type="number"
              min="0"
              max="100"
              step="any"
              value={editWeight}
              onChange={(e) => setEditWeight(e.target.value)}
              className="w-24"
            />
            <Button size="sm" onClick={handleSaveEdit}>Save</Button>
            <Button size="sm" variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
          </div>
        ) : (
          <div>
            <div
              role="button"
              tabIndex={0}
              className="flex w-full flex-wrap items-center justify-between gap-2 text-left cursor-pointer"
              onClick={() => setIsExpanded((current) => !current)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setIsExpanded((current) => !current);
                }
              }}
              aria-expanded={isExpanded}
            >
              <div className="flex items-center gap-2">
                {isExpanded ? (
                  <ChevronDownIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                ) : (
                  <ChevronRightIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium">{category.name}</h4>
                    <Badge variant="secondary">{category.weight_percent}%</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {formatPercent(categoryGrade.percent)} · {categoryGrade.graded_count}/{categoryGrade.total_count} graded
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    startEditing();
                  }}
                >
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteCategory(category.id);
                  }}
                >
                  <TrashIcon className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {isExpanded && (
              <div className="mt-4 space-y-2 border-t pt-4">
                {categoryAssignments.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No assignments in this category yet.
                  </p>
                ) : (
                  <>
                    {categoryAssignments.map((assignment) => {
                      const draft = drafts[assignment.id] || { score: "", points: "", error: "" };

                      return (
                        <AssignmentScoreRow
                          key={assignment.id}
                          assignment={assignment}
                          score={draft.score}
                          points={draft.points}
                          error={draft.error}
                          onChange={(field, value) => handleDraftChange(assignment.id, field, value)}
                        />
                      );
                    })}

                    <div className="flex items-center gap-2 pt-1">
                      <Button size="sm" onClick={handleSaveScores} disabled={isSavingScores}>
                        {isSavingScores ? "Saving..." : "Save Scores"}
                      </Button>
                      {scoresError && <p className="text-sm text-destructive">{scoresError}</p>}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

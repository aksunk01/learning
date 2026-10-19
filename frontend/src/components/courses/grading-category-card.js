"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronDownIcon, ChevronRightIcon, TrashIcon } from "lucide-react";
import { AssignmentScoreRow } from "@/components/courses/assignment-score-row";

function formatPercent(value) {
  return value == null ? "—" : `${value.toFixed(1)}%`;
}

// One grading category: editable name/weight, and an expandable list of its
// assignments where scores and points can be updated.
export function GradingCategoryCard({
  category,
  categoryGrade,
  categoryAssignments,
  onSaveCategory,
  onDeleteCategory,
  onSaveAssignmentScore,
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(category.name);
  const [editWeight, setEditWeight] = useState(String(category.weight_percent));
  const [isExpanded, setIsExpanded] = useState(false);

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
                  categoryAssignments.map((assignment) => (
                    <AssignmentScoreRow
                      key={assignment.id}
                      assignment={assignment}
                      onSave={(updates) => onSaveAssignmentScore(assignment.id, updates)}
                    />
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

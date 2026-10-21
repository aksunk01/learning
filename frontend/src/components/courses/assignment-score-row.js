"use client";

import { Input } from "@/components/ui/input";

// A single assignment's score/points editor row. Purely controlled - the
// draft values and save/error state live in the parent (GradingCategoryCard),
// which batches every row in a category behind one "Save Scores" button.
export function AssignmentScoreRow({ assignment, score, points, error, onChange }) {
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3">
        <div className="min-w-0">
          <p className="font-medium truncate">{assignment.title}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex flex-col items-start gap-1">
            <label className="text-xs text-muted-foreground">Score</label>
            <Input
              type="number"
              min="0"
              step="any"
              placeholder="Score"
              value={score}
              onChange={(e) => onChange("score", e.target.value)}
              className="w-24"
            />
          </div>
          <span className="mt-5 text-muted-foreground">/</span>
          <div className="flex flex-col items-start gap-1">
            <label className="text-xs text-muted-foreground">Points</label>
            <Input
              type="number"
              min="0"
              step="any"
              placeholder="Points"
              value={points}
              onChange={(e) => onChange("points", e.target.value)}
              className="w-24"
            />
          </div>
        </div>
      </div>
      {error && <p className="text-sm text-destructive mt-1">{error}</p>}
    </div>
  );
}

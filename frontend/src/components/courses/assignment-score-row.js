"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// A single assignment's score/points editor. Manages its own draft values
// and save state; persistence is delegated to `onSave`.
export function AssignmentScoreRow({ assignment, onSave }) {
  const [score, setScore] = useState(
    assignment.score_earned != null ? String(assignment.score_earned) : ""
  );
  const [points, setPoints] = useState(
    assignment.points != null ? String(assignment.points) : ""
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async () => {
    const parsedScore = score.trim() === "" ? null : parseFloat(score);
    const parsedPoints = points.trim() === "" ? null : parseFloat(points);

    if (score.trim() !== "" && Number.isNaN(parsedScore)) {
      setError("Score must be a number");
      return;
    }

    if (points.trim() !== "" && (Number.isNaN(parsedPoints) || parsedPoints < 0)) {
      setError("Points must be a number greater than or equal to 0");
      return;
    }

    setError("");
    setSaving(true);

    try {
      await onSave({ score_earned: parsedScore, points: parsedPoints });
    } catch (err) {
      setError(err.message || "Failed to update score");
    } finally {
      setSaving(false);
    }
  };

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
              onChange={(e) => setScore(e.target.value)}
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
              onChange={(e) => setPoints(e.target.value)}
              className="w-24"
            />
          </div>
          <Button size="sm" className="mt-5" onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>
      {error && <p className="text-sm text-destructive mt-1">{error}</p>}
    </div>
  );
}

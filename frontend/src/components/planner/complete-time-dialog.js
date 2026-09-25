"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Optional "how long did this actually take?" prompt shown when marking a
 * task/subtask complete. Skippable - completion always proceeds, this only
 * controls whether an actual-minutes value is attached (which feeds the
 * Planner's estimate personalization).
 */
export function CompleteTimeDialog({ open, onOpenChange, title, onConfirm, onSkip }) {
  const [minutes, setMinutes] = useState("");

  const handleOpenChange = (next) => {
    if (!next) {
      setMinutes("");
    }
    onOpenChange(next);
  };

  const handleSkip = () => {
    setMinutes("");
    onOpenChange(false);
    onSkip();
  };

  const handleConfirm = () => {
    const parsed = parseInt(minutes, 10);
    setMinutes("");
    onOpenChange(false);
    onConfirm(Number.isFinite(parsed) && parsed > 0 ? parsed : null);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nice work!</DialogTitle>
          <DialogDescription>
            {title ? `How long did "${title}" actually take?` : "How long did that actually take?"}
            {" "}This helps the Planner learn your pace - totally optional.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="actual-minutes">Actual minutes spent</Label>
          <Input
            id="actual-minutes"
            type="number"
            min="1"
            placeholder="e.g. 90"
            value={minutes}
            onChange={(e) => setMinutes(e.target.value)}
          />
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={handleSkip}>Skip</Button>
          <Button onClick={handleConfirm} disabled={!minutes}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

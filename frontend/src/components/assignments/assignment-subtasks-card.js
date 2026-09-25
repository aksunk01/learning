"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { CheckIcon, TrashIcon, SparklesIcon, ArrowUpIcon, ArrowDownIcon, PlusIcon } from "lucide-react";
import {
  fetchSubtasks,
  createSubtask,
  generateSubtasks,
  acceptSubtasks,
  updateSubtask,
  deleteSubtask,
  updateSubtaskCompletion,
} from "@/lib/assignment-subtasks-api";
import { CompleteTimeDialog } from "@/components/planner/complete-time-dialog";

export function AssignmentSubtasksCard({ assignmentId }) {
  const [subtasks, setSubtasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [suggestions, setSuggestions] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [accepting, setAccepting] = useState(false);

  const [newTitle, setNewTitle] = useState("");
  const [newMinutes, setNewMinutes] = useState("");

  const [completingSubtask, setCompletingSubtask] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const getToken = () => localStorage.getItem("access_token");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchSubtasks(assignmentId, getToken());
      setSubtasks(data);
    } catch (err) {
      setError(err.message || "Failed to load subtasks");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!assignmentId) return;
    Promise.resolve().then(() => load());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignmentId]);

  const handleGenerate = async () => {
    setGenerating(true);
    setError("");
    try {
      const result = await generateSubtasks(assignmentId, getToken());
      setSuggestions(
        result.subtasks.map((s) => ({ title: s.title, estimatedMinutes: s.estimated_minutes }))
      );
    } catch (err) {
      setError(err.message || "Failed to generate subtasks");
    } finally {
      setGenerating(false);
    }
  };

  const updateSuggestion = (index, field, value) => {
    setSuggestions((current) =>
      current.map((s, i) => (i === index ? { ...s, [field]: value } : s))
    );
  };

  const removeSuggestion = (index) => {
    setSuggestions((current) => current.filter((_, i) => i !== index));
  };

  const handleAcceptSuggestions = async () => {
    if (!suggestions || suggestions.length === 0) {
      setSuggestions(null);
      return;
    }

    setAccepting(true);
    try {
      await acceptSubtasks(assignmentId, suggestions, getToken());
      setSuggestions(null);
      load();
    } catch (err) {
      setError(err.message || "Failed to save subtasks");
    } finally {
      setAccepting(false);
    }
  };

  const handleAddManual = async () => {
    const minutes = parseInt(newMinutes, 10);
    if (!newTitle.trim() || !minutes || minutes <= 0) return;

    try {
      await createSubtask(assignmentId, { title: newTitle.trim(), estimatedMinutes: minutes }, getToken());
      setNewTitle("");
      setNewMinutes("");
      load();
    } catch (err) {
      setError(err.message || "Failed to add subtask");
    }
  };

  const handleDelete = async (subtaskId) => {
    try {
      await deleteSubtask(assignmentId, subtaskId, getToken());
      load();
    } catch (err) {
      setError(err.message || "Failed to delete subtask");
    }
  };

  const handleMove = async (subtask, direction) => {
    const index = subtasks.findIndex((s) => s.id === subtask.id);
    const swapIndex = index + direction;
    if (swapIndex < 0 || swapIndex >= subtasks.length) return;

    const other = subtasks[swapIndex];

    try {
      await Promise.all([
        updateSubtask(assignmentId, subtask.id, { orderIndex: other.order_index }, getToken()),
        updateSubtask(assignmentId, other.id, { orderIndex: subtask.order_index }, getToken()),
      ]);
      load();
    } catch (err) {
      setError(err.message || "Failed to reorder subtasks");
    }
  };

  const handleCompleteClick = async (subtask) => {
    if (subtask.is_completed) {
      // Un-completing needs no time prompt - just toggle it back.
      try {
        await updateSubtaskCompletion(assignmentId, subtask.id, false, getToken());
      } catch (err) {
        setError(err.message || "Failed to update subtask");
      } finally {
        load();
      }
      return;
    }

    setCompletingSubtask(subtask);
    setDialogOpen(true);
  };

  const finishCompletion = async (actualMinutes) => {
    if (!completingSubtask) return;

    try {
      await updateSubtaskCompletion(
        assignmentId,
        completingSubtask.id,
        true,
        getToken(),
        { actualMinutes }
      );
    } catch (err) {
      setError(err.message || "Failed to update subtask");
    } finally {
      setCompletingSubtask(null);
      load();
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Subtasks</CardTitle>
        <Button variant="outline" size="sm" onClick={handleGenerate} disabled={generating}>
          <SparklesIcon className="h-4 w-4 mr-2" />
          {generating ? "Thinking..." : "Break this down"}
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {error && <p className="text-sm text-destructive">{error}</p>}

        {suggestions && (
          <div className="border rounded-lg p-3 space-y-2 bg-muted/30">
            <p className="text-sm font-medium">Review suggested subtasks</p>
            {suggestions.length === 0 && (
              <p className="text-sm text-muted-foreground">No suggestions - try adding a description first.</p>
            )}
            {suggestions.map((s, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input
                  value={s.title}
                  onChange={(e) => updateSuggestion(index, "title", e.target.value)}
                  className="flex-1"
                />
                <Input
                  type="number"
                  min="1"
                  value={s.estimatedMinutes}
                  onChange={(e) => updateSuggestion(index, "estimatedMinutes", parseInt(e.target.value, 10) || 0)}
                  className="w-20"
                />
                <span className="text-xs text-muted-foreground">min</span>
                <Button variant="ghost" size="icon" onClick={() => removeSuggestion(index)}>
                  <TrashIcon className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={() => setSuggestions(null)}>Cancel</Button>
              <Button size="sm" onClick={handleAcceptSuggestions} disabled={accepting}>
                {accepting ? "Saving..." : "Accept"}
              </Button>
            </div>
          </div>
        )}

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading subtasks...</p>
        ) : subtasks.length === 0 ? (
          <p className="text-sm text-muted-foreground">No subtasks yet.</p>
        ) : (
          <div className="space-y-2">
            {subtasks.map((subtask, index) => (
              <div
                key={subtask.id}
                className={`flex items-center gap-2 p-2 border rounded-lg ${subtask.is_completed ? "bg-muted/50" : ""}`}
              >
                <Button
                  variant={subtask.is_completed ? "secondary" : "outline"}
                  size="icon"
                  onClick={() => handleCompleteClick(subtask)}
                  aria-label="Toggle complete"
                >
                  <CheckIcon className="h-4 w-4" />
                </Button>
                <div className="flex-1 min-w-0">
                  <p className={`font-medium truncate ${subtask.is_completed ? "line-through text-muted-foreground" : ""}`}>
                    {subtask.title}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {subtask.estimated_minutes} min
                    {subtask.source === "ai" && (
                      <Badge variant="outline" className="ml-2 text-xs">AI</Badge>
                    )}
                  </p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => handleMove(subtask, -1)} disabled={index === 0}>
                  <ArrowUpIcon className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => handleMove(subtask, 1)} disabled={index === subtasks.length - 1}>
                  <ArrowDownIcon className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => handleDelete(subtask.id)}>
                  <TrashIcon className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2 pt-2 border-t">
          <Input
            placeholder="New subtask"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            className="flex-1"
          />
          <Input
            type="number"
            min="1"
            placeholder="min"
            value={newMinutes}
            onChange={(e) => setNewMinutes(e.target.value)}
            className="w-20"
          />
          <Button variant="outline" size="icon" onClick={handleAddManual}>
            <PlusIcon className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>

      <CompleteTimeDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={completingSubtask?.title}
        onConfirm={finishCompletion}
        onSkip={() => finishCompletion(null)}
      />
    </Card>
  );
}

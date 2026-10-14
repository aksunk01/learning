"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TrashIcon } from "lucide-react";
import {
  fetchGradingCategories,
  createGradingCategory,
  updateGradingCategory,
  deleteGradingCategory,
  detectGradingCategories,
  fetchCourseGrade,
} from "@/lib/grading-api";
import { fetchCourseMaterials } from "@/lib/course-materials-api";

function formatPercent(value) {
  return value == null ? "—" : `${value.toFixed(1)}%`;
}

export function GradingTab({ courseId, token }) {
  const [categories, setCategories] = useState([]);
  const [grade, setGrade] = useState(null);
  const [syllabusMaterial, setSyllabusMaterial] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDetecting, setIsDetecting] = useState(false);
  const [error, setError] = useState("");

  const [newName, setNewName] = useState("");
  const [newWeight, setNewWeight] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editWeight, setEditWeight] = useState("");

  const load = async () => {
    setIsLoading(true);
    setError("");

    try {
      const [categoriesData, gradeData, materials] = await Promise.all([
        fetchGradingCategories(courseId, token),
        fetchCourseGrade(courseId, token),
        fetchCourseMaterials(courseId, token),
      ]);
      setCategories(categoriesData);
      setGrade(gradeData);
      setSyllabusMaterial(
        materials
          .filter((m) => m.material_type?.trim().toLowerCase() === "syllabus" && m.processing_status === "completed")
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0] || null
      );
    } catch (err) {
      setError(err.message || "Failed to load grading data");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDetect = async () => {
    setIsDetecting(true);
    setError("");

    try {
      await detectGradingCategories(courseId, token, syllabusMaterial?.id);
      await load();
    } catch (err) {
      setError(err.message || "Failed to detect grading categories");
    } finally {
      setIsDetecting(false);
    }
  };

  useEffect(() => {
    if (!courseId || !token) return;
    Promise.resolve().then(load);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId, token]);

  const handleCreate = async (event) => {
    event.preventDefault();

    const weight = parseFloat(newWeight);
    if (!newName.trim() || isNaN(weight)) return;

    setIsCreating(true);
    setError("");

    try {
      await createGradingCategory(courseId, { name: newName.trim(), weight_percent: weight }, token);
      setNewName("");
      setNewWeight("");
      await load();
    } catch (err) {
      setError(err.message || "Failed to create category");
    } finally {
      setIsCreating(false);
    }
  };

  const startEditing = (category) => {
    setEditingId(category.id);
    setEditName(category.name);
    setEditWeight(category.weight_percent.toString());
  };

  const handleSaveEdit = async (categoryId) => {
    const weight = parseFloat(editWeight);
    if (!editName.trim() || isNaN(weight)) return;

    try {
      await updateGradingCategory(courseId, categoryId, { name: editName.trim(), weight_percent: weight }, token);
      setEditingId(null);
      await load();
    } catch (err) {
      setError(err.message || "Failed to update category");
    }
  };

  const handleDelete = async (categoryId) => {
    try {
      await deleteGradingCategory(courseId, categoryId, token);
      await load();
    } catch (err) {
      setError(err.message || "Failed to delete category");
    }
  };

  if (isLoading) {
    return <p className="text-muted-foreground">Loading grading breakdown...</p>;
  }

  return (
    <div>
      {error && <div className="text-destructive text-sm mb-4">{error}</div>}

      <Card className="mb-6">
        <CardContent className="p-6">
          <h3 className="text-sm font-medium text-muted-foreground mb-1">Current Grade</h3>
          <p className="text-3xl font-bold">
            {grade?.overall_percent != null ? formatPercent(grade.overall_percent) : "Not enough graded work yet"}
          </p>
        </CardContent>
      </Card>

      {grade && Math.abs(grade.weight_sum - 100) > 0.01 && categories.length > 0 && (
        <div className="mb-4 p-3 rounded-md border border-yellow-300 bg-yellow-50 text-sm text-yellow-800 dark:border-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300">
          Category weights add up to {grade.weight_sum}%, not 100%. Edit your categories below to fix this.
        </div>
      )}

      {grade && grade.uncategorized_graded_count > 0 && (
        <div className="mb-4 p-3 rounded-md border border-border bg-muted/50 text-sm text-muted-foreground">
          {grade.uncategorized_graded_count} graded assignment{grade.uncategorized_graded_count === 1 ? "" : "s"} not
          assigned to a category yet - open an assignment&apos;s edit dialog to categorize it.
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <h3 className="text-xl font-semibold">Grading Categories</h3>

        {syllabusMaterial && (
          <Button size="sm" variant="outline" onClick={handleDetect} disabled={isDetecting}>
            {isDetecting ? "Detecting..." : `Detect from "${syllabusMaterial.name}"`}
          </Button>
        )}
      </div>

      {categories.length === 0 ? (
        <p className="text-muted-foreground mb-6">
          {syllabusMaterial
            ? "No grading categories yet. Click \"Detect from Syllabus\" above to auto-extract them, or add one below."
            : "No grading categories yet. Upload a document named \"Syllabus\" to auto-detect them, or add one below."}
        </p>
      ) : (
        <div className="space-y-3 mb-6">
          {grade?.categories.map((categoryGrade) => {
            const category = categories.find((c) => c.id === categoryGrade.id);
            if (!category) return null;

            const isEditing = editingId === category.id;

            return (
              <Card key={category.id}>
                <CardContent className="p-4">
                  {isEditing ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-40"
                      />
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        step="any"
                        value={editWeight}
                        onChange={(e) => setEditWeight(e.target.value)}
                        className="w-24"
                      />
                      <Button size="sm" onClick={() => handleSaveEdit(category.id)}>Save</Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>Cancel</Button>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{category.name}</h4>
                          <Badge variant="secondary">{category.weight_percent}%</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {formatPercent(categoryGrade.percent)} · {categoryGrade.graded_count}/{categoryGrade.total_count} graded
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => startEditing(category)}>Edit</Button>
                        <Button size="sm" variant="outline" onClick={() => handleDelete(category.id)}>
                          <TrashIcon className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <form onSubmit={handleCreate} className="flex flex-wrap items-end gap-2">
        <div>
          <label className="text-sm text-muted-foreground block mb-1">Name</label>
          <Input
            placeholder="e.g. Homework"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="w-40"
          />
        </div>
        <div>
          <label className="text-sm text-muted-foreground block mb-1">Weight %</label>
          <Input
            type="number"
            min="0"
            max="100"
            step="any"
            placeholder="20"
            value={newWeight}
            onChange={(e) => setNewWeight(e.target.value)}
            className="w-24"
          />
        </div>
        <Button type="submit" disabled={isCreating || !newName.trim() || !newWeight}>
          {isCreating ? "Adding..." : "Add Category"}
        </Button>
      </form>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
} from "@/components/ui/dialog";
import { 
  Field, 
  FieldGroup, 
  FieldLabel, 
  FieldError,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { updateAssignment } from "@/lib/assignments-api";
import { fetchGradingCategories } from "@/lib/grading-api";
import { useRouter } from "next/navigation";

// Define the validation schema - matching the create dialog schema
const assignmentSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  description: z.string().optional().nullable(),
  assignmentType: z.string().optional().nullable(),
  dueAt: z.string().optional().nullable(),
  points: z.string().optional().nullable().refine((value) => {
    if (!value) return true; // Allow empty values
    const num = parseFloat(value);
    return !isNaN(num) && num >= 0;
  }, "Points must be a number greater than or equal to 0"),
  scoreEarned: z.string().optional().nullable().refine((value) => {
    if (!value) return true; // Allow empty values
    const num = parseFloat(value);
    return !isNaN(num) && num >= 0;
  }, "Score earned must be a number greater than or equal to 0"),
  categoryId: z.string().optional().nullable(),
});

export function EditAssignmentDialog({ 
  assignment, 
  open, 
  onOpenChange, 
  onUpdated 
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [categories, setCategories] = useState([]);
  const router = useRouter();

  const form = useForm({
    resolver: zodResolver(assignmentSchema),
    defaultValues: {
      title: "",
      description: "",
      assignmentType: "",
      dueAt: "",
      points: "",
      scoreEarned: "",
      categoryId: "",
    },
  });

  // Populate form when assignment changes
useEffect(() => {
  if (assignment) {
    form.reset({
      title: assignment.title || "",
      description: assignment.description || "",
      assignmentType: assignment.assignment_type || "",
      dueAt: assignment.due_at
        ? assignment.due_at.substring(0, 16)
        : "",
      points: assignment.points?.toString() || "",
      scoreEarned: assignment.score_earned?.toString() || "",
      categoryId: assignment.category_id || "",
    });
  }
}, [assignment, form]);

  // Load the course's grading categories whenever the dialog opens
  useEffect(() => {
    if (!open || !assignment?.course_id) return;

    fetchGradingCategories(assignment.course_id, localStorage.getItem("access_token"))
      .then(setCategories)
      .catch(() => {
        // Category dropdown just stays empty if this fails
        setCategories([]);
      });
  }, [open, assignment?.course_id]);

const handleOpenChange = (nextOpen) => {
  if (!nextOpen) {
    setError(null);
  }

  onOpenChange(nextOpen);
};

const onSubmit = async (data) => {
  setIsSubmitting(true);
  setError(null);

  const assignmentData = {
    title: data.title.trim(),
    description: data.description?.trim() || null,
    assignment_type: data.assignmentType?.trim() || null,
    due_at: data.dueAt || null,
    points: data.points ? parseFloat(data.points) : null,
    score_earned: data.scoreEarned
      ? parseFloat(data.scoreEarned)
      : null,
    category_id: data.categoryId || null,
  };

  try {
    const updatedAssignment = await updateAssignment(
      assignment.course_id,
      assignment.id,
      assignmentData,
      localStorage.getItem("access_token")
    );

    if (onUpdated) {
      onUpdated(updatedAssignment);
    }

    handleOpenChange(false);
  } catch (err) {
    if (err.status === 401 || err.status === 403) {
      localStorage.removeItem("access_token");
      router.push("/login");
      return;
    }

    setError(err.message || "Failed to update assignment");
  } finally {
    setIsSubmitting(false);
  }
};

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Assignment</DialogTitle>
          <DialogDescription>
            Update the details for this assignment.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FieldGroup>
            
            <Field name="title">
              <FieldLabel>Title</FieldLabel>
              <Input 
                placeholder="Assignment title" 
                {...form.register("title")} 
              />
              <FieldError>{form.formState.errors.title?.message}</FieldError>
            </Field>
            
            <Field name="description">
              <FieldLabel>Description</FieldLabel>
              <Textarea 
                placeholder="Assignment description" 
                {...form.register("description")} 
              />
              <FieldError>{form.formState.errors.description?.message}</FieldError>
            </Field>
            
            <Field name="assignmentType">
              <FieldLabel>Assignment Type</FieldLabel>
              <Input 
                placeholder="e.g. homework, quiz, exam" 
                {...form.register("assignmentType")} 
              />
              <FieldError>{form.formState.errors.assignmentType?.message}</FieldError>
            </Field>
            
            <Field name="dueAt">
              <FieldLabel>Due Date/Time</FieldLabel>
              <Input 
                type="datetime-local"
                {...form.register("dueAt")} 
              />
              <FieldError>{form.formState.errors.dueAt?.message}</FieldError>
            </Field>
            
            <Field name="points">
              <FieldLabel>Points</FieldLabel>
              <Input 
                type="number"
                placeholder="Maximum points" 
                {...form.register("points")} 
                min="0"
                step="any"
              />
              <FieldError>{form.formState.errors.points?.message}</FieldError>
            </Field>
            
            <Field name="scoreEarned">
              <FieldLabel>Score Earned</FieldLabel>
              <Input
                type="number"
                placeholder="Points you received"
                {...form.register("scoreEarned")}
                min="0"
                step="any"
              />
              <FieldError>{form.formState.errors.scoreEarned?.message}</FieldError>
            </Field>

            <Field name="categoryId">
              <FieldLabel>Grading Category</FieldLabel>
              <select
                className="h-9 w-full min-w-0 rounded-md border border-input bg-transparent px-2.5 py-1 text-base shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-input/30"
                {...form.register("categoryId")}
              >
                <option value="">Uncategorized</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name} ({category.weight_percent}%)
                  </option>
                ))}
              </select>
              <FieldError>{form.formState.errors.categoryId?.message}</FieldError>
            </Field>
          </FieldGroup>
          
          
          
          {error && (
            <div className="text-sm text-destructive">
              Error: {error}
            </div>
          )}
          
          <DialogFooter>
            <Button 
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting}
            >
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

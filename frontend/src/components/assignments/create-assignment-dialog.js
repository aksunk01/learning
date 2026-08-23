"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {  Dialog,  DialogContent,  DialogDescription,  DialogFooter,  DialogHeader,  DialogTitle,  DialogTrigger,} from "@/components/ui/dialog";
import {  Field,  FieldGroup,  FieldLabel,  FieldError,} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { PlusIcon } from "lucide-react";
import { createAssignment } from "@/lib/assignments-api";
import { useRouter } from "next/navigation";

// Define the validation schema
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
  weightPercent: z.string().optional().nullable().refine((value) => {
    if (!value) return true; // Allow empty values
    const num = parseFloat(value);
    return !isNaN(num) && num >= 0 && num <= 100;
  }, "Weight percent must be a number between 0 and 100 inclusive"),
});

export function CreateAssignmentDialog({ courseId, token, onAssignmentCreated }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const router = useRouter();

  const form = useForm({
    resolver: zodResolver(assignmentSchema),
    defaultValues: {
      title: "",
      description: "",
      assignmentType: "",
      dueAt: "",
      points: "",
      weightPercent: "",
    },
  });



  const onSubmit = async (data) => {
    setIsSubmitting(true);
    setError(null);

    // Prepare the payload with trimmed values and null for empty optional fields
    const assignmentData = {
      title: data.title.trim(),
      description: data.description?.trim() || null,
      assignment_type: data.assignmentType?.trim() || null,
      due_at: data.dueAt || null,
      points: data.points ? parseFloat(data.points) : null,
      weight_percent: data.weightPercent ? parseFloat(data.weightPercent) : null,
    };

    try {
      const createdAssignment = await createAssignment(courseId, assignmentData, token);
      
      // Call the success callback if provided
      if (onAssignmentCreated) {
        onAssignmentCreated(createdAssignment);
      }
      
      // Reset form and close dialog
      form.reset();
      setIsOpen(false);
    } catch (err) {
      if (err.status === 401 || err.status === 403) {
        localStorage.removeItem("access_token");
        router.push("/login");
        return;
      }
      
      setError(err.message || "Failed to create assignment");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (open) => {
    if (!open) {
      // Reset form when closing
      form.reset();
      setError(null);
    }
    setIsOpen(open);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <PlusIcon className="mr-2 h-4 w-4" />
          Add Assignment
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Assignment</DialogTitle>
          <DialogDescription>
            Enter the details for your new assignment.
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
            
            <Field name="weightPercent">
              <FieldLabel>Weight Percent</FieldLabel>
              <Input 
                type="number"
                placeholder="Assignment weight percentage" 
                {...form.register("weightPercent")} 
                min="0"
                max="100"
                step="any"
              />
              <FieldError>{form.formState.errors.weightPercent?.message}</FieldError>
            </Field>
          </FieldGroup>
          
          
          
          {error && (
            <div className="text-sm text-destructive">
              Error: {error}
            </div>
          )}
          
          <DialogFooter>
            <Button 
              type="submit" 
              disabled={isSubmitting}
            >
              {isSubmitting ? "Creating..." : "Create Assignment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

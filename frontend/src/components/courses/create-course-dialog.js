"use client";

import { useState } from "react";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldDescription,
  FieldError,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { PlusIcon } from "lucide-react";
import { createCourse } from "@/lib/courses-api";

// Define the validation schema
const courseSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  code: z.string().trim().min(1, "Code is required"),
  description: z.string().optional().nullable(),
  semester: z.string().optional().nullable(),
});

export function CreateCourseDialog({ token, onCourseCreated }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const form = useForm({
    resolver: zodResolver(courseSchema),
    defaultValues: {
      name: "",
      code: "",
      description: "",
      semester: "",
    },
  });

  const onSubmit = async (data) => {
    setIsSubmitting(true);
    setError(null);

    // Prepare the payload with trimmed values and null for empty optional fields
    const courseData = {
      name: data.name.trim(),
      code: data.code.trim(),
      description: data.description?.trim() || null,
      semester: data.semester?.trim() || null,
    };

    try {
      const createdCourse = await createCourse(courseData, token);
      
      // Call the success callback if provided
      if (onCourseCreated) {
        onCourseCreated(createdCourse);
      }
      
      // Reset form and close dialog
      form.reset();
      setIsOpen(false);
    } catch (err) {
      setError(err.message || "Failed to create course");
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
          Add Course
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Course</DialogTitle>
          <DialogDescription>
            Enter the details for your new course.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FieldGroup>
            <Field name="name">
              <FieldLabel>Name</FieldLabel>
              <Input 
                placeholder="Course name" 
                {...form.register("name")} 
              />
              <FieldError>{form.formState.errors.name?.message}</FieldError>
            </Field>
            
            <Field name="code">
              <FieldLabel>Code</FieldLabel>
              <Input 
                placeholder="Course code" 
                {...form.register("code")} 
              />
              <FieldError>{form.formState.errors.code?.message}</FieldError>
            </Field>
            
            <Field name="description">
              <FieldLabel>Description</FieldLabel>
              <Textarea 
                placeholder="Course description" 
                {...form.register("description")} 
              />
              <FieldError>{form.formState.errors.description?.message}</FieldError>
            </Field>
            
            <Field name="semester">
              <FieldLabel>Semester</FieldLabel>
              <Input 
                placeholder="Semester (e.g. Fall 2023)" 
                {...form.register("semester")} 
              />
              <FieldError>{form.formState.errors.semester?.message}</FieldError>
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
              {isSubmitting ? "Creating..." : "Create Course"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

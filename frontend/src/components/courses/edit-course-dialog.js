"use client";

import { useEffect, useState } from "react";
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
import { updateCourse, fetchCourses } from "@/lib/courses-api";
import { SemesterSelect } from "@/components/courses/semester-select";
import {
  CourseColorPicker,
  COURSE_COLOR_PALETTE,
} from "@/components/courses/course-color-picker";

const courseSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  code: z.string().trim().min(1, "Code is required"),
  description: z.string().optional().nullable(),
  semester_id: z.string().optional().nullable(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Pick a color"),
});

export function EditCourseDialog({ course, token, open, onOpenChange, onUpdated }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [takenColors, setTakenColors] = useState([]);

  const form = useForm({
    resolver: zodResolver(courseSchema),
    defaultValues: {
      name: "",
      code: "",
      description: "",
      semester_id: null,
      color: "#3b82f6",
    },
  });

  useEffect(() => {
    if (course) {
      form.reset({
        name: course.name || "",
        code: course.code || "",
        description: course.description || "",
        semester_id: course.semester_id || null,
        color: course.color || "#3b82f6",
      });
    }
  }, [course, form]);

  const semesterId = form.watch("semester_id");

  // Keep track of colors already used by other classes in the selected
  // semester, so we can gray them out and avoid picking a duplicate.
  useEffect(() => {
    if (!open || !course || !semesterId) {
      setTakenColors([]);
      return;
    }

    fetchCourses(token)
      .then((courses) => {
        const taken = courses
          .filter(
            (other) => other.semester_id === semesterId && other.id !== course.id
          )
          .map((other) => other.color);
        setTakenColors(taken);
      })
      .catch(() => setTakenColors([]));
  }, [open, course, semesterId, token]);

  useEffect(() => {
    const currentColor = form.getValues("color");
    if (!takenColors.includes(currentColor)) return;

    const nextColor = COURSE_COLOR_PALETTE.find(
      (color) => !takenColors.includes(color)
    );
    if (nextColor) {
      form.setValue("color", nextColor, { shouldValidate: true });
    }
  }, [takenColors, form]);

  const handleOpenChange = (nextOpen) => {
    if (!nextOpen) {
      setError(null);
    }
    onOpenChange(nextOpen);
  };

  const onSubmit = async (data) => {
    setIsSubmitting(true);
    setError(null);

    const courseData = {
      name: data.name.trim(),
      code: data.code.trim(),
      description: data.description?.trim() || null,
      semester_id: data.semester_id || null,
      color: data.color,
    };

    try {
      const updatedCourse = await updateCourse(course.id, courseData, token);

      if (onUpdated) {
        onUpdated(updatedCourse);
      }

      handleOpenChange(false);
    } catch (err) {
      setError(err.message || "Failed to update course");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Course</DialogTitle>
          <DialogDescription>
            Update the details for this course.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FieldGroup>
            <Field name="name">
              <FieldLabel>Name</FieldLabel>
              <Input placeholder="Course name" {...form.register("name")} />
              <FieldError>{form.formState.errors.name?.message}</FieldError>
            </Field>

            <Field name="code">
              <FieldLabel>Code</FieldLabel>
              <Input placeholder="Course code" {...form.register("code")} />
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

            <Field name="semester_id">
              <FieldLabel>Semester</FieldLabel>
              <SemesterSelect
                token={token}
                value={form.watch("semester_id")}
                onChange={(semesterId) =>
                  form.setValue("semester_id", semesterId, { shouldValidate: true })
                }
              />
              <FieldError>{form.formState.errors.semester_id?.message}</FieldError>
            </Field>

            <Field name="color">
              <FieldLabel>Color</FieldLabel>
              <CourseColorPicker
                value={form.watch("color")}
                onChange={(color) =>
                  form.setValue("color", color, { shouldValidate: true })
                }
                disabledColors={takenColors}
              />
              {takenColors.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  Grayed-out colors are already used by another class this semester.
                </p>
              )}
              <FieldError>{form.formState.errors.color?.message}</FieldError>
            </Field>
          </FieldGroup>

          {error && (
            <div className="text-sm text-destructive">Error: {error}</div>
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
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

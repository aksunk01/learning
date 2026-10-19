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
  DialogTrigger,
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
import { PlusIcon } from "lucide-react";
import { createCourse, fetchCourses } from "@/lib/courses-api";
import { SemesterSelect } from "@/components/courses/semester-select";
import {
  CourseColorPicker,
  COURSE_COLOR_PALETTE,
} from "@/components/courses/course-color-picker";
import { useControlledOpen } from "@/hooks/use-controlled-open";
import { MeetingTimeField } from "@/components/courses/meeting-time-field";
import { meetingFormValueToSchedule } from "@/lib/course-schedule";

// Define the validation schema
const courseSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  code: z.string().trim().min(1, "Code is required"),
  description: z.string().optional().nullable(),
  semester_id: z.string().optional().nullable(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Pick a color"),
  meetingTime: z.any().optional().nullable(),
});

export function CreateCourseDialog({
  token,
  onCourseCreated,
  open: openProp,
  onOpenChange: onOpenChangeProp,
  trigger,
}) {
  const [isOpen, setIsOpen] = useControlledOpen(openProp, onOpenChangeProp);
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
      color: COURSE_COLOR_PALETTE[0],
      meetingTime: null,
    },
  });

  const semesterId = form.watch("semester_id");

  // Keep track of colors already used by other classes in the selected
  // semester, so we can gray them out and avoid picking a duplicate.
  useEffect(() => {
    if (!isOpen || !semesterId) {
      setTakenColors([]);
      return;
    }

    fetchCourses(token)
      .then((courses) => {
        const taken = courses
          .filter((course) => course.semester_id === semesterId)
          .map((course) => course.color);
        setTakenColors(taken);
      })
      .catch(() => setTakenColors([]));
  }, [isOpen, semesterId, token]);

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

  const onSubmit = async (data) => {
    setIsSubmitting(true);
    setError(null);

    // Prepare the payload with trimmed values and null for empty optional fields
    const courseData = {
      name: data.name.trim(),
      code: data.code.trim(),
      description: data.description?.trim() || null,
      semester_id: data.semester_id || null,
      color: data.color,
      schedule: meetingFormValueToSchedule(data.meetingTime),
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
      setTakenColors([]);
    }
    setIsOpen(open);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      {trigger !== null && (
        <DialogTrigger asChild>
          {trigger || (
            <Button>
              <PlusIcon className="mr-2 h-4 w-4" />
              Add Course
            </Button>
          )}
        </DialogTrigger>
      )}
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

            <Field name="meetingTime">
              <FieldLabel>Meeting Time</FieldLabel>
              <MeetingTimeField
                value={form.watch("meetingTime")}
                onChange={(value) =>
                  form.setValue("meetingTime", value, { shouldValidate: true })
                }
              />
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

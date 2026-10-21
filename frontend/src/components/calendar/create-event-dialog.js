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
  FieldError,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { CalendarPlusIcon } from "lucide-react";
import { createCalendarEvent } from "@/lib/calendar-events-api";
import { CourseSelect } from "@/components/courses/course-select";
import { RecurrenceField } from "@/components/calendar/recurrence-field";
import { useControlledOpen } from "@/hooks/use-controlled-open";

const eventSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  description: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  startAt: z.string().min(1, "Start date/time is required"),
  endAt: z.string().optional().nullable(),
  allDay: z.boolean().optional(),
});

export function CreateEventDialog({
  token,
  defaultCourseId = null,
  onEventCreated,
  open: openProp,
  onOpenChange: onOpenChangeProp,
  trigger,
}) {
  const [isOpen, setIsOpen] = useControlledOpen(openProp, onOpenChangeProp);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [courseId, setCourseId] = useState(defaultCourseId);
  const [recurrence, setRecurrence] = useState(null);

  const form = useForm({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      title: "",
      description: "",
      location: "",
      startAt: "",
      endAt: "",
      allDay: false,
    },
  });

  const onSubmit = async (data) => {
    setIsSubmitting(true);
    setError(null);

    const allDay = Boolean(data.allDay);

    const eventData = {
      title: data.title.trim(),
      description: data.description?.trim() || null,
      location: data.location?.trim() || null,
      start_at: allDay ? `${data.startAt}T00:00` : data.startAt,
      end_at: allDay ? null : data.endAt || null,
      all_day: allDay,
      course_id: courseId || null,
      recurrence,
    };

    try {
      const createdEvent = await createCalendarEvent(eventData, token);

      if (onEventCreated) {
        onEventCreated(createdEvent);
      }

      form.reset();
      setCourseId(defaultCourseId);
      setRecurrence(null);
      setIsOpen(false);
    } catch (err) {
      setError(err.message || "Failed to create event");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (open) => {
    if (!open) {
      form.reset();
      setError(null);
      setCourseId(defaultCourseId);
      setRecurrence(null);
    }
    setIsOpen(open);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      {trigger !== null && (
        <DialogTrigger asChild>
          {trigger || (
            <Button>
              <CalendarPlusIcon className="mr-2 h-4 w-4" />
              Add Event
            </Button>
          )}
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Event</DialogTitle>
          <DialogDescription>
            Create a one-off event, like an appointment or personal
            reminder. It doesn&apos;t need to belong to a class.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FieldGroup>
            <Field name="title">
              <FieldLabel>Title</FieldLabel>
              <Input placeholder="Event title" {...form.register("title")} />
              <FieldError>{form.formState.errors.title?.message}</FieldError>
            </Field>

            <Field name="description">
              <FieldLabel>Description</FieldLabel>
              <Textarea
                placeholder="Optional details"
                {...form.register("description")}
              />
              <FieldError>{form.formState.errors.description?.message}</FieldError>
            </Field>

            <Field name="location">
              <FieldLabel>Location</FieldLabel>
              <Input
                placeholder="Optional location"
                {...form.register("location")}
              />
              <FieldError>{form.formState.errors.location?.message}</FieldError>
            </Field>

            <Field name="allDay">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.watch("allDay")}
                  onChange={(e) => form.setValue("allDay", e.target.checked)}
                  className="h-4 w-4 rounded border-input"
                />
                All day
              </label>
            </Field>

            <Field name="startAt">
              <FieldLabel>
                {form.watch("allDay") ? "Date" : "Start"}
              </FieldLabel>
              <Input
                type={form.watch("allDay") ? "date" : "datetime-local"}
                {...form.register("startAt")}
              />
              <FieldError>{form.formState.errors.startAt?.message}</FieldError>
            </Field>

            {!form.watch("allDay") && (
              <Field name="endAt">
                <FieldLabel>End (optional)</FieldLabel>
                <Input type="datetime-local" {...form.register("endAt")} />
                <FieldError>{form.formState.errors.endAt?.message}</FieldError>
              </Field>
            )}

            <Field name="course">
              <FieldLabel>Course (optional)</FieldLabel>
              <CourseSelect
                token={token}
                value={courseId}
                onChange={setCourseId}
                allowNone
                noneLabel="No course (personal event)"
              />
            </Field>

            <Field name="recurrence">
              <FieldLabel>Repeats</FieldLabel>
              <RecurrenceField value={recurrence} onChange={setRecurrence} />
            </Field>
          </FieldGroup>

          {error && (
            <div className="text-sm text-destructive">Error: {error}</div>
          )}

          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create Event"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldError,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  fetchCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  updateCalendarEventOccurrence,
  deleteCalendarEventOccurrence,
} from "@/lib/calendar-events-api";
import { CourseSelect } from "@/components/courses/course-select";
import { RecurrenceField } from "@/components/calendar/recurrence-field";

const eventSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  description: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  startAt: z.string().min(1, "Start date/time is required"),
  endAt: z.string().optional().nullable(),
  allDay: z.boolean().optional(),
});

// "2026-10-21T14:30:00" (from the API) -> "2026-10-21T14:30" or "2026-10-21"
// (what <input type="datetime-local"|"date"> expects).
function toInputValue(isoString, allDay) {
  if (!isoString) return "";
  return allDay ? isoString.slice(0, 10) : isoString.slice(0, 16);
}

// Edits (or deletes) a calendar event. For a recurring event, the caller
// passes one expanded occurrence (event.is_recurring, event.series_id,
// event.occurrence_date); this dialog lets the user choose whether their
// change applies just to that date or to the whole series - fetching the
// real series record (true recurrence anchor) only when "entire series" is
// selected, since the passed-in occurrence doesn't carry that anchor.
export function EditEventDialog({ event, token, open, onOpenChange, onChanged }) {
  const [scope, setScope] = useState("occurrence");
  const [seriesEvent, setSeriesEvent] = useState(null);
  const [isLoadingSeries, setIsLoadingSeries] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [courseId, setCourseId] = useState(null);
  const [recurrence, setRecurrence] = useState(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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

  const effectiveScope = event?.is_recurring ? scope : "series";

  const resetFormFrom = (record) => {
    form.reset({
      title: record.title || "",
      description: record.description || "",
      location: record.location || "",
      startAt: toInputValue(record.start_at, record.all_day),
      endAt: record.all_day ? "" : toInputValue(record.end_at, false),
      allDay: Boolean(record.all_day),
    });
    setCourseId(record.course_id || null);
  };

  useEffect(() => {
    if (event) {
      setScope("occurrence");
      setSeriesEvent(null);
      setError(null);
      resetFormFrom(event);
      setRecurrence(event.recurrence || null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event]);

  const handleScopeChange = async (nextScope) => {
    setScope(nextScope);

    if (nextScope === "series") {
      if (seriesEvent) {
        resetFormFrom(seriesEvent);
        setRecurrence(seriesEvent.recurrence || null);
        return;
      }

      setIsLoadingSeries(true);
      setError(null);
      try {
        const fetched = await fetchCalendarEvent(event.series_id, token);
        setSeriesEvent(fetched);
        resetFormFrom(fetched);
        setRecurrence(fetched.recurrence || null);
      } catch (err) {
        setError(err.message || "Failed to load the series");
      } finally {
        setIsLoadingSeries(false);
      }
    } else {
      resetFormFrom(event);
      setRecurrence(event.recurrence || null);
    }
  };

  const handleOpenChange = (nextOpen) => {
    if (!nextOpen) {
      setError(null);
    }
    onOpenChange(nextOpen);
  };

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
    };

    try {
      if (effectiveScope === "series") {
        await updateCalendarEvent(event.series_id, { ...eventData, recurrence }, token);
      } else {
        await updateCalendarEventOccurrence(event.series_id, event.occurrence_date, eventData, token);
      }

      onChanged?.();
      handleOpenChange(false);
    } catch (err) {
      setError(err.message || "Failed to update event");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);

    try {
      if (effectiveScope === "series") {
        await deleteCalendarEvent(event.series_id, token);
      } else {
        await deleteCalendarEventOccurrence(event.series_id, event.occurrence_date, token);
      }

      setConfirmDeleteOpen(false);
      handleOpenChange(false);
      onChanged?.();
    } catch (err) {
      setError(err.message || "Failed to delete event");
    } finally {
      setIsDeleting(false);
    }
  };

  if (!event) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Event</DialogTitle>
            <DialogDescription>Update the details for this event.</DialogDescription>
          </DialogHeader>

          {event.is_recurring && (
            <div className="flex gap-1.5 -mt-2 mb-1">
              <Button
                type="button"
                size="sm"
                variant={scope === "occurrence" ? "default" : "outline"}
                onClick={() => handleScopeChange("occurrence")}
              >
                This event
              </Button>
              <Button
                type="button"
                size="sm"
                variant={scope === "series" ? "default" : "outline"}
                onClick={() => handleScopeChange("series")}
              >
                Entire series
              </Button>
            </div>
          )}

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <fieldset disabled={isLoadingSeries} className="contents">
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
                    {effectiveScope === "series" && event.is_recurring ? " (first occurrence)" : ""}
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

                {effectiveScope === "series" && (
                  <Field name="recurrence">
                    <FieldLabel>Repeats</FieldLabel>
                    <RecurrenceField value={recurrence} onChange={setRecurrence} />
                  </Field>
                )}
              </FieldGroup>
            </fieldset>

            {error && (
              <div className="text-sm text-destructive">Error: {error}</div>
            )}

            <DialogFooter className="sm:justify-between">
              <Button
                type="button"
                variant="destructive"
                onClick={() => setConfirmDeleteOpen(true)}
                disabled={isSubmitting || isLoadingSeries}
              >
                Delete
              </Button>
              <Button type="submit" disabled={isSubmitting || isLoadingSeries}>
                {isSubmitting ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {effectiveScope === "series" && event.is_recurring
                ? "Delete the entire series?"
                : "Delete this event?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {effectiveScope === "series" && event.is_recurring
                ? "This removes every occurrence of this recurring event. This can't be undone."
                : "This can't be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

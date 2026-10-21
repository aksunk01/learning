import { baseUrlOrThrow, handleResponse } from "@/lib/api-helpers";

export async function fetchCalendarEvents(token, { start, end, courseId } = {}) {
  const baseUrl = baseUrlOrThrow();
  const params = new URLSearchParams();
  if (start) params.set("start", start);
  if (end) params.set("end", end);
  if (courseId) params.set("course_id", courseId);
  const query = params.toString() ? `?${params.toString()}` : "";

  const response = await fetch(`${baseUrl}/api/v1/calendar-events${query}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });

  return handleResponse(response, "Failed to fetch calendar events");
}

export async function fetchCalendarEvent(eventId, token) {
  const baseUrl = baseUrlOrThrow();

  const response = await fetch(`${baseUrl}/api/v1/calendar-events/${eventId}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });

  return handleResponse(response, "Failed to fetch calendar event");
}

export async function createCalendarEvent(eventData, token) {
  const baseUrl = baseUrlOrThrow();

  const response = await fetch(`${baseUrl}/api/v1/calendar-events`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(eventData),
  });

  return handleResponse(response, "Failed to create calendar event");
}

export async function updateCalendarEvent(eventId, eventData, token) {
  const baseUrl = baseUrlOrThrow();

  const response = await fetch(`${baseUrl}/api/v1/calendar-events/${eventId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(eventData),
  });

  return handleResponse(response, "Failed to update calendar event");
}

export async function deleteCalendarEvent(eventId, token) {
  const baseUrl = baseUrlOrThrow();

  const response = await fetch(`${baseUrl}/api/v1/calendar-events/${eventId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });

  return handleResponse(response, "Failed to delete calendar event");
}

// Occurrence-level edits/cancellations for one date of a recurring series,
// leaving the rest of the series untouched.
export async function updateCalendarEventOccurrence(seriesId, occurrenceDate, eventData, token) {
  const baseUrl = baseUrlOrThrow();

  const response = await fetch(
    `${baseUrl}/api/v1/calendar-events/${seriesId}/occurrences/${occurrenceDate}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(eventData),
    }
  );

  return handleResponse(response, "Failed to update event occurrence");
}

export async function deleteCalendarEventOccurrence(seriesId, occurrenceDate, token) {
  const baseUrl = baseUrlOrThrow();

  const response = await fetch(
    `${baseUrl}/api/v1/calendar-events/${seriesId}/occurrences/${occurrenceDate}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  return handleResponse(response, "Failed to cancel event occurrence");
}

// Shared helpers for the course `schedule` field (see backend
// CourseSchedule/CourseMeeting schemas): a timezone plus a list of meetings,
// each with days-of-week, a start/end time ("HH:MM", 24h), and an optional
// location.

export const DAY_OPTIONS = [
  { value: "monday", label: "Mon" },
  { value: "tuesday", label: "Tue" },
  { value: "wednesday", label: "Wed" },
  { value: "thursday", label: "Thu" },
  { value: "friday", label: "Fri" },
  { value: "saturday", label: "Sat" },
  { value: "sunday", label: "Sun" },
];

const DAY_LABEL_BY_VALUE = Object.fromEntries(
  DAY_OPTIONS.map(({ value, label }) => [value, label])
);

// Date.getDay() is 0=Sunday..6=Saturday; map that to the schema's day values.
const DAY_VALUE_BY_JS_INDEX = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

export function getDayOfWeekValue(date) {
  return DAY_VALUE_BY_JS_INDEX[date.getDay()];
}

// Flatten every course's non-online recurring meetings into (course, meeting)
// pairs keyed by day-of-week, for rendering on a week calendar grid. Online
// meetings have no fixed time (enforced by the backend), so they never show
// up on the grid.
export function buildCourseMeetingsByDay(courses) {
  const byDay = {};

  for (const course of courses) {
    for (const meeting of course.schedule?.meetings || []) {
      if (meeting.is_online) continue;

      for (const day of meeting.days) {
        (byDay[day] ||= []).push({ course, meeting });
      }
    }
  }

  return byDay;
}

export function formatTime12h(time24h) {
  if (!time24h) return "";

  const [hourStr, minute] = time24h.split(":");
  const hour = parseInt(hourStr, 10);
  const period = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;

  return `${hour12}:${minute} ${period}`;
}

export function formatMeeting(meeting) {
  if (meeting.is_online) {
    const location = meeting.location ? ` · ${meeting.location}` : "";
    return `Online${location}`;
  }

  const days = meeting.days.map((day) => DAY_LABEL_BY_VALUE[day] || day).join(", ");
  const time = `${formatTime12h(meeting.start_time)} – ${formatTime12h(meeting.end_time)}`;
  const location = meeting.location ? ` · ${meeting.location}` : "";

  return `${days} · ${time}${location}`;
}

export function formatCourseSchedule(schedule) {
  if (!schedule?.meetings?.length) return null;

  return schedule.meetings.map(formatMeeting).join("; ");
}

// Convert a course's stored `schedule` into the single-meeting shape the
// MeetingTimeField form control edits. Only the first meeting is editable -
// the schema supports several, but the UI only ever creates one.
export function scheduleToMeetingFormValue(schedule) {
  const meeting = schedule?.meetings?.[0];
  if (!meeting) return null;

  return {
    days: meeting.days,
    start_time: meeting.start_time,
    end_time: meeting.end_time,
    location: meeting.location || "",
    is_online: meeting.is_online || false,
  };
}

// Convert the MeetingTimeField form value back into the `schedule` payload
// the API expects, or null to clear it. This only shapes the data - whether
// it's actually valid (e.g. an in-person meeting needs days AND times, an
// online one needs neither) is enforced by the backend's CourseMeeting
// schema, not duplicated here.
export function meetingFormValueToSchedule(meeting) {
  if (!meeting) return null;

  if (meeting.is_online) {
    return {
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      meetings: [
        {
          is_online: true,
          days: [],
          start_time: null,
          end_time: null,
          location: meeting.location?.trim() || null,
        },
      ],
    };
  }

  const isBlank = !meeting.days?.length && !meeting.start_time && !meeting.end_time;
  if (isBlank) return null;

  return {
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    meetings: [
      {
        is_online: false,
        days: meeting.days,
        start_time: meeting.start_time || null,
        end_time: meeting.end_time || null,
        location: meeting.location?.trim() || null,
      },
    ],
  };
}

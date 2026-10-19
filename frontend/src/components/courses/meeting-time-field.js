"use client";

import { Input } from "@/components/ui/input";
import { DAY_OPTIONS } from "@/lib/course-schedule";

// Editor for a single recurring class meeting: which days of the week, a
// start/end time, whether it meets online, and an optional location/link.
// `value` is either null (no meeting time set) or
// { days: string[], start_time, end_time, location, is_online }.
export function MeetingTimeField({ value, onChange }) {
  const meeting = value || {
    days: [],
    start_time: "",
    end_time: "",
    location: "",
    is_online: false,
  };

  const updateMeeting = (patch) => {
    onChange({ ...meeting, ...patch });
  };

  const toggleDay = (day) => {
    const days = meeting.days.includes(day)
      ? meeting.days.filter((d) => d !== day)
      : [...meeting.days, day];
    updateMeeting({ days });
  };

  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={meeting.is_online}
          onChange={(e) => updateMeeting({ is_online: e.target.checked })}
          className="h-4 w-4 rounded border-input"
        />
        Meets online
      </label>

      {meeting.is_online ? (
        <p className="text-xs text-muted-foreground">
          Online classes don&apos;t have a fixed meeting time.
        </p>
      ) : (
        <>
          <div className="flex flex-wrap gap-1.5">
            {DAY_OPTIONS.map(({ value: day, label }) => {
              const isSelected = meeting.days.includes(day);

              return (
                <button
                  key={day}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => toggleDay(day)}
                  className={`h-8 min-w-9 rounded-md border px-2 text-xs font-medium transition-colors ${
                    isSelected
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-input hover:bg-muted"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Input
              type="time"
              value={meeting.start_time}
              onChange={(e) => updateMeeting({ start_time: e.target.value })}
              className="w-32"
              aria-label="Meeting start time"
            />
            <span className="text-muted-foreground text-sm">to</span>
            <Input
              type="time"
              value={meeting.end_time}
              onChange={(e) => updateMeeting({ end_time: e.target.value })}
              className="w-32"
              aria-label="Meeting end time"
            />
          </div>
        </>
      )}

      <Input
        placeholder={meeting.is_online ? "Meeting link (optional)" : "Location (optional)"}
        value={meeting.location}
        onChange={(e) => updateMeeting({ location: e.target.value })}
      />
    </div>
  );
}

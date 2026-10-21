"use client";

import { Input } from "@/components/ui/input";
import { DAY_OPTIONS } from "@/lib/course-schedule";

const FREQUENCY_OPTIONS = [
  { value: "none", label: "Does not repeat" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

const INTERVAL_UNIT_LABEL = {
  daily: (n) => (n === 1 ? "day" : "days"),
  weekly: (n) => (n === 1 ? "week" : "weeks"),
  monthly: (n) => (n === 1 ? "month" : "months"),
};

// Editor for a CalendarEvent's recurrence rule: how often it repeats, which
// days of the week (for a weekly rule), and an optional end date. `value` is
// either null ("does not repeat") or
// { frequency, interval, days_of_week, end_date }.
export function RecurrenceField({ value, onChange }) {
  const frequency = value?.frequency || "none";
  const interval = value?.interval ?? 1;
  const daysOfWeek = value?.days_of_week || [];
  const endDate = value?.end_date || "";

  const update = (patch) => {
    onChange({
      frequency,
      interval,
      days_of_week: daysOfWeek,
      end_date: endDate || null,
      ...patch,
    });
  };

  const handleFrequencyChange = (nextFrequency) => {
    if (nextFrequency === "none") {
      onChange(null);
      return;
    }

    onChange({
      frequency: nextFrequency,
      interval,
      // Only weekly uses a day-of-week list; drop it for other frequencies.
      days_of_week: nextFrequency === "weekly" ? daysOfWeek : [],
      end_date: endDate || null,
    });
  };

  const toggleDay = (day) => {
    const next = daysOfWeek.includes(day)
      ? daysOfWeek.filter((d) => d !== day)
      : [...daysOfWeek, day];
    update({ days_of_week: next });
  };

  return (
    <div className="space-y-2">
      <select
        className="h-9 w-full min-w-0 rounded-md border border-input bg-transparent px-2.5 py-1 text-base shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-input/30"
        value={frequency}
        onChange={(e) => handleFrequencyChange(e.target.value)}
      >
        {FREQUENCY_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      {frequency !== "none" && (
        <>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Every</span>
            <Input
              type="number"
              min="1"
              max="52"
              value={interval}
              onChange={(e) => update({ interval: Math.max(1, parseInt(e.target.value, 10) || 1) })}
              className="w-16"
            />
            <span className="text-sm text-muted-foreground">
              {INTERVAL_UNIT_LABEL[frequency](interval)}
            </span>
          </div>

          {frequency === "weekly" && (
            <div className="flex flex-wrap gap-1.5">
              {DAY_OPTIONS.map(({ value: day, label }) => {
                const isSelected = daysOfWeek.includes(day);

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
          )}

          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground shrink-0">Ends (optional)</span>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => update({ end_date: e.target.value || null })}
              className="w-40"
            />
          </div>
        </>
      )}
    </div>
  );
}

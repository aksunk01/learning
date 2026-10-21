"""Expands a recurring calendar event's rule into concrete occurrence dates
within a bounded [start, end] window. Occurrences are computed on the fly
from the series' rule rather than stored - only exceptions (cancelled or
modified single occurrences) are persisted, in CalendarEventOverride.
"""
from datetime import date, timedelta

DAY_VALUES = [
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday",
]


def _add_months(base: date, months: int) -> date:
    month_index = base.month - 1 + months
    year = base.year + month_index // 12
    month = month_index % 12 + 1
    day = base.day

    # Clamp to the last valid day of the target month (e.g. Jan 31 + 1
    # month -> Feb 28/29, not an error).
    while True:
        try:
            return date(year, month, day)
        except ValueError:
            day -= 1


def occurrence_dates(
    series_start_date: date,
    frequency: str,
    interval: int,
    days_of_week: list[str] | None,
    recurrence_end_date: date | None,
    window_start: date,
    window_end: date,
) -> list[date]:
    """All dates this series recurs on within [window_start, window_end]."""
    interval = max(1, interval or 1)
    range_start = max(series_start_date, window_start)
    range_end = window_end if recurrence_end_date is None else min(window_end, recurrence_end_date)

    if range_end < range_start:
        return []

    if frequency == "daily":
        first_offset = (range_start - series_start_date).days
        remainder = first_offset % interval
        first_date = range_start if remainder == 0 else range_start + timedelta(days=interval - remainder)

        dates = []
        current = first_date
        while current <= range_end:
            dates.append(current)
            current += timedelta(days=interval)
        return dates

    if frequency == "weekly":
        selected_days = set(days_of_week or [])
        if not selected_days:
            return []

        series_week_start = series_start_date - timedelta(days=series_start_date.weekday())
        dates = []
        current = range_start
        while current <= range_end:
            day_name = DAY_VALUES[current.weekday()]
            if day_name in selected_days:
                current_week_start = current - timedelta(days=current.weekday())
                weeks_elapsed = (current_week_start - series_week_start).days // 7
                if weeks_elapsed >= 0 and weeks_elapsed % interval == 0:
                    dates.append(current)
            current += timedelta(days=1)
        return dates

    if frequency == "monthly":
        dates = []
        month_index = 0
        while True:
            candidate = _add_months(series_start_date, month_index * interval)
            if candidate > range_end:
                break
            if candidate >= range_start:
                dates.append(candidate)
            month_index += 1
            if month_index > 1200:  # safety valve against pathological input
                break
        return dates

    return []

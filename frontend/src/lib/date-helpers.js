// Local-timezone "YYYY-MM-DD" key for a Date, for grouping/matching by day
// (as opposed to toISOString(), which shifts to UTC and can land on the
// wrong day near midnight).
export function formatDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseWallClockDate(dateString) {
  if (!dateString) return null;

  const [datePart, timePart = "00:00"] = dateString.split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  const [hour = 0, minute = 0] = timePart.split(":").map(Number);

  return new Date(year, month - 1, day, hour, minute);
}

export function formatWallClockDate(dateString) {
  const date = parseWallClockDate(dateString);

  if (!date) {
    return "";
  }

  return date.toLocaleString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}




export function formatWallClockDateShort(dateString) {
  const date = parseWallClockDate(dateString);

  if (!date) {
    return "";
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
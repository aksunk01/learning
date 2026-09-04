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
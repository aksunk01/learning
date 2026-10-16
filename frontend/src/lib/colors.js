export const DEFAULT_COURSE_COLOR = "#3b82f6";

export function hexToRgba(hex, alpha) {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex || "");
  const value = match ? match[1] : DEFAULT_COURSE_COLOR.slice(1);

  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function courseGlowStyle(hex, intensity = 1) {
  return {
    backgroundColor: hexToRgba(hex, 0.08 * intensity),
  };
}

export function coursePageTintStyle(hex, intensity = 1) {
  return {
    backgroundColor: hexToRgba(hex, 0.03 * intensity),
  };
}

// Full-saturation accents (dots, left borders, badge text) that fade toward
// transparent as intensity drops, rather than toward a fixed muted color.
export function courseAccentColor(hex, intensity = 1) {
  return hexToRgba(hex, intensity);
}

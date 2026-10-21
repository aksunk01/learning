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

function hexTriple(hex) {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex || "");
  const value = match ? match[1] : DEFAULT_COURSE_COLOR.slice(1);

  return [
    parseInt(value.slice(0, 2), 16),
    parseInt(value.slice(2, 4), 16),
    parseInt(value.slice(4, 6), 16),
  ];
}

// Mix `hex` toward `towardHex` by `ratio` (0 = hex, 1 = towardHex).
function mixHex(hex, towardHex, ratio) {
  const [r1, g1, b1] = hexTriple(hex);
  const [r2, g2, b2] = hexTriple(towardHex);
  const mix = (a, b) => Math.round(a + (b - a) * ratio);

  return `#${[mix(r1, r2), mix(g1, g2), mix(b1, b2)]
    .map((c) => c.toString(16).padStart(2, "0"))
    .join("")}`;
}

// Indicator style for a course-colored progress bar, matching the same
// top-to-bottom gradient + glow treatment as the semester progress bar
// (see components/ui/progress.jsx), but built from the course's own color.
export function courseProgressIndicatorStyle(hex) {
  const light = mixHex(hex, "#ffffff", 0.85);
  const lightMid = mixHex(hex, "#ffffff", 0.45);
  const dark = mixHex(hex, "#000000", 0.45);

  return {
    backgroundImage: `linear-gradient(to bottom, ${light} 0%, ${lightMid} 28%, ${hex} 58%, ${dark} 100%)`,
    boxShadow: [
      `0 0 6px ${hexToRgba(hex, 0.95)}`,
      `0 0 14px ${hexToRgba(hex, 0.75)}`,
      `0 0 24px ${hexToRgba(hex, 0.45)}`,
    ].join(", "),
  };
}

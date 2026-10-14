"use client";

export const COURSE_COLOR_PALETTE = [
  "#ef4444",
  "#f97316",
  "#f59e0b",
  "#84cc16",
  "#22c55e",
  "#14b8a6",
  "#06b6d4",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
];

export function CourseColorPicker({ value, onChange, disabledColors = [] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {COURSE_COLOR_PALETTE.map((color) => {
        const isSelected = value?.toLowerCase() === color.toLowerCase();
        const isDisabled =
          !isSelected &&
          disabledColors.some((taken) => taken?.toLowerCase() === color.toLowerCase());

        return (
          <button
            key={color}
            type="button"
            aria-label={
              isDisabled
                ? `${color} already used by another class this semester`
                : `Select color ${color}`
            }
            aria-pressed={isSelected}
            disabled={isDisabled}
            title={isDisabled ? "Already used by another class this semester" : undefined}
            onClick={() => onChange(color)}
            className={`h-7 w-7 rounded-full border-2 transition-transform ${
              isSelected
                ? "border-foreground scale-110"
                : "border-transparent hover:scale-105"
            } ${isDisabled ? "opacity-25 cursor-not-allowed hover:scale-100" : ""}`}
            style={{ backgroundColor: color }}
          />
        );
      })}
    </div>
  );
}

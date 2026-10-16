const RADIUS = 40;
const STROKE_WIDTH = 8;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function gaugeColorClass(percent) {
  if (percent >= 90) return "stroke-emerald-500";
  if (percent >= 75) return "stroke-blue-500";
  if (percent >= 60) return "stroke-amber-500";
  return "stroke-red-500";
}

export function GradeGauge({ percent, size = 96 }) {
  const clamped = Math.max(0, Math.min(100, percent));
  const offset = CIRCUMFERENCE * (1 - clamped / 100);

  return (
    <div
      className="relative shrink-0"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`Current grade: ${clamped.toFixed(1)} percent`}
    >
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
        <circle
          cx="50"
          cy="50"
          r={RADIUS}
          strokeWidth={STROKE_WIDTH}
          fill="none"
          className="stroke-muted"
        />
        <circle
          cx="50"
          cy="50"
          r={RADIUS}
          strokeWidth={STROKE_WIDTH}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={offset}
          className={`${gaugeColorClass(clamped)} transition-[stroke-dashoffset] duration-500`}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xl font-semibold">
          {clamped.toFixed(0)}%
        </span>
      </div>
    </div>
  );
}

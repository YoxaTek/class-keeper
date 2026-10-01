import s from "./DonutChart.module.scss";

export interface DonutSegment {
  label: string;
  value: number;
  color: string; // any CSS color, normally a var(--chart-*) token
}

/**
 * Fixed-order categorical set for the grade-breakdown donut. The actual
 * colors (light + dark, CVD-validated against the app's surfaces) are the
 * --chart-* tokens in styles/tokens.scss. The order must never be re-cycled
 * per-chart — slot 3 (aqua) doubles as the closest CVD-safe relative of the
 * app's accent.
 */
export const GRADE_CATEGORY_COLORS = {
  attendance: "var(--chart-attendance)",
  assignment: "var(--chart-assignment)",
  quiz: "var(--chart-quiz)",
  midterm: "var(--chart-midterm)",
  final: "var(--chart-final)",
  impression: "var(--chart-impression)",
} as const;

/**
 * A segmented radial progress ring: each category fills a share of the ring
 * proportional to its earned points out of `max` (the sum of the course's
 * weights, usually 100 but not hardcoded since a teacher can customize
 * them), with the remainder left as an empty track. Colors come from the
 * dataviz skill's validated categorical order (first 6 slots, worst
 * adjacent CVD Delta E 9.1 light / 8.4 dark) — a separate concern from the
 * app's single teal accent, which stays reserved for UI chrome.
 */
export function DonutChart({
  segments,
  max,
  centerLabel,
  centerSubLabel,
}: {
  segments: DonutSegment[];
  max: number;
  centerLabel: string;
  centerSubLabel: string;
}) {
  const size = 96;
  const strokeWidth = 14;
  const r = (size - strokeWidth) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;
  const gap = 2.5; // px of empty circumference between segments, for separation

  const arcs = segments
    .filter((s) => s.value > 0)
    .reduce<Array<DonutSegment & { length: number; offset: number; sweep: number }>>((acc, s) => {
      const prev = acc[acc.length - 1];
      const offset = prev ? prev.offset + prev.sweep : 0;
      const sweep = (s.value / max) * circumference;
      const length = Math.max(sweep - gap, 0);
      acc.push({ ...s, length, offset, sweep });
      return acc;
    }, []);

  return (
    <div className={s.donut}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className={s.ring}>
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          strokeWidth={strokeWidth}
          className={s.track}
        />
        {arcs.map((arc, i) => (
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            strokeWidth={strokeWidth}
            strokeLinecap="butt"
            strokeDasharray={`${arc.length} ${circumference - arc.length}`}
            strokeDashoffset={-arc.offset}
            style={{ stroke: arc.color }}
          />
        ))}
      </svg>
      <div className={s.center}>
        <span className={s.value}>{centerLabel}</span>
        <span className={`tabular ${s.sub}`}>{centerSubLabel}</span>
      </div>
    </div>
  );
}

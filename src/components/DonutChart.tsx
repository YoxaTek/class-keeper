export interface DonutSegment {
  label: string;
  value: number;
  colorLight: string;
  colorDark: string;
}

/**
 * Fixed-order categorical set for the grade-breakdown donut, validated with
 * the dataviz skill's validator against the app's actual surfaces (white /
 * zinc-900): `node scripts/validate_palette.js
 * "#2a78d6,#eb6834,#1baf7a,#eda100,#e87ba4,#008300" --mode light --surface
 * "#ffffff"` and the dark-mode equivalents below, both ALL CHECKS PASS. The
 * order must never be re-cycled per-chart — slot 3 (aqua) doubles as the
 * closest CVD-safe relative of the app's #0f6e56 accent.
 */
export const GRADE_CATEGORY_COLORS = {
  attendance: { light: "#2a78d6", dark: "#3987e5" },
  assignment: { light: "#eb6834", dark: "#d95926" },
  quiz: { light: "#1baf7a", dark: "#199e70" },
  midterm: { light: "#eda100", dark: "#c98500" },
  final: { light: "#e87ba4", dark: "#d55181" },
  impression: { light: "#008300", dark: "#008300" },
} as const;

/**
 * A segmented radial progress ring: each category fills a share of the ring
 * proportional to its earned points out of `max` (the sum of the term's
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
  const size = 140;
  const strokeWidth = 16;
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
    <div className="relative inline-flex" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          strokeWidth={strokeWidth}
          className="stroke-zinc-100 dark:stroke-zinc-800"
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
            className="[stroke:var(--donut-color-light)] dark:[stroke:var(--donut-color-dark)]"
            style={{ "--donut-color-light": arc.colorLight, "--donut-color-dark": arc.colorDark } as React.CSSProperties}
          />
        ))}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">{centerLabel}</span>
        <span className="text-xs text-zinc-500 dark:text-zinc-500">{centerSubLabel}</span>
      </div>
    </div>
  );
}

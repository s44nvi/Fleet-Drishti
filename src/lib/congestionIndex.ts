import type { Tone } from "./visuals";

export const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
export const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;

// Traffic convention for a 0..1 congestion index: free flow green →
// yellow → orange → red. Shared by the map line layer, the heat grid, the
// hourly profile and the legend so one colour means one level everywhere.
const STOPS: [number, [number, number, number]][] = [
  [0, [47, 174, 99]], // #2fae63
  [0.35, [214, 201, 58]], // #d6c93a
  [0.55, [240, 146, 43]], // #f0922b
  [0.75, [225, 60, 44]], // #e13c2c
  [1, [185, 28, 28]], // #b91c1c
];

export function congestionColor(value: number): string {
  const v = Math.min(1, Math.max(0, value));
  for (let i = 1; i < STOPS.length; i++) {
    const [t1, c1] = STOPS[i];
    const [t0, c0] = STOPS[i - 1];
    if (v <= t1) {
      const k = (v - t0) / (t1 - t0);
      const c = c0.map((ch, j) => Math.round(ch + (c1[j] - ch) * k));
      return `rgb(${c[0]} ${c[1]} ${c[2]})`;
    }
  }
  return "rgb(185 28 28)";
}

export const CONGESTION_GRADIENT = `linear-gradient(90deg, ${STOPS.map(([t, c]) => `rgb(${c.join(" ")}) ${t * 100}%`).join(", ")})`;

export function congestionWord(value: number): { label: string; tone: Tone } {
  if (value < 0.35) return { label: "Free flow", tone: "ok" };
  if (value < 0.55) return { label: "Moderate", tone: "watch" };
  if (value < 0.75) return { label: "Heavy", tone: "alert" };
  return { label: "Severe", tone: "alert" };
}

export const CONGESTED_THRESHOLD = 0.55;

export function hourLabel(hour: number): string {
  return `${String(hour).padStart(2, "0")}:00`;
}

// Monday-based weekday index (0 = Monday) for a timestamp.
export function mondayIndex(iso: string): number {
  return (new Date(iso).getDay() + 6) % 7;
}

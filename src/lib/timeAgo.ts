// The mock fixtures are all timestamped on one fixed past date, so a plain
// `new Date() - timestamp` would always read as "N days ago" and never look
// live. Instead every "time ago" label in the Command Center is computed
// relative to the *latest* timestamp anywhere in the fixture set, which
// stands in for "now" in this demo dataset — so a same-day AI observation
// still reads as "4 min ago" the way it would against a real live feed.
export function minutesAgo(timestamp: string, anchor: string): number {
  const diffMs = new Date(anchor).getTime() - new Date(timestamp).getTime();
  return Math.max(0, Math.round(diffMs / 60000));
}

export function formatMinutesAgo(minutes: number): string {
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  return `${hours} hr ago`;
}

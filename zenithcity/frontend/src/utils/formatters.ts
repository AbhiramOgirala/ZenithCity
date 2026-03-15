export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}
export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
export function formatPoints(pts: number): string {
  if (pts >= 1000000) return `${(pts / 1000000).toFixed(1)}M`;
  if (pts >= 1000) return `${(pts / 1000).toFixed(1)}K`;
  return pts.toString();
}

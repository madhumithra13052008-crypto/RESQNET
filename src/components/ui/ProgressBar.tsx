export function ProgressBar({ value, color = '#22d3ee', height = 6 }: { value: number; color?: string; height?: number }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className="w-full overflow-hidden rounded-full bg-bg-600" style={{ height }} role="progressbar" aria-valuenow={Math.round(v)} aria-valuemin={0} aria-valuemax={100}>
      <div className="h-full rounded-full transition-all duration-300" style={{ width: `${v}%`, background: color }} />
    </div>
  );
}
export const batteryColor = (b: number) => (b > 50 ? '#34d399' : b > 20 ? '#fbbf24' : '#f87171');

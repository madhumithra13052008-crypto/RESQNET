import type { ReactNode } from 'react';

const COLORS = { default: 'text-ink', ok: 'text-ok', warn: 'text-warn', bad: 'text-bad', cyan: 'text-accent' };
export function Stat({ label, value, sub, tone = 'default', icon }: { label: string; value: ReactNode; sub?: ReactNode; tone?: keyof typeof COLORS; icon?: ReactNode }) {
  return (
    <div className="rounded-lg border border-line/70 bg-bg-700/50 px-3 py-2">
      <div className="flex items-center gap-1.5 text-xs text-mute">{icon}{label}</div>
      <div className={`mono mt-0.5 text-xl font-semibold ${COLORS[tone]}`}>{value}</div>
      {sub && <div className="mt-0.5 text-[11px] text-mute">{sub}</div>}
    </div>
  );
}

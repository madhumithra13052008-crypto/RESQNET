import type { ReactNode } from 'react';

export type Tone = 'ok' | 'warn' | 'bad' | 'info' | 'mute' | 'cyan';
const TONES: Record<Tone, string> = {
  ok: 'bg-ok/15 text-ok border-ok/30',
  warn: 'bg-warn/15 text-warn border-warn/30',
  bad: 'bg-bad/15 text-bad border-bad/30',
  info: 'bg-violet-400/15 text-violet-300 border-violet-400/30',
  mute: 'bg-slate-400/10 text-slate-300 border-slate-400/20',
  cyan: 'bg-accent/15 text-accent border-accent/30',
};
export function Badge({ tone = 'mute', children, className = '' }: { tone?: Tone; children: ReactNode; className?: string }) {
  return <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-md border px-1.5 py-0.5 text-[11px] font-medium ${TONES[tone]} ${className}`}>{children}</span>;
}

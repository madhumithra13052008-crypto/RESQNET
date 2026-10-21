import { ArrowRight } from 'lucide-react';
import { fmtTime } from '../../lib/format';
import { useSimStore } from '../../store/useSimStore';
import { Card } from '../ui/Card';

export function Reassignments() {
  const events = useSimStore((s) => s.events);
  const moves = events.filter((e) => e.type === 'handoff').slice(-4).reverse().map((e) => {
    const m = /(T\d+) reassigned (D\d+) -> (D\d+)/.exec(e.message);
    return m ? { id: e.id, t: e.t, task: m[1], from: m[2], to: m[3] } : null;
  }).filter(Boolean) as { id: number; t: number; task: string; from: string; to: string }[];
  const recon = events.filter((e) => e.type === 'reconciliation').length;
  return (
    <Card title="TASK REASSIGNMENTS" right={<span className="text-[11px] text-mute">{recon} reconciliations</span>} bodyClass="p-2.5">
      {moves.length === 0 ? <p className="text-sm text-mute">No task has changed owner yet. Reassignments appear when a drone fails, returns for battery, or loses its link.</p> : (
        <ul className="space-y-2">
          {moves.map((m) => (
            <li key={m.id} className="flex items-center gap-2 text-xs">
              <span className="mono w-11 text-mute">{fmtTime(m.t)}</span>
              <span className="mono rounded-full border border-bad/50 px-2 py-0.5 text-bad">{m.from}</span>
              <ArrowRight size={14} className="text-accent" />
              <span className="mono rounded-full border border-ok/50 px-2 py-0.5 text-ok">{m.to}</span>
              <span className="mono text-ink">{m.task}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

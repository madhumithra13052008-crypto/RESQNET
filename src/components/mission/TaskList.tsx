import { ClipboardList } from 'lucide-react';
import { HUMAN, PRIORITY_COLOR } from '../../lib/constants';
import { fmtTime, sectorName } from '../../lib/format';
import type { SimState, TaskStatus } from '../../types';
import { Badge, type Tone } from '../ui/Badge';
import { Card } from '../ui/Card';
import { ProgressBar } from '../ui/ProgressBar';

const TONE: Record<TaskStatus, Tone> = { pending: 'mute', assigned: 'cyan', in_progress: 'warn', completed: 'ok', conflict: 'bad' };

export function TaskList({ sim }: { sim: SimState }) {
  const rows = [...sim.tasks].sort((a, b) => Number(a.status === 'completed') - Number(b.status === 'completed') || b.priority - a.priority || a.deadline_s - b.deadline_s);
  return (
    <Card title="SEARCH TASKS" icon={<ClipboardList size={15} />} right={<span className="mono text-xs text-mute">{sim.metrics.tasks_completed}/{sim.metrics.tasks_total} done</span>} bodyClass="p-0">
      <div className="max-h-[360px] overflow-auto">
        <table className="w-full min-w-[520px] text-xs">
          <thead className="sticky top-0 bg-bg-800 text-left text-[11px] text-mute"><tr><th className="px-3 py-1.5">Task</th><th>Pri</th><th>Status</th><th>Owner</th><th>Deadline</th><th className="pr-3">Progress</th></tr></thead>
          <tbody>
            {rows.map((t) => {
              const left = t.deadline_s - sim.time;
              return (
                <tr key={t.id} className="border-t border-line/40">
                  <td className="px-3 py-1.5"><span className="mono font-semibold">{t.id}</span> <span className="text-mute">{sectorName(t.x, t.y)}</span><div className="text-[10px] text-mute">{HUMAN(t.type)}{t.in_comm_dead_zone ? ' · dead zone' : ''}</div></td>
                  <td><span className="mono font-bold" style={{ color: PRIORITY_COLOR[t.priority] }}>P{t.priority}</span>{t.required_drones > 1 && <span className="mono text-[10px] text-accent"> ×{t.required_drones}</span>}</td>
                  <td><Badge tone={TONE[t.status]}>{t.status.replace('_', ' ')}</Badge></td>
                  <td className="mono">{t.assigned_to.length ? t.assigned_to.join('+') : '—'}</td>
                  <td className={`mono ${t.status !== 'completed' && left < 0 ? 'text-bad' : 'text-mute'}`}>{t.status === 'completed' ? (t.overdue ? 'late' : 'on time') : left < 0 ? `late ${fmtTime(-left)}` : fmtTime(left)}</td>
                  <td className="w-24 pr-3"><ProgressBar value={t.progress * 100} color="#2dd4bf" height={5} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

import { Battery, Radio, Target } from 'lucide-react';
import { DRONE_COLOR, DRONE_TONE } from '../../lib/constants';
import { droneName, sectorName } from '../../lib/format';
import { useSimStore } from '../../store/useSimStore';
import type { Drone, SimState } from '../../types';
import { Badge } from '../ui/Badge';
import { Card } from '../ui/Card';
import { ProgressBar, batteryColor } from '../ui/ProgressBar';

function DroneCard({ d, sim, selected, onSelect }: { d: Drone; sim: SimState; selected: boolean; onSelect: () => void }) {
  const task = d.task_id ? sim.tasks.find((t) => t.id === d.task_id) : undefined;
  const ago = Math.max(0, Math.round(sim.time - d.last_update));
  return (
    <button onClick={onSelect} aria-pressed={selected} className={`w-full rounded-lg border p-2.5 text-left transition-colors ${selected ? 'border-accent bg-accent/10' : 'border-line bg-bg-700/50 hover:border-accent/50'}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ background: DRONE_COLOR[d.status], boxShadow: `0 0 8px ${DRONE_COLOR[d.status]}` }} /><span className="text-sm font-semibold tracking-wide">{droneName(d.id)}</span></div>
        <Badge tone={DRONE_TONE[d.status]}>{d.status}</Badge>
      </div>
      <div className="mono mt-1.5 flex items-center justify-between text-[11px] text-mute"><span>({d.x}, {d.y}) · {sectorName(d.x, d.y)}</span><span>{d.in_dead_zone ? <span className="text-violet-300">dead zone</span> : `zone grp ${d.group === 0 ? 'W' : 'E'}`}</span></div>
      <div className="mt-1.5 flex items-center gap-1.5"><Battery size={13} className="shrink-0 text-mute" /><div className="flex-1"><ProgressBar value={d.battery} color={batteryColor(d.battery)} height={5} /></div><span className="mono w-9 text-right text-xs">{Math.round(d.battery)}%</span></div>
      <div className="mt-1.5 flex items-center justify-between gap-2 text-[11px]">
        <span className="flex min-w-0 items-center gap-1 text-mute"><Target size={12} className="shrink-0" />
          {d.verifying ? <span className="mono text-accent">verify {d.verifying}</span> : task ? <span className="mono truncate text-ink">{task.id} P{task.priority}{task.assigned_to.length > 1 ? ` · ${task.assigned_to.join('+')}` : ''}</span> : 'no task'}
          {task?.status === 'conflict' && <Badge tone="bad">conflict</Badge>}
        </span>
        <span className={`mono flex shrink-0 items-center gap-1 ${d.connected ? 'text-ok' : 'text-bad'}`}><Radio size={12} />{d.connected ? 'linked' : `lost ${ago}s`}</span>
      </div>
    </button>
  );
}

export function DroneFleetPanel({ sim }: { sim: SimState }) {
  const selected = useSimStore((s) => s.selectedDroneId);
  const select = useSimStore((s) => s.selectDrone);
  const active = sim.drones.filter((d) => d.status !== 'failed').length;
  return (
    <Card title={`DRONE FLEET (${sim.drones.length})`} right={<span className="mono text-xs text-mute">{active} operational</span>} bodyClass="space-y-2 p-2.5">
      {sim.drones.map((d) => <DroneCard key={d.id} d={d} sim={sim} selected={selected === d.id} onSelect={() => select(selected === d.id ? null : d.id)} />)}
    </Card>
  );
}

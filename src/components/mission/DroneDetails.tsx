import { Crosshair, Plug, Unplug, Zap } from 'lucide-react';
import { DRONE_TONE } from '../../lib/constants';
import { droneName, fmtTime, sectorName } from '../../lib/format';
import { injectFailure, restoreFailure } from '../../store/actions';
import { useSimStore } from '../../store/useSimStore';
import type { SimState } from '../../types';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

export function DroneDetails({ sim }: { sim: SimState }) {
  const id = useSimStore((s) => s.selectedDroneId);
  const events = useSimStore((s) => s.events);
  const d = sim.drones.find((x) => x.id === id);
  const live = sim.status === 'running' || sim.status === 'paused';
  if (!d) return <Card title="DRONE DETAILS" icon={<Crosshair size={15} />}><p className="text-sm text-mute">Click a drone on the map, grid or fleet list to see its details and to target failures at it.</p></Card>;
  const owned = sim.tasks.filter((t) => t.assigned_to.includes(d.id) && t.status !== 'completed');
  const recent = events.filter((e) => e.drone_id === d.id).slice(-5).reverse();
  return (
    <Card title={droneName(d.id)} icon={<Crosshair size={15} />} right={<Badge tone={DRONE_TONE[d.status]}>{d.status}</Badge>}>
      <dl className="mono grid grid-cols-2 gap-y-1 text-xs">
        <dt className="text-mute">Position</dt><dd>({d.x}, {d.y}) · {sectorName(d.x, d.y)}</dd>
        <dt className="text-mute">Battery</dt><dd>{d.battery.toFixed(1)}%</dd>
        <dt className="text-mute">Controller link</dt><dd className={d.connected ? 'text-ok' : 'text-bad'}>{d.connected ? 'connected' : d.in_dead_zone ? 'lost (dead zone)' : 'lost'}</dd>
        <dt className="text-mute">Last contact</dt><dd>{fmtTime(d.last_update)}</dd>
        <dt className="text-mute">Network group</dt><dd>{d.group === 0 ? 'west (D1-D3)' : 'east (D4-D6)'}</dd>
        <dt className="text-mute">Owned tasks</dt><dd>{owned.length ? owned.map((t) => `${t.id}${t.status === 'conflict' ? '!' : ''}`).join(', ') : '—'}</dd>
        <dt className="text-mute">Verifying</dt><dd>{d.verifying ?? '—'}</dd>
      </dl>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" variant="warn" disabled={!live || d.status === 'failed'} onClick={() => injectFailure('drone_disconnect', [d.id])}><Unplug size={13} />Disconnect</Button>
        <Button size="sm" variant="danger" disabled={!live || d.status === 'failed'} onClick={() => injectFailure('drone_failure', [d.id])}><Zap size={13} />Fail</Button>
        <Button size="sm" variant="ok" disabled={!live} onClick={() => restoreFailure('drones', [d.id])}><Plug size={13} />Restore</Button>
      </div>
      <div className="mt-3 border-t border-line/60 pt-2">
        <div className="mb-1 text-xs font-medium text-mute">Recent events</div>
        {recent.length === 0 ? <p className="text-xs text-mute">None yet.</p> : <ul className="space-y-1">{recent.map((e) => <li key={e.id} className="text-xs"><span className="mono text-mute">{fmtTime(e.t)}</span> {e.message}</li>)}</ul>}
      </div>
    </Card>
  );
}

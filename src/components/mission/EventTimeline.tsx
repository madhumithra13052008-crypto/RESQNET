import { ListChecks } from 'lucide-react';
import { useMemo, useState } from 'react';
import { SEVERITY_COLOR } from '../../lib/constants';
import { fmtTime } from '../../lib/format';
import { useSimStore } from '../../store/useSimStore';
import type { Severity } from '../../types';
import { Card } from '../ui/Card';
import { Empty } from '../ui/Empty';

export function EventTimeline({ droneIds }: { droneIds: string[] }) {
  const events = useSimStore((s) => s.events);
  const [drone, setDrone] = useState('all');
  const [sev, setSev] = useState<'all' | Severity>('all');
  const shown = useMemo(() => events.filter((e) => (drone === 'all' || e.drone_id === drone) && (sev === 'all' || e.severity === sev)).slice().reverse(), [events, drone, sev]);
  return (
    <Card title="FLIGHT LOG (LIVE)" icon={<ListChecks size={15} />} bodyClass="p-0"
      right={<>
        <select className="input !w-auto !py-1 text-xs" value={drone} onChange={(e) => setDrone(e.target.value)} aria-label="Filter by drone"><option value="all">All drones</option>{droneIds.map((d) => <option key={d} value={d}>{d}</option>)}</select>
        <select className="input !w-auto !py-1 text-xs" value={sev} onChange={(e) => setSev(e.target.value as 'all' | Severity)} aria-label="Filter by severity"><option value="all">All severities</option><option value="error">Errors</option><option value="warning">Warnings</option><option value="success">Success</option><option value="info">Info</option></select>
      </>}>
      {shown.length === 0 ? <Empty title="No events yet" hint="Task allocations, failures, recoveries and reconnections appear here as they happen." /> : (
        <ul className="max-h-[360px] divide-y divide-line/40 overflow-y-auto" aria-live="polite">
          {shown.map((e) => (
            <li key={e.id} className="flex items-start gap-2 px-3 py-1.5 text-xs">
              <span className="mono mt-0.5 w-11 shrink-0 text-mute">{fmtTime(e.t)}</span>
              <span className="mt-1 h-2 w-2 shrink-0 rounded-full" style={{ background: SEVERITY_COLOR[e.severity] }} title={e.severity} />
              {e.drone_id && <span className="mono mt-px shrink-0 font-semibold" style={{ color: SEVERITY_COLOR[e.severity] }}>{e.drone_id}</span>}
              <span className="text-ink">{e.message}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

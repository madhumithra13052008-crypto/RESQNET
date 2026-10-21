import { ScanSearch } from 'lucide-react';
import type { SimState } from '../../types';
import { Badge } from '../ui/Badge';
import { Card } from '../ui/Card';
import { Empty } from '../ui/Empty';
import { DetectionCard } from './DetectionCard';

export function FindingsPanel({ sim }: { sim: SimState }) {
  const list = [...sim.detections].reverse();
  const live = sim.status === 'running' || sim.status === 'paused';
  const m = sim.metrics;
  return (
    <Card title="POTENTIAL RESCUE FINDINGS" icon={<ScanSearch size={15} />} right={<><Badge tone={m.unresolved_findings ? 'warn' : 'mute'}>{m.unresolved_findings} open</Badge><Badge tone="ok">{m.findings_confirmed} confirmed</Badge></>} bodyClass="p-0">
      {list.length === 0 ? <Empty title="No candidate detections yet" hint="When a drone searches a cell with a candidate, its location, evidence, confidence and verification status appear here and on the map." /> : (
        <ul className="max-h-[460px] divide-y divide-line/40 overflow-y-auto">{list.map((q) => <li key={q.id} className="p-3"><DetectionCard det={q} live={live} /></li>)}</ul>
      )}
      <p className="border-t border-line/60 px-3 py-2 text-[11px] text-mute">Detections are unconfirmed observations. A finding is shown as confirmed only after the backend emits an explicit confirmation event from a verification pass. It is never treated as a completed rescue.</p>
    </Card>
  );
}

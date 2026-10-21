import { AlertOctagon, AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { SEVERITY_COLOR } from '../../lib/constants';
import { fmtTime } from '../../lib/format';
import { useSimStore } from '../../store/useSimStore';
import { Card } from '../ui/Card';

const ICON = { error: AlertOctagon, warning: AlertTriangle, success: CheckCircle2, info: Info };
const ALERT_TYPES = new Set(['failure', 'conflict', 'detection', 'geofence', 'safety', 'battery', 'recovery', 'reconciliation', 'comms']);

export function AlertsPanel() {
  const events = useSimStore((s) => s.events);
  const acked = useSimStore((s) => s.ackedAlerts);
  const ack = useSimStore((s) => s.ackAlerts);
  const alerts = events.filter((e) => ALERT_TYPES.has(e.type) && e.severity !== 'info').slice(-40);
  const unacked = alerts.filter((e) => e.id > acked).length;
  const shown = alerts.slice(-5).reverse();
  return (
    <Card title={`ALERTS (${unacked})`} bodyClass="p-0" right={<button className="rounded border border-line px-2 py-0.5 text-[11px] text-mute hover:text-ink disabled:opacity-40" disabled={!alerts.length} onClick={() => ack(events[events.length - 1]?.id ?? 0)}>Acknowledge all</button>}>
      {shown.length === 0 ? <p className="p-3 text-sm text-mute">No active alerts.</p> : (
        <ul className="divide-y divide-line/40" aria-live="polite">
          {shown.map((e) => {
            const Icon = ICON[e.severity];
            return (
              <li key={e.id} className={`flex gap-2.5 px-3 py-2 ${e.id <= acked ? 'opacity-50' : ''}`}>
                <Icon size={16} className="mt-0.5 shrink-0" style={{ color: SEVERITY_COLOR[e.severity] }} />
                <div className="min-w-0 text-xs"><div className="font-medium leading-snug">{e.message}</div><div className="mono text-[10px] text-mute">{fmtTime(e.t)} · {e.type}</div></div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

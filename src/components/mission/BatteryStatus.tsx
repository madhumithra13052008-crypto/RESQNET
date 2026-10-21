import { DRONE_COLOR } from '../../lib/constants';
import { droneName } from '../../lib/format';
import type { SimState } from '../../types';
import { Card } from '../ui/Card';
import { ProgressBar, batteryColor } from '../ui/ProgressBar';

export function BatteryStatus({ sim }: { sim: SimState }) {
  return (
    <Card title="BATTERY STATUS" bodyClass="p-2.5">
      <div className="grid grid-cols-3 gap-2">
        {sim.drones.map((d) => (
          <div key={d.id} className="rounded-lg border border-line bg-bg-700/50 p-2 text-center">
            <div className="text-[10px] font-semibold tracking-wide text-mute">{droneName(d.id)}</div>
            <div className="mono text-xl font-semibold" style={{ color: d.battery <= 20 ? '#f87171' : '#e6eef9' }}>{Math.round(d.battery)}%</div>
            <ProgressBar value={d.battery} color={batteryColor(d.battery)} height={5} />
            <div className="mt-1 text-[10px]" style={{ color: DRONE_COLOR[d.status] }}>{d.status}</div>
          </div>
        ))}
      </div>
    </Card>
  );
}

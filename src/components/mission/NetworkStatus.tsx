import { CheckCircle2, Network, Server, TriangleAlert, Unplug } from 'lucide-react';
import type { ReactNode } from 'react';
import type { SimState } from '../../types';

function Chip({ ok, warn, icon, label, value }: { ok?: boolean; warn?: boolean; icon: ReactNode; label: string; value: string }) {
  const c = warn ? 'border-warn/40 bg-warn/10 text-warn' : ok ? 'border-ok/30 bg-ok/10 text-ok' : 'border-bad/40 bg-bad/10 text-bad';
  return (
    <div className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 ${c}`}>
      {icon}
      <div className="leading-tight"><div className="text-[11px] opacity-80">{label}</div><div className="text-sm font-semibold">{value}</div></div>
    </div>
  );
}

export function NetworkStatus({ sim }: { sim: SimState }) {
  const n = sim.network, conflicts = sim.metrics.conflicts_active;
  const alive = sim.drones.filter((d) => d.status !== 'failed');
  const linked = alive.filter((d) => d.connected).length;
  return (
    <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
      <Chip ok={n.controller_online} icon={<Server size={18} />} label="Central controller" value={n.controller_online ? 'Online' : 'Offline'} />
      <Chip ok={!n.partitioned} icon={<Network size={18} />} label="Network" value={n.partitioned ? `Partitioned (${n.groups.length} groups)` : 'Connected'} />
      <Chip ok={linked === alive.length} warn={linked > 0 && linked < alive.length} icon={<Unplug size={18} />} label="Drones linked" value={`${linked}/${sim.drones.length}`} />
      <Chip ok={n.converged && n.recovery !== 'in_progress'} warn={n.converged && n.recovery === 'in_progress'} icon={n.converged ? <CheckCircle2 size={18} /> : <TriangleAlert size={18} />} label="Task state"
        value={!n.converged ? `Diverged: ${conflicts} conflicting` : n.recovery === 'in_progress' ? 'Recovering' : n.recovery === 'recovered' ? 'Converged' : 'Consistent'} />
    </div>
  );
}

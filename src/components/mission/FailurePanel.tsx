import { CloudLightning, Network, Plug, Power, RefreshCcw, ShieldAlert, Unplug, Zap } from 'lucide-react';
import type { ReactNode } from 'react';
import { injectFailure, restoreFailure } from '../../store/actions';
import { useSimStore } from '../../store/useSimStore';
import type { SimState } from '../../types';
import { Card } from '../ui/Card';
import { NetworkStatus } from './NetworkStatus';

const TONE = {
  fail: 'border-bad/40 bg-bad/10 text-bad hover:bg-bad/20',
  warn: 'border-warn/40 bg-warn/10 text-warn hover:bg-warn/20',
  heal: 'border-accent/50 bg-accent/15 text-accent hover:bg-accent/25',
  neutral: 'border-line bg-bg-700/60 text-ink hover:border-accent/50',
};
function Action({ icon, title, desc, tone, onClick, disabled }: { icon: ReactNode; title: string; desc: string; tone: keyof typeof TONE; onClick: () => void; disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled} className={`flex items-start gap-3 rounded-xl border p-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${TONE[tone]}`}>
      <span className="mt-0.5 shrink-0">{icon}</span>
      <span><span className="block text-sm font-semibold">{title}</span><span className="block text-[11px] opacity-80">{desc}</span></span>
    </button>
  );
}

export function FailurePanel({ sim }: { sim: SimState }) {
  const n = sim.network;
  const sel = useSimStore((s) => s.selectedDroneId);
  const d = sim.drones.find((x) => x.id === sel);
  const live = sim.status === 'running' || sim.status === 'paused';
  const rt = sim.metrics.recovery_time;
  return (
    <Card title="Failure injection and recovery" icon={<ShieldAlert size={15} />} right={<span className="text-[11px] text-mute">The result shown is what the backend computes</span>}>
      <NetworkStatus sim={sim} />
      <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {n.controller_online
          ? <Action tone="fail" icon={<Power size={18} />} title="Disable central controller" desc="Drones lose central coordination" disabled={!live} onClick={() => injectFailure('controller_outage')} />
          : <Action tone="heal" icon={<Power size={18} />} title="Restore central controller" desc="Bring the controller back online" disabled={!live} onClick={() => restoreFailure('controller')} />}
        {!n.partitioned
          ? <Action tone="fail" icon={<Network size={18} />} title="Inject network partition" desc="Split D1-D3 from D4-D6" disabled={!live} onClick={() => injectFailure('network_partition')} />
          : <Action tone="heal" icon={<Network size={18} />} title="Reconnect network" desc="Heal the partition and reconcile" disabled={!live} onClick={() => restoreFailure('network')} />}
        <Action tone="warn" icon={<CloudLightning size={18} />} title="Inject network loss" desc="40% packet loss on all links" disabled={!live} onClick={() => injectFailure('packet_loss')} />
        <Action tone="warn" icon={<Unplug size={18} />} title={d ? `Disconnect ${d.id}` : 'Disconnect selected drone'} desc={d ? 'Cut all of its links' : 'Select a drone first'} disabled={!live || !d || d.status === 'failed'} onClick={() => d && injectFailure('drone_disconnect', [d.id])} />
        <Action tone="fail" icon={<Zap size={18} />} title={d ? `Fail ${d.id}` : 'Fail selected drone'} desc={d ? 'It stops responding' : 'Select a drone first'} disabled={!live || !d || d.status === 'failed'} onClick={() => d && injectFailure('drone_failure', [d.id])} />
        <Action tone="heal" icon={<Plug size={18} />} title="Restore connectivity" desc={d ? `Restore all links, reboot ${d.id} if failed` : 'Restore controller, network and drone links'} disabled={!live}
          onClick={() => { restoreFailure('all'); if (d?.status === 'failed') restoreFailure('drones', [d.id]); }} />
      </div>
      <div className="mt-3 rounded-lg border border-line/70 bg-bg-700/40 p-2.5 text-xs">
        <div className="flex items-center gap-2 font-medium text-ink"><RefreshCcw size={13} className="text-accent" />Recovery result</div>
        <div className="mono mt-1 leading-relaxed text-mute">
          {n.recovery === 'none' && 'No failure injected yet.'}
          {n.recovery === 'in_progress' && <span className="text-warn">Recovery in progress: coordination has not resumed for every drone.</span>}
          {n.recovery === 'recovered' && <span className="text-ok">Coordination resumed{rt !== null ? ` ${rt}s after the failure (mean per failure)` : ''}.</span>}{' '}
          Duplicate assignments: <span className={sim.metrics.duplicate_assignments ? 'text-warn' : 'text-ok'}>{sim.metrics.duplicate_assignments}</span>.{' '}
          {n.converged ? <span className="text-ok">Task ownership is consistent.</span> : <span className="text-bad">Task ownership has NOT converged ({sim.metrics.conflicts_active} conflicting).</span>}
        </div>
      </div>
    </Card>
  );
}

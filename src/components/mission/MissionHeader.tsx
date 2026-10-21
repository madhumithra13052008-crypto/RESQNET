import { DISASTER_EMOJI, MODE_META } from '../../lib/constants';
import { fmtTime } from '../../lib/format';
import type { Scenario, SimState } from '../../types';
import { Badge } from '../ui/Badge';
import { ProgressBar } from '../ui/ProgressBar';

export function MissionHeader({ sim, scenario }: { sim: SimState; scenario: Scenario }) {
  const c = scenario.communication.conditions, m = sim.metrics;
  const tone = sim.status === 'running' ? 'ok' : sim.status === 'paused' ? 'warn' : sim.status === 'completed' ? 'cyan' : 'mute';
  const chip = (k: string, v: string) => <span key={k} className="rounded-md border border-line/70 bg-bg-700/60 px-2 py-1 text-[11px] text-mute">{k} <b className="mono text-ink">{v}</b></span>;
  return (
    <div className="panel flex flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3">
      <div className="flex items-center gap-3">
        <span className="text-2xl" aria-hidden>{DISASTER_EMOJI[scenario.disaster_type]}</span>
        <div>
          <div className="flex items-center gap-2"><h1 className="text-lg font-semibold leading-tight">{scenario.name}</h1><Badge tone={tone}>{sim.status === 'idle' ? 'ready' : sim.status}</Badge><Badge tone="cyan">{MODE_META[sim.mode].label}</Badge></div>
          <div className="mono text-[11px] text-mute">{scenario.scenario_id} · seed {sim.seed} · {sim.run_id}</div>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {chip('reliability', `${Math.round(sim.network.network_reliability * 100)}%`)}
        {chip('packet loss', `${sim.network.packet_loss_pct}%`)}
        {chip('latency', `${sim.network.latency_ms} ms`)}
        {chip('controller risk', `${Math.round(c.controller_failure_risk * 100)}%`)}
        {chip('urgency', String(scenario.mission.urgency_index))}
      </div>
      <div className="ml-auto flex min-w-[260px] items-center gap-4">
        <div>
          <div className="text-[11px] text-mute">Elapsed</div>
          <div className="mono text-xl font-semibold">{fmtTime(sim.time)}<span className="text-sm text-mute"> / {fmtTime(sim.duration_s)}</span></div>
        </div>
        <div className="flex-1 space-y-1.5">
          <div className="flex justify-between text-[11px] text-mute"><span>Mission time</span><span className="mono text-ink">{Math.round((sim.time / sim.duration_s) * 100)}%</span></div>
          <ProgressBar value={(sim.time / sim.duration_s) * 100} color="#60a5fa" height={5} />
          <div className="flex justify-between text-[11px] text-mute"><span>Tasks {m.tasks_completed}/{m.tasks_total}</span><span className="mono text-ink">{m.coverage.toFixed(1)}% searched</span></div>
          <ProgressBar value={m.tasks_total ? (m.tasks_completed / m.tasks_total) * 100 : 0} color="#2dd4bf" height={5} />
        </div>
      </div>
    </div>
  );
}

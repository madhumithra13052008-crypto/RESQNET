import { PRIORITY_COLOR } from '../../lib/constants';
import type { Scenario, SimState } from '../../types';
import { Card } from '../ui/Card';

export function ZonesPanel({ sim, scenario }: { sim: SimState; scenario: Scenario }) {
  const st = new Map(sim.zones.map((z) => [z.zone_id, z]));
  return (
    <Card title="PRIORITY ZONES" right={<span className="text-[11px] text-mute">5×5 cells each</span>} bodyClass="p-2.5">
      <div className="grid grid-cols-4 gap-1.5" role="list">
        {scenario.zones.map((z) => {
          const s = st.get(z.zone_id), cov = s?.coverage_pct ?? 0, c = PRIORITY_COLOR[z.priority_level];
          return (
            <div key={z.zone_id} role="listitem" className="relative overflow-hidden rounded-md border bg-bg-700/60 p-1.5" style={{ borderColor: `${c}88` }} title={`${z.zone_id} ${z.sector_range} · priority ${z.priority_level} · risk ${z.simulated_risk_score} (synthetic) · ${s?.open_tasks ?? 0} open tasks`}>
              <div className="absolute inset-x-0 bottom-0 bg-ok/25" style={{ height: `${cov}%` }} />
              <div className="relative">
                <div className="flex items-center justify-between"><span className="mono text-[10px] font-semibold">{z.zone_id}</span><span className="mono rounded px-1 text-[9px] font-bold text-bg-900" style={{ background: c }}>P{z.priority_level}</span></div>
                <div className="mono mt-0.5 text-sm font-semibold">{cov}%</div>
                <div className="mono text-[9px] text-mute">risk {z.simulated_risk_score.toFixed(2)}</div>
                {(s?.unresolved_findings ?? 0) > 0 && <span className="absolute right-0 top-4 text-[11px] text-warn" title="unresolved finding">◎</span>}
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-2 text-[10px] text-mute">Fill = searched share. Risk is a synthetic score, not a survivor probability.</p>
    </Card>
  );
}

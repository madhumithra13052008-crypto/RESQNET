import { Download, Gauge } from 'lucide-react';
import { exportRunCsv, exportRunJson } from '../../lib/export';
import { num } from '../../lib/format';
import { useSettingsStore } from '../../store/useSettingsStore';
import { useSimStore } from '../../store/useSimStore';
import type { RunDetail, Scenario, SimState } from '../../types';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Stat } from '../ui/Stat';
import { CoverageChart } from './CoverageChart';

export function OutcomesPanel({ sim, scenario }: { sim: SimState; scenario: Scenario }) {
  const history = useSimStore((s) => s.history);
  const events = useSimStore((s) => s.events);
  const fs = useSettingsStore((s) => s.failureScenario);
  const m = sim.metrics;
  const summary = (): RunDetail => ({
    run_id: sim.run_id, scenario_id: sim.scenario_id, scenario_name: scenario.name, mode: sim.mode, seed: sim.seed, failure_scenario: fs,
    status: sim.status === 'completed' ? 'completed' : 'aborted', started_at: new Date().toISOString(), duration_s: sim.time, metrics: m, events, series: history,
  });
  return (
    <Card title="MISSION OUTCOMES" icon={<Gauge size={15} />} right={<><Button size="sm" onClick={() => exportRunCsv(summary())} disabled={sim.tick === 0}><Download size={13} />CSV</Button><Button size="sm" onClick={() => exportRunJson(summary())} disabled={sim.tick === 0}><Download size={13} />JSON</Button></>}>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Stat label="Search coverage" value={`${m.coverage.toFixed(1)}%`} tone="cyan" sub={`${m.areas_remaining} cells remaining`} />
        <Stat label="Tasks completed" value={`${m.tasks_completed}/${m.tasks_total}`} tone="ok" sub={`${m.critical_completed}/${m.critical_total} critical · ${m.tasks_assigned} assigned`} />
        <Stat label="Deadlines missed" value={m.deadlines_missed} tone={m.deadlines_missed ? 'bad' : 'ok'} />
        <Stat label="Awaiting verification" value={m.unresolved_findings} tone={m.unresolved_findings ? 'warn' : 'default'} sub={`${m.findings_confirmed} confirmed · ${m.findings_dismissed} dismissed`} />
        <Stat label="Verification passes" value={m.verifications_assigned} sub="assigned / confirmed / dismissed" />
        <Stat label="Duplicate assignments" value={m.duplicate_assignments} tone={m.duplicate_assignments ? 'warn' : 'ok'} sub={`${m.conflicts_active} active conflicts`} />
        <Stat label="Recovery time" value={num(m.recovery_time, 's')} sub={sim.network.recovery === 'in_progress' ? 'recovery in progress' : 'mean per failure'} />
        <Stat label="Messages sent" value={m.comm_overhead} sub="communication overhead" />
        <Stat label="Safety violations" value={m.safety_violations} tone={m.safety_violations ? 'bad' : 'ok'} sub="no-fly entries" />
      </div>
      <div className="mt-4">
        <div className="mb-1 text-xs font-medium text-mute">Progress over time</div>
        {history.length > 1 ? <CoverageChart data={history} /> : <p className="py-6 text-center text-xs text-mute">The chart fills in as the mission runs.</p>}
      </div>
    </Card>
  );
}

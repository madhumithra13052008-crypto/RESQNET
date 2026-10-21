import { FlaskConical, Loader2, Play } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { getApi } from '../api';
import { ComparisonTable, leaders } from '../components/experiments/ComparisonTable';
import { CoverageOverTime, METRIC_DEFS, MODES, MetricBars } from '../components/experiments/ComparisonCharts';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Empty } from '../components/ui/Empty';
import { MODE_META } from '../lib/constants';
import { fmtDate } from '../lib/format';
import { useSettingsStore } from '../store/useSettingsStore';
import { useSimStore } from '../store/useSimStore';
import type { ExperimentResult } from '../types';

export default function ExperimentsPage() {
  const s = useSettingsStore();
  const catalog = useSimStore((x) => x.catalog);
  const failureScenarios = useSimStore((x) => x.failureScenarios);
  const scenarios = catalog?.scenarios ?? [];
  const setError = useSimStore((x) => x.setError);
  const [list, setList] = useState<ExperimentResult[]>([]);
  const [active, setActive] = useState<ExperimentResult | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    try { const l = await getApi().listExperiments(); setList(l); setActive((a) => a ?? l[0] ?? null); } catch (e) { setError((e as Error).message); }
  }, [setError]);
  useEffect(() => { refresh(); }, [refresh, s.useMock, s.apiUrl]);

  const run = async () => {
    setBusy(true); setError(null);
    try {
      const exp = await getApi().runExperiment({ scenario_id: s.scenarioId, seed: s.seed, params: { network_reliability: s.networkReliability, failure_scenario: s.failureScenario === 'manual' ? 'multi_failure' : s.failureScenario } });
      setActive(exp); setList((l) => [exp, ...l.filter((x) => x.id !== exp.id)]);
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  };

  const verdict = useMemo(() => {
    if (!active) return null;
    const wins: Record<string, number> = { centralized: 0, decentralized: 0, hybrid: 0 };
    const hybridMisses: string[] = [];
    METRIC_DEFS.forEach((d, i) => {
      const l = leaders(active, i);
      l.forEach((m) => wins[m]++);
      if (l.length && !l.includes('hybrid')) hybridMisses.push(d.label.toLowerCase());
    });
    return { wins, hybridMisses };
  }, [active]);

  return (
    <div className="mx-auto max-w-[1300px] space-y-4 p-3 md:p-5">
      <div>
        <h1 className="text-2xl font-semibold">Experiments</h1>
        <p className="mt-1 max-w-2xl text-sm text-mute">Run centralized, decentralized and hybrid coordination on the same map, task list, starting positions and failure schedule, then compare what happened.</p>
      </div>

      <Card title="Run a comparison" icon={<FlaskConical size={15} />}>
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[200px]">
            <label className="label" htmlFor="exp-sc">Scenario</label>
            <select id="exp-sc" className="input" value={s.scenarioId} onChange={(e) => { const sc = catalog?.scenarios.find((x) => x.scenario_id === e.target.value); s.set({ scenarioId: e.target.value, ...(sc ? { seed: sc.seed, networkReliability: sc.communication.conditions.network_reliability } : {}) }); }}>
              {scenarios.map((sc) => <option key={sc.scenario_id} value={sc.scenario_id}>{sc.name}</option>)}
            </select>
          </div>
          <div className="w-28">
            <label className="label" htmlFor="exp-seed">Seed</label>
            <input id="exp-seed" type="number" className="input mono" value={s.seed} onChange={(e) => s.set({ seed: Math.max(0, Math.floor(Number(e.target.value) || 0)) })} />
          </div>
          <div className="min-w-[200px]">
            <label className="label" htmlFor="exp-fs">Failure conditions (same for all modes)</label>
            <select id="exp-fs" className="input" value={s.failureScenario === 'manual' ? 'multi_failure' : s.failureScenario} onChange={(e) => s.set({ failureScenario: e.target.value })}>
              {failureScenarios.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </div>
          <Button variant="primary" onClick={run} disabled={busy || scenarios.length === 0}>
            {busy ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}{busy ? 'Running 3 simulations' : 'Run comparison'}
          </Button>
        </div>
        <p className="mt-3 text-xs text-mute">Network reliability ({Math.round(s.networkReliability * 100)}%) comes from the Scenarios page. All three modes run on the same map, tasks, drone starts, seed and failure script.</p>
      </Card>

      {list.length > 1 && (
        <div className="flex flex-wrap gap-2" aria-label="Previous experiments">
          {list.map((e) => (
            <button key={e.id} onClick={() => setActive(e)} className={`rounded-lg border px-3 py-1.5 text-xs ${active?.id === e.id ? 'border-accent bg-accent/10 text-accent' : 'border-line text-mute hover:text-ink'}`}>
              {e.scenario_name} · seed {e.seed} · {fmtDate(e.created_at)}
            </button>
          ))}
        </div>
      )}

      {!active ? (
        <Card><Empty icon={<FlaskConical size={30} />} title="No comparison yet" hint="Run a comparison to see which strategy covered more area, completed more tasks, recovered faster and produced fewer conflicting assignments in that test." /></Card>
      ) : (
        <>
          <Card title="What happened in this test">
            <p className="text-sm">
              Metric leaders for <b>{active.scenario_name}</b> (seed {active.seed}):{' '}
              {MODES.map((m, i) => <span key={m}>{i > 0 && ', '}<b style={{ color: MODE_META[m].color }}>{MODE_META[m].label}</b> {verdict?.wins[m]}</span>)} of {METRIC_DEFS.length}.
            </p>
            {verdict && verdict.hybridMisses.length > 0 && (
              <p className="mt-1 text-sm text-warn">Hybrid did not lead on: {verdict.hybridMisses.join(', ')}.</p>
            )}
            <p className="mt-2 text-xs text-mute">Failure schedule used for all three modes: {active.schedule.join('; ') || 'none'}. Each run lasted {active.horizon_s}s of simulated time. This is one seed in simulation, so treat it as evidence about this test, not a general result.</p>
          </Card>
          <Card title="Comparison table"><ComparisonTable exp={active} /></Card>
          <Card title="Coverage over time"><CoverageOverTime exp={active} /></Card>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {METRIC_DEFS.map((d) => <MetricBars key={d.key} exp={active} def={d} />)}
          </div>
        </>
      )}
    </div>
  );
}

import { CheckCircle2, FlaskConical, Play, Sparkles } from 'lucide-react';
import { ScenarioPreview } from '../components/mission/ScenarioPreview';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Empty } from '../components/ui/Empty';
import { DISASTER_EMOJI, HUMAN, MODE_META, PRIORITY_COLOR, PRIORITY_LABEL } from '../lib/constants';
import { navigate } from '../lib/nav';
import { analyzeScenario, loadScenario, startMission } from '../store/actions';
import { useSettingsStore } from '../store/useSettingsStore';
import { useSimStore } from '../store/useSimStore';
import type { CoordinationMode, Scenario } from '../types';

const count = (xs: string[]) => Object.entries(xs.reduce<Record<string, number>>((a, k) => ((a[k] = (a[k] ?? 0) + 1), a), {}));

export default function ScenariosPage() {
  const s = useSettingsStore();
  const catalog = useSimStore((x) => x.catalog);
  const recommendation = useSimStore((x) => x.recommendation);
  const failureScenarios = useSimStore((x) => x.failureScenarios);
  const setRec = useSimStore((x) => x.setRecommendation);
  const sc = catalog?.scenarios.find((x) => x.scenario_id === s.scenarioId);
  const range = catalog?.meta.adjustable_parameters.network_reliability ?? { min: 0.3, max: 1, step: 0.05 };

  const choose = (x: Scenario) => {
    s.set({ scenarioId: x.scenario_id, seed: x.seed, networkReliability: x.communication.conditions.network_reliability, mode: 'hybrid', modeSource: 'default' });
    setRec(null); loadScenario();
  };
  const pickMode = (m: CoordinationMode) => s.set({ mode: m, modeSource: recommendation && recommendation.mode === m ? 'recommended' : 'manual' });
  const fsHint = s.failureScenario === 'manual' ? 'No scripted failures. Inject failures yourself during the mission.' : failureScenarios.find((f) => f.id === s.failureScenario)?.description;

  return (
    <div className="mx-auto max-w-[1400px] space-y-4 p-3 md:p-5">
      <div>
        <h1 className="text-2xl font-semibold">Scenarios</h1>
        <p className="mt-1 max-w-3xl text-sm text-mute">Pick a disaster scenario, review the conditions from the dataset, let RESQNET analyse them, then start the mission. The recommendation comes from the conditions, not from the scenario name.</p>
      </div>

      <section aria-label="Choose scenario">
        <h2 className="mb-2 text-sm font-semibold text-mute">1. Choose a disaster scenario</h2>
        {!catalog ? <Card><Empty title="Scenario catalog not loaded" hint="The backend returned no scenarios or is unreachable. Check Settings." /></Card> : (
          <div className="grid gap-3 md:grid-cols-3">
            {catalog.scenarios.map((x) => {
              const on = x.scenario_id === s.scenarioId, c = x.communication.conditions;
              return (
                <button key={x.scenario_id} onClick={() => choose(x)} aria-pressed={on} className={`panel p-4 text-left transition-colors ${on ? '!border-accent bg-accent/10' : 'hover:border-accent/50'}`}>
                  <div className="flex items-center justify-between"><span className="text-3xl" aria-hidden>{DISASTER_EMOJI[x.disaster_type]}</span>{on && <Badge tone="cyan"><CheckCircle2 size={12} />Selected</Badge>}</div>
                  <div className="mt-2 text-lg font-semibold">{x.name}</div>
                  <p className="mt-1 text-sm text-mute">{x.description}</p>
                  <div className="mono mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-mute">
                    <span>{x.stats.free_cells} free cells</span><span>{x.stats.blocked_cells} blocked</span>
                    <span>{x.stats.restricted_cells} no-fly</span><span>{x.stats.task_count} tasks</span>
                    <span>{Math.round(c.network_reliability * 100)}% network</span><span>seed {x.seed}</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {sc && (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <Card title="2. Review conditions">
            <div className="grid gap-4 md:grid-cols-[auto_1fr]">
              <div><ScenarioPreview sc={sc} /><p className="mt-1.5 max-w-[460px] text-[11px] text-mute">Grey = blocked, hatched red = no-fly, purple dashed = comm dead zone, dashed boxes = priority zones, numbers = tasks (priority), diamonds = candidate detections (hidden until searched), H = base and controller.</p></div>
              <div className="space-y-4">
                <div>
                  <label className="label" htmlFor="rel">Network reliability (adjustable): <span className="mono text-ink">{Math.round(s.networkReliability * 100)}%</span></label>
                  <input id="rel" type="range" min={range.min} max={range.max} step={range.step} value={s.networkReliability} onChange={(e) => { s.set({ networkReliability: Number(e.target.value) }); setRec(null); }} className="w-full accent-cyan-400" />
                </div>
                <dl className="mono grid grid-cols-2 gap-x-3 gap-y-1.5 rounded-lg border border-line/70 bg-bg-700/40 p-2.5 text-xs">
                  <dt className="text-mute">Packet loss</dt><dd>{sc.communication.conditions.packet_loss_pct}%</dd>
                  <dt className="text-mute">Latency</dt><dd>{sc.communication.conditions.latency_ms} ms</dd>
                  <dt className="text-mute">Controller failure risk</dt><dd>{Math.round(sc.communication.conditions.controller_failure_risk * 100)}%</dd>
                  <dt className="text-mute">Urgency index</dt><dd>{sc.mission.urgency_index}</dd>
                  <dt className="text-mute">Mission</dt><dd>{sc.mission.duration_s} s · tick {sc.mission.tick_s} s</dd>
                  <dt className="text-mute">Base / hub</dt><dd>{sc.base.sector} · range {sc.communication.hub.range_cells} cells</dd>
                  <dt className="text-mute">Cell size</dt><dd>{sc.grid.cell_size_m} m</dd>
                  <dt className="text-mute">Drones</dt><dd>6 at base</dd>
                </dl>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="label" htmlFor="seed">Random seed</label><input id="seed" type="number" className="input mono" value={s.seed} onChange={(e) => s.set({ seed: Math.max(0, Math.floor(Number(e.target.value) || 0)) })} onBlur={() => loadScenario()} /></div>
                  <div><label className="label" htmlFor="fs">Failure conditions</label>
                    <select id="fs" className="input" value={s.failureScenario} onChange={(e) => s.set({ failureScenario: e.target.value })}>
                      <option value="manual">Manual (inject myself)</option>
                      {failureScenarios.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                    </select></div>
                </div>
                <p className="text-xs text-mute">{fsHint}</p>
              </div>
            </div>
            <div className="mt-4 grid gap-3 text-xs sm:grid-cols-3">
              <div><div className="mb-1 font-medium text-mute">Obstacles ({sc.obstacles.length})</div>{count(sc.obstacles.map((o) => HUMAN(o.type))).map(([k, n]) => <div key={k} className="flex justify-between"><span>{k}</span><span className="mono text-mute">{n}</span></div>)}</div>
              <div><div className="mb-1 font-medium text-mute">No-fly zones ({sc.restricted_zones.length})</div>{sc.restricted_zones.map((z) => <div key={z.id} className="flex justify-between gap-2"><span>{HUMAN(z.type)}</span><Badge tone={z.severity === 'critical' ? 'bad' : 'warn'}>{z.severity}</Badge></div>)}</div>
              <div><div className="mb-1 font-medium text-mute">Tasks by priority</div>{[5, 4, 3, 2, 1].map((p) => <div key={p} className="flex justify-between"><span style={{ color: PRIORITY_COLOR[p] }}>P{p} {PRIORITY_LABEL[p]}</span><span className="mono text-mute">{sc.stats.tasks_by_priority[String(p)] ?? 0}</span></div>)}<div className="mt-1 text-mute">{sc.candidate_detections.length} candidate detections · {sc.communication.dead_zones.length} dead zone(s)</div></div>
            </div>
            <Button variant="primary" className="mt-4 w-full sm:w-auto" onClick={() => analyzeScenario()}><Sparkles size={16} />Analyze scenario</Button>
          </Card>

          <Card title="3. Coordination strategy" right={recommendation && <Badge tone="ok">Analysis ready</Badge>}>
            {recommendation ? (
              <div className="mb-3 space-y-3 rounded-lg border border-accent/30 bg-accent/5 p-3 text-sm">
                <div>Recommended mode: <b className="text-accent">{MODE_META[recommendation.mode].label}</b></div>
                <div><div className="text-xs font-medium text-mute">Reasons</div><ul className="ml-4 list-disc space-y-0.5">{recommendation.reasons.map((r) => <li key={r}>{r}</li>)}</ul></div>
                <div><div className="text-xs font-medium text-mute">Situation assessed</div>
                  <div className="mt-1 grid gap-1 sm:grid-cols-2">{recommendation.factors.map((f) => <div key={f.label} className="rounded border border-line/60 bg-bg-700/40 px-2 py-1 text-xs"><span className="text-mute">{f.label}: </span><b className="mono">{f.value}</b>{f.note && <div className="text-[10px] text-mute">{f.note}</div>}</div>)}</div></div>
                <div><div className="text-xs font-medium text-mute">Expected trade-offs</div><ul className="ml-4 list-disc space-y-0.5">{recommendation.tradeoffs.map((r) => <li key={r}>{r}</li>)}</ul></div>
                <details className="text-xs text-mute"><summary className="cursor-pointer">Assumptions</summary><ul className="ml-4 mt-1 list-disc">{recommendation.assumptions.map((a) => <li key={a}>{a}</li>)}</ul></details>
              </div>
            ) : <p className="mb-3 rounded-lg border border-dashed border-line p-3 text-sm text-mute">Press Analyze scenario to assess connectivity, controller availability, task urgency, battery and mission constraints, or pick a mode yourself below.</p>}
            <div className="space-y-2" role="radiogroup" aria-label="Coordination mode">
              {(Object.keys(MODE_META) as CoordinationMode[]).map((m) => {
                const on = s.mode === m;
                return (
                  <button key={m} role="radio" aria-checked={on} onClick={() => pickMode(m)} className={`w-full rounded-lg border p-2.5 text-left transition-colors ${on ? 'border-accent bg-accent/10' : 'border-line bg-bg-700/40 hover:border-accent/50'}`}>
                    <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-full border-2" style={{ borderColor: MODE_META[m].color, background: on ? MODE_META[m].color : 'transparent' }} /><span className="font-medium">{MODE_META[m].label}</span>
                      {recommendation?.mode === m && <Badge tone="ok">Recommended</Badge>}{on && s.modeSource === 'manual' && <Badge tone="warn">Manual override</Badge>}</div>
                    <p className="ml-5 mt-0.5 text-xs text-mute">{MODE_META[m].blurb}</p>
                  </button>
                );
              })}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button variant="primary" size="lg" onClick={async () => { await startMission(); navigate('mission'); }}><Play size={18} />Start mission</Button>
              <Button size="lg" onClick={() => navigate('experiments')}><FlaskConical size={18} />Compare strategies</Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

import type { Ctl, DetectionAction, Handlers, HealthInfo, SimApi } from '../contract';
import type {
  Catalog, CoordinationMode, ExperimentResult, FailureType, HistoryPoint, Recommendation, RestoreTarget, RunDetail, RunStatus,
  RunSummary, Scenario, ScenarioParams, SimState, StartRequest,
} from '../../types';
import { CATALOG, FAILURE_SCENARIOS, truthOf } from './catalog';
import { Engine, describeSchedule, runHeadless } from './engine';

const RUNS_KEY = 'resqnet.mock.runs.v2';
const EXP_KEY = 'resqnet.mock.experiments.v2';
const load = <T,>(k: string): T[] => { try { return JSON.parse(localStorage.getItem(k) ?? '[]'); } catch { return []; } };
const save = (k: string, v: unknown) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage full or blocked */ } };
const scenarioOf = (id: string): Scenario => CATALOG.scenarios.find((s) => s.scenario_id === id) ?? CATALOG.scenarios[0];
const MODES: CoordinationMode[] = ['centralized', 'decentralized', 'hybrid'];

export class MockClient implements SimApi {
  private engine: Engine | null = null;
  private req: StartRequest | null = null;
  private timer: number | null = null;
  private status: RunStatus = 'idle';
  private speed = 1;
  private runId = '';
  private handlers = new Set<Handlers>();
  private saved = true;
  private series: HistoryPoint[] = [];
  private startedAt = '';

  async health(): Promise<HealthInfo> { return { status: 'ok', engine: 'browser mock engine', database: 'localStorage', version: 'mock-2' }; }
  async getCatalog(): Promise<Catalog> { return CATALOG; }
  async listFailureScenarios() { return FAILURE_SCENARIOS; }

  async analyze(req: { scenario_id: string; params: ScenarioParams }): Promise<Recommendation> {
    const sc = scenarioOf(req.scenario_id), c = sc.communication.conditions;
    const rel = req.params.network_reliability, risk = c.controller_failure_risk;
    const deadTasks = sc.tasks.filter((t) => t.in_comm_dead_zone).length;
    const critical = sc.tasks.filter((t) => t.priority >= 4).length;
    let mode: CoordinationMode = 'hybrid';
    const reasons: string[] = [];
    if (rel >= 0.9 && risk <= 0.2 && sc.communication.dead_zones.length === 0) {
      mode = 'centralized';
      reasons.push(`Connectivity is reliable (${Math.round(rel * 100)}%), controller failure risk is low (${Math.round(risk * 100)}%) and there are no comm dead zones.`, 'A single planner avoids duplicate claims and message overhead.');
    } else if (rel <= 0.4 && risk >= 0.6) {
      mode = 'decentralized';
      reasons.push(`Network reliability is very low (${Math.round(rel * 100)}%) and the controller is likely to fail (${Math.round(risk * 100)}%).`, 'Waiting for central instructions would stall most drones, so local claiming is the safer default.');
    } else {
      reasons.push(`Connectivity is intermittent (${Math.round(rel * 100)}% reliability, ${c.packet_loss_pct}% packet loss, ${c.latency_ms} ms latency).`, `Controller failure risk is ${Math.round(risk * 100)}%.`);
      if (sc.communication.dead_zones.length) reasons.push(`${sc.communication.dead_zones.length} comm dead zone(s) cover ${deadTasks} task location(s), so some drones will lose the controller by design.`);
      reasons.push('Hybrid keeps central efficiency and falls back to local claiming and reconciliation when the link drops.');
    }
    const tradeoffs = {
      centralized: ['Best task consistency while linked.', 'Drones without a link stop receiving work.', 'Single point of failure.'],
      decentralized: ['Keeps working with no controller.', 'Highest message overhead.', 'Stale claims can create duplicate assignments until peers reconcile.'],
      hybrid: ['Recovers locally and reconciles on reconnection.', 'More complex logic to test.', 'Region leases can leave some tasks waiting during a partition.'],
    }[mode];
    return {
      mode, reasons, tradeoffs,
      assumptions: [
        'All values are initial test parameters from disaster_scenarios.json, not real-world operating specifications.',
        'The recommendation applies threshold rules to the conditions above, not to the scenario name.',
        'Only network reliability is adjustable; the other conditions come from the scenario.',
        'Validate the choice by comparing runs on the Experiments page.',
      ],
      factors: [
        { label: 'Connectivity', value: `${Math.round(rel * 100)}% reliable`, note: `${c.packet_loss_pct}% loss · ${c.latency_ms} ms` },
        { label: 'Controller availability', value: `${Math.round(risk * 100)}% failure risk` },
        { label: 'Task urgency', value: `index ${sc.mission.urgency_index}`, note: `${critical} critical or life-threatening tasks` },
        { label: 'Comm dead zones', value: String(sc.communication.dead_zones.length), note: `${deadTasks} tasks inside` },
        { label: 'Mission constraints', value: `${sc.mission.duration_s} s`, note: `${sc.stats.restricted_cells} no-fly cells · battery return at 20%` },
      ],
    };
  }

  private build(req: StartRequest) {
    this.stopTimer(); this.saveRun();
    const sc = scenarioOf(req.scenario_id);
    this.req = req;
    this.engine = new Engine({ scenario: sc, truth: truthOf(sc.scenario_id), mode: req.mode, seed: req.seed, params: req.params, failureScenarios: FAILURE_SCENARIOS });
    this.runId = `run-${Date.now().toString(36)}`;
    this.status = 'idle'; this.speed = req.speed; this.saved = false; this.series = []; this.startedAt = new Date().toISOString();
  }
  private snapshot(): SimState { return this.engine!.getState(this.runId, this.status); }
  private emit(): SimState | null {
    if (!this.engine) { this.handlers.forEach((h) => h.onState(null)); return null; }
    const s = this.snapshot();
    this.handlers.forEach((h) => h.onState(s));
    this.engine.drainEvents().forEach((e) => this.handlers.forEach((h) => h.onEvent(e)));
    return s;
  }
  private startTimer() { this.stopTimer(); this.timer = window.setInterval(() => this.tick(), Math.max(40, 500 / this.speed)); }
  private stopTimer() { if (this.timer !== null) { window.clearInterval(this.timer); this.timer = null; } }
  private tick() {
    if (!this.engine) return;
    this.engine.step();
    this.series.push(this.engine.historyPoint());
    if (this.engine.finished) {
      this.status = 'completed'; this.stopTimer(); this.engine.emit('success', 'mission', `Mission finished at t=${this.engine.now}s`);
      this.saveRun();
    }
    this.emit();
  }
  private saveRun() {
    if (!this.engine || !this.req || this.saved || this.engine.tick === 0) return;
    this.saved = true;
    const sc = scenarioOf(this.req.scenario_id);
    const run: RunDetail = {
      run_id: this.runId, scenario_id: sc.scenario_id, scenario_name: sc.name, mode: this.req.mode, seed: this.req.seed,
      failure_scenario: this.req.params.failure_scenario, status: this.status === 'completed' ? 'completed' : 'aborted', started_at: this.startedAt,
      duration_s: this.engine.now, metrics: this.engine.metrics(), events: this.engine.allEvents().slice(-500), series: this.series.slice(-400),
    };
    save(RUNS_KEY, [run, ...load<RunDetail>(RUNS_KEY)].slice(0, 25));
  }

  async loadScenario(req: StartRequest) { this.build(req); return this.emit() as SimState; }
  async start(req: StartRequest) {
    this.build(req); this.status = 'running';
    this.engine!.emit('info', 'mission', `Mission started: ${scenarioOf(req.scenario_id).name}, ${req.mode} coordination, seed ${req.seed}`);
    const s = this.emit() as SimState;
    this.startTimer();
    return s;
  }
  private cur(): Ctl { return this.engine ? Promise.resolve(this.emit() as SimState) : Promise.resolve(undefined); }
  async pause(): Ctl { if (this.status === 'running') { this.status = 'paused'; this.stopTimer(); } return this.cur(); }
  async resume(): Ctl { if (this.engine && this.status === 'paused') { this.status = 'running'; this.startTimer(); } return this.cur(); }
  async reset(): Ctl { if (!this.req) return; this.build(this.req); return this.emit() as SimState; }
  async setSpeed(speed: number): Ctl { this.speed = speed; if (this.status === 'running') this.startTimer(); }
  async injectFailure(req: { type: FailureType; drone_ids?: string[] }): Ctl { this.engine?.inject(req.type, req.drone_ids); return this.cur(); }
  async restore(req: { target: RestoreTarget; drone_ids?: string[] }): Ctl { this.engine?.restore(req.target, req.drone_ids); return this.cur(); }
  async detectionAction(id: string, action: DetectionAction): Ctl { this.engine?.detectionAction(id, action); return this.cur(); }

  async listRuns(): Promise<RunSummary[]> { this.saveRun(); return load<RunDetail>(RUNS_KEY).map(({ events: _e, series: _s, ...r }) => r); }
  async getRun(id: string): Promise<RunDetail> {
    const r = load<RunDetail>(RUNS_KEY).find((x) => x.run_id === id);
    if (!r) throw new Error(`Run ${id} not found`);
    return r;
  }
  async runExperiment(req: { scenario_id: string; seed: number; params: ScenarioParams }): Promise<ExperimentResult> {
    await new Promise((r) => setTimeout(r, 60));
    const sc = scenarioOf(req.scenario_id);
    const fsId = req.params.failure_scenario === 'manual' ? 'multi_failure' : req.params.failure_scenario;
    const params = { ...req.params, failure_scenario: fsId };
    const results = {} as ExperimentResult['results'];
    for (const mode of MODES) results[mode] = runHeadless({ scenario: sc, truth: truthOf(sc.scenario_id), mode, seed: req.seed, params, failureScenarios: FAILURE_SCENARIOS });
    const exp: ExperimentResult = {
      id: `exp-${Date.now().toString(36)}`, created_at: new Date().toISOString(), scenario_id: sc.scenario_id, scenario_name: sc.name, seed: req.seed,
      failure_scenario: fsId, schedule: describeSchedule(FAILURE_SCENARIOS.find((f) => f.id === fsId)), horizon_s: sc.mission.duration_s, results,
    };
    save(EXP_KEY, [exp, ...load<ExperimentResult>(EXP_KEY)].slice(0, 10));
    return exp;
  }
  async listExperiments() { return load<ExperimentResult>(EXP_KEY); }

  subscribe(h: Handlers) {
    this.handlers.add(h);
    h.onConnection('connected');
    if (this.engine) h.onState(this.snapshot());
    return () => { this.handlers.delete(h); };
  }
}

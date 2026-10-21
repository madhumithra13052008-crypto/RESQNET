import type {
  Catalog, ExperimentResult, FailureScenario, FailureType, Recommendation, RestoreTarget, RunDetail, RunSummary,
  ScenarioParams, SimEvent, SimState, StartRequest,
} from '../types';

export interface Handlers {
  onState: (s: SimState | null) => void;
  onEvent: (e: SimEvent) => void;
  onConnection: (c: 'connected' | 'connecting' | 'offline') => void;
}
export interface HealthInfo { status: string; database?: string; version?: string; engine?: string }
export type Ctl = Promise<SimState | void>;
export type DetectionAction = 'assign' | 'dismiss';

/** Everything the UI needs from the backend. Implemented by RealClient (FastAPI) and MockClient (browser). */
export interface SimApi {
  health(): Promise<HealthInfo>;
  getCatalog(): Promise<Catalog>; // disaster_scenarios.json without any ground_truth
  listFailureScenarios(): Promise<FailureScenario[]>;
  analyze(req: { scenario_id: string; params: ScenarioParams }): Promise<Recommendation>;
  loadScenario(req: StartRequest): Promise<SimState>;
  start(req: StartRequest): Promise<SimState>;
  pause(): Ctl;
  resume(): Ctl;
  reset(): Ctl;
  setSpeed(speed: number): Ctl;
  injectFailure(req: { type: FailureType; drone_ids?: string[] }): Ctl;
  restore(req: { target: RestoreTarget; drone_ids?: string[] }): Ctl;
  /** assign: dispatch a drone to verify. The backend alone decides confirmed/dismissed and emits the event. */
  detectionAction(id: string, action: DetectionAction): Ctl;
  listRuns(): Promise<RunSummary[]>;
  getRun(id: string): Promise<RunDetail>;
  runExperiment(req: { scenario_id: string; seed: number; params: ScenarioParams }): Promise<ExperimentResult>;
  listExperiments(): Promise<ExperimentResult[]>;
  subscribe(h: Handlers): () => void;
}

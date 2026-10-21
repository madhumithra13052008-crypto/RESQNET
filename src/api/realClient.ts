import axios, { AxiosInstance } from 'axios';
import type { Ctl, DetectionAction, Handlers, HealthInfo, SimApi } from './contract';
import type {
  Catalog, ExperimentResult, FailureScenario, FailureType, Recommendation, RestoreTarget, RunDetail, RunSummary, ScenarioParams,
  SimEvent, SimState, StartRequest,
} from '../types';

/** Talks to the FastAPI backend. REST under {apiUrl}/api, live updates over a WebSocket. */
export class RealClient implements SimApi {
  private http: AxiosInstance;
  constructor(apiUrl: string, private wsUrl: string) {
    this.http = axios.create({ baseURL: `${apiUrl.replace(/\/$/, '')}/api`, timeout: 15000 });
    this.http.interceptors.response.use(
      (r) => r,
      (err) => {
        const detail = err?.response?.data?.detail;
        const msg = typeof detail === 'string' ? detail : err?.response ? `Backend returned ${err.response.status}` : 'Cannot reach the backend. Check the API URL in Settings.';
        return Promise.reject(new Error(msg));
      },
    );
  }
  private async ctl(path: string, body?: unknown): Ctl {
    const { data } = await this.http.post(path, body ?? {});
    return data && typeof data === 'object' && 'run_id' in data ? (data as SimState) : undefined;
  }
  async health(): Promise<HealthInfo> { return (await this.http.get('/health')).data; }
  async getCatalog(): Promise<Catalog> { return (await this.http.get('/scenarios')).data; }
  async listFailureScenarios(): Promise<FailureScenario[]> { return (await this.http.get('/failure-scenarios')).data; }
  async analyze(req: { scenario_id: string; params: ScenarioParams }): Promise<Recommendation> { return (await this.http.post('/analyze', req)).data; }
  async loadScenario(req: StartRequest): Promise<SimState> { return (await this.http.post('/simulation/load', req)).data; }
  async start(req: StartRequest): Promise<SimState> { return (await this.http.post('/simulation/start', req)).data; }
  pause() { return this.ctl('/simulation/pause'); }
  resume() { return this.ctl('/simulation/resume'); }
  reset() { return this.ctl('/simulation/reset'); }
  setSpeed(speed: number) { return this.ctl('/simulation/speed', { speed }); }
  injectFailure(req: { type: FailureType; drone_ids?: string[] }) { return this.ctl('/simulation/failure', req); }
  restore(req: { target: RestoreTarget; drone_ids?: string[] }) { return this.ctl('/simulation/restore', req); }
  detectionAction(id: string, action: DetectionAction) { return this.ctl(`/detections/${encodeURIComponent(id)}/${action}`); }
  async listRuns(): Promise<RunSummary[]> { return (await this.http.get('/runs')).data; }
  async getRun(id: string): Promise<RunDetail> { return (await this.http.get(`/runs/${encodeURIComponent(id)}`)).data; }
  async runExperiment(req: { scenario_id: string; seed: number; params: ScenarioParams }): Promise<ExperimentResult> {
    return (await this.http.post('/experiments', req, { timeout: 120000 })).data;
  }
  async listExperiments(): Promise<ExperimentResult[]> { return (await this.http.get('/experiments')).data; }

  subscribe(h: Handlers) {
    let ws: WebSocket | null = null, closed = false, retry = 0, timer: number | undefined;
    const open = () => {
      h.onConnection('connecting');
      try { ws = new WebSocket(this.wsUrl); } catch { h.onConnection('offline'); return; }
      ws.onopen = () => { retry = 0; h.onConnection('connected'); };
      ws.onmessage = (m) => {
        try {
          const msg = JSON.parse(m.data as string);
          if (msg.type === 'state' || msg.type === 'snapshot') h.onState(msg.data as SimState);
          else if (msg.type === 'event') h.onEvent(msg.data as SimEvent);
          else if (msg.type === 'events') (msg.data as SimEvent[]).forEach(h.onEvent);
        } catch { /* ignore malformed frames */ }
      };
      ws.onclose = () => {
        if (closed) return;
        h.onConnection('offline');
        timer = window.setTimeout(open, Math.min(8000, 800 * 2 ** retry++));
      };
      ws.onerror = () => ws?.close();
    };
    open();
    return () => { closed = true; window.clearTimeout(timer); ws?.close(); };
  }
}

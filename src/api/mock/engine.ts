// Deterministic browser-side simulation driven by disaster_scenarios.json. It implements the same contract as the
// FastAPI backend so the UI can be built and demonstrated without it. Everything is computed tick by tick.
// ground_truth (candidate_detections[].ground_truth) is used ONLY here, to decide verification outcomes, and is never exposed.
import type {
  CandidateDef, CellState, CoordinationMode, Detection, Drone, DroneStatus, FailureEvent, FailureScenario, FailureType, HistoryPoint,
  Metrics, RestoreTarget, RunStatus, Scenario, ScenarioParams, Severity, SimEvent, SimState, Task, TaskDef, VerificationStatus, ZoneState,
} from '../../types';

export interface EngineConfig {
  scenario: Scenario; truth: Record<string, boolean>; mode: CoordinationMode; seed: number;
  params: ScenarioParams; failureScenarios: FailureScenario[];
}
interface Claim { drone: string; vis: Set<string> }
interface ITask { def: TaskDef; req: number; need: number; progress: number; done: boolean; claims: Claim[]; conflictAge: number; prev: string | null; overdue: boolean; started: boolean }
interface ICand { def: CandidateDef; cell: number; revealed: boolean; at: number; by: string; status: VerificationStatus; verifier: string | null; waited: number; truth: boolean; everAssigned: boolean }
interface IDrone {
  id: string; x: number; y: number; hx: number; hy: number; battery: number; group: number;
  connected: boolean; failed: boolean; isolated: boolean; silent: number; unreachable: number; dropout: number; wasLost: boolean; inDead: boolean;
  task: string | null; sweep: number | null; verifying: string | null; local: boolean; returning: boolean; aware: boolean;
  lastUpdate: number; lastLinked: number | null; status: DroneStatus;
}

const DIRS: [number, number][] = [[0, -1], [1, 0], [0, 1], [-1, 0]];
const DRAIN_MOVE = 0.45, DRAIN_WORK = 0.15, LOW_BATTERY = 20, VERIFY_TICKS = 4, ORPHAN_TICKS = 5;
const HAZARD_AT_S = 180; // scripted geofence update (a critical no-fly zone grows); engine feature, not part of the dataset

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const describeSchedule = (fs: FailureScenario | undefined) =>
  (fs?.events ?? []).map((e) => (e.action === 'inject' ? `t=${e.t_s}s inject ${e.type!.replace(/_/g, ' ')}${e.drone_ids ? ` (${e.drone_ids.join(',')})` : ''}` : `t=${e.t_s}s restore ${e.target}`));

export class Engine {
  cfg: EngineConfig; sc: Scenario; W: number; H: number; tickS: number; durationS: number;
  tick = 0; now = 0; mode: CoordinationMode;
  rand: () => number; linkRand: () => number;
  blocked: Uint8Array; // 0 free, 1 blocked, 2 restricted, 3 geofence expansion
  dead: Uint8Array; searched: Uint8Array;
  drones: IDrone[] = []; tasks: ITask[] = []; cands: ICand[] = [];
  hazardCells: number[] = []; hazardActive = false; hazardSince = 0; hazardZone = '';
  controllerOnline = true; partitioned = false; lossy = false;
  failStart: number | null = null; affected = false; recovered = false; recoveryTimes: number[] = [];
  messages = 0; duplicates = 0; safety = 0; completionTick: number | null = null; idleStreak = 0; verifs = 0;
  private events: SimEvent[] = []; private pending: SimEvent[] = []; private nextEvent = 1;
  private schedule: FailureEvent[]; private si = 0;

  constructor(cfg: EngineConfig) {
    this.cfg = cfg; const sc = (this.sc = cfg.scenario);
    this.W = sc.grid.width; this.H = sc.grid.height; this.mode = cfg.mode;
    this.tickS = sc.mission.tick_s; this.durationS = sc.mission.duration_s;
    const N = this.W * this.H, W = this.W;
    this.rand = rng(cfg.seed * 104729 + 7); this.linkRand = rng(cfg.seed * 31 + 5);
    const world = rng(cfg.seed * 7919 + 13);
    this.blocked = new Uint8Array(N); this.dead = new Uint8Array(N); this.searched = new Uint8Array(N);
    sc.grid.initial_cell_grid.forEach((row, y) => [...row].forEach((ch, x) => { this.blocked[y * W + x] = ch === '#' ? 1 : ch === 'X' ? 2 : 0; }));
    sc.communication.dead_zones.forEach((z) => { for (let y = z.bounds.y0; y <= z.bounds.y1; y++) for (let x = z.bounds.x0; x <= z.bounds.x1; x++) this.dead[y * W + x] = 1; });
    this.schedule = [...(cfg.failureScenarios.find((f) => f.id === cfg.params.failure_scenario)?.events ?? [])].sort((a, b) => a.t_s - b.t_s);

    // tasks and candidate detections come straight from the dataset
    this.tasks = sc.tasks.map((t) => ({ def: t, req: t.required_drones, need: Math.ceil(t.est_duration_s / this.tickS), progress: 0, done: false, claims: [], conflictAge: 0, prev: null, overdue: false, started: false }));
    this.cands = sc.candidate_detections.map((c) => ({ def: c, cell: c.y * W + c.x, revealed: false, at: 0, by: '', status: 'unverified', verifier: null, waited: 0, truth: cfg.truth[c.id] ?? false, everAssigned: false }));

    // drones start on the 6 free cells nearest the base (drone_config.json was not supplied: assumption)
    const nDrones = 6, order: number[] = [], seen = new Set<number>(), q = [sc.base.y * W + sc.base.x];
    seen.add(q[0]);
    for (let i = 0; i < q.length && order.length < nDrones; i++) {
      const c = q[i]; order.push(c);
      const x = c % W, y = (c - x) / W;
      for (const [dx, dy] of DIRS) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= W || ny >= this.H) continue;
        const nc = ny * W + nx;
        if (!seen.has(nc) && this.blocked[nc] === 0) { seen.add(nc); q.push(nc); }
      }
    }
    order.forEach((c, i) => {
      const x = c % W, y = Math.floor(c / W);
      this.drones.push({
        id: `D${i + 1}`, x, y, hx: x, hy: y, battery: 90 + Math.floor(world() * 11), group: i < nDrones / 2 ? 0 : 1,
        connected: true, failed: false, isolated: false, silent: 0, unreachable: 0, dropout: 0, wasLost: false, inDead: false,
        task: null, sweep: null, verifying: null, local: false, returning: false, aware: true, lastUpdate: 0, lastLinked: c, status: 'idle',
      });
    });
    // geofence expansion: neighbours of the first critical no-fly zone
    const rz = sc.restricted_zones.find((z) => z.severity === 'critical') ?? sc.restricted_zones[0];
    if (rz) {
      this.hazardZone = rz.id;
      const reserved = new Set<number>([...this.tasks.map((t) => t.def.y * W + t.def.x), ...this.cands.map((c) => c.cell), ...order]);
      const add = new Set<number>();
      for (const [cx, cy] of rz.cells) for (const [dx, dy] of DIRS) {
        const nx = cx + dx, ny = cy + dy;
        if (nx < 0 || ny < 0 || nx >= W || ny >= this.H) continue;
        const nc = ny * W + nx;
        if (this.blocked[nc] === 0 && !reserved.has(nc) && add.size < 8) add.add(nc);
      }
      this.hazardCells = [...add];
    }
    this.drones.forEach((d) => this.markSearched(d));
  }

  // ---------- helpers ----------
  idx(x: number, y: number) { return y * this.W + x; }
  task(id: string) { return this.tasks.find((t) => t.def.id === id); }
  cand(id: string) { return this.cands.find((c) => c.def.id === id); }
  drone(id: string) { return this.drones.find((d) => d.id === id)!; }
  sector(x: number, y: number) { return `${String.fromCharCode(65 + x)}${y + 1}`; }
  emit(severity: Severity, type: string, message: string, drone_id: string | null = null) {
    const e: SimEvent = { id: this.nextEvent++, t: this.now, severity, type, drone_id, message };
    this.events.push(e); this.pending.push(e);
  }
  drainEvents() { const p = this.pending; this.pending = []; return p; }
  allEvents() { return this.events; }
  reliability() { return this.cfg.params.network_reliability * (this.lossy ? 0.5 : 1); }
  lossPct() { return this.lossy ? 40 : this.sc.communication.conditions.packet_loss_pct; }
  peerKey(d: IDrone) { return d.failed ? `X${d.id}` : d.isolated ? `S${d.id}` : this.partitioned ? `G${d.group}` : 'ALL'; }
  commKey(d: IDrone) {
    if (this.mode === 'centralized') return d.connected ? 'C' : `S${d.id}`;
    if (this.mode === 'hybrid') return d.connected ? 'C' : this.peerKey(d);
    return this.peerKey(d);
  }
  get finished() {
    const done = this.tasks.every((t) => t.done);
    return this.now >= this.durationS || (done && (this.metrics().coverage >= 95 || (this.idleStreak >= 8 && this.controllerOnline && !this.partitioned)));
  }

  // ---------- path finding ----------
  passable(d: IDrone, c: number, cur: number) { const b = this.blocked[c]; return b === 0 || c === cur || (b === 3 && !d.aware); }
  bfs(d: IDrone, src: number) {
    const W = this.W, H = this.H, dist = new Int16Array(W * H).fill(-1), cur = d.y * W + d.x, q = [src];
    dist[src] = 0;
    for (let i = 0; i < q.length; i++) {
      const c = q[i], x = c % W, y = (c - x) / W;
      for (const [dx, dy] of DIRS) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const nc = ny * W + nx;
        if (dist[nc] !== -1 || !this.passable(d, nc, cur)) continue;
        dist[nc] = dist[c] + 1; q.push(nc);
      }
    }
    return dist;
  }

  // ---------- main tick ----------
  step() {
    this.tick++; this.now = this.tick * this.tickS;
    this.runSchedule();
    if (!this.hazardActive && this.now >= HAZARD_AT_S && this.hazardCells.length) this.activateHazard();
    this.updateConnectivity();
    if (this.hazardActive) this.spreadAwareness();
    if (this.mode !== 'centralized') this.gossip();
    this.detectFailures();
    this.resolveConflicts();
    for (const c of this.cands) if (c.status === 'verification_assigned' && !c.verifier) this.dispatchVerifier(c);
    for (const d of this.drones) this.actDrone(d);
    this.workTasks();
    this.checkDeadlines();
    this.updateStatus();
    this.trackRecovery();
    this.countMessages();
    const alive = this.drones.filter((d) => !d.failed);
    this.idleStreak = alive.every((d) => d.task === null && d.sweep === null && d.verifying === null && !d.returning) ? this.idleStreak + 1 : 0;
    if (this.completionTick === null && this.tasks.every((k) => k.done)) { this.completionTick = this.now; this.emit('success', 'mission', `All ${this.tasks.length} search tasks completed at t=${this.now}s`); }
  }

  runSchedule() {
    while (this.si < this.schedule.length && this.schedule[this.si].t_s <= this.now) {
      const s = this.schedule[this.si++];
      if (s.action === 'inject') this.inject(s.type!, s.drone_ids); else this.restore(s.target!, s.drone_ids);
    }
  }
  updateConnectivity() {
    const hub = this.sc.communication.hub, rel = this.cfg.params.network_reliability;
    for (const d of this.drones) {
      const r = this.linkRand(); // consumed for every drone every tick so the link weather is identical in every mode
      if (d.failed) { d.silent++; d.connected = false; d.unreachable = 0; d.inDead = false; continue; }
      d.silent = 0;
      if (d.dropout > 0) d.dropout--; else if (r < (1 - rel) * 0.03) d.dropout = 2 + (Math.floor(r * 1000) % 3);
      const c = d.y * this.W + d.x, dead = this.dead[c] === 1;
      if (dead !== d.inDead) {
        d.inDead = dead;
        const dz = this.sc.communication.dead_zones.find((z) => d.x >= z.bounds.x0 && d.x <= z.bounds.x1 && d.y >= z.bounds.y0 && d.y <= z.bounds.y1);
        if (dead) this.emit('warning', 'comms', `${d.id} entered comm dead zone ${dz?.id ?? ''} - controller link lost`, d.id);
        else this.emit('info', 'comms', `${d.id} left the comm dead zone - link can recover`, d.id);
      }
      const inRange = Math.hypot(d.x - hub.x, d.y - hub.y) <= hub.range_cells;
      d.connected = !d.isolated && this.controllerOnline && !(this.partitioned && d.group === 1) && inRange && !dead && d.dropout === 0;
      if (d.connected) { d.lastUpdate = this.now; d.unreachable = 0; d.lastLinked = c; } else d.unreachable++;
    }
  }
  activateHazard() {
    this.hazardCells.forEach((c) => (this.blocked[c] = 3));
    this.hazardActive = true; this.hazardSince = this.now;
    this.drones.forEach((d) => (d.aware = false));
    this.emit('warning', 'geofence', `Geofence update: no-fly zone ${this.hazardZone} expanded by ${this.hazardCells.length} cells`);
  }
  spreadAwareness() {
    for (let pass = 0; pass < 2; pass++)
      for (const d of this.drones) {
        if (d.aware || d.failed) continue;
        if (this.mode !== 'decentralized' && d.connected) { d.aware = true; continue; }
        if (this.mode !== 'centralized' && this.drones.some((o) => o.aware && !o.failed && o !== d && this.peerKey(o) === this.peerKey(d))) d.aware = true;
      }
  }
  gossip() {
    for (const t of this.tasks) {
      if (t.done) continue;
      for (const c of t.claims) {
        const cd = this.drone(c.drone);
        if (cd.failed) continue;
        for (const o of this.drones)
          if (!o.failed && !c.vis.has(o.id) && this.peerKey(o) === this.peerKey(cd) && this.rand() < this.reliability()) c.vis.add(o.id);
      }
    }
  }
  release(d: IDrone) {
    for (const t of this.tasks) {
      const had = t.claims.some((c) => c.drone === d.id);
      t.claims = t.claims.filter((c) => c.drone !== d.id);
      if (had && t.claims.length === 0) t.prev = d.id;
    }
    if (d.verifying) { const c = this.cand(d.verifying); if (c && c.verifier === d.id) c.verifier = null; }
    d.task = null; d.sweep = null; d.verifying = null;
  }
  detectFailures() {
    for (const d of this.drones) {
      if (!d.failed || d.silent < 3 || (d.task === null && d.sweep === null && d.verifying === null)) continue;
      const ctrlSees = this.mode !== 'decentralized' && this.controllerOnline;
      const peersSee = this.mode !== 'centralized' && this.drones.some((o) => !o.failed && !o.isolated && o !== d && (!this.partitioned || o.group === d.group));
      if (!ctrlSees && !peersSee) continue;
      const tid = d.task;
      this.release(d);
      this.emit('warning', 'recovery', `${d.id} unresponsive${tid ? ` - ${tid} released for reassignment` : ''} (detected by ${ctrlSees ? 'controller' : 'peers'})`, d.id);
    }
  }
  isOrphan(c: Claim) {
    const o = this.drone(c.drone);
    return o.failed || (this.mode === 'centralized' && this.controllerOnline && o.unreachable >= ORPHAN_TICKS);
  }
  resolveConflicts() {
    for (const t of this.tasks) {
      if (t.done || t.claims.length <= t.req) { t.conflictAge = 0; continue; }
      t.conflictAge++;
      const keys = new Set(t.claims.map((c) => this.commKey(this.drone(c.drone))));
      if (keys.size !== 1 || t.conflictAge < (this.mode === 'decentralized' ? 3 : 1)) continue;
      const dist = (id: string) => { const d = this.drone(id); return Math.abs(d.x - t.def.x) + Math.abs(d.y - t.def.y); };
      const sorted = [...t.claims].sort((a, b) => dist(a.drone) - dist(b.drone) || a.drone.localeCompare(b.drone));
      const keep = sorted.slice(0, t.req), drop = sorted.slice(t.req);
      for (const c of drop) { const o = this.drone(c.drone); if (o.task === t.def.id) o.task = null; }
      t.claims = keep; t.conflictAge = 0;
      this.emit('success', 'reconciliation', `Conflict on ${t.def.id} resolved: ${keep.map((c) => c.drone).join('+')} keep ownership, ${drop.map((c) => c.drone).join(', ')} released`, keep[0].drone);
    }
  }

  // ---------- drone behaviour ----------
  actDrone(d: IDrone) {
    if (d.failed) return;
    if (d.task) { const tk = this.task(d.task); if (!tk || tk.done || !tk.claims.some((c) => c.drone === d.id)) d.task = null; }
    if (d.sweep !== null && this.searched[d.sweep]) d.sweep = null;
    if (d.verifying) { const c = this.cand(d.verifying); if (!c || c.status !== 'verification_assigned' || c.verifier !== d.id) d.verifying = null; }
    if (d.connected && d.wasLost) { d.wasLost = false; this.emit('success', 'reconnection', `${d.id} reconnected to the controller`, d.id); }
    if (!d.connected) d.wasLost = true;
    if (this.mode === 'hybrid') {
      if (!d.connected && d.unreachable >= 2 && !d.local) { d.local = true; this.emit('info', 'recovery', `${d.id} lost the controller - switching to local coordination`, d.id); }
      if (d.connected && d.local) { d.local = false; this.emit('success', 'reconciliation', `${d.id} rejoined the controller - task state synchronised`, d.id); }
    }
    if (!d.returning && d.battery <= LOW_BATTERY) {
      d.returning = true; this.release(d);
      this.emit('warning', 'battery', `${d.id} battery at ${Math.round(d.battery)}% - returning to base`, d.id);
    }
    const home = this.idx(d.hx, d.hy);
    if (d.returning) {
      if (d.x === d.hx && d.y === d.hy) {
        d.battery = Math.min(100, d.battery + 5);
        if (d.battery >= 95) { d.returning = false; this.emit('info', 'battery', `${d.id} recharged and back on duty`, d.id); }
      } else this.moveToward(d, home);
      return;
    }
    if (d.verifying === null && d.task === null && d.sweep === null) this.acquire(d);
    const cur = d.y * this.W + d.x;
    let target: number | null = null;
    if (d.verifying) target = this.cand(d.verifying)!.cell;
    else if (d.task) { const tk = this.task(d.task)!; target = this.idx(tk.def.x, tk.def.y); }
    else if (d.sweep !== null) target = d.sweep;
    else if (this.mode === 'centralized' && !d.connected && d.lastLinked !== null && cur !== d.lastLinked) target = d.lastLinked; // failsafe: fly back to last linked cell
    if (target === null) { d.battery = Math.max(0, d.battery - 0.03); return; }
    this.moveToward(d, target);
    const at = d.y * this.W + d.x === target;
    if (at && d.verifying) {
      const c = this.cand(d.verifying)!;
      if (++c.waited >= VERIFY_TICKS) this.resolveVerification(d, c);
    } else if (at && d.sweep === target) d.sweep = null;
    if (at) d.battery = Math.max(0, d.battery - DRAIN_WORK);
  }
  acquire(d: IDrone) {
    const ctrl = this.mode !== 'decentralized' && d.connected;
    const local = this.mode !== 'centralized' && !ctrl;
    if (!ctrl && !local) return;
    if (ctrl && this.rand() * 100 < this.lossPct()) { this.messages++; return; }
    const dist = this.bfs(d, this.idx(d.x, d.y));
    const tk = this.pickTask(d, dist, ctrl ? 'ctrl' : 'local');
    if (tk) { this.claim(tk, d, ctrl ? 'ctrl' : 'local'); return; }
    const cell = this.pickSweep(d, dist);
    if (cell !== null) d.sweep = cell;
  }
  pickTask(d: IDrone, dist: Int16Array, via: 'ctrl' | 'local') {
    let best: ITask | null = null, bs = -1e9;
    for (const t of this.tasks) {
      if (t.done) continue;
      const dd = dist[this.idx(t.def.x, t.def.y)];
      if (dd < 0) continue;
      const region = t.def.x < this.W / 2 ? 0 : 1;
      let live = 0;
      if (via === 'ctrl') {
        live = t.claims.filter((c) => !this.isOrphan(c)).length;
        if (live >= t.req) continue;
        // hybrid: the controller leases a region to an unreachable group instead of double-assigning it
        if (this.mode === 'hybrid' && this.partitioned && d.group !== region && this.drones.some((o) => !o.failed && o.unreachable >= 2 && o.group === region)) continue;
      } else {
        const vis = t.claims.filter((c) => !this.drone(c.drone).failed && (c.drone === d.id || c.vis.has(d.id)));
        live = vis.length;
        if (vis.some((c) => c.drone === d.id) || live >= t.req) continue;
        if (this.mode === 'hybrid' && this.partitioned && region !== d.group) continue;
      }
      const urgency = Math.max(0, 6 - (t.def.deadline_s - this.now) / 40);
      const score = t.def.priority * 10 - dd + (live > 0 ? 15 : 0) + urgency;
      if (score > bs) { bs = score; best = t; }
    }
    return best;
  }
  claim(t: ITask, d: IDrone, via: 'ctrl' | 'local') {
    const vis = new Set<string>();
    if (via === 'ctrl') this.drones.forEach((o) => vis.add(o.id));
    else for (const o of this.drones) if (o !== d && !o.failed && !o.isolated && this.peerKey(o) === this.peerKey(d)) { this.messages++; if (this.rand() < this.reliability()) vis.add(o.id); }
    t.claims.push({ drone: d.id, vis });
    d.task = t.def.id; d.local = via === 'local';
    if (via === 'ctrl') { this.messages += 2; d.local = false; }
    const how = via === 'ctrl' ? 'controller' : 'local claim';
    if (t.claims.length > t.req) {
      this.duplicates++;
      this.emit('warning', 'conflict', `Duplicate assignment: ${t.def.id} claimed by ${t.claims.map((c) => c.drone).join(' and ')} (needs ${t.req})`, d.id);
    } else if (t.prev && t.prev !== d.id) {
      this.emit('info', 'handoff', `${t.def.id} reassigned ${t.prev} -> ${d.id} [${how}]`, d.id); t.prev = null;
    } else this.emit('info', 'allocation', `${t.def.id} (P${t.def.priority} ${t.def.priority_label}) assigned to ${d.id} [${how}]`, d.id);
  }
  pickSweep(d: IDrone, dist: Int16Array) {
    const key = this.commKey(d);
    let best = -1, bd = 1e9;
    for (let c = 0; c < this.W * this.H; c++) {
      if (this.searched[c] || dist[c] < 0 || dist[c] >= bd) continue;
      const b = this.blocked[c];
      if (b === 1 || b === 2 || (b === 3 && d.aware)) continue;
      if (this.drones.some((o) => o !== d && !o.failed && o.sweep === c && this.commKey(o) === key)) continue;
      best = c; bd = dist[c];
    }
    return best < 0 ? null : best;
  }
  moveToward(d: IDrone, target: number) {
    const cur = d.y * this.W + d.x;
    if (cur === target) return;
    const fd = this.bfs(d, target);
    if (fd[cur] < 0) {
      if (d.task) { const tk = this.task(d.task); if (tk) tk.claims = tk.claims.filter((c) => c.drone !== d.id); this.emit('warning', 'task', `${d.id} cannot reach ${d.task} - task released`, d.id); d.task = null; }
      else if (d.verifying) { const c = this.cand(d.verifying); if (c) c.verifier = null; d.verifying = null; }
      else d.sweep = null;
      return;
    }
    for (const [dx, dy] of DIRS) {
      const nx = d.x + dx, ny = d.y + dy;
      if (nx < 0 || ny < 0 || nx >= this.W || ny >= this.H) continue;
      const nc = ny * this.W + nx;
      if (fd[nc] !== fd[cur] - 1 || !this.passable(d, nc, cur)) continue;
      d.x = nx; d.y = ny; d.battery = Math.max(0, d.battery - DRAIN_MOVE);
      if (this.blocked[nc] === 3) { this.safety++; d.aware = true; this.emit('error', 'safety', `Safety violation: ${d.id} entered the expanded no-fly zone before being told about it`, d.id); }
      this.markSearched(d);
      return;
    }
  }
  markSearched(d: IDrone) {
    const c = d.y * this.W + d.x, b = this.blocked[c];
    if (b === 1 || b === 2 || this.searched[c]) return;
    this.searched[c] = 1;
    for (const cd of this.cands) {
      if (cd.cell !== c || cd.revealed) continue; // reveal_condition: cell_searched
      cd.revealed = true; cd.at = this.now; cd.by = d.id;
      this.emit('warning', 'detection', `Possible person detected in Sector ${cd.def.sector} (${Math.round(cd.def.confidence * 100)}%) - awaiting verification`, d.id);
    }
  }
  workTasks() {
    for (const t of this.tasks) {
      if (t.done) continue;
      const present = t.claims.map((c) => this.drone(c.drone)).filter((o) => !o.failed && !o.returning && o.x === t.def.x && o.y === t.def.y);
      if (present.length < t.req) continue;
      if (!t.started) { t.started = true; this.emit('info', 'task', `${t.def.id} work started (${present.map((o) => o.id).join(', ')})`, present[0].id); }
      if (++t.progress >= t.need) {
        t.done = true;
        const who = t.claims.map((c) => c.drone);
        t.claims.forEach((c) => { const o = this.drone(c.drone); if (o.task === t.def.id) o.task = null; });
        t.claims = [];
        this.searched[this.idx(t.def.x, t.def.y)] = 1;
        this.emit('success', 'task', `${t.def.id} ${t.def.type.replace(/_/g, ' ')} completed by ${who.join('+')}${t.overdue ? ' (after deadline)' : ''}`, who[0]);
      }
    }
  }
  checkDeadlines() {
    for (const t of this.tasks) if (!t.done && !t.overdue && this.now > t.def.deadline_s) { t.overdue = true; this.emit('warning', 'task', `${t.def.id} (P${t.def.priority}) missed its ${t.def.deadline_s}s deadline`); }
  }

  // ---------- verification (detection_verification_statuses) ----------
  dispatchVerifier(c: ICand) {
    const cands = this.drones.filter((d) => !d.failed && !d.returning && d.task === null && d.verifying === null);
    if (!cands.length) return;
    cands.sort((a, b) => Math.abs(a.x - c.def.x) + Math.abs(a.y - c.def.y) - (Math.abs(b.x - c.def.x) + Math.abs(b.y - c.def.y)));
    const d = cands[0]; d.verifying = c.def.id; d.sweep = null; c.verifier = d.id; c.waited = 0;
    this.emit('info', 'verification', `${d.id} dispatched to verify ${c.def.id} in Sector ${c.def.sector}`, d.id);
  }
  resolveVerification(d: IDrone, c: ICand) {
    c.status = c.truth ? 'confirmed' : 'dismissed'; c.verifier = null; d.verifying = null;
    if (c.truth) this.emit('success', 'verification', `${c.def.id} CONFIRMED in Sector ${c.def.sector} by ${d.id} verification pass`, d.id);
    else this.emit('info', 'verification', `${c.def.id} dismissed: ${d.id} found no person in Sector ${c.def.sector}`, d.id);
  }
  detectionAction(id: string, action: 'assign' | 'dismiss') {
    const c = this.cand(id);
    if (!c || !c.revealed) return;
    if (action === 'assign' && c.status === 'unverified') {
      c.status = 'verification_assigned'; c.everAssigned = true; this.verifs++;
      this.emit('info', 'verification', `Verification assigned for ${c.def.id} in Sector ${c.def.sector}`);
      this.dispatchVerifier(c);
    } else if (action === 'dismiss' && (c.status === 'unverified' || c.status === 'verification_assigned')) {
      if (c.verifier) { const d = this.drone(c.verifier); d.verifying = null; }
      c.status = 'dismissed'; c.verifier = null;
      this.emit('info', 'verification', `${c.def.id} dismissed by operator without a verification pass`);
    }
  }

  // ---------- status / metrics ----------
  updateStatus() {
    for (const d of this.drones) {
      const working = d.task !== null || d.sweep !== null || d.verifying !== null;
      let s: DroneStatus;
      if (d.failed) s = 'failed';
      else if (d.returning) s = 'returning';
      else if (!d.connected && this.mode === 'centralized') s = 'disconnected';
      else if (!d.connected && this.mode === 'hybrid') s = d.local ? (working ? 'recovering' : 'idle') : 'disconnected';
      else s = working ? 'searching' : 'idle';
      d.status = s;
    }
  }
  trackRecovery() {
    if (this.failStart === null || this.recovered) return;
    const alive = this.drones.filter((d) => !d.failed);
    if (alive.some((d) => !d.connected) || this.drones.some((d) => d.failed)) this.affected = true;
    const disc = alive.filter((d) => d.status === 'disconnected').length;
    const orphan = this.tasks.filter((t) => !t.done && t.claims.length > 0 && t.claims.every((c) => this.drone(c.drone).failed)).length;
    const stillDown = !this.controllerOnline && this.mode === 'centralized';
    if (this.affected && disc === 0 && orphan === 0 && !stillDown) {
      const rt = this.now - this.failStart;
      this.recoveryTimes.push(rt); this.recovered = true;
      this.emit('success', 'recovery', `Recovery complete: coordination resumed ${rt}s after the failure`);
    }
  }
  countMessages() {
    const alive = this.drones.filter((d) => !d.failed);
    if (this.mode !== 'decentralized') this.messages += alive.filter((d) => d.connected).length;
    if (this.mode !== 'centralized' && this.tick % 2 === 0)
      for (const d of alive) if (this.mode === 'decentralized' || !d.connected) this.messages += alive.filter((o) => o !== d && !o.isolated && !d.isolated && this.peerKey(o) === this.peerKey(d)).length;
  }
  coverageStats() {
    let total = 0, cov = 0;
    for (let c = 0; c < this.W * this.H; c++) {
      const b = this.blocked[c];
      if (b === 1 || b === 2 || (b === 3 && this.hazardActive)) continue;
      total++; if (this.searched[c]) cov++;
    }
    return { total, cov };
  }
  metrics(): Metrics {
    const { total, cov } = this.coverageStats();
    const open = this.tasks.filter((t) => !t.done), rec = this.recoveryTimes;
    const crit = this.tasks.filter((t) => t.def.priority >= 4);
    const rev = this.cands.filter((c) => c.revealed);
    return {
      coverage: total ? Math.round((cov / total) * 1000) / 10 : 0,
      tasks_total: this.tasks.length, tasks_assigned: open.filter((t) => t.claims.length > 0).length, tasks_completed: this.tasks.length - open.length,
      critical_total: crit.length, critical_completed: crit.filter((t) => t.done).length,
      deadlines_missed: this.tasks.filter((t) => t.overdue).length, areas_remaining: total - cov,
      unresolved_findings: rev.filter((c) => c.status === 'unverified' || c.status === 'verification_assigned').length,
      verifications_assigned: this.verifs, findings_confirmed: rev.filter((c) => c.status === 'confirmed').length, findings_dismissed: rev.filter((c) => c.status === 'dismissed').length,
      duplicate_assignments: this.duplicates, conflicts_active: open.filter((t) => t.claims.length > t.req).length,
      recovery_time: rec.length ? Math.round((rec.reduce((a, b) => a + b, 0) / rec.length) * 10) / 10 : null,
      time_to_complete: this.completionTick, comm_overhead: this.messages, safety_violations: this.safety,
    };
  }
  historyPoint(): HistoryPoint {
    const m = this.metrics();
    return { t: this.now, coverage: m.coverage, completed: m.tasks_total ? Math.round((m.tasks_completed / m.tasks_total) * 100) : 0, conflicts: m.conflicts_active };
  }

  // ---------- commands ----------
  inject(type: FailureType, ids: string[] = []) {
    const mark = () => { if (this.failStart === null || this.recovered) { this.failStart = this.now; this.recovered = false; this.affected = false; } };
    const targets = ids.map((i) => this.drones.find((d) => d.id === i)).filter(Boolean) as IDrone[];
    switch (type) {
      case 'controller_outage':
        if (!this.controllerOnline) return this.emit('info', 'failure', 'Central controller is already offline');
        this.controllerOnline = false; mark(); this.emit('error', 'failure', 'Central controller went offline'); break;
      case 'network_partition':
        if (this.partitioned) return this.emit('info', 'failure', 'Network is already partitioned');
        this.partitioned = true; mark();
        this.emit('error', 'failure', `Network partition: ${this.drones.filter((d) => d.group === 1).map((d) => d.id).join(', ')} separated from the controller and from ${this.drones.filter((d) => d.group === 0).map((d) => d.id).join(', ')}`); break;
      case 'packet_loss':
        this.lossy = true; this.emit('warning', 'failure', 'Heavy packet loss injected (40%): messages are being dropped'); break;
      case 'drone_disconnect':
        if (!targets.length) return this.emit('info', 'failure', 'Select a drone first');
        targets.forEach((d) => { d.isolated = true; this.emit('error', 'failure', `${d.id} lost all communication links`, d.id); }); mark(); break;
      case 'drone_failure':
        if (!targets.length) return this.emit('info', 'failure', 'Select a drone first');
        targets.forEach((d) => { d.failed = true; d.silent = 0; this.emit('error', 'failure', `${d.id} stopped responding`, d.id); }); mark(); break;
    }
  }
  restore(target: RestoreTarget, ids: string[] = []) {
    if (target === 'controller' || target === 'all') { if (!this.controllerOnline) this.emit('success', 'restoration', 'Central controller back online'); this.controllerOnline = true; }
    if (target === 'network' || target === 'all') {
      if (this.partitioned || this.lossy) this.emit('success', 'restoration', 'Network connectivity restored - reconciling task state');
      this.partitioned = false; this.lossy = false;
    }
    if (target === 'drones' || target === 'all') {
      this.drones.forEach((d) => { if (!ids.length || ids.includes(d.id)) d.isolated = false; });
      if (target === 'drones') ids.forEach((i) => { const d = this.drones.find((x) => x.id === i); if (d?.failed) { d.failed = false; this.emit('success', 'restoration', `${d.id} rebooted and responding again`, d.id); } });
    }
  }

  // ---------- snapshot ----------
  cellsView(): CellState[] {
    const N = this.W * this.H, out: CellState[] = new Array(N), W = this.W;
    const targeted = new Set<number>();
    this.drones.forEach((d) => {
      if (d.failed) return;
      if (d.task) { const t = this.task(d.task); if (t) targeted.add(t.def.y * W + t.def.x); }
      if (d.sweep !== null) targeted.add(d.sweep);
      if (d.verifying) targeted.add(this.cand(d.verifying)!.cell);
    });
    const taskAt = new Map<number, ITask>();
    this.tasks.forEach((t) => { if (!t.done) taskAt.set(t.def.y * W + t.def.x, t); });
    const candAt = new Map<number, ICand>();
    this.cands.forEach((c) => { if (c.revealed) candAt.set(c.cell, c); });
    for (let c = 0; c < N; c++) {
      const b = this.blocked[c], k = candAt.get(c), t = taskAt.get(c);
      if (b === 1) out[c] = 'blocked';
      else if (b === 2 || (b === 3 && this.hazardActive)) out[c] = 'restricted';
      else if (k && k.status === 'unverified') out[c] = 'priority';
      else if (k && k.status === 'verification_assigned') out[c] = 'in_progress';
      else if (t) out[c] = t.claims.length > 0 || targeted.has(c) ? 'in_progress' : t.def.priority >= 4 ? 'priority' : this.searched[c] ? 'searched' : 'unexplored';
      else if (targeted.has(c)) out[c] = 'in_progress';
      else out[c] = this.searched[c] ? 'searched' : 'unexplored';
    }
    return out;
  }
  zoneStates(): ZoneState[] {
    return this.sc.zones.map((z) => {
      let free = 0, s = 0;
      for (let y = z.bounds.y0; y <= z.bounds.y1; y++) for (let x = z.bounds.x0; x <= z.bounds.x1; x++) {
        const c = y * this.W + x, b = this.blocked[c];
        if (b === 1 || b === 2 || (b === 3 && this.hazardActive)) continue;
        free++; if (this.searched[c]) s++;
      }
      return {
        zone_id: z.zone_id, free_cells: free, searched_cells: s, coverage_pct: free ? Math.round((s / free) * 100) : 100,
        open_tasks: this.tasks.filter((t) => !t.done && t.def.zone_id === z.zone_id).length,
        unresolved_findings: this.cands.filter((c) => c.revealed && c.def.zone_id === z.zone_id && (c.status === 'unverified' || c.status === 'verification_assigned')).length,
      };
    });
  }
  getState(runId: string, status: RunStatus): SimState {
    const tasks: Task[] = this.tasks.map((t) => {
      const present = t.claims.filter((c) => { const o = this.drone(c.drone); return o.x === t.def.x && o.y === t.def.y; }).length;
      return {
        ...t.def, assigned_to: t.claims.map((c) => c.drone), progress: Math.min(1, t.progress / t.need), overdue: t.overdue,
        status: t.done ? 'completed' : t.claims.length > t.req ? 'conflict' : t.progress > 0 || present > 0 ? 'in_progress' : t.claims.length ? 'assigned' : 'pending',
      };
    });
    const groups: Record<string, string[]> = {};
    this.drones.filter((d) => !d.failed).forEach((d) => (groups[this.peerKey(d)] ??= []).push(d.id));
    const m = this.metrics(), cc = this.sc.communication.conditions;
    const detections: Detection[] = this.cands.filter((c) => c.revealed).map((c) => ({
      id: c.def.id, x: c.def.x, y: c.def.y, sector: c.def.sector, zone_id: c.def.zone_id, evidence_image_id: c.def.evidence_image_id,
      confidence: c.def.confidence, verification_status: c.status, cv_payload: c.def.cv_payload, detected_at: c.at, detected_by: c.by, verifier: c.verifier, source: 'simulated_observation',
    }));
    const drones: Drone[] = this.drones.map((d) => ({
      id: d.id, x: d.x, y: d.y, battery: Math.round(d.battery * 10) / 10, status: d.status, connected: d.connected, in_dead_zone: d.inDead,
      task_id: d.task, verifying: d.verifying, last_update: d.lastUpdate, group: d.group,
    }));
    return {
      run_id: runId, scenario_id: this.sc.scenario_id, mode: this.mode, status, seed: this.cfg.seed, tick: this.tick, time: this.now, duration_s: this.durationS,
      grid: { width: this.W, height: this.H }, cells: this.cellsView(), drones, tasks, detections, zones: this.zoneStates(),
      network: {
        controller_online: this.controllerOnline, partitioned: this.partitioned, packet_loss_pct: this.lossPct(), network_reliability: this.cfg.params.network_reliability,
        latency_ms: cc.latency_ms, converged: m.conflicts_active === 0,
        recovery: this.failStart === null ? 'none' : this.recovered ? 'recovered' : 'in_progress', groups: Object.values(groups),
      },
      geofence: { active: this.hazardActive, since: this.hazardSince, zone_id: this.hazardZone, cells: this.hazardCells.map((c) => [c % this.W, Math.floor(c / this.W)] as [number, number]) },
      metrics: m,
    };
  }
}

export interface HeadlessResult { metrics: Metrics; series: { t: number; coverage: number; completed: number }[] }
export function runHeadless(cfg: EngineConfig): HeadlessResult {
  const e = new Engine(cfg), series: HeadlessResult['series'] = [];
  const ticks = Math.floor(e.durationS / e.tickS);
  for (let i = 0; i < ticks; i++) {
    e.step();
    if (e.tick % 5 === 0) { const h = e.historyPoint(); series.push({ t: h.t, coverage: h.coverage, completed: h.completed }); }
  }
  return { metrics: e.metrics(), series };
}

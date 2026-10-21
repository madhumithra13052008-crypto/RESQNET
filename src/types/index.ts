// Shared contract, aligned with disaster_scenarios.json (contract_version 1.0).
// Coordinates: origin top-left, x = column 0-19, y = row 0-19. Sector label = column letter + row number (x=1,y=3 -> B4).
export type CoordinationMode = 'centralized' | 'decentralized' | 'hybrid';
export type DroneStatus = 'searching' | 'idle' | 'disconnected' | 'recovering' | 'returning' | 'failed';
export type CellState = 'unexplored' | 'in_progress' | 'searched' | 'blocked' | 'priority' | 'restricted';
export type VerificationStatus = 'unverified' | 'verification_assigned' | 'confirmed' | 'dismissed';
export type TaskStatus = 'pending' | 'assigned' | 'in_progress' | 'completed' | 'conflict';
export type RunStatus = 'idle' | 'running' | 'paused' | 'completed';
export type Severity = 'info' | 'success' | 'warning' | 'error';
export type FailureType = 'controller_outage' | 'network_partition' | 'packet_loss' | 'drone_disconnect' | 'drone_failure';
export type RestoreTarget = 'controller' | 'network' | 'drones' | 'all';
export type DisasterType = 'earthquake' | 'cyclone' | 'flood';
export type Cell2 = [number, number];
export interface Bounds { x0: number; y0: number; x1: number; y1: number }

// ---------- static scenario data (from disaster_scenarios.json) ----------
export interface Obstacle { id: string; type: string; cells: Cell2[] }
export interface RestrictedZone { id: string; type: string; severity: 'high' | 'critical'; no_fly: boolean; bounds: Bounds; cells: Cell2[]; reason: string }
export interface DeadZone { id: string; cause: string; bounds: Bounds }
export interface Zone { zone_id: string; bounds: Bounds; sector_range: string; priority_level: number; free_cell_count: number; hazard_cell_count: number; simulated_risk_score: number }
export interface TaskDef {
  id: string; type: string; x: number; y: number; sector: string; zone_id: string; priority: number; priority_label: string;
  deadline_s: number; est_duration_s: number; required_drones: number; in_comm_dead_zone: boolean;
}
export interface CvPayload { image_id: string; detections: { label: string; confidence: number; bbox: [number, number, number, number] }[] }
export interface CandidateDef {
  id: string; x: number; y: number; sector: string; zone_id: string; reveal_condition: string; evidence_image_id: string;
  confidence: number; verification_status: VerificationStatus; cv_payload: CvPayload;
}
export interface Scenario {
  scenario_id: string; name: string; disaster_type: DisasterType; description: string; seed: number;
  grid: { width: number; height: number; cell_size_m: number; initial_cell_grid: string[] };
  base: { x: number; y: number; sector: string };
  communication: {
    hub: { x: number; y: number; range_cells: number };
    dead_zones: DeadZone[];
    conditions: { network_reliability: number; packet_loss_pct: number; latency_ms: number; controller_failure_risk: number };
  };
  mission: { duration_s: number; tick_s: number; urgency_index: number };
  obstacles: Obstacle[]; blocked_cells: Cell2[]; restricted_zones: RestrictedZone[]; restricted_cells: Cell2[];
  zones: Zone[]; tasks: (TaskDef & { status: string; assigned_to: string | null })[]; candidate_detections: CandidateDef[];
  bridges?: { id: string; cells: Cell2[] }[];
  geo?: { lat: number; lng: number };
  stats: { blocked_cells: number; restricted_cells: number; free_cells: number; inaccessible_pocket_cells: number; task_count: number; tasks_by_priority: Record<string, number>; detection_count: number };
}
export interface CatalogMeta {
  name: string; version: string; contract_version: string; coordinate_system: string; movement_model: string;
  units: Record<string, string>; modes: CoordinationMode[]; cell_states: string[]; map_legend: Record<string, string>;
  priority_scale: Record<string, string>; detection_verification_statuses: VerificationStatus[]; detection_note: string;
  zone_scheme: string; synthetic_data_notice: string;
  adjustable_parameters: { network_reliability: { min: number; max: number; step: number } };
}
export interface Catalog { meta: CatalogMeta; scenarios: Scenario[] }

export interface FailureEvent { t_s: number; action: 'inject' | 'restore'; type?: FailureType; target?: RestoreTarget; drone_ids?: string[] }
export interface FailureScenario { id: string; name: string; description: string; events: FailureEvent[] }

// ---------- live state ----------
export interface Drone {
  id: string; // "D1".."D6"
  x: number; y: number;
  battery: number; // %
  status: DroneStatus;
  connected: boolean; // link to the central controller
  in_dead_zone: boolean;
  task_id: string | null;
  verifying: string | null;
  last_update: number; // mission seconds of last controller contact
  group: number;
}
export interface Task extends TaskDef {
  status: TaskStatus;
  assigned_to: string[];
  progress: number; // 0-1
  overdue: boolean;
}
export interface Detection {
  id: string; x: number; y: number; sector: string; zone_id: string; evidence_image_id: string; confidence: number;
  verification_status: VerificationStatus; cv_payload: CvPayload; detected_at: number; detected_by: string;
  verifier: string | null; source: string;
}
export interface ZoneState { zone_id: string; coverage_pct: number; searched_cells: number; free_cells: number; open_tasks: number; unresolved_findings: number }
export interface NetworkState {
  controller_online: boolean; partitioned: boolean; packet_loss_pct: number; network_reliability: number; latency_ms: number;
  converged: boolean; recovery: 'none' | 'in_progress' | 'recovered'; groups: string[][];
}
export interface Metrics {
  coverage: number; tasks_total: number; tasks_assigned: number; tasks_completed: number; critical_total: number; critical_completed: number;
  deadlines_missed: number; areas_remaining: number; unresolved_findings: number; verifications_assigned: number;
  findings_confirmed: number; findings_dismissed: number; duplicate_assignments: number; conflicts_active: number;
  recovery_time: number | null; time_to_complete: number | null; comm_overhead: number; safety_violations: number;
}
export interface SimEvent { id: number; t: number; severity: Severity; type: string; drone_id?: string | null; message: string }
export interface Geofence { active: boolean; since: number; cells: Cell2[]; zone_id: string }
export interface SimState {
  run_id: string; scenario_id: string; mode: CoordinationMode; status: RunStatus; seed: number;
  tick: number; time: number; duration_s: number;
  grid: { width: number; height: number };
  cells: CellState[]; // row-major
  drones: Drone[]; tasks: Task[]; detections: Detection[]; zones: ZoneState[];
  network: NetworkState; geofence: Geofence; metrics: Metrics;
}
export interface ScenarioParams { network_reliability: number; failure_scenario: string }
export interface StartRequest { scenario_id: string; mode: CoordinationMode; seed: number; speed: number; params: ScenarioParams }
export interface Recommendation {
  mode: CoordinationMode; reasons: string[]; tradeoffs: string[]; assumptions: string[];
  factors: { label: string; value: string; note?: string }[];
}
export interface HistoryPoint { t: number; coverage: number; completed: number; conflicts: number }
export interface RunSummary {
  run_id: string; scenario_id: string; scenario_name: string; mode: CoordinationMode; seed: number;
  failure_scenario: string; status: 'completed' | 'aborted'; started_at: string; duration_s: number; metrics: Metrics;
}
export interface RunDetail extends RunSummary { events: SimEvent[]; series: HistoryPoint[] }
export interface ModeResult { metrics: Metrics; series: { t: number; coverage: number; completed: number }[] }
export interface ExperimentResult {
  id: string; created_at: string; scenario_id: string; scenario_name: string; seed: number; failure_scenario: string;
  schedule: string[]; horizon_s: number; results: Record<CoordinationMode, ModeResult>;
}

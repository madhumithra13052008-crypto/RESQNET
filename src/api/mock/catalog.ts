import raw from './data/disaster_scenarios.json';
import type { Catalog, FailureScenario, Scenario } from '../../types';

type RawScenario = Omit<Scenario, 'candidate_detections'> & { candidate_detections: (Scenario['candidate_detections'][number] & { ground_truth?: { person_present: boolean } })[] };
const data = raw as unknown as { meta: Catalog['meta']; scenarios: RawScenario[] };

/** Public catalog: ground_truth is stripped (backend-only, never displayed). */
export const CATALOG: Catalog = {
  meta: data.meta,
  scenarios: data.scenarios.map((s) => ({ ...s, candidate_detections: s.candidate_detections.map(({ ground_truth: _g, ...c }) => c) })) as Scenario[],
};
/** Used only by the mock engine to decide verification outcomes. */
export const truthOf = (scenarioId: string): Record<string, boolean> => {
  const s = data.scenarios.find((x) => x.scenario_id === scenarioId);
  return Object.fromEntries((s?.candidate_detections ?? []).map((c) => [c.id, !!c.ground_truth?.person_present]));
};

// failure_scenarios.json was not supplied. These mirror the named suite in the plan (times in mission seconds).
export const FAILURE_SCENARIOS: FailureScenario[] = [
  { id: 'normal_operation', name: 'Normal operation', description: 'No injected failures. Baseline allocation and coverage.', events: [] },
  { id: 'controller_failure', name: 'Controller failure', description: 'Controller offline at 60 s, restored at 140 s.', events: [
    { t_s: 60, action: 'inject', type: 'controller_outage' }, { t_s: 140, action: 'restore', target: 'controller' }] },
  { id: 'network_partition', name: 'Network partition', description: 'Network splits at 80 s and reconnects at 180 s.', events: [
    { t_s: 80, action: 'inject', type: 'network_partition' }, { t_s: 180, action: 'restore', target: 'network' }] },
  { id: 'drone_failure', name: 'Single drone failure', description: 'Drone D3 stops responding at 70 s.', events: [
    { t_s: 70, action: 'inject', type: 'drone_failure', drone_ids: ['D3'] }] },
  { id: 'packet_loss', name: 'Packet loss', description: 'Heavy packet loss from 60 s to 200 s.', events: [
    { t_s: 60, action: 'inject', type: 'packet_loss' }, { t_s: 200, action: 'restore', target: 'network' }] },
  { id: 'multi_failure', name: 'Multiple failures', description: 'Controller outage, drone failure, restore, then a partition and reconnection.', events: [
    { t_s: 40, action: 'inject', type: 'controller_outage' }, { t_s: 70, action: 'inject', type: 'drone_failure', drone_ids: ['D3'] },
    { t_s: 90, action: 'restore', target: 'controller' }, { t_s: 110, action: 'inject', type: 'network_partition' }, { t_s: 170, action: 'restore', target: 'network' }] },
];

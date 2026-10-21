import { getApi } from '../api';
import type { DetectionAction } from '../api/contract';
import type { FailureType, RestoreTarget, SimState, StartRequest } from '../types';
import { useSettingsStore } from './useSettingsStore';
import { useSimStore } from './useSimStore';

export function selectionRequest(): StartRequest {
  const s = useSettingsStore.getState();
  return { scenario_id: s.scenarioId, mode: s.mode, seed: s.seed, speed: s.speed, params: { network_reliability: s.networkReliability, failure_scenario: s.failureScenario } };
}
const msg = (e: unknown) => (e instanceof Error ? e.message : String(e));
async function guard<T>(fn: () => Promise<T>): Promise<T | undefined> {
  try { useSimStore.getState().setError(null); return await fn(); } catch (e) { useSimStore.getState().setError(msg(e)); return undefined; }
}
const apply = (s: SimState | void | undefined) => { if (s && 'run_id' in s) useSimStore.getState().setSim(s); };

export const loadScenario = () => guard(async () => { useSimStore.getState().clearRun(); apply(await getApi().loadScenario(selectionRequest())); });
export const startMission = () => guard(async () => { useSimStore.getState().clearRun(); apply(await getApi().start(selectionRequest())); });
export const pauseMission = () => guard(async () => apply(await getApi().pause()));
export const resumeMission = () => guard(async () => apply(await getApi().resume()));
export const resetMission = () => guard(async () => { useSimStore.getState().clearRun(); apply(await getApi().reset()); });
export const changeSpeed = (speed: number) => guard(async () => { useSettingsStore.getState().set({ speed }); await getApi().setSpeed(speed); });
export const injectFailure = (type: FailureType, drone_ids?: string[]) => guard(async () => apply(await getApi().injectFailure({ type, drone_ids })));
export const restoreFailure = (target: RestoreTarget, drone_ids?: string[]) => guard(async () => apply(await getApi().restore({ target, drone_ids })));
export const detectionAction = (id: string, action: DetectionAction) => guard(async () => apply(await getApi().detectionAction(id, action)));
export const analyzeScenario = () =>
  guard(async () => {
    const s = useSettingsStore.getState();
    const rec = await getApi().analyze({ scenario_id: s.scenarioId, params: selectionRequest().params });
    useSimStore.getState().setRecommendation(rec);
    if (s.modeSource !== 'manual') s.set({ mode: rec.mode, modeSource: 'recommended' });
    return rec;
  });

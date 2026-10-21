import { create } from 'zustand';
import type { Catalog, FailureScenario, HistoryPoint, Recommendation, SimEvent, SimState } from '../types';

export type Connection = 'connected' | 'connecting' | 'offline';
export type Trails = Record<string, [number, number][]>;
interface SimStore {
  sim: SimState | null; events: SimEvent[]; history: HistoryPoint[]; trails: Trails;
  connection: Connection; apiOnline: boolean; selectedDroneId: string | null; recommendation: Recommendation | null;
  catalog: Catalog | null; failureScenarios: FailureScenario[]; error: string | null; ackedAlerts: number;
  setSim: (s: SimState | null) => void; pushEvent: (e: SimEvent) => void; clearRun: () => void;
  setConnection: (c: Connection) => void; setApiOnline: (b: boolean) => void; selectDrone: (id: string | null) => void;
  setRecommendation: (r: Recommendation | null) => void; setCatalog: (c: Catalog) => void; setFailureScenarios: (f: FailureScenario[]) => void;
  setError: (e: string | null) => void; ackAlerts: (upTo: number) => void;
}
const MAX_TRAIL = 80;

export const useSimStore = create<SimStore>((set) => ({
  sim: null, events: [], history: [], trails: {}, connection: 'connecting', apiOnline: false, selectedDroneId: null, recommendation: null,
  catalog: null, failureScenarios: [], error: null, ackedAlerts: 0,
  setSim: (s) =>
    set((st) => {
      if (!s) return { sim: null, history: [], events: [], trails: {}, selectedDroneId: null, ackedAlerts: 0 };
      const newRun = !st.sim || st.sim.run_id !== s.run_id;
      let history = newRun ? [] : st.history;
      if (history.length && s.time < history[history.length - 1].t) history = [];
      const lastT = history.length ? history[history.length - 1].t : -1;
      if (s.status !== 'idle' && s.time > lastT) {
        const m = s.metrics;
        history = [...history.slice(-799), { t: s.time, coverage: m.coverage, completed: m.tasks_total ? Math.round((m.tasks_completed / m.tasks_total) * 100) : 0, conflicts: m.conflicts_active }];
      }
      let trails: Trails = newRun || (st.sim && s.tick < st.sim.tick) ? {} : { ...st.trails };
      for (const d of s.drones) {
        const tr = trails[d.id] ?? [];
        const last = tr[tr.length - 1];
        if (!last || last[0] !== d.x || last[1] !== d.y) trails[d.id] = [...tr.slice(-(MAX_TRAIL - 1)), [d.x, d.y]];
        else if (!trails[d.id]) trails[d.id] = tr;
      }
      return { sim: s, history, trails, events: newRun ? [] : st.events, selectedDroneId: newRun ? null : st.selectedDroneId, ackedAlerts: newRun ? 0 : st.ackedAlerts };
    }),
  pushEvent: (e) => set((st) => (st.events.some((x) => x.id === e.id) ? st : { events: [...st.events.slice(-799), e] })),
  clearRun: () => set({ events: [], history: [], trails: {}, selectedDroneId: null, ackedAlerts: 0 }),
  setConnection: (connection) => set({ connection }),
  setApiOnline: (apiOnline) => set({ apiOnline }),
  selectDrone: (selectedDroneId) => set({ selectedDroneId }),
  setRecommendation: (recommendation) => set({ recommendation }),
  setCatalog: (catalog) => set({ catalog }),
  setFailureScenarios: (failureScenarios) => set({ failureScenarios }),
  setError: (error) => set({ error }),
  ackAlerts: (ackedAlerts) => set({ ackedAlerts }),
}));
export const useScenario = () => useSimStore((s) => s.catalog?.scenarios.find((x) => x.scenario_id === s.sim?.scenario_id) ?? null);

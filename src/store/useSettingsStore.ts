import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CoordinationMode } from '../types';

export type MapStyle = 'satellite' | 'dark' | 'street';
export interface SettingsData {
  apiUrl: string; wsUrl: string; useMock: boolean;
  speed: number; seed: number;
  scenarioId: string; mode: CoordinationMode; modeSource: 'recommended' | 'manual' | 'default';
  networkReliability: number;
  failureScenario: string; // 'manual' or an id from failure_scenarios
  mapStyle: MapStyle;
  geoAnchors: Record<string, { lat: number; lng: number }>;
}
const env = import.meta.env;
export const DEFAULTS: SettingsData = {
  apiUrl: env.VITE_API_URL ?? 'http://localhost:8000',
  wsUrl: env.VITE_WS_URL ?? 'ws://localhost:8000/ws/simulation',
  useMock: (env.VITE_USE_MOCK ?? 'true') === 'true',
  speed: 1, seed: 2101, scenarioId: 'earthquake', mode: 'hybrid', modeSource: 'default',
  networkReliability: 0.7, failureScenario: 'manual', mapStyle: 'satellite', geoAnchors: {},
};
interface SettingsStore extends SettingsData { set: (p: Partial<SettingsData>) => void; reset: () => void }
export const useSettingsStore = create<SettingsStore>()(
  persist((set) => ({ ...DEFAULTS, set: (p) => set(p), reset: () => set({ ...DEFAULTS }) }), { name: 'resqnet.settings.v2', version: 2 }),
);

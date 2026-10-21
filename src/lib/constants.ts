import type { CellState, CoordinationMode, DroneStatus, Severity, VerificationStatus } from '../types';

// Legend taken from disaster_scenarios.json -> meta.map_legend
export const CELL_STYLE: Record<CellState, { label: string; note: string; fill: string; hex: string; opacity: number }> = {
  unexplored: { label: 'Not yet searched', note: 'blue', fill: 'rgba(37,99,235,0.22)', hex: '#3b82f6', opacity: 0.2 },
  searched: { label: 'Searched, no candidate', note: 'green · not proof of safety', fill: 'rgba(34,197,94,0.45)', hex: '#22c55e', opacity: 0.42 },
  in_progress: { label: 'In progress / needs verification', note: 'yellow', fill: 'rgba(250,204,21,0.6)', hex: '#facc15', opacity: 0.55 },
  priority: { label: 'High-priority / unresolved candidate', note: 'red', fill: 'rgba(239,68,68,0.62)', hex: '#ef4444', opacity: 0.58 },
  blocked: { label: 'Blocked / inaccessible', note: 'grey', fill: 'rgba(120,134,155,0.85)', hex: '#78869b', opacity: 0.78 },
  restricted: { label: 'Restricted / no-fly', note: 'dark red hatch', fill: 'rgba(127,29,29,0.75)', hex: '#991b1b', opacity: 0.6 },
};
export const CELL_ORDER: CellState[] = ['searched', 'in_progress', 'priority', 'blocked', 'restricted', 'unexplored'];

export const DRONE_COLOR: Record<DroneStatus, string> = {
  searching: '#22d3ee', idle: '#94a3b8', disconnected: '#f87171', recovering: '#fbbf24', returning: '#a78bfa', failed: '#ef4444',
};
export const DRONE_TONE: Record<DroneStatus, 'cyan' | 'mute' | 'bad' | 'warn' | 'info'> = {
  searching: 'cyan', idle: 'mute', disconnected: 'bad', recovering: 'warn', returning: 'info', failed: 'bad',
};
// priority_scale: 1 low ... 5 life_threatening
export const PRIORITY_COLOR: Record<number, string> = { 1: '#94a3b8', 2: '#60a5fa', 3: '#fbbf24', 4: '#fb923c', 5: '#f87171' };
export const PRIORITY_LABEL: Record<number, string> = { 1: 'low', 2: 'moderate', 3: 'high', 4: 'critical', 5: 'life-threatening' };

export const MODE_META: Record<CoordinationMode, { label: string; short: string; color: string; blurb: string }> = {
  centralized: { label: 'Centralized', short: 'Central', color: '#60a5fa', blurb: 'One controller assigns every task. Efficient while the link holds, stalls when it drops.' },
  decentralized: { label: 'Decentralized', short: 'Decentral', color: '#c084fc', blurb: 'Drones claim tasks among themselves. Keeps moving, but stale claims can collide.' },
  hybrid: { label: 'Hybrid', short: 'Hybrid', color: '#2dd4bf', blurb: 'Controller by default; local claiming and reconciliation when the link fails.' },
};
export const SEVERITY_COLOR: Record<Severity, string> = { info: '#60a5fa', success: '#34d399', warning: '#fbbf24', error: '#f87171' };
export const VERIFY_META: Record<VerificationStatus, { label: string; tone: 'warn' | 'cyan' | 'ok' | 'mute' }> = {
  unverified: { label: 'awaiting verification', tone: 'warn' },
  verification_assigned: { label: 'verification assigned', tone: 'cyan' },
  confirmed: { label: 'confirmed', tone: 'ok' },
  dismissed: { label: 'dismissed', tone: 'mute' },
};
export const SPEEDS = [0.5, 1, 2, 4, 8];
export const DISASTER_EMOJI: Record<string, string> = { earthquake: '🏚️', cyclone: '🌀', flood: '🌊' };
export const HUMAN = (s: string) => s.replace(/_/g, ' ');

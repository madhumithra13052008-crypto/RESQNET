import type { RunDetail, RunSummary, SimEvent } from '../types';

export function download(name: string, text: string, mime: string) {
  const url = URL.createObjectURL(new Blob([text], { type: mime }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
const esc = (v: unknown) => {
  const s = v === null || v === undefined ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
export const toCsv = (rows: Record<string, unknown>[]) => {
  if (!rows.length) return '';
  const cols = Object.keys(rows[0]);
  return [cols.join(','), ...rows.map((r) => cols.map((c) => esc(r[c])).join(','))].join('\n');
};
const flat = (r: RunSummary) => ({
  run_id: r.run_id, scenario: r.scenario_id, mode: r.mode, seed: r.seed, status: r.status, started_at: r.started_at,
  failure_scenario: r.failure_scenario, duration_s: r.duration_s, ...r.metrics,
});
export const runsToCsv = (runs: RunSummary[]) => toCsv(runs.map(flat));
export const eventsToCsv = (events: SimEvent[]) =>
  toCsv(events.map((e) => ({ id: e.id, t: e.t, severity: e.severity, type: e.type, drone: e.drone_id ?? '', message: e.message })));
export const exportRunJson = (r: RunSummary | RunDetail) => download(`resqnet-${r.run_id}.json`, JSON.stringify(r, null, 2), 'application/json');
export const exportRunCsv = (r: RunSummary | RunDetail) => download(`resqnet-${r.run_id}.csv`, runsToCsv([r]), 'text/csv');

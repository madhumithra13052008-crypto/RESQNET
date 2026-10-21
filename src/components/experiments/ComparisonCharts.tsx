import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { MODE_META } from '../../lib/constants';
import type { CoordinationMode, ExperimentResult } from '../../types';

export const MODES: CoordinationMode[] = ['centralized', 'decentralized', 'hybrid'];
const tip = { contentStyle: { background: '#0e1a2e', border: '1px solid #22395a', borderRadius: 8, fontSize: 12 } };

export interface MetricDef { key: string; label: string; better: 'high' | 'low'; unit?: string; get: (r: ExperimentResult['results'][CoordinationMode]) => number | null }
export const METRIC_DEFS: MetricDef[] = [
  { key: 'coverage', label: 'Coverage', better: 'high', unit: '%', get: (r) => r.metrics.coverage },
  { key: 'tasks', label: 'Task completion', better: 'high', unit: '%', get: (r) => (r.metrics.tasks_total ? Math.round((r.metrics.tasks_completed / r.metrics.tasks_total) * 100) : 0) },
  { key: 'recovery', label: 'Recovery time', better: 'low', unit: 's', get: (r) => r.metrics.recovery_time },
  { key: 'dups', label: 'Duplicate assignments', better: 'low', get: (r) => r.metrics.duplicate_assignments },
  { key: 'comm', label: 'Communication overhead', better: 'low', unit: ' msgs', get: (r) => r.metrics.comm_overhead },
  { key: 'safety', label: 'Safety violations', better: 'low', get: (r) => r.metrics.safety_violations },
  { key: 'ttc', label: 'Time to finish tasks', better: 'low', unit: 's', get: (r) => r.metrics.time_to_complete },
  { key: 'late', label: 'Deadlines missed', better: 'low', get: (r) => r.metrics.deadlines_missed },
  { key: 'crit', label: 'Critical tasks done (P4-P5)', better: 'high', unit: '%', get: (r) => (r.metrics.critical_total ? Math.round((r.metrics.critical_completed / r.metrics.critical_total) * 100) : 100) },
];

export function MetricBars({ exp, def }: { exp: ExperimentResult; def: MetricDef }) {
  const data = MODES.map((m) => ({ name: MODE_META[m].short, mode: m, value: def.get(exp.results[m]) ?? 0, missing: def.get(exp.results[m]) === null }));
  return (
    <div className="rounded-lg border border-line/70 bg-bg-700/40 p-2.5">
      <div className="mb-1 flex items-baseline justify-between text-xs">
        <span className="font-medium text-ink">{def.label}</span>
        <span className="text-mute">{def.better === 'high' ? 'higher is better' : 'lower is better'}</span>
      </div>
      <div className="h-36">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 14, right: 6, bottom: 0, left: -20 }}>
            <CartesianGrid stroke="#22395a" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" stroke="#8aa0bf" fontSize={11} />
            <YAxis stroke="#8aa0bf" fontSize={11} allowDecimals={false} />
            <Tooltip {...tip} cursor={{ fill: 'rgba(255,255,255,.04)' }} formatter={(v) => `${v}${def.unit ?? ""}`} />
            <Bar dataKey="value" radius={[4, 4, 0, 0]} label={{ position: 'top', fill: '#e6eef9', fontSize: 11 }} isAnimationActive={false}>
              {data.map((d) => <Cell key={d.mode} fill={MODE_META[d.mode].color} fillOpacity={d.missing ? 0.25 : 1} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function CoverageOverTime({ exp }: { exp: ExperimentResult }) {
  const ts = exp.results.hybrid.series.map((p) => p.t);
  const data = ts.map((t, i) => ({
    t,
    centralized: exp.results.centralized.series[i]?.coverage,
    decentralized: exp.results.decentralized.series[i]?.coverage,
    hybrid: exp.results.hybrid.series[i]?.coverage,
  }));
  return (
    <div className="h-64" aria-label="Coverage over time for each coordination mode">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -14 }}>
          <CartesianGrid stroke="#22395a" strokeDasharray="3 3" />
          <XAxis dataKey="t" stroke="#8aa0bf" fontSize={11} tickFormatter={(v) => `${v}s`} />
          <YAxis stroke="#8aa0bf" fontSize={11} domain={[0, 100]} unit="%" />
          <Tooltip {...tip} labelFormatter={(v) => `t=${v}s`} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          {MODES.map((m) => <Line key={m} type="monotone" dataKey={m} name={MODE_META[m].label} stroke={MODE_META[m].color} strokeWidth={2.5} dot={false} isAnimationActive={false} />)}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

import { MODE_META } from '../../lib/constants';
import type { ExperimentResult } from '../../types';
import { METRIC_DEFS, MODES } from './ComparisonCharts';

/** Returns the winning mode(s) for a metric, or [] if all tie / no data. */
export function leaders(exp: ExperimentResult, i: number) {
  const def = METRIC_DEFS[i];
  const vals = MODES.map((m) => ({ m, v: def.get(exp.results[m]) })).filter((x): x is { m: typeof MODES[number]; v: number } => x.v !== null);
  if (vals.length < 2) return [];
  const best = def.better === 'high' ? Math.max(...vals.map((x) => x.v)) : Math.min(...vals.map((x) => x.v));
  const win = vals.filter((x) => x.v === best).map((x) => x.m);
  return win.length === vals.length ? [] : win;
}

export function ComparisonTable({ exp }: { exp: ExperimentResult }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[520px] text-sm">
        <thead>
          <tr className="border-b border-line text-left text-xs text-mute">
            <th className="py-2 pr-3 font-medium">Metric</th>
            {MODES.map((m) => <th key={m} className="px-3 py-2 font-medium" style={{ color: MODE_META[m].color }}>{MODE_META[m].label}</th>)}
          </tr>
        </thead>
        <tbody>
          {METRIC_DEFS.map((def, i) => {
            const win = leaders(exp, i);
            return (
              <tr key={def.key} className="border-b border-line/40">
                <td className="py-2 pr-3 text-ink">{def.label} <span className="text-xs text-mute">({def.better === 'high' ? 'higher' : 'lower'} is better)</span></td>
                {MODES.map((m) => {
                  const v = def.get(exp.results[m]);
                  const isBest = win.includes(m);
                  return (
                    <td key={m} className={`mono px-3 py-2 ${isBest ? 'font-semibold text-ok' : 'text-ink'}`}>
                      {v === null ? <span className="text-mute" title="Not reached in this run">n/a</span> : `${v}${def.unit ?? ''}`}
                      {isBest && <span className="ml-1 text-[10px]">best</span>}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

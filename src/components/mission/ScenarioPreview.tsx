import { PRIORITY_COLOR } from '../../lib/constants';
import type { Scenario } from '../../types';

/** Static preview of a dataset scenario: obstacles, no-fly cells, dead zones, priority zones, tasks, candidates and base. */
export function ScenarioPreview({ sc }: { sc: Scenario }) {
  const W = sc.grid.width, H = sc.grid.height, k = 20;
  const rows = sc.grid.initial_cell_grid;
  return (
    <svg viewBox={`0 0 ${W * k} ${H * k}`} className="w-full max-w-[460px] rounded-lg border border-line bg-bg-900" role="img" aria-label={`${sc.name} preview`}>
      <defs><pattern id={`h-${sc.scenario_id}`} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" fill="#7f1d1d" /><rect width="2" height="6" fill="#ef4444" opacity=".7" /></pattern></defs>
      <rect width={W * k} height={H * k} fill="rgba(37,99,235,0.18)" />
      {rows.map((row, y) => [...row].map((ch, x) => ch === '.' ? null : <rect key={`${x}-${y}`} x={x * k} y={y * k} width={k} height={k} fill={ch === '#' ? '#78869b' : `url(#h-${sc.scenario_id})`} />))}
      {Array.from({ length: W + 1 }, (_, i) => <line key={`v${i}`} x1={i * k} x2={i * k} y1="0" y2={H * k} stroke="#fff" strokeOpacity=".06" />)}
      {Array.from({ length: H + 1 }, (_, i) => <line key={`h${i}`} y1={i * k} y2={i * k} x1="0" x2={W * k} stroke="#fff" strokeOpacity=".06" />)}
      {sc.zones.map((z) => <g key={z.zone_id}><rect x={z.bounds.x0 * k} y={z.bounds.y0 * k} width={(z.bounds.x1 - z.bounds.x0 + 1) * k} height={(z.bounds.y1 - z.bounds.y0 + 1) * k} fill="none" stroke={PRIORITY_COLOR[z.priority_level]} strokeOpacity=".7" strokeDasharray="4 3" /><text x={z.bounds.x0 * k + 3} y={z.bounds.y0 * k + 10} fontSize="8" fill="#fff" fillOpacity=".55" fontFamily="monospace">{z.zone_id}</text></g>)}
      {sc.communication.dead_zones.map((z) => <rect key={z.id} x={z.bounds.x0 * k} y={z.bounds.y0 * k} width={(z.bounds.x1 - z.bounds.x0 + 1) * k} height={(z.bounds.y1 - z.bounds.y0 + 1) * k} fill="#7c3aed" fillOpacity=".2" stroke="#a78bfa" strokeWidth="2" strokeDasharray="6 4"><title>{z.id} {z.cause}</title></rect>)}
      {sc.tasks.map((t) => <g key={t.id}><circle cx={t.x * k + k / 2} cy={t.y * k + k / 2} r="8.5" fill="#0a1220" stroke={PRIORITY_COLOR[t.priority]} strokeWidth="2" /><text x={t.x * k + k / 2} y={t.y * k + k / 2 + 3.5} textAnchor="middle" fontSize="9" fontWeight="700" fill={PRIORITY_COLOR[t.priority]} fontFamily="monospace">{t.priority}</text></g>)}
      {sc.candidate_detections.map((c) => <g key={c.id}><rect x={c.x * k + 5} y={c.y * k + 5} width="10" height="10" transform={`rotate(45 ${c.x * k + 10} ${c.y * k + 10})`} fill="#facc15" fillOpacity=".25" stroke="#facc15" strokeWidth="1.5"><title>{c.id} candidate (hidden until searched)</title></rect></g>)}
      <g><circle cx={sc.base.x * k + k / 2} cy={sc.base.y * k + k / 2} r="9" fill="#0a1220" stroke="#22d3ee" strokeWidth="2" /><text x={sc.base.x * k + k / 2} y={sc.base.y * k + k / 2 + 4} textAnchor="middle" fontSize="11" fontWeight="700" fill="#22d3ee">H</text></g>
    </svg>
  );
}

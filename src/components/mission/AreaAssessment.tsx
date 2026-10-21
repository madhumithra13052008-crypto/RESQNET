import { useMemo } from 'react';
import { CELL_ORDER, CELL_STYLE } from '../../lib/constants';
import type { SimState } from '../../types';
import { Card } from '../ui/Card';

export function AreaAssessment({ sim }: { sim: SimState }) {
  const counts = useMemo(() => { const c: Record<string, number> = {}; sim.cells.forEach((s) => (c[s] = (c[s] ?? 0) + 1)); return c; }, [sim.cells]);
  return (
    <Card title="AREA ASSESSMENT" right={<span className="text-[11px] text-mute">Output A</span>}>
      <div className="space-y-1.5">
        {CELL_ORDER.map((k) => (
          <div key={k} className="flex items-center gap-2 text-xs">
            <span className="h-3.5 w-3.5 shrink-0 rounded-sm border border-white/15" style={{ background: CELL_STYLE[k].fill }} />
            <span className="flex-1">{CELL_STYLE[k].label}</span>
            <span className="mono text-mute">{counts[k] ?? 0}</span>
          </div>
        ))}
      </div>
      <p className="mt-2.5 rounded-md border border-warn/30 bg-warn/10 px-2.5 py-1.5 text-[11px] text-warn">Searched does not mean safe. A drone can search an area without finding anyone, which does not prove the area is safe.</p>
    </Card>
  );
}

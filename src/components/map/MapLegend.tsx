import { ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { CELL_ORDER, CELL_STYLE, DRONE_COLOR, PRIORITY_COLOR } from '../../lib/constants';
import type { DroneStatus } from '../../types';

export function MapLegend() {
  const [open, setOpen] = useState(true);
  return (
    <div className="absolute bottom-8 right-3 z-[900] w-[230px] rounded-lg border border-line bg-bg-900/92 text-[11px] shadow-lg backdrop-blur">
      <button onClick={() => setOpen(!open)} className="flex w-full items-center justify-between px-2.5 py-1.5 font-semibold text-ink" aria-expanded={open}>
        Map legend {open ? <ChevronDown size={13} /> : <ChevronUp size={13} />}
      </button>
      {open && (
        <div className="space-y-2 border-t border-line/60 p-2.5">
          <div className="space-y-1">
            {CELL_ORDER.map((k) => (
              <div key={k} className="flex items-center gap-2"><span className="h-3 w-3 shrink-0 rounded-sm border border-white/20" style={{ background: CELL_STYLE[k].fill }} /><span>{CELL_STYLE[k].label}</span></div>
            ))}
          </div>
          <div className="space-y-1 border-t border-line/60 pt-2 text-mute">
            <div className="flex flex-wrap gap-x-2 gap-y-1">
              {(['searching', 'recovering', 'disconnected', 'returning', 'idle', 'failed'] as DroneStatus[]).map((s) => (
                <span key={s} className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full" style={{ background: DRONE_COLOR[s] }} />{s}</span>
              ))}
            </div>
            <div className="flex items-center gap-1.5"><span className="mono rounded border px-1 text-[9px]" style={{ borderColor: PRIORITY_COLOR[5], color: PRIORITY_COLOR[5] }}>P5</span>task, priority 1 to 5 (×2 = two drones)</div>
            <div className="flex items-center gap-1.5"><span className="h-2.5 w-4 border-t-2 border-dashed border-accent" />flight path and target</div>
            <div className="flex items-center gap-1.5"><span className="h-2.5 w-4 border-t-2 border-dashed border-bad" />controller link lost</div>
            <div className="flex items-center gap-1.5"><span className="h-3 w-3 border-2 border-dashed border-violet-400" />comm dead zone</div>
            <div className="flex items-center gap-1.5"><span className="h-3 w-3 border-2 border-red-500 bg-red-900/50" />restricted / no-fly</div>
            <div className="flex items-center gap-1.5"><span className="h-3 w-3 border border-dashed border-white/70" />priority zone (Z01 to Z16)</div>
            <div className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full border-2 border-yellow-400" />candidate detection</div>
          </div>
          <p className="rounded border border-warn/30 bg-warn/10 px-1.5 py-1 text-warn">Searched does not mean safe.</p>
        </div>
      )}
    </div>
  );
}

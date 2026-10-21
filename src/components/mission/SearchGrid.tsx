import { useMemo, useState } from 'react';
import { CELL_STYLE, DRONE_COLOR, HUMAN, PRIORITY_COLOR } from '../../lib/constants';
import { sectorName } from '../../lib/format';
import { useSimStore } from '../../store/useSimStore';
import type { Scenario, SimState } from '../../types';

/** Abstract 20x20 grid view. Axis labels follow the dataset: columns A-T, rows 1-20. */
export function SearchGrid({ sim, scenario }: { sim: SimState; scenario: Scenario }) {
  const { width: W, height: H } = sim.grid;
  const selected = useSimStore((s) => s.selectedDroneId);
  const select = useSimStore((s) => s.selectDrone);
  const [hover, setHover] = useState<number | null>(null);
  const taskAt = useMemo(() => new Map(sim.tasks.map((t) => [t.y * W + t.x, t])), [sim.tasks, W]);
  const detAt = useMemo(() => new Map(sim.detections.map((q) => [q.y * W + q.x, q])), [sim.detections, W]);
  const dead = useMemo(() => {
    const s = new Set<number>();
    scenario.communication.dead_zones.forEach((z) => { for (let y = z.bounds.y0; y <= z.bounds.y1; y++) for (let x = z.bounds.x0; x <= z.bounds.x1; x++) s.add(y * W + x); });
    return s;
  }, [scenario, W]);
  const hx = hover !== null ? hover % W : 0, hy = hover !== null ? Math.floor(hover / W) : 0;
  const ht = hover !== null ? taskAt.get(hover) : undefined;
  const label = 'mono text-[9px] text-mute';

  return (
    <div className="mx-auto w-full max-w-[760px]">
      <div className="grid" style={{ gridTemplateColumns: `18px repeat(${W}, 1fr)`, gridTemplateRows: `14px 1fr` }}>
        <div />
        <div className="grid" style={{ gridTemplateColumns: `repeat(${W}, 1fr)` }}>{Array.from({ length: W }, (_, x) => <span key={x} className={`${label} text-center`}>{String.fromCharCode(65 + x)}</span>)}</div>
        <div className="grid" style={{ gridTemplateRows: `repeat(${H}, 1fr)` }}>{Array.from({ length: H }, (_, y) => <span key={y} className={`${label} flex items-center justify-end pr-1`}>{y + 1}</span>)}</div>
        <div className="relative select-none overflow-hidden rounded-md border border-line bg-bg-900" style={{ display: 'grid', gridTemplateColumns: `repeat(${W}, 1fr)`, aspectRatio: `${W} / ${H}` }} onMouseLeave={() => setHover(null)} role="grid" aria-label="Search grid">
          {sim.cells.map((st, i) => {
            const t = taskAt.get(i), q = detAt.get(i);
            return (
              <div key={i} onMouseEnter={() => setHover(i)} className="relative border-[0.5px] border-white/[0.06]"
                style={{
                  background: CELL_STYLE[st].fill,
                  backgroundImage: st === 'restricted' ? 'repeating-linear-gradient(45deg, rgba(255,255,255,.14) 0 3px, transparent 3px 6px)' : dead.has(i) ? 'repeating-linear-gradient(135deg, rgba(167,139,250,.28) 0 2px, transparent 2px 7px)' : undefined,
                  outline: t?.status === 'conflict' ? '2px dashed #f87171' : undefined, outlineOffset: -2,
                }}>
                {t && t.status !== 'completed' && <span className="mono absolute left-[2px] top-[1px] text-[8px] font-bold leading-none sm:text-[9px]" style={{ color: PRIORITY_COLOR[t.priority] }}>P{t.priority}{t.required_drones > 1 ? '×2' : ''}</span>}
                {t?.status === 'completed' && <span className="absolute left-[2px] top-0 text-[10px] text-ok">✓</span>}
                {q && <span className="absolute bottom-[2px] right-[2px] h-2 w-2 rounded-full border-2 sm:h-2.5 sm:w-2.5" style={{ borderColor: q.verification_status === 'confirmed' ? '#34d399' : q.verification_status === 'dismissed' ? '#94a3b8' : '#facc15' }} title={`${q.id} ${q.verification_status}`} />}
              </div>
            );
          })}
          <div className="pointer-events-none absolute inset-0 z-10" style={{ display: 'grid', gridTemplateColumns: `repeat(${scenario.grid.width / 5}, 1fr)`, gridTemplateRows: `repeat(${scenario.grid.height / 5}, 1fr)` }}>
            {scenario.zones.map((z) => <div key={z.zone_id} className="border border-dashed border-white/25 p-0.5"><span className="mono text-[8px] text-white/55">{z.zone_id}</span></div>)}
          </div>
          <div className="pointer-events-none absolute inset-0 z-20">
            {sim.drones.map((d) => {
              const c = DRONE_COLOR[d.status], sel = selected === d.id;
              return (
                <button key={d.id} onClick={() => select(sel ? null : d.id)} aria-label={`${d.id} ${d.status} battery ${Math.round(d.battery)} percent`} className="pointer-events-auto absolute flex items-center justify-center"
                  style={{ left: `${(d.x / W) * 100}%`, top: `${(d.y / H) * 100}%`, width: `${100 / W}%`, height: `${100 / H}%`, transition: 'left .45s linear, top .45s linear' }}>
                  <span className="mono flex h-[80%] w-[80%] items-center justify-center rounded-full text-[9px] font-bold text-bg-900 sm:text-[10px]"
                    style={{ background: c, border: `2px ${d.connected ? 'solid' : 'dashed'} ${d.connected ? '#0a1220' : '#fff'}`, boxShadow: sel ? `0 0 0 2px #fff, 0 0 12px 3px ${c}` : `0 0 8px 1px ${c}88`, opacity: d.status === 'failed' ? 0.55 : 1 }}>
                    {d.status === 'failed' ? '×' : d.id}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
      <div className="mono mt-2 h-5 text-xs text-mute">
        {hover !== null ? <>{sectorName(hx, hy)} ({hx}, {hy}) · {CELL_STYLE[sim.cells[hover]].label}{dead.has(hover) ? ' · comm dead zone' : ''}{ht ? ` · ${ht.id} ${HUMAN(ht.type)} P${ht.priority}` : ''}</> : 'Hover a cell for details. Click a drone to select it.'}
      </div>
    </div>
  );
}

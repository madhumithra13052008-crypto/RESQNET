import { CheckCircle2, CircleDot, PlaneLanding } from 'lucide-react';
import { PRIORITY_COLOR, PRIORITY_LABEL } from '../../lib/constants';
import type { SimState } from '../../types';
import { Card } from '../ui/Card';
import { ProgressBar } from '../ui/ProgressBar';

function Donut({ value }: { value: number }) {
  const r = 46, c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 120 120" className="h-28 w-28" role="img" aria-label={`Search coverage ${value.toFixed(0)} percent`}>
      <circle cx="60" cy="60" r={r} fill="none" stroke="#1a2f4d" strokeWidth="11" />
      <circle cx="60" cy="60" r={r} fill="none" stroke="#34d399" strokeWidth="11" strokeLinecap="round" strokeDasharray={`${(value / 100) * c} ${c}`} transform="rotate(-90 60 60)" style={{ transition: 'stroke-dasharray .4s' }} />
      <text x="60" y="60" textAnchor="middle" fill="#e6eef9" fontSize="25" fontWeight="700" fontFamily="JetBrains Mono, monospace">{Math.round(value)}</text>
      <text x="60" y="78" textAnchor="middle" fill="#8aa0bf" fontSize="10">% searched</text>
    </svg>
  );
}
function Row({ done, label, value }: { done: boolean; label: string; value: string }) {
  return (
    <li className="flex items-center gap-2.5 border-b border-line/40 py-2 last:border-0">
      {done ? <CheckCircle2 size={18} className="shrink-0 text-ok" /> : <CircleDot size={18} className="shrink-0 text-warn" />}
      <div className="leading-tight"><div className="text-sm font-medium">{label}</div><div className={`text-[11px] ${done ? 'text-ok' : 'text-warn'}`}>{value}</div></div>
    </li>
  );
}

export function MissionStatusPanel({ sim }: { sim: SimState }) {
  const m = sim.metrics, n = sim.network;
  const returning = sim.drones.filter((d) => d.status === 'returning').length;
  const byP = [5, 4, 3, 2, 1].map((p) => { const t = sim.tasks.filter((x) => x.priority === p); return { p, total: t.length, done: t.filter((x) => x.status === 'completed').length }; }).filter((x) => x.total);
  const net = !n.controller_online || n.partitioned ? 'Degraded: failure active' : n.recovery === 'in_progress' ? 'Recovering' : 'Nominal';
  return (
    <Card title="MISSION STATUS" bodyClass="p-3">
      <div className="flex items-center gap-3"><Donut value={m.coverage} />
        <div className="space-y-1 text-xs text-mute"><div><b className="mono text-base text-ink">{m.areas_remaining}</b> cells remaining</div><div><b className="mono text-base text-ink">{m.tasks_total - m.tasks_completed}</b> tasks open</div><div><b className="mono text-base text-ink">{m.unresolved_findings}</b> to verify</div></div>
      </div>
      <ul className="mt-2">
        <Row done={m.coverage >= 95} label="Area coverage" value={m.coverage >= 95 ? 'Complete' : 'In progress'} />
        <Row done={m.critical_completed === m.critical_total} label="Critical tasks (P4 to P5)" value={`${m.critical_completed}/${m.critical_total} done${m.deadlines_missed ? ` · ${m.deadlines_missed} late` : ''}`} />
        <Row done={m.unresolved_findings === 0 && sim.detections.length > 0} label="Finding verification" value={`${m.findings_confirmed} confirmed · ${m.findings_dismissed} dismissed · ${m.unresolved_findings} open`} />
        <Row done={net === 'Nominal'} label="Network health" value={net} />
        <li className="flex items-center gap-2.5 py-2"><PlaneLanding size={18} className="shrink-0 text-mute" /><div className="leading-tight"><div className="text-sm font-medium">Return-to-base</div><div className="text-[11px] text-mute">{returning ? `${returning} drone(s) returning` : 'Standby'}</div></div></li>
      </ul>
      <div className="mt-2 border-t border-line/60 pt-2">
        <div className="mb-1.5 text-[11px] font-medium text-mute">Tasks by priority</div>
        <div className="space-y-1.5">
          {byP.map((x) => (
            <div key={x.p} className="flex items-center gap-2 text-[11px]">
              <span className="w-24 shrink-0 truncate" style={{ color: PRIORITY_COLOR[x.p] }}>P{x.p} {PRIORITY_LABEL[x.p]}</span>
              <div className="flex-1"><ProgressBar value={(x.done / x.total) * 100} color={PRIORITY_COLOR[x.p]} height={5} /></div>
              <span className="mono w-8 text-right text-mute">{x.done}/{x.total}</span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

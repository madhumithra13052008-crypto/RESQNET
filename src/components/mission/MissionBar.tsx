import { Pause, Play, RotateCcw, Settings2 } from 'lucide-react';
import { SPEEDS } from '../../lib/constants';
import { fmtTime } from '../../lib/format';
import { navigate } from '../../lib/nav';
import { changeSpeed, pauseMission, resetMission, resumeMission, startMission } from '../../store/actions';
import { useSettingsStore } from '../../store/useSettingsStore';
import { useSimStore } from '../../store/useSimStore';
import type { SimState } from '../../types';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';

export function MissionBar({ sim }: { sim: SimState }) {
  const speed = useSettingsStore((s) => s.speed);
  const fsId = useSettingsStore((s) => s.failureScenario);
  const fs = useSimStore((s) => s.failureScenarios);
  const fsName = fsId === 'manual' ? 'Manual injection' : fs.find((f) => f.id === fsId)?.name ?? fsId;
  return (
    <div className="panel flex flex-wrap items-center gap-2 px-3 py-2.5" role="group" aria-label="Mission controls">
      {(sim.status === 'idle' || sim.status === 'completed') && <Button variant="primary" onClick={() => startMission()}><Play size={16} />{sim.status === 'completed' ? 'Run again' : 'Start mission'}</Button>}
      {sim.status === 'running' && <Button variant="warn" onClick={() => pauseMission()}><Pause size={16} />Pause</Button>}
      {sim.status === 'paused' && <Button variant="primary" onClick={() => resumeMission()}><Play size={16} />Resume</Button>}
      <Button onClick={() => resetMission()} disabled={sim.status === 'idle' && sim.tick === 0}><RotateCcw size={15} />Reset</Button>
      <label className="flex items-center gap-1.5 text-xs text-mute">
        Speed
        <select className="input !w-auto !py-1.5" value={speed} onChange={(e) => changeSpeed(Number(e.target.value))} aria-label="Simulation speed">
          {SPEEDS.map((s) => <option key={s} value={s}>{s}×</option>)}
        </select>
      </label>
      <span className="mono text-xs text-mute">t = <span className="text-ink">{fmtTime(sim.time)}</span> · tick {sim.tick}</span>
      <div className="ml-auto flex items-center gap-2">
        <Badge tone="mute">failures: {fsName}</Badge>
        <Button size="sm" onClick={() => navigate('scenarios')}><Settings2 size={14} />Scenario</Button>
      </div>
      {sim.status === 'completed' && <p className="basis-full rounded-md border border-accent/30 bg-accent/10 px-3 py-1.5 text-sm text-accent">Mission finished at {fmtTime(sim.time)}. Review the outcomes below or compare strategies on the Experiments page.</p>}
    </div>
  );
}

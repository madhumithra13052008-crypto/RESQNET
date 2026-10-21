import { FlaskConical, Play, Radar, ShieldAlert, Waypoints } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { MODE_META } from '../lib/constants';
import { navigate } from '../lib/nav';
import type { CoordinationMode } from '../types';

const DOTS = [
  { x: 12, y: 22, d: '0s' }, { x: 28, y: 64, d: '-3s' }, { x: 46, y: 30, d: '-6s' },
  { x: 60, y: 70, d: '-9s' }, { x: 76, y: 24, d: '-2s' }, { x: 86, y: 56, d: '-5s' },
];

function Hero() {
  return (
    <div className="relative aspect-[4/3] w-full max-w-[520px] overflow-hidden rounded-2xl border border-line bg-bg-800" aria-hidden>
      <div className="absolute inset-0" style={{ backgroundImage: 'linear-gradient(#22395a55 1px, transparent 1px), linear-gradient(90deg, #22395a55 1px, transparent 1px)', backgroundSize: '5% 5%' }} />
      <div className="absolute left-[8%] top-[12%] h-[26%] w-[22%] bg-red-500/30" />
      <div className="absolute left-[55%] top-[48%] h-[30%] w-[25%] bg-yellow-400/25" />
      <div className="absolute bottom-[10%] left-[10%] h-[22%] w-[28%] bg-slate-500/50" />
      <div className="absolute right-[8%] top-[10%] h-[24%] w-[24%] bg-green-500/25" />
      <div className="absolute inset-y-0 left-1/2 border-l-2 border-dashed border-red-400/60" />
      {DOTS.map((p, i) => (
        <span key={i} className="absolute h-4 w-4 animate-drift rounded-full bg-accent shadow-[0_0_14px_3px_rgba(34,211,238,.6)]" style={{ left: `${p.x}%`, top: `${p.y}%`, animationDelay: p.d }} />
      ))}
    </div>
  );
}

export default function HomePage() {
  return (
    <div className="mx-auto max-w-[1200px] px-4 py-8 md:py-14">
      <section className="grid items-center gap-10 lg:grid-cols-[1.1fr_1fr]">
        <div>
          <h1 className="text-4xl font-bold leading-tight tracking-tight md:text-5xl">
            RESQNET
            <span className="mt-2 block text-xl font-medium text-accent md:text-2xl">Resilient Swarm Coordination for Disaster Response</span>
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-mute">
            Six simulated drones search a disaster zone while you break their network. Watch the swarm lose its controller, keep working, and reconcile when the connection returns, then compare centralized, decentralized and hybrid coordination under identical conditions.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Button variant="primary" size="lg" onClick={() => navigate('scenarios')}><Play size={18} />Launch simulation</Button>
            <Button size="lg" onClick={() => navigate('experiments')}><FlaskConical size={18} />Previous experiments</Button>
          </div>
          <p className="mt-4 text-xs text-mute">No installation needed. Everything runs in the browser against a simulation, not real aircraft.</p>
        </div>
        <div className="flex justify-center lg:justify-end"><Hero /></div>
      </section>

      <section className="mt-14 grid gap-3 md:grid-cols-3" aria-label="Coordination modes">
        {(Object.keys(MODE_META) as CoordinationMode[]).map((m) => (
          <div key={m} className="panel p-4">
            <div className="flex items-center gap-2 text-lg font-semibold"><span className="h-3 w-3 rounded-full" style={{ background: MODE_META[m].color }} />{MODE_META[m].label}</div>
            <p className="mt-2 text-sm text-mute">{MODE_META[m].blurb}</p>
          </div>
        ))}
      </section>

      <section className="mt-10 grid gap-3 md:grid-cols-3">
        {[
          { i: <Radar size={20} />, t: 'See the search live', d: 'A 20×20 grid shows searched, in-progress, priority, blocked and unexplored cells as drones move.' },
          { i: <ShieldAlert size={20} />, t: 'Cause real failures', d: 'Disable the controller, split the network or fail a drone. The backend computes the recovery; nothing is pre-recorded.' },
          { i: <Waypoints size={20} />, t: 'Judge the evidence', d: 'Findings stay unconfirmed until verified. Metrics, event logs and exports show what each strategy actually did.' },
        ].map((c) => (
          <div key={c.t} className="panel p-4">
            <div className="text-accent">{c.i}</div>
            <h2 className="mt-2 font-semibold">{c.t}</h2>
            <p className="mt-1 text-sm text-mute">{c.d}</p>
          </div>
        ))}
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold">How a run works</h2>
        <ol className="mt-3 grid gap-3 md:grid-cols-4">
          {['Choose a disaster scenario', 'Analyze conditions and pick a strategy', 'Start the mission and inject a failure', 'Compare strategies on the same scenario'].map((t, i) => (
            <li key={t} className="panel flex gap-3 p-3 text-sm"><span className="mono text-accent">{i + 1}</span>{t}</li>
          ))}
        </ol>
      </section>
    </div>
  );
}

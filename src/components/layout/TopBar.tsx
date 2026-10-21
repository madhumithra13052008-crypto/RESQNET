import { BarChart3, FlaskConical, Home, LayoutGrid, Radar, Settings } from 'lucide-react';
import type { ReactNode } from 'react';
import { MODE_META } from '../../lib/constants';
import { fmtTime } from '../../lib/format';
import { navigate, type Page } from '../../lib/nav';
import { useSettingsStore } from '../../store/useSettingsStore';
import { useSimStore } from '../../store/useSimStore';
import { Badge } from '../ui/Badge';

const NAV: { id: Page; label: string; icon: ReactNode }[] = [
  { id: 'home', label: 'Home', icon: <Home size={14} /> },
  { id: 'mission', label: 'Mission Control', icon: <Radar size={14} /> },
  { id: 'scenarios', label: 'Scenarios', icon: <LayoutGrid size={14} /> },
  { id: 'experiments', label: 'Experiments', icon: <FlaskConical size={14} /> },
  { id: 'analytics', label: 'Analytics', icon: <BarChart3 size={14} /> },
  { id: 'settings', label: 'Settings', icon: <Settings size={14} /> },
];

export function Logo() {
  return (
    <div className="flex items-center gap-2">
      <svg width="26" height="26" viewBox="0 0 32 32" aria-hidden>
        <g stroke="#22d3ee" strokeWidth="2" fill="none"><circle cx="9" cy="9" r="3" /><circle cx="23" cy="9" r="3" /><circle cx="9" cy="23" r="3" /><circle cx="23" cy="23" r="3" /><path d="M12 12l8 8M20 12l-8 8" /></g>
        <circle cx="16" cy="16" r="2.4" fill="#2dd4bf" />
      </svg>
      <span className="text-base font-bold tracking-[0.12em]">RESQ<span className="text-accent">NET</span></span>
    </div>
  );
}

export function TopBar({ page }: { page: Page }) {
  const sim = useSimStore((s) => s.sim);
  const connection = useSimStore((s) => s.connection);
  const apiOnline = useSimStore((s) => s.apiOnline);
  const useMock = useSettingsStore((s) => s.useMock);
  const online = connection === 'connected' && apiOnline;
  const dot = online ? 'bg-ok' : connection === 'connecting' ? 'bg-warn' : 'bg-bad';
  return (
    <header className="sticky top-0 z-[1100] border-b border-line bg-bg-900/92 backdrop-blur">
      <div className="mx-auto flex max-w-[1900px] flex-wrap items-center gap-x-5 gap-y-1 px-3 md:px-4">
        <button onClick={() => navigate('home')} aria-label="RESQNET home" className="py-2.5"><Logo /></button>
        <nav className="order-3 flex w-full gap-1 overflow-x-auto md:order-none md:w-auto md:flex-1" aria-label="Main">
          {NAV.map((n) => (
            <button key={n.id} onClick={() => navigate(n.id)} aria-current={page === n.id ? 'page' : undefined}
              className={`flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-3 text-[13px] font-medium tracking-wide transition-colors ${page === n.id ? 'border-accent text-ink' : 'border-transparent text-mute hover:text-ink'}`}>
              {n.icon}{n.label}
            </button>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-3 py-2">
          {sim && sim.status !== 'idle' && <><Badge tone="cyan">{MODE_META[sim.mode].label}</Badge><span className="mono text-lg font-medium">{fmtTime(sim.time)}</span></>}
          {useMock && <Badge tone="warn" className="hidden sm:inline-flex">Mock engine</Badge>}
          <span className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wider text-ink" role="status"><span className={`h-2 w-2 rounded-full ${dot}`} />{online ? 'CONNECTED' : connection === 'connecting' ? 'CONNECTING' : 'OFFLINE'}</span>
          <button onClick={() => navigate('settings')} aria-label="Settings" className="text-mute hover:text-ink"><Settings size={17} /></button>
        </div>
      </div>
    </header>
  );
}

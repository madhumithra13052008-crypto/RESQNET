import { Grid3x3, Map as MapIcon, Radar } from 'lucide-react';
import { useState } from 'react';
import { AlertsPanel } from '../components/mission/AlertsPanel';
import { AreaAssessment } from '../components/mission/AreaAssessment';
import { BatteryStatus } from '../components/mission/BatteryStatus';
import { DroneDetails } from '../components/mission/DroneDetails';
import { DroneFleetPanel } from '../components/mission/DroneFleetPanel';
import { EventTimeline } from '../components/mission/EventTimeline';
import { FailurePanel } from '../components/mission/FailurePanel';
import { FindingsPanel } from '../components/mission/FindingsPanel';
import { MissionBar } from '../components/mission/MissionBar';
import { MissionHeader } from '../components/mission/MissionHeader';
import { MissionStatusPanel } from '../components/mission/MissionStatusPanel';
import { OutcomesPanel } from '../components/mission/OutcomesPanel';
import { Reassignments } from '../components/mission/Reassignments';
import { SearchGrid } from '../components/mission/SearchGrid';
import { TaskList } from '../components/mission/TaskList';
import { ZonesPanel } from '../components/mission/ZonesPanel';
import { LiveMap } from '../components/map/LiveMap';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Empty } from '../components/ui/Empty';
import { navigate } from '../lib/nav';
import { loadScenario } from '../store/actions';
import { useSimStore } from '../store/useSimStore';

export default function MissionControlPage() {
  const sim = useSimStore((s) => s.sim);
  const catalog = useSimStore((s) => s.catalog);
  const connection = useSimStore((s) => s.connection);
  const [view, setView] = useState<'map' | 'grid'>('map');
  const scenario = sim && catalog ? catalog.scenarios.find((x) => x.scenario_id === sim.scenario_id) : undefined;

  if (!sim || !scenario) {
    return (
      <div className="mx-auto max-w-xl p-6">
        <Card>
          <Empty icon={<Radar size={32} />} title={connection === 'offline' ? 'Cannot reach the simulation backend' : 'No scenario loaded yet'}
            hint={connection === 'offline' ? 'Check that the backend is running, or switch to the built-in mock engine in Settings.' : 'Choose a disaster scenario to load the map, obstacles and drones.'}
            action={<div className="mt-2 flex gap-2"><Button variant="primary" onClick={() => navigate('scenarios')}>Choose a scenario</Button><Button onClick={() => loadScenario()}>Retry loading</Button>{connection === 'offline' && <Button onClick={() => navigate('settings')}>Open settings</Button>}</div>} />
        </Card>
      </div>
    );
  }
  const tab = (id: 'map' | 'grid', icon: JSX.Element, label: string) => (
    <button role="tab" aria-selected={view === id} onClick={() => setView(id)} className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs ${view === id ? 'bg-accent/20 text-accent' : 'text-mute hover:text-ink'}`}>{icon}{label}</button>
  );

  return (
    <div className="mx-auto max-w-[1900px] space-y-3 p-3 md:p-4">
      <MissionHeader sim={sim} scenario={scenario} />
      <div className="grid items-start gap-3 xl:grid-cols-[290px_minmax(0,1fr)_345px]">
        <aside className="order-2 space-y-3 xl:order-1">
          <MissionStatusPanel sim={sim} />
          <AreaAssessment sim={sim} />
          <ZonesPanel sim={sim} scenario={scenario} />
        </aside>
        <section className="order-1 min-w-0 space-y-3 xl:order-2" aria-label="Live search area">
          <Card title="LIVE SEARCH AREA" icon={<Radar size={15} />} bodyClass="p-2"
            right={<div className="flex rounded-lg border border-line p-0.5" role="tablist" aria-label="View">{tab('map', <MapIcon size={13} />, 'Real map')}{tab('grid', <Grid3x3 size={13} />, 'Grid')}</div>}>
            {view === 'map' ? <LiveMap sim={sim} scenario={scenario} /> : <div className="p-2"><SearchGrid sim={sim} scenario={scenario} /></div>}
          </Card>
          <MissionBar sim={sim} />
          <FailurePanel sim={sim} />
        </section>
        <aside className="order-3 space-y-3">
          <AlertsPanel />
          <DroneFleetPanel sim={sim} />
          <DroneDetails sim={sim} />
        </aside>
      </div>
      <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
        <EventTimeline droneIds={sim.drones.map((d) => d.id)} />
        <div className="space-y-3"><BatteryStatus sim={sim} /><Reassignments /></div>
        <TaskList sim={sim} />
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        <FindingsPanel sim={sim} />
        <OutcomesPanel sim={sim} scenario={scenario} />
      </div>
    </div>
  );
}

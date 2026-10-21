import { CheckCircle2, Loader2, RotateCcw, XCircle } from 'lucide-react';
import { useState } from 'react';
import { getApi } from '../api';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { SPEEDS } from '../lib/constants';
import { DEFAULT_ANCHORS } from '../lib/geo';
import { loadScenario } from '../store/actions';
import { useSettingsStore, type MapStyle } from '../store/useSettingsStore';
import { useSimStore } from '../store/useSimStore';

export default function SettingsPage() {
  const s = useSettingsStore();
  const catalog = useSimStore((x) => x.catalog);
  const [test, setTest] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const check = async () => {
    setBusy(true); setTest(null);
    try { const h = await getApi().health(); setTest({ ok: true, text: `Backend responded: ${h.status}${h.engine ? ` · ${h.engine}` : ''}${h.database ? ` · db ${h.database}` : ''}${h.version ? ` · v${h.version}` : ''}` }); }
    catch (e) { setTest({ ok: false, text: (e as Error).message }); } finally { setBusy(false); }
  };
  const setAnchor = (id: string, k: 'lat' | 'lng', v: number) => {
    const cur = s.geoAnchors[id] ?? DEFAULT_ANCHORS[id] ?? { lat: 20, lng: 78 };
    s.set({ geoAnchors: { ...s.geoAnchors, [id]: { ...cur, [k]: v } } });
  };
  return (
    <div className="mx-auto max-w-[900px] space-y-4 p-3 md:p-5">
      <div><h1 className="text-2xl font-semibold">Settings</h1><p className="mt-1 text-sm text-mute">Simulation defaults, map location and the connection to the backend. Stored in this browser.</p></div>

      <Card title="Simulation">
        <div className="grid gap-4 sm:grid-cols-2">
          <div><label className="label" htmlFor="speed">Simulation speed</label><select id="speed" className="input" value={s.speed} onChange={(e) => s.set({ speed: Number(e.target.value) })}>{SPEEDS.map((v) => <option key={v} value={v}>{v}×</option>)}</select></div>
          <div><label className="label" htmlFor="seed">Random seed</label><input id="seed" type="number" className="input mono" value={s.seed} onChange={(e) => s.set({ seed: Math.max(0, Math.floor(Number(e.target.value) || 0)) })} onBlur={() => loadScenario()} />
            <p className="mt-1 text-xs text-mute">Each dataset scenario has its own default seed (earthquake 2101, cyclone 2102, flood 2103). The same seed gives repeatable runs.</p></div>
          <div><label className="label" htmlFor="basemap">Default basemap</label><select id="basemap" className="input" value={s.mapStyle} onChange={(e) => s.set({ mapStyle: e.target.value as MapStyle })}><option value="satellite">Satellite (Esri)</option><option value="dark">Dark (CARTO)</option><option value="street">Street (OpenStreetMap)</option></select></div>
        </div>
      </Card>

      <Card title="Map location (illustrative)">
        <p className="mb-3 text-xs text-mute">The dataset has no coordinates, so each 20×20 grid (25 m cells, 500 m wide) is anchored to a real place by its north-west corner. Change it to place a scenario anywhere. This only affects the map background.</p>
        <div className="space-y-3">
          {(catalog?.scenarios ?? []).map((sc) => {
            const a = s.geoAnchors[sc.scenario_id] ?? sc.geo ?? DEFAULT_ANCHORS[sc.scenario_id] ?? { lat: 20, lng: 78 };
            return (
              <div key={sc.scenario_id} className="grid items-end gap-3 sm:grid-cols-[1fr_1fr_1fr_auto]">
                <div className="text-sm font-medium">{sc.name}</div>
                <div><label className="label" htmlFor={`lat-${sc.scenario_id}`}>Latitude (NW corner)</label><input id={`lat-${sc.scenario_id}`} type="number" step="0.0001" className="input mono" value={a.lat} onChange={(e) => setAnchor(sc.scenario_id, 'lat', Number(e.target.value))} /></div>
                <div><label className="label" htmlFor={`lng-${sc.scenario_id}`}>Longitude (NW corner)</label><input id={`lng-${sc.scenario_id}`} type="number" step="0.0001" className="input mono" value={a.lng} onChange={(e) => setAnchor(sc.scenario_id, 'lng', Number(e.target.value))} /></div>
                <Button size="sm" onClick={() => { const { [sc.scenario_id]: _x, ...rest } = s.geoAnchors; s.set({ geoAnchors: rest }); }}>Default</Button>
              </div>
            );
          })}
        </div>
      </Card>

      <Card title="Backend connection">
        <label className="flex cursor-pointer items-start gap-3">
          <input type="checkbox" className="mt-1 h-4 w-4 accent-cyan-400" checked={s.useMock} onChange={(e) => s.set({ useMock: e.target.checked })} />
          <span><span className="block text-sm font-medium">Use the built-in mock engine</span><span className="block text-xs text-mute">Runs a rule-based simulation of disaster_scenarios.json inside the browser, so the UI works without the FastAPI server. Turn it off to use the backend below.</span></span>
        </label>
        <div className={`mt-4 grid gap-4 ${s.useMock ? 'pointer-events-none opacity-40' : ''}`}>
          <div><label className="label" htmlFor="api">API base URL</label><input id="api" className="input mono" value={s.apiUrl} onChange={(e) => s.set({ apiUrl: e.target.value })} placeholder="http://localhost:8000" disabled={s.useMock} /></div>
          <div><label className="label" htmlFor="ws">WebSocket URL</label><input id="ws" className="input mono" value={s.wsUrl} onChange={(e) => s.set({ wsUrl: e.target.value })} placeholder="ws://localhost:8000/ws/simulation" disabled={s.useMock} /></div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button onClick={check} disabled={busy}>{busy && <Loader2 size={14} className="animate-spin" />}Test connection</Button>
          {test && <span className={`flex items-center gap-1.5 text-sm ${test.ok ? 'text-ok' : 'text-bad'}`} role="status">{test.ok ? <CheckCircle2 size={15} /> : <XCircle size={15} />}{test.text}</span>}
        </div>
      </Card>

      <Card title="Backend contract (v1, matches disaster_scenarios.json contract 1.0)">
        <details>
          <summary className="cursor-pointer text-sm text-accent">Endpoints the frontend calls</summary>
          <pre className="mono mt-3 overflow-x-auto rounded-lg bg-bg-900 p-3 text-xs leading-relaxed text-mute">{`REST (prefix /api)
GET  /health                      -> {status, database?, version?}
GET  /scenarios                   -> {meta, scenarios[]}  (disaster_scenarios.json WITHOUT ground_truth)
GET  /failure-scenarios           -> FailureScenario[]    (failure_scenarios.json)
POST /analyze                     {scenario_id, params:{network_reliability, failure_scenario}} -> Recommendation
POST /simulation/load             StartRequest -> SimState (idle)
POST /simulation/start            StartRequest -> SimState
POST /simulation/pause | resume | reset
POST /simulation/speed            {speed}
POST /simulation/failure          {type, drone_ids?}   type: controller_outage | network_partition | packet_loss | drone_disconnect | drone_failure
POST /simulation/restore          {target, drone_ids?} target: controller | network | drones | all
POST /detections/{id}/assign      dispatch a verification pass
POST /detections/{id}/dismiss     operator dismissal
GET  /runs, /runs/{id}            RunSummary[] / RunDetail
GET  /experiments                 ExperimentResult[]
POST /experiments                 {scenario_id, seed, params} -> ExperimentResult

WebSocket (JSON)
{"type":"state","data":SimState}   {"type":"event","data":SimEvent}   {"type":"events","data":SimEvent[]}

Rules: sector = column letter + row number (x=1,y=3 -> B4); candidate ground_truth is never sent to the UI;
a finding is "confirmed" only when the backend sets verification_status = "confirmed".
Types live in src/types/index.ts`}</pre>
        </details>
      </Card>
      <Button variant="danger" onClick={() => { s.reset(); loadScenario(); }}><RotateCcw size={14} />Reset all settings</Button>
    </div>
  );
}

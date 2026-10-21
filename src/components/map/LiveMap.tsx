import type { PathOptions } from 'leaflet';
import { Layers, Pause, Play, RotateCcw } from 'lucide-react';
import { Fragment, useMemo, useState } from 'react';
import { Circle, MapContainer, Marker, Polyline, Popup, Rectangle, ScaleControl, TileLayer, Tooltip, ZoomControl } from 'react-leaflet';
import { CELL_STYLE, DRONE_COLOR, HUMAN } from '../../lib/constants';
import { DEFAULT_ANCHORS, FALLBACK_ANCHOR, makeGeo } from '../../lib/geo';
import { pauseMission, resetMission, resumeMission, startMission } from '../../store/actions';
import { useSettingsStore, type MapStyle } from '../../store/useSettingsStore';
import { useSimStore } from '../../store/useSimStore';
import type { CellState, Scenario, SimState } from '../../types';
import { DetectionCard } from '../mission/DetectionCard';
import { baseIcon, detectionIcon, droneIcon, taskIcon } from './icons';
import { MapLegend } from './MapLegend';

const TILES: Record<MapStyle, { url: string; attribution: string; maxNativeZoom: number }> = {
  satellite: { url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', attribution: 'Tiles &copy; Esri, Maxar, Earthstar Geographics', maxNativeZoom: 19 },
  dark: { url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', attribution: '&copy; OpenStreetMap contributors &copy; CARTO', maxNativeZoom: 20 },
  street: { url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png', attribution: '&copy; OpenStreetMap contributors', maxNativeZoom: 19 },
};
const CELL_PATH = Object.fromEntries(
  (Object.keys(CELL_STYLE) as CellState[]).map((k) => [k, { color: '#ffffff', weight: 0.4, opacity: 0.18, fillColor: CELL_STYLE[k].hex, fillOpacity: CELL_STYLE[k].opacity } as PathOptions]),
) as Record<CellState, PathOptions>;
const ZONE_COLOR = ['', '#94a3b8', '#60a5fa', '#fbbf24', '#fb923c', '#f87171'];
const ZONE_PATH = ZONE_COLOR.map((c) => ({ color: c || '#fff', weight: 1.4, dashArray: '5 5', opacity: 0.8, fill: false } as PathOptions));
const RZ_PATH: PathOptions = { color: '#ef4444', weight: 2.5, fillColor: '#b91c1c', fillOpacity: 0.28 };
const DZ_PATH: PathOptions = { color: '#a78bfa', weight: 2, dashArray: '8 6', fillColor: '#7c3aed', fillOpacity: 0.14 };
const CAUTION_PATH: PathOptions = { color: '#fbbf24', weight: 2.5, dashArray: '8 5', fillColor: '#f59e0b', fillOpacity: 0.12 };

function Toggle({ on, onClick, children }: { on: boolean; onClick: () => void; children: string }) {
  return <button onClick={onClick} aria-pressed={on} className={`rounded px-2 py-1 text-[11px] ${on ? 'bg-accent/20 text-accent' : 'text-mute hover:text-ink'}`}>{children}</button>;
}

export function LiveMap({ sim, scenario }: { sim: SimState; scenario: Scenario }) {
  const anchorOverride = useSettingsStore((s) => s.geoAnchors[scenario.scenario_id]);
  const mapStyle = useSettingsStore((s) => s.mapStyle);
  const setSettings = useSettingsStore((s) => s.set);
  const trails = useSimStore((s) => s.trails);
  const detections = sim.detections;
  const selected = useSimStore((s) => s.selectedDroneId);
  const select = useSimStore((s) => s.selectDrone);
  const [layers, setLayers] = useState({ cells: true, zones: true, paths: true, links: true });
  const anchor = anchorOverride ?? scenario.geo ?? DEFAULT_ANCHORS[scenario.scenario_id] ?? FALLBACK_ANCHOR;
  const geo = useMemo(() => makeGeo(scenario, anchor), [scenario, anchor.lat, anchor.lng]);
  const W = sim.grid.width, H = sim.grid.height;
  const rects = useMemo(() => Array.from({ length: W * H }, (_, i) => geo.cellBounds(i % W, Math.floor(i / W))), [geo, W, H]);
  const net = sim.network, hub = scenario.communication.hub;
  const tile = TILES[mapStyle];
  const live = sim.status === 'running' || sim.status === 'paused';
  const tasksById = useMemo(() => new Map(sim.tasks.map((t) => [t.id, t])), [sim.tasks]);
  const detsById = useMemo(() => new Map(detections.map((q) => [q.id, q])), [detections]);

  const gf = sim.geofence;
  const gfBounds = useMemo(() => {
    if (!gf.active || !gf.cells.length) return null;
    const xs = gf.cells.map((c) => c[0]), ys = gf.cells.map((c) => c[1]);
    return geo.boxBounds({ x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) });
  }, [gf, geo]);

  const banner = !net.controller_online ? 'CENTRAL CONTROLLER OFFLINE' : net.partitioned ? `NETWORK PARTITIONED · ${net.groups.map((g) => g.join('+')).join(' | ')}` : net.packet_loss_pct >= 30 ? `HEAVY PACKET LOSS · ${net.packet_loss_pct}%` : null;

  return (
    <div className="relative overflow-hidden rounded-lg border border-line">
      <MapContainer key={`${scenario.scenario_id}-${anchor.lat}-${anchor.lng}`} bounds={geo.gridBounds} boundsOptions={{ padding: [24, 24] }} maxZoom={20} zoomControl={false} scrollWheelZoom className="h-[62vh] min-h-[460px] w-full bg-bg-900 xl:max-h-[760px]">
        <TileLayer key={mapStyle} url={tile.url} attribution={tile.attribution} maxNativeZoom={tile.maxNativeZoom} maxZoom={20} subdomains="abcd" />
        <ZoomControl position="topright" />
        <ScaleControl position="bottomleft" imperial={false} />

        {layers.cells && sim.cells.map((st, i) => <Rectangle key={i} bounds={rects[i]} pathOptions={CELL_PATH[st]} interactive={false} />)}
        {layers.zones && scenario.zones.map((z) => (
          <Rectangle key={z.zone_id} bounds={geo.boxBounds(z.bounds)} pathOptions={ZONE_PATH[z.priority_level] ?? ZONE_PATH[1]} interactive={false}>
            <Tooltip permanent direction="center" className="zone-tip">{z.zone_id}</Tooltip>
          </Rectangle>
        ))}
        {scenario.communication.dead_zones.map((z) => (
          <Rectangle key={z.id} bounds={geo.boxBounds(z.bounds)} pathOptions={DZ_PATH} interactive={false}>
            <Tooltip permanent direction="top" className="map-tip dz-tip">COMM DEAD ZONE {z.id} · {HUMAN(z.cause)}</Tooltip>
          </Rectangle>
        ))}
        {scenario.restricted_zones.map((z) => (
          <Rectangle key={z.id} bounds={geo.boxBounds(z.bounds)} pathOptions={RZ_PATH} interactive={false}>
            <Tooltip permanent direction="center" className="map-tip rz-tip">RESTRICTED · {HUMAN(z.type)}</Tooltip>
          </Rectangle>
        ))}
        {gfBounds && <Rectangle bounds={gfBounds} pathOptions={CAUTION_PATH} interactive={false}><Tooltip permanent direction="bottom" className="map-tip caution-tip">GEOFENCE UPDATE · {gf.zone_id} EXPANDED</Tooltip></Rectangle>}
        {scenario.bridges?.map((b) => (
          <Polyline key={b.id} positions={b.cells.map(([x, y]) => geo.center(x, y))} pathOptions={{ color: '#e5c07b', weight: 6, opacity: 0.9 }}>
            <Tooltip className="map-tip">{b.id} bridge</Tooltip>
          </Polyline>
        ))}

        <Circle center={geo.center(hub.x, hub.y)} radius={geo.rangeMeters(hub.range_cells)} pathOptions={{ color: net.controller_online ? '#22d3ee' : '#f87171', weight: 1.2, dashArray: '3 7', fill: false, opacity: 0.7 }} interactive={false} />
        <Marker position={geo.center(hub.x, hub.y)} icon={baseIcon(net.controller_online)} interactive={false} zIndexOffset={500} />

        {layers.links && sim.drones.filter((d) => d.status !== 'failed').map((d) => (
          <Polyline key={`l-${d.id}`} positions={[geo.center(hub.x, hub.y), geo.center(d.x, d.y)]}
            pathOptions={d.connected ? { color: '#2dd4bf', weight: 1, opacity: 0.3 } : { color: '#f87171', weight: 1.8, dashArray: '4 8', opacity: 0.85 }} interactive={false} />
        ))}
        {layers.paths && sim.drones.map((d) => {
          const tr = trails[d.id] ?? [];
          const tk = d.task_id ? tasksById.get(d.task_id) : undefined;
          const dt = d.verifying ? detsById.get(d.verifying) : undefined;
          const tgt = tk ? geo.center(tk.x, tk.y) : dt ? geo.center(dt.x, dt.y) : null;
          return (
            <Fragment key={`p-${d.id}`}>
              {tr.length > 1 && <Polyline positions={tr.map(([x, y]) => geo.center(x, y))} pathOptions={{ color: DRONE_COLOR[d.status], weight: 2.2, dashArray: '6 6', opacity: 0.8 }} interactive={false} />}
              {tgt && <Polyline positions={[geo.center(d.x, d.y), tgt]} pathOptions={{ color: '#22d3ee', weight: 1.6, dashArray: '2 7', opacity: 0.9 }} interactive={false} />}
            </Fragment>
          );
        })}

        {sim.tasks.map((t) => <Marker key={t.id} position={geo.center(t.x, t.y)} icon={taskIcon(t)} interactive={false} />)}
        {detections.map((q) => (
          <Marker key={q.id} position={geo.center(q.x, q.y)} icon={detectionIcon(q)} zIndexOffset={700}>
            <Popup minWidth={270}><DetectionCard det={q} live={live} compact /></Popup>
          </Marker>
        ))}
        {sim.drones.map((d) => (
          <Marker key={d.id} position={geo.center(d.x, d.y)} icon={droneIcon(d, selected === d.id)} zIndexOffset={1000 + (selected === d.id ? 500 : 0)} eventHandlers={{ click: () => select(selected === d.id ? null : d.id) }} />
        ))}
      </MapContainer>

      <div className="absolute left-3 top-3 z-[900] flex flex-col gap-2">
        <div className="flex rounded-lg border border-line bg-bg-900/92 p-0.5 backdrop-blur" role="group" aria-label="Basemap">
          {(['satellite', 'dark', 'street'] as MapStyle[]).map((m) => (
            <button key={m} onClick={() => setSettings({ mapStyle: m })} aria-pressed={mapStyle === m} className={`rounded-md px-2.5 py-1 text-[11px] capitalize ${mapStyle === m ? 'bg-accent/20 text-accent' : 'text-mute hover:text-ink'}`}>{m}</button>
          ))}
        </div>
        <div className="flex items-center gap-0.5 rounded-lg border border-line bg-bg-900/92 p-0.5 backdrop-blur" role="group" aria-label="Map layers">
          <Layers size={13} className="mx-1.5 text-mute" />
          <Toggle on={layers.cells} onClick={() => setLayers({ ...layers, cells: !layers.cells })}>Grid</Toggle>
          <Toggle on={layers.zones} onClick={() => setLayers({ ...layers, zones: !layers.zones })}>Zones</Toggle>
          <Toggle on={layers.paths} onClick={() => setLayers({ ...layers, paths: !layers.paths })}>Paths</Toggle>
          <Toggle on={layers.links} onClick={() => setLayers({ ...layers, links: !layers.links })}>Links</Toggle>
        </div>
        <div className="flex gap-1 rounded-lg border border-line bg-bg-900/92 p-1 backdrop-blur" role="group" aria-label="Quick mission controls">
          {(sim.status === 'idle' || sim.status === 'completed') && <button onClick={() => startMission()} className="flex items-center gap-1 rounded-md bg-accent px-2.5 py-1 text-[11px] font-semibold text-bg-900"><Play size={12} />{sim.status === 'completed' ? 'Run again' : 'Start'}</button>}
          {sim.status === 'running' && <button onClick={() => pauseMission()} className="flex items-center gap-1 rounded-md bg-warn/20 px-2.5 py-1 text-[11px] font-semibold text-warn"><Pause size={12} />Pause</button>}
          {sim.status === 'paused' && <button onClick={() => resumeMission()} className="flex items-center gap-1 rounded-md bg-accent px-2.5 py-1 text-[11px] font-semibold text-bg-900"><Play size={12} />Resume</button>}
          <button onClick={() => resetMission()} className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] text-mute hover:text-ink" aria-label="Reset mission"><RotateCcw size={12} />Reset</button>
        </div>
      </div>

      {banner && <div className="absolute left-1/2 top-3 z-[900] -translate-x-1/2 rounded-md border border-bad/60 bg-bad/85 px-3 py-1 text-[11px] font-bold tracking-wide text-white shadow-lg animate-pulseSoft">{banner}</div>}
      <MapLegend />
      <div className="absolute bottom-1 left-24 z-[900] text-[10px] text-mute">Illustrative location: {scenario.grid.cell_size_m} m cells, {(W * scenario.grid.cell_size_m)} m × {(H * scenario.grid.cell_size_m)} m</div>
    </div>
  );
}

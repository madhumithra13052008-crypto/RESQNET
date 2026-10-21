import L from 'leaflet';
import { DRONE_COLOR, PRIORITY_COLOR } from '../../lib/constants';
import { droneName } from '../../lib/format';
import type { Detection, Drone, Task } from '../../types';

const cache = new Map<string, L.DivIcon>();
const get = (key: string, make: () => L.DivIcon) => {
  let i = cache.get(key);
  if (!i) { i = make(); cache.set(key, i); if (cache.size > 600) cache.clear(); }
  return i;
};

export const droneIcon = (d: Drone, selected: boolean) =>
  get(`d|${d.id}|${d.status}|${Math.round(d.battery)}|${d.connected}|${selected}|${d.task_id ?? ''}`, () => {
    const c = DRONE_COLOR[d.status];
    const cls = `drone-pin${selected ? ' sel' : ''}${d.connected ? '' : ' off'}${d.status === 'failed' ? ' bad' : ''}`;
    const sub = d.status === 'failed' ? 'FAILED' : `${Math.round(d.battery)}% · ${d.status}`;
    return L.divIcon({
      className: 'drone-marker', iconSize: [34, 34], iconAnchor: [17, 17],
      html: `<div class="${cls}" style="--c:${c}"><div class="dp-dot">${d.status === 'failed' ? '×' : 'D' + d.id.replace(/\D/g, '')}</div><div class="dp-label"><b>${droneName(d.id)}</b><i>${sub}</i></div></div>`,
    });
  });

export const taskIcon = (t: Task) =>
  get(`t|${t.id}|${t.status}|${t.overdue}`, () => {
    const done = t.status === 'completed';
    const c = PRIORITY_COLOR[t.priority] ?? '#94a3b8';
    return L.divIcon({
      className: 'task-marker', iconSize: [30, 30], iconAnchor: [15, 15],
      html: `<div class="task-pin${done ? ' done' : ''}${t.overdue && !done ? ' late' : ''}" style="--c:${c}">${done ? '✓' : 'P' + t.priority}<small>${t.id}</small>${t.required_drones > 1 && !done ? `<span class="x2">×${t.required_drones}</span>` : ''}</div>`,
    });
  });

export const detectionIcon = (q: Detection) =>
  get(`q|${q.id}|${q.verification_status}`, () => {
    const m = { unverified: ['#facc15', '?', true], verification_assigned: ['#22d3ee', '⌖', true], confirmed: ['#34d399', '✓', false], dismissed: ['#94a3b8', '×', false] }[q.verification_status] as [string, string, boolean];
    return L.divIcon({ className: 'task-marker', iconSize: [30, 30], iconAnchor: [15, 15], html: `<div class="det-pin${m[2] ? ' pulse' : ''}" style="--c:${m[0]}">${m[1]}</div>` });
  });

export const baseIcon = (online: boolean) =>
  get(`b|${online}`, () => {
    const c = online ? '#22d3ee' : '#f87171';
    return L.divIcon({ className: 'task-marker', iconSize: [34, 34], iconAnchor: [17, 17], html: `<div class="base-pin" style="--c:${c}">H<span>BASE · CONTROLLER ${online ? 'ONLINE' : 'OFFLINE'}</span></div>` });
  });

export const fmtTime = (sec: number) => {
  const s = Math.max(0, Math.floor(sec));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};
export const pct = (n: number, d = 1) => `${n.toFixed(d)}%`;
/** Dataset rule: column letter A-T + row number 1-20 (x=1,y=3 -> B4). */
export const sectorName = (x: number, y: number) => `${String.fromCharCode(65 + x)}${y + 1}`;
export const droneNum = (id: string) => id.replace(/\D/g, '').padStart(2, '0');
export const droneName = (id: string) => `DRONE ${droneNum(id)}`;
export const fmtDate = (iso: string) => {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? iso : d.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};
export const num = (n: number | null | undefined, suffix = '') => (n === null || n === undefined ? '—' : `${n}${suffix}`);

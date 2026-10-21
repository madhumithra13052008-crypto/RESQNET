import type { LatLngBoundsExpression, LatLngExpression } from 'leaflet';
import type { Bounds, Scenario } from '../types';

// The dataset has no coordinates. These anchors (north-west corner of the 20x20 grid) are ILLUSTRATIVE and can be
// changed in Settings. If the backend adds `geo: {lat,lng}` to a scenario, that value wins.
export const DEFAULT_ANCHORS: Record<string, { lat: number; lng: number }> = {
  earthquake: { lat: 27.7062, lng: 85.3135 },
  cyclone: { lat: 19.8062, lng: 85.8228 },
  flood: { lat: 9.5002, lng: 76.3365 },
};
export const FALLBACK_ANCHOR = { lat: 20.0, lng: 78.0 };

export function makeGeo(sc: Scenario, anchor: { lat: number; lng: number }) {
  const size = sc.grid.cell_size_m;
  const dLat = size / 111320;
  const dLng = size / (111320 * Math.cos((anchor.lat * Math.PI) / 180));
  const W = sc.grid.width, H = sc.grid.height;
  const sw = (x: number, y: number): [number, number] => [anchor.lat - (y + 1) * dLat, anchor.lng + x * dLng];
  const ne = (x: number, y: number): [number, number] => [anchor.lat - y * dLat, anchor.lng + (x + 1) * dLng];
  return {
    cellBounds: (x: number, y: number): LatLngBoundsExpression => [sw(x, y), ne(x, y)],
    boxBounds: (b: Bounds): LatLngBoundsExpression => [sw(b.x0, b.y1), ne(b.x1, b.y0)],
    center: (x: number, y: number): LatLngExpression => [anchor.lat - (y + 0.5) * dLat, anchor.lng + (x + 0.5) * dLng],
    gridBounds: [[anchor.lat - H * dLat, anchor.lng], [anchor.lat, anchor.lng + W * dLng]] as LatLngBoundsExpression,
    rangeMeters: (cells: number) => cells * size,
  };
}
export type Geo = ReturnType<typeof makeGeo>;

# RESQNET Frontend (v2, dataset-driven)

React 18 + TypeScript + Vite mission-control dashboard for **RESQNET: Resilient Swarm Coordination for Disaster Response**.
Stack: Tailwind CSS 3, Zustand, Axios, Recharts, Lucide, React Leaflet + Leaflet.

## Run
```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check + production build (deploy dist/ to Vercel)
```

## Built around `disaster_scenarios.json` (contract 1.0)
- Scenarios, 20x20 grids, 25 m cells, obstacles, no-fly zones, comm dead zones, hub range, 16 priority zones (Z01-Z16), tasks (priority 1-5, deadlines, `required_drones`), candidate detections and flood bridges are all read from the catalog (`GET /api/scenarios`). The bundled copy lives in `src/api/mock/data/`.
- Sector labels follow the dataset: column letter + row number (x=1,y=3 -> **B4**).
- Only `network_reliability` is adjustable (0.30 to 1.00, step 0.05). Other conditions are shown read-only.
- Detections follow `unverified -> verification_assigned -> confirmed | dismissed`. `ground_truth` is never used by the UI. A finding is "confirmed" only when the backend says so.
- Map legend colours come from `meta.map_legend` (green searched, yellow in progress / needs verification, red priority / unresolved candidate, grey blocked, blue unexplored).

## Real map
Mission Control shows the grid projected on a real basemap (satellite / dark / street) with: coloured search cells, priority zones, restricted zones, comm dead zones, base + controller link range, per-drone link lines (red dashed when lost), flight paths and targets, task pins (P1-P5, x2 for two-drone tasks), detection pins with evidence popups, drone callouts, legend, scale. A flat Grid view is one click away.
The dataset has no coordinates, so each scenario is anchored at an **illustrative** location (Settings -> Map location). If the backend adds `geo: {lat, lng}` to a scenario it wins.
Tiles load from the internet (Esri, CARTO, OpenStreetMap).

## Not supplied: `drone_config.json`, `failure_scenarios.json`
- Drones: 6, starting on the free cells nearest the base, battery 90-100% (assumption).
- Failure scenarios: the frontend loads them from `GET /api/failure-scenarios`; the mock serves a default suite named after the plan (normal_operation, controller_failure, network_partition, drone_failure, packet_loss, multi_failure). Send the real files and these can be replaced.

## Mock engine vs backend
`VITE_USE_MOCK=true` (default) runs a deterministic browser simulation of the dataset implementing the same contract (hub range, dead zones, 2-drone tasks, deadlines, verification passes, a scripted geofence expansion at 180 s). `false` uses the FastAPI backend. Switch in Settings. The endpoint list is in Settings -> Backend contract; JSON shapes are in `src/types/index.ts`.

## Screens
Home · Mission Control · Scenarios · Experiments · Analytics · Settings (see the plan's screen list).
Mission Control: header strip, status / area / zone panels (left), live map + mission controls + failure injection (centre), alerts / fleet / drone details (right), flight log / battery / reassignments / tasks, findings (Output B) and outcomes (Output C).

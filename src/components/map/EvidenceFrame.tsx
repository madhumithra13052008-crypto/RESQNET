import { VERIFY_META } from '../../lib/constants';
import type { Detection } from '../../types';

/** Simulated evidence frame: draws the dataset's cv_payload bounding box. No real image exists in the simulation. */
export function EvidenceFrame({ det }: { det: Detection }) {
  const d = det.cv_payload?.detections?.[0];
  const [x0, y0, x1, y1] = d?.bbox ?? [0, 0, 0, 0];
  const color = det.verification_status === 'confirmed' ? '#34d399' : det.verification_status === 'dismissed' ? '#94a3b8' : '#facc15';
  return (
    <figure className="m-0">
      <svg viewBox="0 0 640 480" className="w-full rounded-md border border-line bg-bg-900" role="img" aria-label={`Simulated evidence frame ${det.evidence_image_id} with detection box`}>
        <defs>
          <linearGradient id={`g-${det.id}`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#16263e" /><stop offset="1" stopColor="#0b1424" /></linearGradient>
          <pattern id={`p-${det.id}`} width="32" height="32" patternUnits="userSpaceOnUse"><path d="M32 0H0V32" fill="none" stroke="#22395a" strokeWidth="1" opacity=".6" /></pattern>
        </defs>
        <rect width="640" height="480" fill={`url(#g-${det.id})`} />
        <rect width="640" height="480" fill={`url(#p-${det.id})`} />
        <text x="14" y="26" fill="#8aa0bf" fontSize="16" fontFamily="monospace">{det.evidence_image_id} · simulated</text>
        {d && (
          <g>
            <rect x={x0} y={y0} width={x1 - x0} height={y1 - y0} fill={color} fillOpacity=".12" stroke={color} strokeWidth="3" />
            <rect x={x0} y={Math.max(0, y0 - 24)} width="132" height="24" fill={color} />
            <text x={x0 + 6} y={Math.max(16, y0 - 7)} fill="#0a1220" fontSize="15" fontWeight="700" fontFamily="monospace">{d.label} {Math.round(d.confidence * 100)}%</text>
          </g>
        )}
      </svg>
      <figcaption className="mt-1 text-[10px] text-mute">Simulated evidence (no real image). Status: {VERIFY_META[det.verification_status].label}.</figcaption>
    </figure>
  );
}

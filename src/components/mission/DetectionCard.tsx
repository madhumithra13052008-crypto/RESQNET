import { Crosshair, X } from 'lucide-react';
import { VERIFY_META } from '../../lib/constants';
import { fmtTime } from '../../lib/format';
import { detectionAction } from '../../store/actions';
import type { Detection } from '../../types';
import { EvidenceFrame } from '../map/EvidenceFrame';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { ProgressBar } from '../ui/ProgressBar';

export function DetectionCard({ det, live, compact = false }: { det: Detection; live: boolean; compact?: boolean }) {
  const v = VERIFY_META[det.verification_status];
  const open = det.verification_status === 'unverified' || det.verification_status === 'verification_assigned';
  const headline = det.verification_status === 'confirmed' ? `Person confirmed in Sector ${det.sector}` : det.verification_status === 'dismissed' ? `Detection in Sector ${det.sector} dismissed` : `Possible person detected in Sector ${det.sector}`;
  return (
    <div className={compact ? 'w-[260px]' : 'flex gap-3'}>
      <div className={compact ? '' : 'w-40 shrink-0'}><EvidenceFrame det={det} /></div>
      <div className="min-w-0 flex-1">
        <div className="mt-2 flex flex-wrap items-center gap-2 sm:mt-0">
          <span className="mono text-xs font-semibold">{det.id}</span>
          <Badge tone={v.tone}>{v.label}</Badge>
          <span className="mono text-[11px] text-mute">zone {det.zone_id}</span>
        </div>
        <p className="mt-1 text-sm">{headline}</p>
        <div className="mt-1.5 flex items-center gap-2 text-xs text-mute">
          <span>Confidence</span>
          <div className="w-20"><ProgressBar value={det.confidence * 100} color={det.confidence > 0.8 ? '#34d399' : '#fbbf24'} height={5} /></div>
          <span className="mono text-ink">{Math.round(det.confidence * 100)}%</span>
        </div>
        <div className="mono mt-1 text-[11px] text-mute">found by {det.detected_by} at {fmtTime(det.detected_at)} · ({det.x}, {det.y}){det.verifier ? ` · verifier ${det.verifier}` : ''}</div>
        {open && (
          <div className="mt-2 flex flex-wrap gap-2">
            {det.verification_status === 'unverified' && <Button size="sm" variant="primary" disabled={!live} onClick={() => detectionAction(det.id, 'assign')}><Crosshair size={13} />Assign verification</Button>}
            <Button size="sm" disabled={!live} onClick={() => detectionAction(det.id, 'dismiss')}><X size={13} />Dismiss</Button>
          </div>
        )}
        {det.verification_status === 'verification_assigned' && <p className="mt-1.5 text-[11px] text-accent">{det.verifier ? `${det.verifier} is flying a verification pass.` : 'Waiting for a free drone.'}</p>}
      </div>
    </div>
  );
}

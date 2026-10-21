import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from 'recharts';
import type { HistoryPoint } from '../../types';

export function CoverageChart({ data, height = 190 }: { data: HistoryPoint[]; height?: number }) {
  return (
    <div style={{ height }} aria-label="Coverage and task completion over time">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 6, right: 10, bottom: 0, left: -18 }}>
          <CartesianGrid stroke="#22395a" strokeDasharray="3 3" />
          <XAxis dataKey="t" stroke="#8aa0bf" fontSize={11} tickFormatter={(v) => `${v}s`} />
          <YAxis stroke="#8aa0bf" fontSize={11} domain={[0, 100]} unit="%" />
          <Tooltip contentStyle={{ background: '#0e1a2e', border: '1px solid #22395a', borderRadius: 8, fontSize: 12 }} labelFormatter={(v) => `t=${v}s`} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Line type="monotone" dataKey="coverage" name="Coverage" stroke="#22d3ee" dot={false} strokeWidth={2} isAnimationActive={false} />
          <Line type="monotone" dataKey="completed" name="Tasks done" stroke="#2dd4bf" dot={false} strokeWidth={2} strokeDasharray="5 3" isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

import { Activity, BarChart3, Download, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { getApi } from '../api';
import { CoverageChart } from '../components/mission/CoverageChart';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Empty } from '../components/ui/Empty';
import { Stat } from '../components/ui/Stat';
import { HUMAN, MODE_META, SEVERITY_COLOR } from '../lib/constants';
import { download, eventsToCsv, exportRunCsv, exportRunJson, runsToCsv } from '../lib/export';
import { fmtDate, fmtTime, num } from '../lib/format';
import { useSettingsStore } from '../store/useSettingsStore';
import { useSimStore } from '../store/useSimStore';
import type { CoordinationMode, RunDetail, RunSummary, Severity } from '../types';

const TYPE_COLORS = ['#a855f7', '#8b5cf6', '#fb7185', '#60a5fa', '#2dd4bf', '#fbbf24', '#34d399', '#f472b6', '#94a3b8'];
const SEVS: Severity[] = ['error', 'warning', 'success', 'info'];
const tip = { contentStyle: { background: '#0e1a2e', border: '1px solid #22395a', borderRadius: 8, fontSize: 12 } };

function EventReport({ run }: { run: RunDetail }) {
  const [types, setTypes] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(0);
  const allTypes = useMemo(() => [...new Set(run.events.map((e) => e.type))], [run]);
  const events = useMemo(() => run.events.filter((e) => types.size === 0 || types.has(e.type)), [run, types]);
  const buckets = useMemo(() => {
    const size = 30, n = Math.ceil((run.duration_s + 1) / size);
    const rows = Array.from({ length: n }, (_, i) => ({ t: i * size, error: 0, warning: 0, success: 0, info: 0 }));
    events.forEach((e) => { rows[Math.min(n - 1, Math.floor(e.t / size))][e.severity]++; });
    return rows;
  }, [events, run.duration_s]);
  const byType = useMemo(() => allTypes.map((t) => ({ name: t, value: events.filter((e) => e.type === t).length })).filter((x) => x.value), [allTypes, events]);
  const rows = events.slice().reverse();
  const pages = Math.max(1, Math.ceil(rows.length / 12));
  const toggle = (t: string) => { const n = new Set(types); n.has(t) ? n.delete(t) : n.add(t); setTypes(n); setPage(0); };
  return (
    <div className="rounded-2xl border border-[#243a7a] bg-[#101a45] p-4 shadow-xl">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-xl font-semibold"><Activity size={20} className="text-accent" />Event Reports <span className="text-sm font-normal text-mute">· {run.scenario_name} · {MODE_META[run.mode].label}</span></h2>
        <div className="flex gap-2"><Button size="sm" onClick={() => download(`resqnet-${run.run_id}-events.csv`, eventsToCsv(events), 'text/csv')}><Download size={13} />Events CSV</Button><Button size="sm" onClick={() => exportRunCsv(run)}><Download size={13} />Summary CSV</Button><Button size="sm" onClick={() => exportRunJson(run)}><Download size={13} />JSON</Button></div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs"><span className="text-mute">Filtered by:</span>
        {allTypes.map((t) => <button key={t} onClick={() => toggle(t)} aria-pressed={types.has(t)} className={`rounded-full border px-2.5 py-0.5 ${types.has(t) ? 'border-accent bg-accent/20 text-accent' : 'border-[#324a8f] text-mute hover:text-ink'}`}>{HUMAN(t)}</button>)}
        {types.size > 0 && <button onClick={() => setTypes(new Set())} className="text-accent underline">clear</button>}</div>
      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="rounded-xl bg-[#17317a]/70 p-3">
          <div className="h-60"><ResponsiveContainer width="100%" height="100%">
            <LineChart data={buckets} margin={{ top: 8, right: 10, bottom: 0, left: -18 }}>
              <CartesianGrid stroke="#3b5bb0" strokeDasharray="2 6" vertical={false} />
              <XAxis dataKey="t" stroke="#b6c4f0" fontSize={11} tickFormatter={(v) => fmtTime(v)} /><YAxis stroke="#b6c4f0" fontSize={11} allowDecimals={false} />
              <Tooltip {...tip} labelFormatter={(v) => `from ${fmtTime(Number(v))}`} /><Legend wrapperStyle={{ fontSize: 11 }} />
              {SEVS.map((s) => <Line key={s} type="monotone" dataKey={s} stroke={SEVERITY_COLOR[s]} strokeWidth={2.5} dot={{ r: 3.5 }} isAnimationActive={false} />)}
            </LineChart></ResponsiveContainer></div>
        </div>
        <div className="flex items-center gap-3 rounded-xl bg-[#17317a]/40 p-3">
          <div className="relative h-36 w-36 shrink-0">
            <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={byType} dataKey="value" innerRadius={44} outerRadius={64} stroke="none" isAnimationActive={false}>{byType.map((_, i) => <Cell key={i} fill={TYPE_COLORS[i % TYPE_COLORS.length]} />)}</Pie></PieChart></ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"><b className="mono text-xl">{events.length}</b><span className="text-[10px] text-mute">events</span></div>
          </div>
          <ul className="space-y-1 text-[11px]">{byType.slice(0, 7).map((x, i) => <li key={x.name} className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: TYPE_COLORS[i % TYPE_COLORS.length] }} /><b className="mono">{x.value}</b><span className="text-mute">{HUMAN(x.name)}</span></li>)}</ul>
        </div>
      </div>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[620px] text-sm">
          <thead><tr className="text-left text-xs text-[#b6c4f0]"><th className="py-2 pl-3">Severity</th><th>Event type</th><th>Drone</th><th>Message</th><th>Mission time</th></tr></thead>
          <tbody>{rows.slice(page * 12, page * 12 + 12).map((e, i) => (
            <tr key={e.id} className={i % 2 ? 'bg-[#142257]' : 'bg-[#182b6a]/60'}><td className="border-l-4 py-2 pl-3" style={{ borderColor: SEVERITY_COLOR[e.severity] }}>{e.severity}</td><td>{HUMAN(e.type)}</td><td className="mono">{e.drone_id ?? '—'}</td><td className="max-w-[420px] truncate" title={e.message}>{e.message}</td><td className="mono">{fmtTime(e.t)}</td></tr>))}</tbody>
        </table>
      </div>
      <div className="mt-2 flex items-center justify-end gap-3 text-xs text-[#b6c4f0]"><span>{rows.length ? page * 12 + 1 : 0} – {Math.min(rows.length, page * 12 + 12)} of {rows.length}</span>
        <button disabled={page === 0} onClick={() => setPage(page - 1)} className="px-2 disabled:opacity-30" aria-label="Previous page">‹</button><button disabled={page + 1 >= pages} onClick={() => setPage(page + 1)} className="px-2 disabled:opacity-30" aria-label="Next page">›</button></div>
    </div>
  );
}

export default function AnalyticsPage() {
  const { useMock, apiUrl } = useSettingsStore();
  const setError = useSimStore((s) => s.setError);
  const [runs, setRuns] = useState<RunSummary[]>([]);
  const [detail, setDetail] = useState<RunDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const refresh = useCallback(async () => { setLoading(true); try { setRuns(await getApi().listRuns()); } catch (e) { setError((e as Error).message); } finally { setLoading(false); } }, [setError]);
  useEffect(() => { refresh(); }, [refresh, useMock, apiUrl]);
  const open = async (id: string) => { try { setDetail(await getApi().getRun(id)); } catch (e) { setError((e as Error).message); } };
  const byMode = useMemo(() => (['centralized', 'decentralized', 'hybrid'] as CoordinationMode[]).map((m) => {
    const r = runs.filter((x) => x.mode === m);
    return { mode: m, name: MODE_META[m].short, n: r.length, coverage: r.length ? Math.round((r.reduce((a, b) => a + b.metrics.coverage, 0) / r.length) * 10) / 10 : 0 };
  }), [runs]);

  return (
    <div className="mx-auto max-w-[1300px] space-y-4 p-3 md:p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><h1 className="text-2xl font-semibold">Analytics</h1><p className="mt-1 text-sm text-mute">Saved simulation runs and their metrics. Open a run to reopen its results, or export the evidence.</p></div>
        <div className="flex gap-2">
          <Button onClick={refresh} disabled={loading}><RefreshCw size={14} className={loading ? 'animate-spin' : ''} />Refresh</Button>
          <Button disabled={!runs.length} onClick={() => download('resqnet-runs.csv', runsToCsv(runs), 'text/csv')}><Download size={14} />All runs CSV</Button>
          <Button disabled={!runs.length} onClick={() => download('resqnet-runs.json', JSON.stringify(runs, null, 2), 'application/json')}><Download size={14} />All runs JSON</Button>
        </div>
      </div>
      {runs.length === 0 ? <Card><Empty icon={<BarChart3 size={30} />} title="No saved runs yet" hint="Runs are saved when a mission finishes or is reset. Start a mission from Mission Control." /></Card> : (
        <>
          <Card title="Average coverage by mode (saved runs)">
            <div className="h-44"><ResponsiveContainer width="100%" height="100%"><BarChart data={byMode} margin={{ top: 14, right: 8, bottom: 0, left: -18 }}>
              <CartesianGrid stroke="#22395a" strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" stroke="#8aa0bf" fontSize={11} /><YAxis stroke="#8aa0bf" fontSize={11} domain={[0, 100]} unit="%" />
              <Tooltip {...tip} formatter={(v, _n, p) => [`${v}% over ${p?.payload?.n ?? 0} run(s)`, 'Coverage']} />
              <Bar dataKey="coverage" radius={[4, 4, 0, 0]} label={{ position: 'top', fill: '#e6eef9', fontSize: 11 }} isAnimationActive={false}>{byMode.map((d) => <Cell key={d.mode} fill={MODE_META[d.mode].color} />)}</Bar>
            </BarChart></ResponsiveContainer></div>
            <p className="text-xs text-mute">Runs differ in scenario, seed and failures, so this is a rough overview. Use Experiments for a fair comparison.</p>
          </Card>
          <Card title="Saved runs" bodyClass="p-0">
            <div className="overflow-x-auto"><table className="w-full min-w-[820px] text-sm">
              <thead><tr className="border-b border-line text-left text-xs text-mute">{['Started', 'Scenario', 'Mode', 'Failures', 'Seed', 'Status', 'Coverage', 'Tasks', 'Dupes', 'Recovery', ''].map((h) => <th key={h} className="px-3 py-2 font-medium">{h}</th>)}</tr></thead>
              <tbody>{runs.map((r) => (
                <tr key={r.run_id} className={`border-b border-line/40 hover:bg-bg-700/50 ${detail?.run_id === r.run_id ? 'bg-accent/5' : ''}`}>
                  <td className="px-3 py-2 text-xs text-mute">{fmtDate(r.started_at)}</td><td className="px-3 py-2">{r.scenario_name}</td>
                  <td className="px-3 py-2" style={{ color: MODE_META[r.mode].color }}>{MODE_META[r.mode].label}</td><td className="px-3 py-2 text-xs text-mute">{HUMAN(r.failure_scenario)}</td>
                  <td className="mono px-3 py-2">{r.seed}</td><td className="px-3 py-2"><Badge tone={r.status === 'completed' ? 'ok' : 'mute'}>{r.status}</Badge></td>
                  <td className="mono px-3 py-2">{r.metrics.coverage.toFixed(1)}%</td><td className="mono px-3 py-2">{r.metrics.tasks_completed}/{r.metrics.tasks_total}</td>
                  <td className="mono px-3 py-2">{r.metrics.duplicate_assignments}</td><td className="mono px-3 py-2">{num(r.metrics.recovery_time, 's')}</td>
                  <td className="px-3 py-2 text-right"><Button size="sm" onClick={() => open(r.run_id)}>Open</Button></td>
                </tr>))}</tbody></table></div>
          </Card>
        </>
      )}
      {detail && (
        <>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Stat label="Coverage" value={`${detail.metrics.coverage.toFixed(1)}%`} tone="cyan" /><Stat label="Tasks" value={`${detail.metrics.tasks_completed}/${detail.metrics.tasks_total}`} tone="ok" sub={`${detail.metrics.deadlines_missed} deadlines missed`} />
            <Stat label="Messages" value={detail.metrics.comm_overhead} /><Stat label="Safety violations" value={detail.metrics.safety_violations} tone={detail.metrics.safety_violations ? 'bad' : 'ok'} />
          </div>
          {detail.series?.length > 1 && <Card title="Progress over time"><CoverageChart data={detail.series} /></Card>}
          <EventReport run={detail} />
        </>
      )}
    </div>
  );
}

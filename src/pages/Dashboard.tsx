import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Wallet, Target, TrendingUp, Percent, PlusCircle, Brain, Bot, Lightbulb, AlertTriangle, Cpu,
} from 'lucide-react';
import { api } from '../lib/api';
import type { DashboardData } from '../lib/types';
import { inr, pct, pnlClass, sign, voteTone, statusTone, timeAgo } from '../lib/format';
import { Card, StatCard, Badge, Spinner, Button, EmptyState } from '../components/ui';

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  const load = () => {
    setLoading(true);
    setErr('');
    api.dashboard().then(setData).catch((e) => setErr(e.message)).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  if (loading) {
    return <div className="flex items-center justify-center py-24"><Spinner className="h-7 w-7" /></div>;
  }
  if (err) {
    return (
      <div className="py-24 text-center">
        <p className="text-sm text-rose-400">Failed to load dashboard: {err}</p>
        <Button className="mt-4" onClick={load}>Retry</Button>
      </div>
    );
  }
  if (!data) return null;

  const a = data.account;
  const configuredCount = data.providers.filter((p) => p.configured).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Trading Dashboard</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Multi-LLM decision engine for Indian options &amp; commodities
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone={data.paperMode ? 'amber' : 'emerald'}>{data.paperMode ? 'Paper Mode' : 'Live Mode'}</Badge>
          <Link to="/new"><Button><PlusCircle size={16} /> New Decision</Button></Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Equity" value={inr(a.equity)} sub={`Start ${inr(a.virtual_capital)}`} icon={<Wallet size={16} />} />
        <StatCard label="Realized P&L" value={`${sign(a.realized_pnl)}${inr(a.realized_pnl)}`} tone={a.realized_pnl >= 0 ? 'emerald' : 'rose'} sub={`${a.total_decisions} closed trades`} icon={<TrendingUp size={16} />} />
        <StatCard label="Win Rate" value={pct(a.win_rate)} sub={`${a.wins}W / ${a.losses}L`} tone={a.win_rate >= 50 ? 'emerald' : 'amber'} icon={<Target size={16} />} />
        <StatCard label="Open Positions" value={a.open_count} sub={`of max risk positions`} tone="sky" icon={<Percent size={16} />} />
      </div>

      <Card className="flex flex-wrap items-center gap-3 p-4">
        <Cpu size={16} className="text-emerald-400" />
        <span className="text-sm text-zinc-300">LLM Providers:</span>
        <div className="flex flex-wrap gap-2">
          {data.providers.map((p) => (
            <span
              key={p.id}
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${p.configured ? 'bg-emerald-500/15 text-emerald-400' : 'bg-zinc-800 text-zinc-500'}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${p.configured ? 'bg-emerald-400' : 'bg-zinc-600'}`} />
              {p.name}
            </span>
          ))}
        </div>
        <span className="ml-auto text-xs text-zinc-500">
          {configuredCount > 0 ? `${configuredCount}/${data.providers.length} configured` : 'Heuristic mode — add keys in Setup'}
        </span>
        <Link to="/setup" className="text-xs text-emerald-400 hover:underline">Configure →</Link>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">Recent Decisions</h2>
            <Link to="/decisions" className="text-xs text-emerald-400 hover:underline">View all →</Link>
          </div>
          {data.recentDecisions.length === 0 ? (
            <Card className="p-4"><EmptyState icon={<Brain size={28} />} title="No decisions yet" hint="Run your first multi-LLM decision from the New Decision page." /></Card>
          ) : (
            <div className="space-y-2">
              {data.recentDecisions.map((d) => {
                const out = d.trade_outcomes?.[0];
                return (
                  <Card key={d.id} className="flex items-center gap-3 p-3">
                    <Badge tone={voteTone(d.action)}>{d.action}</Badge>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-zinc-100">
                        {d.instrument} <span className="text-zinc-500">{d.option_type} {d.strike}</span>
                      </div>
                      <div className="text-xs text-zinc-500">
                        {d.segment === 'commodity' ? 'MCX' : 'NSE'} · {d.qty} lot×{d.lot_size} · {timeAgo(d.created_at)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-sm tabular-nums text-zinc-300">{d.confidence}%</div>
                      {out ? (
                        <div className={`font-mono text-xs tabular-nums ${pnlClass(out.pnl)}`}>{sign(out.pnl)}{inr(out.pnl)}</div>
                      ) : (
                        <Badge tone={statusTone(d.status)} className="mt-0.5">{d.status}</Badge>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-400">Agent Performance</h2>
            <Card className="divide-y divide-zinc-800">
              {data.agents.map((ag) => (
                <div key={ag.id} className="flex items-center gap-3 p-3">
                  <Bot size={16} className="text-zinc-500" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm text-zinc-200">{ag.name}</div>
                    <div className="text-xs text-zinc-500">{ag.role} · {ag.decisions_count} votes</div>
                  </div>
                  <div className="text-right font-mono text-sm tabular-nums">
                    {ag.win_rate != null ? (
                      <span className={ag.win_rate >= 55 ? 'text-emerald-400' : ag.win_rate >= 45 ? 'text-amber-400' : 'text-rose-400'}>{pct(ag.win_rate, 0)}</span>
                    ) : (
                      <span className="text-zinc-600">—</span>
                    )}
                  </div>
                </div>
              ))}
            </Card>
          </div>

          <div>
            <div className="mb-2 flex items-center gap-2">
              <Lightbulb size={14} className="text-amber-400" />
              <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">Learned Lessons</h2>
            </div>
            {data.lessons.length === 0 ? (
              <Card className="p-4"><EmptyState icon={<AlertTriangle size={24} />} title="No lessons yet" hint="Record trade outcomes to generate lessons." /></Card>
            ) : (
              <div className="space-y-2">
                {data.lessons.slice(0, 5).map((l) => (
                  <Card key={l.id} className="p-3">
                    <p className="text-xs leading-relaxed text-zinc-300">{l.lesson_text}</p>
                    {l.sample_size > 0 && (
                      <div className="mt-1 text-[10px] text-zinc-600">n={l.sample_size} · {pct(l.win_rate, 0)} win</div>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

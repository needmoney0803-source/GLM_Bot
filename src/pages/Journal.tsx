import { useEffect, useState, useMemo, type ReactNode } from 'react';
import { BookOpen } from 'lucide-react';
import { api } from '../lib/api';
import type { Decision } from '../lib/types';
import { inr, pct, pnlClass, sign, voteTone } from '../lib/format';
import { Card, Spinner, EmptyState, Badge, cn } from '../components/ui';

export default function Journal() {
  const [items, setItems] = useState<Decision[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [symbol, setSymbol] = useState('all');

  useEffect(() => {
    api.decisions({ status: 'closed' }).then(setItems).catch((e) => setErr(e.message)).finally(() => setLoading(false));
  }, []);

  const symbols = useMemo(() => Array.from(new Set(items.map((d) => d.instrument))), [items]);
  const filtered = symbol === 'all' ? items : items.filter((d) => d.instrument === symbol);
  const totalPnl = filtered.reduce((a, d) => a + Number(d.trade_outcomes?.[0]?.pnl || 0), 0);
  const wins = filtered.filter((d) => Number(d.trade_outcomes?.[0]?.pnl) > 0).length;
  const wr = filtered.length ? (wins / filtered.length * 100) : 0;

  if (loading) return <div className="flex justify-center py-16"><Spinner className="h-7 w-7" /></div>;
  if (err) return <div className="py-16 text-center text-sm text-rose-400">{err}</div>;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">Trade Journal</h1>
        <p className="mt-1 text-sm text-zinc-500">Closed trades feed the self-learning loop.</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card className="p-4"><div className="text-xs uppercase text-zinc-500">Net P&L</div><div className={cn('mt-1 font-mono text-xl tabular-nums', pnlClass(totalPnl))}>{sign(totalPnl)}{inr(totalPnl)}</div></Card>
        <Card className="p-4"><div className="text-xs uppercase text-zinc-500">Win Rate</div><div className="mt-1 font-mono text-xl tabular-nums text-zinc-100">{pct(wr, 0)}</div></Card>
        <Card className="p-4"><div className="text-xs uppercase text-zinc-500">Trades</div><div className="mt-1 font-mono text-xl tabular-nums text-zinc-100">{filtered.length}</div></Card>
      </div>

      <div className="flex gap-1 overflow-x-auto">
        <FilterPill active={symbol === 'all'} onClick={() => setSymbol('all')}>All</FilterPill>
        {symbols.map((s) => <FilterPill key={s} active={symbol === s} onClick={() => setSymbol(s)}>{s}</FilterPill>)}
      </div>

      {filtered.length === 0 ? (
        <Card className="p-4"><EmptyState icon={<BookOpen size={28} />} title="No closed trades yet" hint="Record outcomes on open decisions to populate the journal." /></Card>
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-800 text-xs uppercase text-zinc-500">
              <tr>
                <th className="p-3">Instrument</th><th className="p-3">Action</th><th className="p-3 text-right">Entry</th><th className="p-3 text-right">Exit</th><th className="p-3 text-right">Qty</th><th className="p-3 text-right">P&L</th><th className="p-3 text-right">%</th><th className="p-3">Result</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {filtered.map((d) => {
                const o = d.trade_outcomes?.[0];
                if (!o) return null;
                return (
                  <tr key={d.id} className="hover:bg-zinc-800/30">
                    <td className="p-3"><div className="font-medium text-zinc-100">{d.instrument}</div><div className="text-xs text-zinc-500">{d.option_type} {d.strike}</div></td>
                    <td className="p-3"><Badge tone={voteTone(d.action)}>{d.action}</Badge></td>
                    <td className="p-3 text-right font-mono tabular-nums text-zinc-300">{inr(d.entry_price)}</td>
                    <td className="p-3 text-right font-mono tabular-nums text-zinc-300">{inr(o.exit_price)}</td>
                    <td className="p-3 text-right font-mono tabular-nums text-zinc-400">{d.qty}×{d.lot_size}</td>
                    <td className={cn('p-3 text-right font-mono tabular-nums', pnlClass(o.pnl))}>{sign(o.pnl)}{inr(o.pnl)}</td>
                    <td className={cn('p-3 text-right font-mono tabular-nums', pnlClass(o.pnl))}>{sign(o.pnl_percent)}{pct(Math.abs(o.pnl_percent), 1).replace('%','%')}</td>
                    <td className="p-3 text-xs text-zinc-400">{o.result.replace(/_/g, ' ')}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

function FilterPill({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return <button onClick={onClick} className={cn('whitespace-nowrap rounded-full px-3 py-1 text-xs', active ? 'bg-emerald-500 text-zinc-950' : 'bg-zinc-800 text-zinc-400')}>{children}</button>;
}

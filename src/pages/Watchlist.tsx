import { useEffect, useState } from 'react';
import { Eye, Plus, Pencil, Trash2 } from 'lucide-react';
import { api } from '../lib/api';
import type { WatchItem } from '../lib/types';
import { Card, Badge, Button, Spinner, Input, Select, Field, Toggle, Modal, EmptyState, cn } from '../components/ui';

const blank: Partial<WatchItem> = { symbol: '', name: '', segment: 'equity_fno', exchange: 'NSE', lot_size: 50, enabled: true };

export default function Watchlist() {
  const [items, setItems] = useState<WatchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [edit, setEdit] = useState<Partial<WatchItem> | null>(null);
  const [busy, setBusy] = useState(false);

  const load = () => { setLoading(true); api.watchlist().then(setItems).catch((e) => setErr(e.message)).finally(() => setLoading(false)); };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!edit) return;
    setBusy(true); setErr('');
    try { await api.saveWatch(edit); setEdit(null); load(); } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  };
  const remove = async (id: number) => { if (!confirm('Remove instrument?')) return; await api.deleteWatch(id); load(); };

  if (loading) return <div className="flex justify-center py-16"><Spinner className="h-7 w-7" /></div>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Watchlist</h1>
          <p className="mt-1 text-sm text-zinc-500">NSE F&amp;O equity &amp; MCX commodity options instruments.</p>
        </div>
        <Button onClick={() => setEdit({ ...blank })}><Plus size={16} /> Add Instrument</Button>
      </div>

      {items.length === 0 ? <Card className="p-4"><EmptyState icon={<Eye size={28} />} title="No instruments" /></Card> : (
        <Card className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-800 text-xs uppercase text-zinc-500"><tr><th className="p-3">Symbol</th><th className="p-3">Name</th><th className="p-3">Segment</th><th className="p-3">Exchange</th><th className="p-3 text-right">Lot Size</th><th className="p-3 text-center">Enabled</th><th className="p-3"></th></tr></thead>
            <tbody className="divide-y divide-zinc-800/60">
              {items.map((w) => (
                <tr key={w.id} className="hover:bg-zinc-800/30">
                  <td className="p-3 font-medium text-zinc-100">{w.symbol}</td>
                  <td className="p-3 text-zinc-400">{w.name}</td>
                  <td className="p-3"><Badge tone={w.segment === 'commodity' ? 'amber' : 'sky'}>{w.segment === 'commodity' ? 'Commodity' : 'Equity F&O'}</Badge></td>
                  <td className="p-3 text-zinc-400">{w.exchange}</td>
                  <td className="p-3 text-right font-mono tabular-nums text-zinc-300">{w.lot_size}</td>
                  <td className="p-3 text-center"><span className={cn('inline-block h-2 w-2 rounded-full', w.enabled ? 'bg-emerald-400' : 'bg-zinc-600')} /></td>
                  <td className="p-3"><div className="flex gap-1"><button onClick={() => setEdit(w)} className="rounded p-1 text-zinc-500 hover:text-zinc-200"><Pencil size={14} /></button><button onClick={() => remove(w.id)} className="rounded p-1 text-zinc-500 hover:text-rose-400"><Trash2 size={14} /></button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {edit && (
        <Modal open onClose={() => setEdit(null)} title={edit.id ? 'Edit Instrument' : 'Add Instrument'}>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Symbol"><Input value={edit.symbol || ''} onChange={(e) => setEdit({ ...edit, symbol: e.target.value.toUpperCase() })} placeholder="NIFTY" /></Field>
              <Field label="Name"><Input value={edit.name || ''} onChange={(e) => setEdit({ ...edit, name: e.target.value })} placeholder="Nifty 50 Index" /></Field>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Segment"><Select value={edit.segment} onChange={(e) => setEdit({ ...edit, segment: e.target.value as WatchItem['segment'], exchange: e.target.value === 'commodity' ? 'MCX' : 'NSE' })}><option value="equity_fno">Equity F&O</option><option value="commodity">Commodity</option></Select></Field>
              <Field label="Exchange"><Select value={edit.exchange} onChange={(e) => setEdit({ ...edit, exchange: e.target.value })}><option>NSE</option><option>BSE</option><option>MCX</option></Select></Field>
              <Field label="Lot Size"><Input type="number" value={String(edit.lot_size ?? 50)} onChange={(e) => setEdit({ ...edit, lot_size: Number(e.target.value) })} /></Field>
            </div>
            <div className="flex items-center justify-between">
              <Toggle checked={edit.enabled ?? true} onChange={(v) => setEdit({ ...edit, enabled: v })} label="Enabled" />
              <div className="flex gap-2"><Button variant="ghost" onClick={() => setEdit(null)}>Cancel</Button><Button onClick={save} disabled={busy || !edit.symbol}>{busy ? <Spinner /> : 'Save'}</Button></div>
            </div>
            {err && <p className="text-sm text-rose-400">{err}</p>}
          </div>
        </Modal>
      )}
    </div>
  );
}

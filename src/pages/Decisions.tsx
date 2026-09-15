import { useEffect, useState } from 'react';
import { Trash2, ChevronDown, ChevronUp, X } from 'lucide-react';
import { api } from '../lib/api';
import type { Decision } from '../lib/types';
import { inr, pct, pnlClass, sign, voteTone, statusTone, timeAgo } from '../lib/format';
import { Card, Badge, Button, Spinner, Input, Select, Textarea, Field, Modal, EmptyState, cn } from '../components/ui';

const FILTERS = ['all', 'open', 'pending', 'closed', 'rejected'] as const;

export default function Decisions() {
  const [items, setItems] = useState<Decision[]>([]);
  const [filter, setFilter] = useState<typeof FILTERS[number]>('all');
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [expanded, setExpanded] = useState<number | null>(null);
  const [outcomeFor, setOutcomeFor] = useState<Decision | null>(null);

  const load = () => {
    setLoading(true); setErr('');
    api.decisions(filter === 'all' ? undefined : { status: filter })
      .then(setItems).catch((e) => setErr(e.message)).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, [filter]);

  const remove = async (id: number) => {
    if (!confirm('Delete this decision and its outcome?')) return;
    await api.deleteDecision(id);
    load();
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Decisions</h1>
          <p className="mt-1 text-sm text-zinc-500">All AI-generated trade decisions and their outcomes.</p>
        </div>
        <div className="flex gap-1 rounded-lg border border-zinc-800 bg-zinc-900/50 p-1">
          {FILTERS.map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={cn('rounded-md px-3 py-1 text-xs capitalize', filter === f ? 'bg-emerald-500 text-zinc-950' : 'text-zinc-400 hover:text-zinc-200')}>{f}</button>
          ))}
        </div>
      </div>

      {loading ? <div className="flex justify-center py-16"><Spinner className="h-7 w-7" /></div> :
        err ? <div className="py-16 text-center text-sm text-rose-400">{err} <Button className="mt-3" onClick={load}>Retry</Button></div> :
        items.length === 0 ? <Card className="p-4"><EmptyState title="No decisions" hint="Run a decision from the New Decision page." /></Card> :
        <div className="space-y-2">
          {items.map((d) => {
            const out = d.trade_outcomes?.[0];
            const open = expanded === d.id;
            return (
              <Card key={d.id} className="overflow-hidden">
                <div className="flex items-center gap-3 p-3">
                  <button onClick={() => setExpanded(open ? null : d.id)} className="flex items-center gap-3">
                    {open ? <ChevronUp size={16} className="text-zinc-500" /> : <ChevronDown size={16} className="text-zinc-500" />}
                    <Badge tone={voteTone(d.action)}>{d.action}</Badge>
                  </button>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-zinc-100">{d.instrument} <span className="text-zinc-500">{d.option_type} {d.strike}</span></div>
                    <div className="text-xs text-zinc-500">{d.qty}×{d.lot_size} · entry {inr(d.entry_price)} · {timeAgo(d.created_at)}</div>
                  </div>
                  <div className="hidden text-right sm:block">
                    <div className="font-mono text-xs text-zinc-400">conf {d.confidence}%</div>
                    {out ? <div className={cn('font-mono text-sm tabular-nums', pnlClass(out.pnl))}>{sign(out.pnl)}{inr(out.pnl)}</div> : <Badge tone={statusTone(d.status)}>{d.status}</Badge>}
                  </div>
                  <div className="flex items-center gap-1">
                    {(d.status === 'open' || d.status === 'pending') && !out && (
                      <Button variant="subtle" className="px-2 py-1 text-xs" onClick={() => setOutcomeFor(d)}>Record Outcome</Button>
                    )}
                    <button onClick={() => remove(d.id)} className="rounded-md p-1.5 text-zinc-600 hover:bg-zinc-800 hover:text-rose-400"><Trash2 size={15} /></button>
                  </div>
                </div>
                {open && (
                  <div className="border-t border-zinc-800 p-4">
                    <p className="mb-3 text-sm leading-relaxed text-zinc-300">{d.reasoning}</p>
                    <div className="mb-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                      <Meta label="Entry" value={inr(d.entry_price)} />
                      <Meta label="Stop Loss" value={inr(d.stop_loss)} />
                      <Meta label="Target" value={inr(d.target)} />
                      <Meta label="Mode" value={d.mode} />
                      {out && (<><Meta label="Exit" value={inr(out.exit_price)} /><Meta label="P&L" value={`${sign(out.pnl)}${inr(out.pnl)}`} /><Meta label="P&L %" value={pct(out.pnl_percent)} /><Meta label="Result" value={out.result} /></>)}
                    </div>
                    {d.decision_agents && d.decision_agents.length > 0 && (
                      <div className="mt-2">
                        <div className="mb-1 text-xs font-medium uppercase tracking-wide text-zinc-500">Analyst votes</div>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {d.decision_agents.map((da) => (
                            <div key={da.id} className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-2">
                              <div className="flex items-center justify-between">
                                <Badge tone={voteTone(da.vote)} className="text-[10px]">{da.vote}</Badge>
                                <span className="text-xs text-zinc-300">{da.agent_name}</span>
                                <span className="font-mono text-[10px] text-zinc-500">{da.confidence}%</span>
                              </div>
                              <p className="mt-1 text-[11px] leading-snug text-zinc-500">{da.reasoning}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      }

      {outcomeFor && <OutcomeModal decision={outcomeFor} onClose={() => setOutcomeFor(null)} onSaved={() => { setOutcomeFor(null); load(); }} />}
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return <div><div className="text-[10px] uppercase text-zinc-600">{label}</div><div className="font-mono text-zinc-200">{value}</div></div>;
}

function OutcomeModal({ decision, onClose, onSaved }: { decision: Decision; onClose: () => void; onSaved: () => void }) {
  const [exit, setExit] = useState(String(decision.entry_price));
  const [result, setResult] = useState('target_hit');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const save = async () => {
    setBusy(true); setErr('');
    try {
      await api.recordOutcome({ decision_id: decision.id, exit_price: Number(exit), result, notes });
      onSaved();
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  };

  return (
    <Modal open onClose={onClose} title={`Record outcome · ${decision.instrument} ${decision.option_type} ${decision.strike}`}>
      <div className="space-y-3">
        <Field label="Exit price (option premium)" hint={`Entry was ${inr(decision.entry_price)} · qty ${decision.qty} × ${decision.lot_size}`}>
          <Input type="number" value={exit} onChange={(e) => setExit(e.target.value)} />
        </Field>
        <Field label="Result">
          <Select value={result} onChange={(e) => setResult(e.target.value)}>
            <option value="target_hit">Target hit</option>
            <option value="stop_hit">Stop loss hit</option>
            <option value="manual_close">Manual close</option>
            <option value="time_exit">Time exit (expiry)</option>
          </Select>
        </Field>
        <Field label="Notes (optional)"><Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
        {err && <p className="text-sm text-rose-400">{err}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={busy || !exit}>{busy ? <Spinner /> : 'Save & Close Trade'}</Button>
        </div>
      </div>
    </Modal>
  );
}

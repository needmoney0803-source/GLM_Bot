import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, Bot, ArrowRight, RotateCcw } from 'lucide-react';
import { api } from '../lib/api';
import type { DecideResult, WatchItem } from '../lib/types';
import { inr, pct, voteTone } from '../lib/format';
import { Card, Button, Input, Select, Textarea, Field, Spinner, Badge } from '../components/ui';

interface Form {
  instrument: string; spot: string; optionType: string; strike: string; expiry: string;
  iv: string; trend: string; premium: string; marketContext: string; sentimentNotes: string;
}

const empty: Form = {
  instrument: '', spot: '', optionType: 'CE', strike: '', expiry: '',
  iv: '18', trend: 'bullish', premium: '', marketContext: '', sentimentNotes: '',
};

export default function NewDecision() {
  const [watch, setWatch] = useState<WatchItem[]>([]);
  const [form, setForm] = useState<Form>(empty);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [result, setResult] = useState<DecideResult | null>(null);
  const [seg, setSeg] = useState('equity_fno');

  useEffect(() => {
    api.watchlist().then((w) => {
      setWatch(w);
      if (w.length) {
        const first = w[0];
        setForm((f) => ({ ...f, instrument: first.symbol }));
        setSeg(first.segment);
      }
    });
  }, []);

  const set = (k: keyof Form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const onInstrument = (symbol: string) => {
    const item = watch.find((w) => w.symbol === symbol);
    setForm((f) => ({ ...f, instrument: symbol }));
    if (item) setSeg(item.segment);
  };

  const run = async () => {
    setBusy(true); setErr(''); setResult(null);
    try {
      const setup: Record<string, unknown> = {
        instrument: form.instrument,
        segment: seg,
        spot: Number(form.spot),
        optionType: form.optionType,
        strike: form.strike,
        expiry: form.expiry,
        iv: Number(form.iv),
        trend: form.trend,
        marketContext: form.marketContext,
        sentimentNotes: form.sentimentNotes,
      };
      if (form.premium) setup.premium = Number(form.premium);
      const r = await api.decide(setup);
      setResult(r);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">New Decision</h1>
        <p className="mt-1 text-sm text-zinc-500">Enter a market setup &mdash; the multi-LLM ensemble analyzes it and returns an actionable trade plan.</p>
      </div>

      {result ? (
        <ResultView result={result} onReset={() => { setResult(null); }} />
      ) : (
        <div className="grid gap-6 lg:grid-cols-5">
          <Card className="space-y-4 p-5 lg:col-span-3">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Field label="Instrument">
                <Select value={form.instrument} onChange={(e) => onInstrument(e.target.value)}>
                  {watch.length === 0 && <option value="">Loading...</option>}
                  {watch.map((w) => (<option key={w.id} value={w.symbol}>{w.symbol} &middot; {w.name}</option>))}
                </Select>
              </Field>
              <Field label="Segment">
                <Select value={seg} onChange={(e) => setSeg(e.target.value)} disabled>
                  <option value="equity_fno">Equity F&amp;O</option>
                  <option value="commodity">Commodity (MCX)</option>
                </Select>
              </Field>
              <Field label="Spot / Underlying"><Input type="number" value={form.spot} onChange={(e) => set('spot', e.target.value)} placeholder="24500" /></Field>
              <Field label="Option Type">
                <Select value={form.optionType} onChange={(e) => set('optionType', e.target.value)}><option value="CE">Call (CE)</option><option value="PE">Put (PE)</option></Select>
              </Field>
              <Field label="Strike"><Input value={form.strike} onChange={(e) => set('strike', e.target.value)} placeholder="24500" /></Field>
              <Field label="Expiry"><Input type="date" value={form.expiry} onChange={(e) => set('expiry', e.target.value)} /></Field>
              <Field label="Implied Vol (%)"><Input type="number" value={form.iv} onChange={(e) => set('iv', e.target.value)} /></Field>
              <Field label="Trend">
                <Select value={form.trend} onChange={(e) => set('trend', e.target.value)}>
                  <option value="bullish">Bullish</option><option value="bearish">Bearish</option>
                  <option value="neutral">Neutral</option><option value="volatile">Volatile</option>
                </Select>
              </Field>
              <Field label="Premium (optional)" hint="Auto-estimated if blank"><Input type="number" value={form.premium} onChange={(e) => set('premium', e.target.value)} placeholder="auto" /></Field>
            </div>
            <Field label="Market Context" hint="Price action, support/resistance, OI buildup, levels">
              <Textarea rows={3} value={form.marketContext} onChange={(e) => set('marketContext', e.target.value)} placeholder="Nifty holding 24400 support; OI buildup at 24500 CE" />
            </Field>
            <Field label="Sentiment / Flow Notes" hint="FII/DII data, news, events">
              <Textarea rows={2} value={form.sentimentNotes} onChange={(e) => set('sentimentNotes', e.target.value)} placeholder="FII longs added; US Fed dovish" />
            </Field>
            {err && <p className="text-sm text-rose-400">{err}</p>}
            <Button onClick={run} disabled={busy || !form.instrument || !form.spot} className="w-full">
              {busy ? <><Spinner /> Running ensemble...</> : <><Sparkles size={16} /> Run Multi-LLM Decision</>}
            </Button>
          </Card>

          <Card className="p-5 lg:col-span-2">
            <h3 className="text-sm font-semibold text-zinc-200">How it works</h3>
            <ol className="mt-3 space-y-2 text-xs text-zinc-400">
              <li><strong className="text-emerald-400">1.</strong> Each enabled AI analyst (technical, Greeks, sentiment, risk, commodities) independently evaluates the setup via its assigned LLM.</li>
              <li><strong className="text-emerald-400">2.</strong> Past lessons are injected into every prompt so the bot learns from history.</li>
              <li><strong className="text-emerald-400">3.</strong> A weighted ensemble vote decides BUY/SELL/HOLD/AVOID &mdash; weights shift toward historically accurate agents.</li>
              <li><strong className="text-emerald-400">4.</strong> A portfolio-manager LLM synthesizes the final plan with strike, qty, SL &amp; target.</li>
              <li><strong className="text-emerald-400">5.</strong> The decision auto-opens as a paper trade so outcomes feed the learning loop.</li>
            </ol>
            <p className="mt-3 rounded-lg bg-zinc-800/50 p-2 text-[11px] text-zinc-500">
              No LLM keys yet? The engine falls back to a built-in heuristic ensemble so it still works &mdash; add free keys in <Link to="/setup" className="text-emerald-400 hover:underline">Setup</Link> for full multi-LLM analysis.
            </p>
          </Card>
        </div>
      )}
    </div>
  );
}

function ResultView({ result, onReset }: { result: DecideResult; onReset: () => void }) {
  const d = result.decision;
  return (
    <div className="space-y-5">
      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Badge tone={voteTone(d.action)} className="px-3 py-1 text-sm">{d.action}</Badge>
            <div>
              <div className="text-lg font-bold text-zinc-100">{d.instrument} {d.option_type} {d.strike}</div>
              <div className="text-xs text-zinc-500">{d.exchange} &middot; exp {d.expiry || '...'} &middot; {result.mode} trade &middot; {result.llmActive ? 'multi-LLM' : 'heuristic'}</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-zinc-500">Confidence</div>
            <div className="font-mono text-2xl tabular-nums text-emerald-400">{d.confidence}%</div>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Qty" value={`${d.qty} x ${d.lot_size}`} />
          <Stat label="Entry (premium)" value={inr(d.entry_price)} />
          <Stat label="Stop Loss" value={inr(d.stop_loss)} tone="rose" />
          <Stat label="Target" value={inr(d.target)} tone="emerald" />
        </div>
        <p className="mt-4 rounded-lg bg-zinc-800/40 p-3 text-sm leading-relaxed text-zinc-300">{d.reasoning}</p>
        {result.lessonsApplied.length > 0 && (
          <div className="mt-3">
            <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">Lessons applied</div>
            <ul className="mt-1 list-inside list-disc space-y-0.5 text-xs text-zinc-400">
              {result.lessonsApplied.map((l, i) => (<li key={i}>{l}</li>))}
            </ul>
          </div>
        )}
        <div className="mt-4 flex gap-2">
          <Link to="/decisions"><Button variant="subtle">View in Decisions <ArrowRight size={14} /></Button></Link>
          <Button variant="ghost" onClick={onReset}><RotateCcw size={14} /> Run Another</Button>
        </div>
      </Card>

      <div>
        <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-zinc-200"><Bot size={16} /> Analyst Votes</h3>
        <div className="grid gap-2 sm:grid-cols-2">
          {result.agents.map((ag, i) => (
            <Card key={i} className="p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge tone={voteTone(ag.vote)}>{ag.vote}</Badge>
                  <span className="text-sm font-medium text-zinc-200">{ag.agent_name}</span>
                </div>
                <span className="font-mono text-xs text-zinc-500">{ag.confidence}%</span>
              </div>
              <div className="mt-1 text-[11px] text-zinc-500">
                {ag.role} &middot; {ag.usedHeuristic ? 'heuristic' : ag.provider}
                {ag.strategy ? ` &middot; ${ag.strategy}` : ''}
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-zinc-400">{ag.reasoning}</p>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, tone = 'zinc' }: { label: string; value: string; tone?: 'zinc' | 'emerald' | 'rose' }) {
  const tones = { zinc: 'text-zinc-100', emerald: 'text-emerald-400', rose: 'text-rose-400' };
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-3">
      <div className="text-[10px] uppercase tracking-wide text-zinc-500">{label}</div>
      <div className={`mt-1 font-mono text-base tabular-nums ${tones[tone]}`}>{value}</div>
    </div>
  );
}

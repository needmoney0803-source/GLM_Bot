import { useEffect, useState } from 'react';
import { Shield, AlertTriangle } from 'lucide-react';
import { api } from '../lib/api';
import type { RiskRules } from '../lib/types';
import { inr } from '../lib/format';
import { Card, Button, Spinner, Input, Field, Toggle, Badge } from '../components/ui';

export default function RiskRulesPage() {
  const [r, setR] = useState<RiskRules | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => { api.risk().then(setR).catch((e) => setErr(e.message)).finally(() => setLoading(false)); }, []);

  const save = async () => {
    if (!r) return;
    setBusy(true); setErr(''); setSaved(false);
    try { await api.saveRisk(r); setSaved(true); setTimeout(() => setSaved(false), 2000); } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  };

  if (loading) return <div className="flex justify-center py-16"><Spinner className="h-7 w-7" /></div>;
  if (!r) return <div className="py-16 text-center text-sm text-rose-400">{err || 'No risk rules found.'}</div>;

  const set = (k: keyof RiskRules, v: number | boolean | string) => setR({ ...r, [k]: v });

  return (
    <div className="max-w-2xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">Risk Rules</h1>
        <p className="mt-1 text-sm text-zinc-500">Capital guardrails applied to every decision.</p>
      </div>

      <Card className={r.paper_mode ? 'border-amber-500/30' : 'border-rose-500/40'}>
        <div className="flex items-center gap-2 p-4">
          {r.paper_mode ? <AlertTriangle size={18} className="text-amber-400" /> : <AlertTriangle size={18} className="text-rose-400" />}
          <div className="flex-1">
            <div className="text-sm font-medium text-zinc-100">Trading Mode</div>
            <div className="text-xs text-zinc-500">{r.paper_mode ? 'Paper — simulated trades, no real money.' : 'LIVE — real orders will be placed via broker.'}</div>
          </div>
          <Toggle checked={!r.paper_mode} onChange={(v) => set('paper_mode', !v)} label={r.paper_mode ? 'Paper' : 'Live'} />
        </div>
        {!r.paper_mode && (
          <div className="border-t border-rose-500/20 bg-rose-500/5 p-3 text-xs text-rose-300">
            Live mode requires broker credentials (DHAN_* or FYERS_*) in Secrets. Real money is at risk.
          </div>
        )}
      </Card>

      <Card className="space-y-4 p-5">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Virtual Capital" hint="Starting paper balance"><Input type="number" value={String(r.virtual_capital)} onChange={(e) => set('virtual_capital', Number(e.target.value))} /></Field>
          <Field label="Max Capital / Trade" hint="Max risk per position"><Input type="number" value={String(r.max_capital_per_trade)} onChange={(e) => set('max_capital_per_trade', Number(e.target.value))} /></Field>
          <Field label="Max Daily Loss"><Input type="number" value={String(r.max_daily_loss)} onChange={(e) => set('max_daily_loss', Number(e.target.value))} /></Field>
          <Field label="Max Open Positions"><Input type="number" value={String(r.max_open_positions)} onChange={(e) => set('max_open_positions', Number(e.target.value))} /></Field>
        </div>
        <Field label="Allowed Segments" hint="Comma-separated"><Input value={r.allowed_segments} onChange={(e) => set('allowed_segments', e.target.value)} /></Field>
        {err && <p className="text-sm text-rose-400">{err}</p>}
        <div className="flex items-center gap-3">
          <Button onClick={save} disabled={busy}>{busy ? <Spinner /> : <><Shield size={16} /> Save Rules</>}</Button>
          {saved && <Badge tone="emerald">Saved</Badge>}
        </div>
      </Card>

      <Card className="p-4 text-xs text-zinc-400">
        <div className="mb-1 font-medium text-zinc-300">Current effective balance</div>
        Virtual capital {inr(r.virtual_capital)} · max risk per trade {inr(r.max_capital_per_trade)} · {r.max_open_positions} concurrent positions max.
      </Card>
    </div>
  );
}

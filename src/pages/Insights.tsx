import { useEffect, useState } from 'react';
import { Brain, RefreshCw, Bot, Lightbulb } from 'lucide-react';
import { api } from '../lib/api';
import type { Lesson } from '../lib/types';
import { pct } from '../lib/format';
import { Card, Badge, Button, Spinner, EmptyState, cn } from '../components/ui';

interface StatAgent { agent_id: number; name: string; role: string; decisions_count: number; wins: number; losses: number; win_rate: number | null; agreement_rate: number | null; }
interface Stats {
  agents: StatAgent[];
  overall: { realized: number; wins: number; losses: number; total: number; win_rate: number };
}

export default function Insights() {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const load = () => {
    setLoading(true); setErr('');
    Promise.all([api.lessons(), api.stats().then((s) => s as unknown as Stats)])
      .then(([l, s]) => { setLessons(l); setStats(s); })
      .catch((e) => setErr(e.message)).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const regen = async () => { setBusy(true); try { const l = await api.regenLessons(); setLessons(l); } catch (e) { setErr((e as Error).message); } finally { setBusy(false); } };

  if (loading) return <div className="flex justify-center py-16"><Spinner className="h-7 w-7" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Learning Insights</h1>
          <p className="mt-1 text-sm text-zinc-500">Lessons extracted from your trade history — auto-updated as outcomes are recorded.</p>
        </div>
        <Button variant="subtle" onClick={regen} disabled={busy}>{busy ? <Spinner /> : <><RefreshCw size={15} /> Regenerate</>}</Button>
      </div>

      {err && <p className="text-sm text-rose-400">{err}</p>}

      {stats && (
        <Card className="p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-zinc-200"><Bot size={16} className="text-emerald-400" /> Agent Accuracy (when vote was followed)</div>
          <div className="space-y-2">
            {stats.agents.map((a) => {
              const wr = a.win_rate ?? null;
              return (
                <div key={a.agent_id} className="flex items-center gap-3">
                  <div className="w-40 truncate text-sm text-zinc-300">{a.name}</div>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-zinc-800">
                    <div className={cn('h-full rounded-full', wr == null ? 'bg-zinc-600' : wr >= 55 ? 'bg-emerald-500' : wr >= 45 ? 'bg-amber-500' : 'bg-rose-500')} style={{ width: `${wr ?? 0}%` }} />
                  </div>
                  <div className="w-12 text-right font-mono text-xs tabular-nums text-zinc-400">{wr == null ? '—' : pct(wr, 0)}</div>
                  <div className="w-16 text-right text-[11px] text-zinc-600">{a.wins ?? 0}W/{a.losses ?? 0}L</div>
                </div>
              );
            })}
            {stats.agents.length === 0 && <p className="text-xs text-zinc-500">No agent data yet.</p>}
          </div>
        </Card>
      )}

      <div>
        <div className="mb-2 flex items-center gap-2"><Lightbulb size={14} className="text-amber-400" /><h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">Learned Lessons</h2></div>
        {lessons.length === 0 ? (
          <Card className="p-4"><EmptyState icon={<Brain size={28} />} title="No lessons yet" hint="Record trade outcomes, then regenerate to extract lessons." /></Card>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {lessons.map((l) => (
              <Card key={l.id} className="p-3">
                <div className="mb-1 flex items-center justify-between">
                  <Badge tone={l.source === 'llm' ? 'sky' : l.source === 'seed' ? 'zinc' : 'emerald'}>{l.setup_type}</Badge>
                  {l.sample_size > 0 && <span className="text-[10px] text-zinc-600">n={l.sample_size} · {pct(l.win_rate, 0)} win</span>}
                </div>
                <p className="text-xs leading-relaxed text-zinc-300">{l.lesson_text}</p>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

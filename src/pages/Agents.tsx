import { useEffect, useState } from 'react';
import { Bot, Plus, Pencil, Trash2, Cpu } from 'lucide-react';
import { api } from '../lib/api';
import type { Agent } from '../lib/types';
import { pct } from '../lib/format';
import { Card, Badge, Button, Spinner, Input, Select, Textarea, Field, Toggle, Modal, EmptyState, cn } from '../components/ui';

const ROLES = ['technical', 'greeks', 'sentiment', 'risk', 'commodities'];
const PROVIDERS = ['gemini', 'groq', 'openrouter', 'mistral', 'cerebras', 'heuristic'];
const MODELS: Record<string, string> = {
  gemini: 'gemini-2.0-flash', groq: 'llama-3.3-70b-versatile', openrouter: 'meta-llama/llama-3.3-70b-instruct:free',
  mistral: 'mistral-small-latest', cerebras: 'llama-3.3-70b', heuristic: '—',
};

const blank: Partial<Agent> = { name: '', role: 'technical', system_prompt: '', provider: 'gemini', model: MODELS.gemini, weight: 1, enabled: true };

export default function Agents() {
  const [items, setItems] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [edit, setEdit] = useState<Partial<Agent> | null>(null);
  const [busy, setBusy] = useState(false);

  const load = () => { setLoading(true); api.agents().then(setItems).catch((e) => setErr(e.message)).finally(() => setLoading(false)); };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!edit) return;
    setBusy(true); setErr('');
    try {
      await api.saveAgent({ ...edit, model: edit.model || MODELS[edit.provider || 'gemini'] || '' });
      setEdit(null); load();
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  };
  const remove = async (id: number) => { if (!confirm('Delete this agent?')) return; await api.deleteAgent(id); load(); };

  if (loading) return <div className="flex justify-center py-16"><Spinner className="h-7 w-7" /></div>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">AI Agents</h1>
          <p className="mt-1 text-sm text-zinc-500">Each analyst votes on setups. Weights auto-adjust to accuracy.</p>
        </div>
        <Button onClick={() => setEdit({ ...blank })}><Plus size={16} /> Add Agent</Button>
      </div>

      {err && <p className="text-sm text-rose-400">{err}</p>}

      {items.length === 0 ? <Card className="p-4"><EmptyState icon={<Bot size={28} />} title="No agents" hint="Add analyst agents to form the ensemble." /></Card> : (
        <div className="grid gap-3 sm:grid-cols-2">
          {items.map((a) => (
            <Card key={a.id} className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <Bot size={18} className="text-emerald-400" />
                  <div>
                    <div className="text-sm font-semibold text-zinc-100">{a.name} {!a.enabled && <span className="text-xs text-zinc-600">(disabled)</span>}</div>
                    <div className="text-xs capitalize text-zinc-500">{a.role}</div>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => setEdit(a)} className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"><Pencil size={14} /></button>
                  <button onClick={() => remove(a.id)} className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-rose-400"><Trash2 size={14} /></button>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                <Badge tone="zinc"><Cpu size={11} /> {a.provider} · {a.model || '—'}</Badge>
                <Badge tone="sky">weight {a.weight}</Badge>
                {a.win_rate != null && <Badge tone={a.win_rate >= 55 ? 'emerald' : a.win_rate >= 45 ? 'amber' : 'rose'}>{pct(a.win_rate, 0)} win</Badge>}
                {a.decisions_count != null && <span className="text-zinc-500">{a.decisions_count} votes</span>}
              </div>
              {a.system_prompt && <p className="mt-2 line-clamp-2 text-xs text-zinc-500">{a.system_prompt}</p>}
            </Card>
          ))}
        </div>
      )}

      {edit && (
        <Modal open onClose={() => setEdit(null)} title={edit.id ? 'Edit Agent' : 'New Agent'}>
          <div className="space-y-3">
            <Field label="Name"><Input value={edit.name || ''} onChange={(e) => setEdit({ ...edit, name: e.target.value })} placeholder="Technical Analyst" /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Role"><Select value={edit.role} onChange={(e) => setEdit({ ...edit, role: e.target.value })}>{ROLES.map((r) => <option key={r} value={r} className="capitalize">{r}</option>)}</Select></Field>
              <Field label="Provider"><Select value={edit.provider} onChange={(e) => setEdit({ ...edit, provider: e.target.value, model: MODELS[e.target.value] || '' })}>{PROVIDERS.map((p) => <option key={p} value={p}>{p}</option>)}</Select></Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Model"><Input value={edit.model || ''} onChange={(e) => setEdit({ ...edit, model: e.target.value })} /></Field>
              <Field label="Base Weight" hint="Auto-scaled by win rate"><Input type="number" step="0.1" value={String(edit.weight ?? 1)} onChange={(e) => setEdit({ ...edit, weight: Number(e.target.value) })} /></Field>
            </div>
            <Field label="System Prompt" hint="Persona & instructions sent to the LLM"><Textarea rows={4} value={edit.system_prompt || ''} onChange={(e) => setEdit({ ...edit, system_prompt: e.target.value })} /></Field>
            <div className="flex items-center justify-between">
              <Toggle checked={edit.enabled ?? true} onChange={(v) => setEdit({ ...edit, enabled: v })} label="Enabled" />
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setEdit(null)}>Cancel</Button>
                <Button onClick={save} disabled={busy || !edit.name}>{busy ? <Spinner /> : 'Save'}</Button>
              </div>
            </div>
            {err && <p className="text-sm text-rose-400">{err}</p>}
          </div>
        </Modal>
      )}
    </div>
  );
}

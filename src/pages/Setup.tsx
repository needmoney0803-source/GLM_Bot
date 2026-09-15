import { useEffect, useState } from 'react';
import { Cpu, KeyRound, Smartphone, Monitor, BookOpen, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { api } from '../lib/api';
import type { ProviderStatus } from '../lib/types';
import { Card, Badge, Spinner } from '../components/ui';

export default function Setup() {
  const [s, setS] = useState<{ providers: ProviderStatus[]; anyConfigured: boolean; brokerReady: boolean; paperMode: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { api.settings().then(setS).finally(() => setLoading(false)); }, []);
  if (loading) return <div className="flex justify-center py-16"><Spinner className="h-7 w-7" /></div>;
  if (!s) return null;

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">Setup Guide</h1>
        <p className="mt-1 text-sm text-zinc-500">Everything you need to run AlgoMint for free.</p>
      </div>

      <Card className="p-5">
        <div className="mb-3 flex items-center gap-2"><Cpu size={18} className="text-emerald-400" /><h2 className="text-sm font-semibold text-zinc-200">1. Free LLM Providers</h2></div>
        <p className="mb-3 text-sm text-zinc-400">Add one or more free API keys in the <strong className="text-zinc-200">Secrets</strong> tab. The ensemble fans out across providers to stay within free quotas and falls back gracefully.</p>
        <div className="space-y-2">
          {s.providers.map((p) => (
            <div key={p.id} className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-950/40 p-3">
              <div className="flex items-center gap-2"><KeyRound size={15} className="text-zinc-500" /><div><div className="text-sm text-zinc-200">{p.name}</div><code className="text-[11px] text-zinc-500">{secretName(p.id)}</code></div></div>
              {p.configured ? <Badge tone="emerald"><CheckCircle2 size={11} /> Configured</Badge> : <Badge tone="zinc">Add key</Badge>}
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-zinc-500">Get free keys: Google AI Studio (Gemini), Groq Cloud, OpenRouter, Mistral Console — all no credit card. Without keys, the engine runs in heuristic mode.</p>
      </Card>

      <Card className="p-5">
        <div className="mb-3 flex items-center gap-2"><BookOpen size={18} className="text-sky-400" /><h2 className="text-sm font-semibold text-zinc-200">2. Broker (optional — for live trading)</h2></div>
        <p className="mb-3 text-sm text-zinc-400">Paper mode works without any broker. To go live with real orders, add credentials for a free Indian broker API:</p>
        <div className="space-y-2 text-sm">
          <Row label="Dhan (free, NSE + MCX)" keys="DHAN_CLIENT_ID, DHAN_CLIENT_SECRET, DHAN_TOTP_SECRET" />
          <Row label="Fyers (free, NSE + MCX)" keys="FYERS_CLIENT_ID, FYERS_SECRET, FYERS_ACCESS_TOKEN" />
        </div>
        <div className="mt-3 flex items-center gap-2 text-xs">
          {s.brokerReady ? <Badge tone="emerald"><CheckCircle2 size={11} /> Broker keys detected</Badge> : <Badge tone="amber">No broker keys — paper mode only</Badge>}
        </div>
      </Card>

      <Card className="p-5">
        <div className="mb-3 flex items-center gap-2"><Monitor size={18} className="text-emerald-400" /><h2 className="text-sm font-semibold text-zinc-200">3. Windows &amp; Android (later)</h2></div>
        <p className="text-sm text-zinc-400">This is a web app — the same codebase wraps into native desktop/mobile with no rewrite:</p>
        <ul className="mt-2 space-y-1 text-sm text-zinc-400">
          <li><strong className="text-zinc-200">Windows:</strong> wrap with <code className="text-emerald-400">Tauri</code> (Rust WebView, tiny binary) or Electron.</li>
          <li><strong className="text-zinc-200">Android:</strong> wrap with <code className="text-emerald-400">Capacitor</code> (WebView) or React Native port.</li>
        </ul>
      </Card>

      <Card className="p-5">
        <div className="mb-3 flex items-center gap-2"><AlertTriangle size={18} className="text-amber-400" /><h2 className="text-sm font-semibold text-zinc-200">How the self-learning works</h2></div>
        <ol className="space-y-1.5 text-sm text-zinc-400">
          <li><strong className="text-emerald-400">Decision memory:</strong> every decision (context, each agent's vote &amp; reasoning, weights) is stored.</li>
          <li><strong className="text-emerald-400">Outcome tracking:</strong> realized P&amp;L is recorded per trade.</li>
          <li><strong className="text-emerald-400">Accuracy attribution:</strong> per-agent and per-setup win rates are computed.</li>
          <li><strong className="text-emerald-400">Feedback injection:</strong> top lessons are injected into future prompts.</li>
          <li><strong className="text-emerald-400">Dynamic weighting:</strong> agents with higher accuracy get more voting weight automatically.</li>
        </ol>
      </Card>

      <Card className="border-rose-500/30 p-5">
        <div className="flex items-center gap-2"><AlertTriangle size={18} className="text-rose-400" /><h2 className="text-sm font-semibold text-zinc-200">Disclaimer</h2></div>
        <p className="mt-2 text-xs leading-relaxed text-zinc-400">
          AlgoMint is an educational decision-support tool. Options and commodities trading involves substantial risk of loss. No bot guarantees profit. Past agent accuracy does not predict future results. Always paper-trade first, and never risk capital you cannot afford to lose. Consult a SEBI-registered advisor before live trading.
        </p>
      </Card>
    </div>
  );
}

function secretName(id: string): string {
  const m: Record<string, string> = { gemini: 'GEMINI_API_KEY', groq: 'GROQ_API_KEY', openrouter: 'OPENROUTER_API_KEY', mistral: 'MISTRAL_API_KEY', cerebras: 'CEREBRAS_API_KEY' };
  return m[id] || id;
}

function Row({ label, keys }: { label: string; keys: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-950/40 p-3">
      <span className="text-zinc-300">{label}</span>
      <code className="text-[11px] text-zinc-500">{keys}</code>
    </div>
  );
}

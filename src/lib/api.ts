import type {
  Agent, DashboardData, Decision, DecideResult, Lesson, RiskRules, WatchItem, ProviderStatus,
} from './types';

async function jfetch<T>(url: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...((opts?.headers as Record<string, string>) || {}) },
  });
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try { const j = await res.json(); if (j.error) msg = j.error; } catch {}
    throw new Error(msg);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

function qs(params: Record<string, string | undefined>): string {
  const u = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) u.set(k, v);
  const s = u.toString();
  return s ? `?${s}` : '';
}

export const api = {
  dashboard: () => jfetch<DashboardData>('/api/dashboard'),
  decide: (setup: Record<string, unknown>) =>
    jfetch<DecideResult>('/api/decide', { method: 'POST', body: JSON.stringify(setup) }),
  decisions: (params?: { status?: string; limit?: number }) =>
    jfetch<Decision[]>(`/api/decisions${params ? qs({ status: params.status, limit: params.limit?.toString() }) : ''}`),
  decision: (id: number) => jfetch<Decision>(`/api/decisions?id=${id}`),
  updateDecision: (id: number, patch: Record<string, unknown>) =>
    jfetch<Decision>('/api/decisions', { method: 'PUT', body: JSON.stringify({ id, ...patch }) }),
  deleteDecision: (id: number) =>
    jfetch<{ ok: boolean }>('/api/decisions', { method: 'DELETE', body: JSON.stringify({ id }) }),
  recordOutcome: (o: { decision_id: number; exit_price: number; result: string; notes?: string }) =>
    jfetch<unknown>('/api/outcomes', { method: 'POST', body: JSON.stringify(o) }),
  agents: () => jfetch<Agent[]>('/api/agents'),
  saveAgent: (a: Partial<Agent> & { id?: number }) =>
    jfetch<Agent>('/api/agents', { method: a.id ? 'PUT' : 'POST', body: JSON.stringify(a) }),
  deleteAgent: (id: number) =>
    jfetch<{ ok: boolean }>('/api/agents', { method: 'DELETE', body: JSON.stringify({ id }) }),
  watchlist: () => jfetch<WatchItem[]>('/api/watchlist'),
  saveWatch: (w: Partial<WatchItem> & { id?: number }) =>
    jfetch<WatchItem>('/api/watchlist', { method: w.id ? 'PUT' : 'POST', body: JSON.stringify(w) }),
  deleteWatch: (id: number) =>
    jfetch<{ ok: boolean }>('/api/watchlist', { method: 'DELETE', body: JSON.stringify({ id }) }),
  risk: () => jfetch<RiskRules>('/api/risk'),
  saveRisk: (r: Partial<RiskRules> & { id?: number }) =>
    jfetch<RiskRules>('/api/risk', { method: 'PUT', body: JSON.stringify(r) }),
  lessons: () => jfetch<Lesson[]>('/api/lessons'),
  regenLessons: () => jfetch<Lesson[]>('/api/lessons', { method: 'POST' }),
  settings: () =>
    jfetch<{ providers: ProviderStatus[]; anyConfigured: boolean; brokerReady: boolean; paperMode: boolean }>('/api/settings'),
  stats: () => jfetch<{ agents: unknown[]; overall: { realized: number; wins: number; losses: number; total: number; win_rate: number } }>('/api/stats'),
};

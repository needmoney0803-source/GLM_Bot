export const inr = (n: number | undefined | null, opts: Intl.NumberFormatOptions = {}): string => {
  const v = Number(n || 0);
  return '₹' + v.toLocaleString('en-IN', { maximumFractionDigits: 0, ...opts });
};

export const pct = (n: number | undefined | null, d = 1): string =>
  n == null ? '—' : Number(n).toFixed(d) + '%';

export const num = (n: number | undefined | null, d = 2): string =>
  n == null ? '—' : Number(n).toFixed(d);

export const sign = (n: number | undefined | null): string => (Number(n || 0) >= 0 ? '+' : '');

export const pnlClass = (n: number | undefined | null): string => {
  const v = Number(n || 0);
  return v > 0 ? 'text-emerald-400' : v < 0 ? 'text-rose-400' : 'text-zinc-400';
};

export const voteTone = (v: string): 'emerald' | 'rose' | 'amber' | 'zinc' =>
  v === 'BUY' ? 'emerald' : v === 'SELL' ? 'rose' : v === 'HOLD' ? 'amber' : 'zinc';

export const statusTone = (s: string): 'emerald' | 'rose' | 'amber' | 'sky' | 'zinc' =>
  s === 'open' ? 'sky' : s === 'closed' ? 'emerald' : s === 'pending' ? 'amber' : s === 'rejected' ? 'rose' : 'zinc';

export function timeAgo(iso: string): string {
  const d = new Date(iso).getTime();
  const s = Math.floor((Date.now() - d) / 1000);
  if (Number.isNaN(s) || s < 0) return '—';
  if (s < 60) return 'just now';
  if (s < 3600) return Math.floor(s / 60) + 'm ago';
  if (s < 86400) return Math.floor(s / 3600) + 'h ago';
  if (s < 604800) return Math.floor(s / 86400) + 'd ago';
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

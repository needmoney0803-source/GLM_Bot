import type { ReactNode, ButtonHTMLAttributes, InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { Loader2 } from 'lucide-react';

export function cn(...c: (string | false | undefined | null)[]): string {
  return c.filter(Boolean).join(' ');
}

export function Spinner({ className = '' }: { className?: string }) {
  return <Loader2 className={cn('animate-spin text-zinc-400', className)} size={18} />;
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={cn('rounded-2xl border border-zinc-800 bg-zinc-900/50 backdrop-blur', className)}>{children}</div>;
}

export function Badge({
  children, tone = 'zinc', className = '',
}: { children: ReactNode; tone?: 'zinc' | 'emerald' | 'rose' | 'amber' | 'sky'; className?: string }) {
  const tones: Record<string, string> = {
    zinc: 'bg-zinc-800 text-zinc-300',
    emerald: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
    rose: 'bg-rose-500/15 text-rose-400 border border-rose-500/30',
    amber: 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
    sky: 'bg-sky-500/15 text-sky-400 border border-sky-500/30',
  };
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium', tones[tone], className)}>
      {children}
    </span>
  );
}

export function Button({
  children, variant = 'primary', className = '', ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost' | 'danger' | 'subtle' }) {
  const variants: Record<string, string> = {
    primary: 'bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold',
    ghost: 'border border-zinc-700 hover:bg-zinc-800 text-zinc-200',
    danger: 'bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 border border-rose-500/30',
    subtle: 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200',
  };
  return (
    <button {...rest} className={cn('inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed', variants[variant], className)}>
      {children}
    </button>
  );
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn('w-full rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-500/60 focus:outline-none', props.className)} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cn('w-full rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-sm text-zinc-100 focus:border-emerald-500/60 focus:outline-none', props.className)} />;
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cn('w-full rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-500/60 focus:outline-none', props.className)} />;
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-zinc-400">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-zinc-600">{hint}</span>}
    </label>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button type="button" onClick={() => onChange(!checked)} className="inline-flex items-center gap-2">
      <span className={cn('relative h-5 w-9 rounded-full transition-colors', checked ? 'bg-emerald-500' : 'bg-zinc-700')}>
        <span className={cn('absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all', checked ? 'left-[18px]' : 'left-[2px]')} />
      </span>
      {label && <span className="text-sm text-zinc-300">{label}</span>}
    </button>
  );
}

export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative z-10 w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-900 p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-zinc-100">{title}</h3>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function EmptyState({ icon, title, hint }: { icon?: ReactNode; title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
      {icon && <div className="text-zinc-600">{icon}</div>}
      <p className="text-sm font-medium text-zinc-300">{title}</p>
      {hint && <p className="max-w-xs text-xs text-zinc-500">{hint}</p>}
    </div>
  );
}

export function StatCard({
  label, value, sub, tone = 'zinc', icon,
}: { label: string; value: ReactNode; sub?: ReactNode; tone?: 'zinc' | 'emerald' | 'rose' | 'sky' | 'amber'; icon?: ReactNode }) {
  const tones: Record<string, string> = {
    zinc: 'text-zinc-100', emerald: 'text-emerald-400', rose: 'text-rose-400', sky: 'text-sky-400', amber: 'text-amber-400',
  };
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">{label}</span>
        {icon && <span className="text-zinc-600">{icon}</span>}
      </div>
      <div className={cn('mt-2 font-mono text-2xl tabular-nums', tones[tone])}>{value}</div>
      {sub && <div className="mt-1 text-xs text-zinc-500">{sub}</div>}
    </Card>
  );
}

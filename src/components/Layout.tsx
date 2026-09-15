import { NavLink, Outlet } from 'react-router-dom';
import {
  LayoutDashboard, PlusCircle, ListChecks, BookOpen, Bot, Eye, Shield, Brain, Settings, TrendingUp,
} from 'lucide-react';

const nav = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/new', label: 'New Decision', icon: PlusCircle },
  { to: '/decisions', label: 'Decisions', icon: ListChecks },
  { to: '/journal', label: 'Trade Journal', icon: BookOpen },
  { to: '/agents', label: 'AI Agents', icon: Bot },
  { to: '/watchlist', label: 'Watchlist', icon: Eye },
  { to: '/risk', label: 'Risk Rules', icon: Shield },
  { to: '/insights', label: 'Learning', icon: Brain },
  { to: '/setup', label: 'Setup Guide', icon: Settings },
];

export default function Layout() {
  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-zinc-800 bg-zinc-950/60 md:flex">
        <div className="flex items-center gap-2 px-5 py-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500 text-zinc-950">
            <TrendingUp size={20} />
          </div>
          <div>
            <div className="text-sm font-bold text-zinc-100">AlgoMint</div>
            <div className="text-[10px] text-zinc-500">Multi-LLM Options AI</div>
          </div>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-2">
          {nav.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm ${isActive ? 'bg-emerald-500/15 text-emerald-400' : 'text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200'}`
              }
            >
              <n.icon size={17} />
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="px-5 py-4 text-[10px] leading-relaxed text-zinc-600">
          Paper-trading by default. Educational tool — not investment advice.
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-zinc-800 bg-zinc-950/80 px-4 py-3 backdrop-blur md:hidden">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500 text-zinc-950">
            <TrendingUp size={18} />
          </div>
          <span className="font-bold text-zinc-100">AlgoMint</span>
          <nav className="ml-auto flex gap-1 overflow-x-auto">
            {nav.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
                className={({ isActive }) =>
                  `whitespace-nowrap rounded-md px-2 py-1 text-xs ${isActive ? 'text-emerald-400' : 'text-zinc-400'}`
                }
              >
                {n.label.split(' ')[0]}
              </NavLink>
            ))}
          </nav>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 md:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

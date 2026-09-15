export type ActionType = 'BUY' | 'SELL' | 'HOLD' | 'AVOID';
export type DecisionStatus = 'pending' | 'open' | 'closed' | 'rejected';
export type Segment = 'equity_fno' | 'commodity';

export interface Agent {
  id: number;
  name: string;
  role: string;
  system_prompt: string;
  provider: string;
  model: string;
  weight: number;
  enabled: boolean;
  created_at?: string;
  decisions_count?: number;
  wins?: number;
  losses?: number;
  win_rate?: number | null;
  agreement_rate?: number | null;
}

export interface DecisionAgent {
  id: number;
  decision_id: number;
  agent_id: number | null;
  agent_name: string;
  role: string;
  vote: ActionType;
  confidence: number;
  reasoning: string;
  weight: number;
  effective_weight?: number;
  strategy?: string | null;
  strike?: string | null;
  provider?: string | null;
  model?: string | null;
  used_heuristic?: boolean;
}

export interface TradeOutcome {
  id: number;
  decision_id: number;
  exit_price: number;
  pnl: number;
  pnl_percent: number;
  result: string;
  notes: string;
  closed_at: string;
}

export interface Decision {
  id: number;
  instrument: string;
  segment: Segment;
  exchange: string | null;
  option_type: string;
  strike: string;
  expiry: string;
  action: ActionType;
  qty: number;
  lot_size: number;
  entry_price: number;
  stop_loss: number | null;
  target: number | null;
  setup_summary: string;
  setup_meta: any;
  reasoning: string;
  confidence: number;
  lessons_applied: any;
  status: DecisionStatus;
  mode: string;
  provider_used: string | null;
  created_at: string;
  decision_agents?: DecisionAgent[];
  trade_outcomes?: TradeOutcome[];
}

export interface Lesson {
  id: number;
  setup_type: string;
  instrument_type: string;
  lesson_text: string;
  sample_size: number;
  win_rate: number;
  confidence: number;
  source?: string;
  created_at: string;
  updated_at: string;
}

export interface WatchItem {
  id: number;
  symbol: string;
  name: string;
  segment: Segment;
  exchange: string;
  lot_size: number;
  enabled: boolean;
  created_at?: string;
}

export interface RiskRules {
  id: number;
  max_capital_per_trade: number;
  max_daily_loss: number;
  max_open_positions: number;
  virtual_capital: number;
  allowed_segments: string;
  paper_mode: boolean;
  updated_at?: string;
}

export interface ProviderStatus {
  id: string;
  name: string;
  configured: boolean;
}

export interface DashboardData {
  account: {
    virtual_capital: number;
    realized_pnl: number;
    equity: number;
    open_count: number;
    total_decisions: number;
    wins: number;
    losses: number;
    win_rate: number;
  };
  agents: Agent[];
  recentDecisions: Decision[];
  lessons: Lesson[];
  providers: ProviderStatus[];
  paperMode: boolean;
  brokerReady: boolean;
}

export interface AgentReport {
  agent_id: number | null;
  agent_name: string;
  role: string;
  provider: string | null;
  model: string | null;
  vote: ActionType;
  confidence: number;
  reasoning: string;
  strategy: string | null;
  strike: string | null;
  weight: number;
  effective_weight: number;
  usedHeuristic: boolean;
  winRate: number | null;
}

export interface DecideResult {
  decision: Decision;
  agents: AgentReport[];
  lessonsApplied: string[];
  ensemble: { score: number; confidence: number; avoidCount: number };
  mode: string;
  llmActive: boolean;
}

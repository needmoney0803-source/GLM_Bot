export async function computeAgentStats(supabase) {
  const { data } = await supabase
    .from('decision_agents')
    .select('*, agents(id,name,role,provider,model,weight,enabled), decisions(id, action, status, trade_outcomes(pnl))');
  const map = {};
  for (const da of data || []) {
    const aid = da.agent_id;
    if (!map[aid]) map[aid] = { agent_id: aid, name: da.agent_name, role: da.role, decisions_count: 0, wins: 0, losses: 0, agreed: 0 };
    const dec = da.decisions;
    map[aid].decisions_count++;
    if (dec && dec.status === 'closed' && dec.trade_outcomes && dec.trade_outcomes.length) {
      const pnl = dec.trade_outcomes[0].pnl;
      if (da.vote === dec.action) {
        map[aid].agreed++;
        if (pnl > 0) map[aid].wins++;
        else map[aid].losses++;
      }
    }
  }
  return Object.values(map).map((v) => {
    const followed = v.wins + v.losses;
    return {
      ...v,
      win_rate: followed ? Number((v.wins / followed * 100).toFixed(1)) : null,
      agreement_rate: v.decisions_count ? Number((v.agreed / v.decisions_count * 100).toFixed(1)) : null,
    };
  });
}

export async function getDashboardPayload(supabase) {
  const { data: agentsRaw } = await supabase.from('agents').select('*').order('id', { ascending: true });
  const stats = await computeAgentStats(supabase);
  const statMap = {};
  for (const s of stats) statMap[s.agent_id] = s;
  const agents = (agentsRaw || []).map((a) => ({ ...a, ...(statMap[a.id] || { decisions_count: 0, wins: 0, losses: 0, win_rate: null, agreement_rate: null }) }));

  const { data: recentDecs } = await supabase
    .from('decisions')
    .select('*, decision_agents(*), trade_outcomes(*)')
    .order('created_at', { ascending: false })
    .limit(8);
  const { data: allClosed } = await supabase.from('decisions').select('id, status, trade_outcomes(pnl)').eq('status', 'closed');
  const { data: lessons } = await supabase.from('lessons').select('*').order('updated_at', { ascending: false }).limit(12);
  const { data: risk } = await supabase.from('risk_rules').select('*').limit(1).single();
  const { count: openCount } = await supabase.from('decisions').select('id', { count: 'exact', head: true }).eq('status', 'open');

  const outs = (allClosed || []).map((d) => d.trade_outcomes && d.trade_outcomes[0]).filter(Boolean);
  const realized = outs.reduce((a, o) => a + Number(o.pnl || 0), 0);
  const wins = outs.filter((o) => Number(o.pnl) > 0).length;
  const losses = outs.filter((o) => Number(o.pnl) <= 0).length;
  const total = outs.length;
  const winRate = total ? Number((wins / total * 100).toFixed(1)) : 0;

  const PROVIDERS = [
    ['gemini', 'Google Gemini', 'GEMINI_API_KEY'],
    ['groq', 'Groq', 'GROQ_API_KEY'],
    ['openrouter', 'OpenRouter', 'OPENROUTER_API_KEY'],
    ['mistral', 'Mistral', 'MISTRAL_API_KEY'],
    ['cerebras', 'Cerebras', 'CEREBRAS_API_KEY'],
  ];
  const providers = PROVIDERS.map(([id, name, env]) => ({ id, name, configured: !!process.env[env] }));
  const brokerReady = !!(process.env.DHAN_CLIENT_ID || process.env.FYERS_CLIENT_ID);

  return {
    account: {
      virtual_capital: Number((risk && risk.virtual_capital) || 0),
      realized_pnl: realized,
      equity: Number((risk && risk.virtual_capital) || 0) + realized,
      open_count: openCount || 0,
      total_decisions: total,
      wins, losses, win_rate: winRate,
    },
    agents,
    recentDecisions: recentDecs || [],
    lessons: lessons || [],
    providers,
    paperMode: (risk && risk.paper_mode) !== false,
    brokerReady,
  };
}

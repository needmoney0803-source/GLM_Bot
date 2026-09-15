import { callLLM, hasAnyProvider } from './llm.js';

const ROLE_PROMPTS = {
  technical: 'You are a senior technical analyst specializing in Indian equity (NSE/BSE) and commodity (MCX) markets. Analyze price action, support/resistance, trend, momentum, volume and open interest. Focus on what the chart says about the next likely move over the option life. Be concise and decisive.',
  greeks: 'You are an options strategist expert in Greeks (delta, gamma, vega, theta), IV rank, IV skew and strategy selection for NSE F&O and MCX commodity options. Recommend whether to buy or write, the strike and a strategy (naked, spread, straddle, ratio). Always account for IV and time decay.',
  sentiment: 'You are a market sentiment and news analyst for Indian markets. Weigh FII/DII flows, news, events, broad market mood and positioning. Translate sentiment into a directional view for this setup.',
  risk: 'You are a disciplined risk manager. Evaluate risk/reward, maximum loss, position sizing relative to capital, and whether this trade should be taken, avoided or sized down. Prioritize capital preservation above all.',
  commodities: 'You are a commodities and macro analyst focused on MCX (crude oil, gold, silver, natural gas), USD/INR, global macros, inventories and seasonality. For equity setups, assess sector breadth and macro backdrop. Give a clear directional view.',
};

function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n));
}

export function parseAgentResponse(text) {
  if (!text) return null;
  let obj = null;
  try { obj = JSON.parse(text); } catch {}
  if (!obj) {
    const m = text.match(/\{[\s\S]*\}/);
    if (m) { try { obj = JSON.parse(m[0]); } catch {} }
  }
  if (obj && obj.vote) {
    return {
      vote: String(obj.vote).toUpperCase().trim(),
      confidence: clamp(Number(obj.confidence) || 50, 0, 100),
      reasoning: obj.reasoning || obj.rationale || text.slice(0, 400),
      strike: obj.strike || obj.suggestedStrike || null,
      strategy: obj.strategy || obj.suggestedStrategy || null,
    };
  }
  const voteMatch = text.match(/VOTE[:\s]+([A-Z]+)/i);
  const confMatch = text.match(/CONFIDENCE[:\s]+(\d+)/i);
  return {
    vote: voteMatch ? voteMatch[1].toUpperCase() : 'HOLD',
    confidence: confMatch ? clamp(Number(confMatch[1]), 0, 100) : 50,
    reasoning: text.slice(0, 500),
    strike: null,
    strategy: null,
  };
}

export function heuristicVote(role, s) {
  const bull = s.trend === 'bullish';
  const bear = s.trend === 'bearish';
  const highIV = (Number(s.iv) || 0) >= 22;
  const isCE = (s.optionType || 'CE').toUpperCase() === 'CE';
  const dirLong = (bull && isCE) || (bear && !isCE);
  const dirShort = (bull && !isCE) || (bear && isCE);
  const map = {
    technical: () => ({ vote: dirLong ? 'BUY' : dirShort ? 'SELL' : 'HOLD', confidence: 62, strategy: dirLong ? 'Long option' : dirShort ? 'Sell / write' : 'Wait', reasoning: `Trend ${s.trend}; chart favors ${dirLong ? 'long' : dirShort ? 'short' : 'sidelines'} on ${s.instrument} ${s.optionType} ${s.strike}.` }),
    greeks: () => ({ vote: highIV ? 'SELL' : dirLong ? 'BUY' : dirShort ? 'SELL' : 'HOLD', confidence: highIV ? 68 : 58, strategy: highIV ? 'Credit spread (sell premium)' : dirLong ? 'Debit spread' : 'Wait', reasoning: `IV ${s.iv} is ${highIV ? 'elevated - prefer premium selling' : 'reasonable - long options viable'}. Strike ${s.strike}.` }),
    sentiment: () => ({ vote: dirLong ? 'BUY' : dirShort ? 'SELL' : 'HOLD', confidence: 55, strategy: null, reasoning: `Sentiment aligns with ${s.trend} bias. Flow/news supportive of ${dirLong ? 'long' : dirShort ? 'short' : 'neutral'} stance.` }),
    risk: () => ({ vote: highIV && dirLong ? 'AVOID' : dirLong ? 'BUY' : dirShort ? 'SELL' : 'HOLD', confidence: 50, strategy: highIV ? 'Reduce size or avoid' : 'Standard size', reasoning: `R:R ${highIV ? 'unfavorable due to rich IV' : 'acceptable'}. ${highIV && dirLong ? 'Capital preservation - avoid overpaying.' : 'Risk within limits.'}` }),
    commodities: () => ({ vote: dirLong ? 'BUY' : dirShort ? 'SELL' : 'HOLD', confidence: s.segment === 'commodity' ? 60 : 52, strategy: null, reasoning: s.segment === 'commodity' ? `Commodity ${s.instrument} trend ${s.trend}; macro/seasonality supports ${dirLong ? 'long' : dirShort ? 'short' : 'wait'}.` : `Macro backdrop ${s.trend}-leaning for ${s.instrument}.` }),
  };
  return (map[role] || map.technical)();
}

function buildAgentUserPrompt(role, s, lessons) {
  const lessonText = (lessons || []).slice(0, 4).map((l) => `- ${l.lesson_text}`).join('\n') || 'None yet.';
  return `MARKET SETUP (Indian market):
Instrument: ${s.instrument} | Segment: ${s.segment} | Exchange: ${s.exchange || 'NSE/MCX'}
Underlying spot: ${s.spot} | Option type: ${s.optionType} | Strike: ${s.strike} | Expiry: ${s.expiry}
Implied Volatility (IV): ${s.iv} | Trend read: ${s.trend}
Market context: ${s.marketContext || 'n/a'}
Sentiment/flow notes: ${s.sentimentNotes || 'n/a'}

PAST LESSONS LEARNED (apply these):
${lessonText}

As the ${role.replace(/_/g, ' ')} analyst, give your verdict on this options setup.
Respond ONLY with strict JSON:
{"vote":"BUY|SELL|HOLD|AVOID","confidence":0-100,"reasoning":"2-3 sentences","strike":"suggested strike or null","strategy":"suggested strategy or null"}`;
}

async function computeAgentStatsLite(supabase) {
  const { data } = await supabase
    .from('decision_agents')
    .select('*, decisions(id, action, status, trade_outcomes(pnl))');
  const m = {};
  for (const da of data || []) {
    const dec = da.decisions;
    if (!dec || dec.status !== 'closed' || !dec.trade_outcomes || !dec.trade_outcomes.length) continue;
    const pnl = dec.trade_outcomes[0].pnl;
    if (pnl == null) continue;
    if (!m[da.agent_id]) m[da.agent_id] = { wins: 0, losses: 0 };
    if (da.vote === dec.action) {
      if (pnl > 0) m[da.agent_id].wins++;
      else m[da.agent_id].losses++;
    }
  }
  return Object.entries(m).map(([aid, v]) => {
    const tot = v.wins + v.losses;
    return { agent_id: Number(aid), wins: v.wins, losses: v.losses, win_rate: tot ? v.wins / tot : null };
  });
}

export async function runDecision(s, supabase) {
  let { data: agents } = await supabase.from('agents').select('*').eq('enabled', true).order('id', { ascending: true });
  if (!agents || !agents.length) {
    const r2 = await supabase.from('agents').select('*').order('id', { ascending: true });
    agents = r2.data || [];
  }
  const { data: risk } = await supabase.from('risk_rules').select('*').limit(1).single();
  const { data: watch } = await supabase.from('watchlist').select('*').eq('symbol', s.instrument).limit(1);
  const watchItem = watch && watch[0];
  const lotSize = (watchItem && watchItem.lot_size) || (s.segment === 'commodity' ? 100 : 50);
  const { data: lessons } = await supabase.from('lessons').select('*').order('updated_at', { ascending: false }).limit(6);

  const stats = await computeAgentStatsLite(supabase);
  const statMap = {};
  for (const st of stats) statMap[st.agent_id] = st;

  const anyLLM = hasAnyProvider();
  const agentReports = [];
  for (const a of agents) {
    let parsed = null;
    let provider = null;
    let model = null;
    let usedHeuristic = false;
    if (anyLLM) {
      const sys = a.system_prompt || ROLE_PROMPTS[a.role] || 'You are a financial analyst.';
      const user = buildAgentUserPrompt(a.role, s, lessons);
      const r = await callLLM({ provider: a.provider, model: a.model, system: sys, user });
      if (r.text) {
        parsed = parseAgentResponse(r.text);
        provider = r.provider;
        model = r.model;
      }
    }
    if (!parsed) {
      parsed = heuristicVote(a.role, s);
      usedHeuristic = true;
      provider = 'heuristic';
    }
    const baseW = Number(a.weight) || 1;
    const st = statMap[a.id];
    const winRate = st && st.win_rate != null ? st.win_rate : null;
    const effW = baseW * (winRate != null ? 0.4 + winRate : 1);
    agentReports.push({
      agent_id: a.id, agent_name: a.name, role: a.role, provider, model, usedHeuristic,
      vote: parsed.vote, confidence: parsed.confidence, reasoning: parsed.reasoning,
      strike: parsed.strike, strategy: parsed.strategy, weight: baseW, effective_weight: effW, winRate,
    });
  }

  const avoidCount = agentReports.filter((r) => r.vote === 'AVOID').length;
  const sumW = agentReports.reduce((a, r) => a + r.effective_weight, 0) || 1;
  const voteNum = { BUY: 1, SELL: -1, HOLD: 0, AVOID: 0 };
  const score = agentReports.reduce((a, r) => a + r.effective_weight * (voteNum[r.vote] || 0), 0) / sumW;
  let action = 'HOLD';
  if (avoidCount > agentReports.length / 2) action = 'AVOID';
  else if (score > 0.2) action = 'BUY';
  else if (score < -0.2) action = 'SELL';
  const confidence = clamp(Math.round((agentReports.reduce((a, r) => a + r.effective_weight * r.confidence, 0) / sumW) * Math.max(0.4, Math.abs(score) + 0.5)), 0, 100);

  let finalOptionType = s.optionType || 'CE';
  if (action === 'BUY') finalOptionType = s.trend === 'bearish' ? 'PE' : 'CE';
  if (action === 'SELL') finalOptionType = s.trend === 'bullish' ? 'PE' : 'CE';
  const finalStrike = s.strike || agentReports.map((r) => r.strike).filter(Boolean)[0] || String(s.spot);

  const premium = Number(s.premium) || Math.round(Number(s.spot) * (s.segment === 'commodity' ? 0.02 : 0.012));
  const maxRisk = Number(risk && risk.max_capital_per_trade) || 25000;
  let qty = Math.max(1, Math.floor(maxRisk / (premium * lotSize)));
  const { count: openCount } = await supabase.from('decisions').select('id', { count: 'exact', head: true }).eq('status', 'open');
  const maxPos = Number(risk && risk.max_open_positions) || 5;
  if ((openCount || 0) + qty > maxPos * 4) qty = 1;
  const entry_price = premium;
  const stop_loss = action === 'SELL' ? Math.round(premium * 1.6) : Math.round(premium * 0.55);
  const target = action === 'SELL' ? Math.round(premium * 0.45) : Math.round(premium * 2);

  const agrees = agentReports.filter((r) => r.vote === action);
  const disagrees = agentReports.filter((r) => r.vote !== action);
  const maxLoss = Math.round((action === 'BUY' ? entry_price - stop_loss : stop_loss - entry_price) * qty * lotSize);
  let rationale = `Ensemble consensus: ${agrees.length}/${agentReports.length} analysts favor ${action} (weighted score ${score.toFixed(2)}). Confidence ${confidence}%. Key view: ${(agrees[0] && agrees[0].reasoning || '').slice(0, 160)} `
    + (disagrees[0] ? `Dissent: ${disagrees[0].agent_name} advised ${disagrees[0].vote}. ` : '')
    + `Risk: ${qty} lot(s) of ${lotSize} -> max loss approx Rs.${maxLoss.toLocaleString('en-IN')}. `
    + (anyLLM ? '' : '(Heuristic mode - add an LLM API key in Secrets for full multi-LLM analysis.)');

  if (anyLLM && action !== 'AVOID') {
    const mgrUser = `You are the portfolio manager. Synthesize a final trade decision from analyst votes. Setup: ${s.instrument} ${finalOptionType} ${finalStrike} expiry ${s.expiry}, spot ${s.spot}, IV ${s.iv}, trend ${s.trend}. Decide action/strike/qty/SL/target with rationale. Respond JSON {"action","strike","qty","stop_loss","target","confidence","rationale"}.\nAnalyst votes:\n${agentReports.map((r) => `- ${r.agent_name} (${r.role}): ${r.vote} conf ${r.confidence} - ${r.reasoning}`).join('\n')}`;
    const r = await callLLM({ provider: null, model: null, system: 'You are a disciplined Indian-market options portfolio manager.', user: mgrUser });
    if (r.text) {
      let m = null;
      try { m = JSON.parse(r.text); } catch { const mm = r.text.match(/\{[\s\S]*\}/); if (mm) { try { m = JSON.parse(mm[0]); } catch {} } }
      if (m && m.rationale) rationale = m.rationale;
    }
  }

  const lessonsApplied = (lessons || []).slice(0, 4).map((l) => l.lesson_text);
  const mode = risk && risk.paper_mode === false ? 'live' : 'paper';
  const status = action === 'AVOID' ? 'rejected' : mode === 'paper' ? 'open' : 'pending';
  const exchange = (watchItem && watchItem.exchange) || (s.segment === 'commodity' ? 'MCX' : 'NSE');

  const { data: dec, error: decErr } = await supabase.from('decisions').insert({
    instrument: s.instrument, segment: s.segment, exchange, option_type: finalOptionType, strike: finalStrike,
    expiry: s.expiry, action, qty, lot_size: lotSize, entry_price, stop_loss, target,
    setup_summary: s.marketContext || '', setup_meta: { spot: s.spot, iv: s.iv, trend: s.trend, sentiment: s.sentimentNotes },
    reasoning: rationale, confidence, lessons_applied: lessonsApplied, status, mode, provider_used: anyLLM ? 'multi-llm' : 'heuristic',
  }).select().single();
  if (decErr) throw decErr;

  if (dec && agentReports.length) {
    const rows = agentReports.map((r) => ({
      decision_id: dec.id, agent_id: r.agent_id, agent_name: r.agent_name, role: r.role, vote: r.vote,
      confidence: r.confidence, reasoning: r.reasoning, weight: r.weight, effective_weight: r.effective_weight,
      strategy: r.strategy, strike: r.strike, provider: r.provider, model: r.model, used_heuristic: r.usedHeuristic,
    }));
    await supabase.from('decision_agents').insert(rows);
  }

  return { decision: dec, agents: agentReports, lessonsApplied, ensemble: { score: Number(score.toFixed(2)), confidence, avoidCount }, mode, llmActive: anyLLM };
}

export async function extractLessons(supabase) {
  const { data: decs } = await supabase
    .from('decisions')
    .select('*, trade_outcomes(pnl,result), decision_agents(agent_name,role,vote)')
    .eq('status', 'closed')
    .order('created_at', { ascending: false })
    .limit(60);
  const lessons = [];
  const byGroup = {};
  for (const d of decs || []) {
    const out = d.trade_outcomes && d.trade_outcomes[0];
    if (!out) continue;
    const key = `${d.segment}|${d.option_type}|${d.action}`;
    byGroup[key] = byGroup[key] || { wins: 0, losses: 0, pnl: 0 };
    if (out.pnl > 0) byGroup[key].wins++;
    else byGroup[key].losses++;
    byGroup[key].pnl += Number(out.pnl) || 0;
  }
  for (const [key, g] of Object.entries(byGroup)) {
    const total = g.wins + g.losses;
    if (total < 2) continue;
    const [seg, ot, act] = key.split('|');
    const wr = (g.wins / total * 100).toFixed(0);
    lessons.push({
      setup_type: key, instrument_type: seg,
      lesson_text: `${seg === 'commodity' ? 'Commodity' : 'Equity'} ${ot} ${act} setups: ${total} trades, ${wr}% win rate, net Rs.${Math.round(g.pnl).toLocaleString('en-IN')}. ${g.wins >= g.losses ? 'Bias toward continuing with disciplined sizing.' : 'Reduce frequency / tighten entry criteria.'}`,
      sample_size: total, win_rate: Number(wr), confidence: clamp(total * 8, 10, 95), source: 'auto',
    });
  }
  const agentMap = {};
  for (const d of decs || []) {
    const out = d.trade_outcomes && d.trade_outcomes[0];
    if (!out) continue;
    for (const da of d.decision_agents || []) {
      if (da.vote === d.action) {
        agentMap[da.agent_name] = agentMap[da.agent_name] || { wins: 0, losses: 0 };
        if (out.pnl > 0) agentMap[da.agent_name].wins++;
        else agentMap[da.agent_name].losses++;
      }
    }
  }
  for (const [name, a] of Object.entries(agentMap)) {
    const tot = a.wins + a.losses;
    if (tot < 2) continue;
    const wr = (a.wins / tot * 100).toFixed(0);
    lessons.push({ setup_type: `agent|${name}`, instrument_type: 'agent', lesson_text: `${name}: when its vote was followed, ${wr}% win rate over ${tot} trades. ${Number(wr) >= 55 ? 'Trust rising - increase weight.' : 'Trust falling - reduce weight.'}`, sample_size: tot, win_rate: Number(wr), confidence: clamp(tot * 8, 10, 95), source: 'auto' });
  }
  if (hasAnyProvider() && (decs || []).length >= 3) {
    const compact = (decs || []).slice(0, 25).map((d) => `${d.instrument} ${d.option_type} ${d.action} strike ${d.strike} IV ${d.setup_meta && d.setup_meta.iv} trend ${d.setup_meta && d.setup_meta.trend} -> Rs.${d.trade_outcomes[0] && d.trade_outcomes[0].pnl}`).join('\n');
    const r = await callLLM({ provider: null, model: null, system: 'You are a trading performance coach for Indian options.', user: `Closed trades:\n${compact}\n\nExtract 3 concise, actionable lessons (max 25 words each). Respond JSON array of strings.` });
    if (r.text) {
      let arr = null;
      try { arr = JSON.parse(r.text); } catch { const m = r.text.match(/\[[\s\S]*\]/); if (m) { try { arr = JSON.parse(m[0]); } catch {} } }
      if (Array.isArray(arr)) for (const t of arr.slice(0, 4)) lessons.push({ setup_type: 'llm|insight', instrument_type: 'insight', lesson_text: String(t), sample_size: (decs || []).length, win_rate: 0, confidence: 60, source: 'llm' });
    }
  }
  await supabase.from('lessons').delete().in('source', ['auto', 'llm']);
  if (lessons.length) await supabase.from('lessons').insert(lessons);
  return lessons;
}

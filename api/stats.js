import supabase from './db-client.js';
import { setCors, handleOptions } from './_cors.js';
import { computeAgentStats } from './_stats.js';

export default async function handler(req, res) {
  setCors(res);
  if (handleOptions(req, res)) return;
  try {
    if (req.method === 'GET') {
      const agents = await computeAgentStats(supabase);
      const { data: closed } = await supabase.from('decisions').select('id, status, trade_outcomes(pnl)').eq('status', 'closed');
      const outs = (closed || []).map((d) => d.trade_outcomes && d.trade_outcomes[0]).filter(Boolean);
      const realized = outs.reduce((a, o) => a + Number(o.pnl || 0), 0);
      const wins = outs.filter((o) => Number(o.pnl) > 0).length;
      const losses = outs.filter((o) => Number(o.pnl) <= 0).length;
      const total = outs.length;
      return res.status(200).json({
        agents,
        overall: { realized, wins, losses, total, win_rate: total ? Number((wins / total * 100).toFixed(1)) : 0 },
      });
    }
    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('stats api error:', err);
    res.status(500).json({ error: err.message });
  }
}

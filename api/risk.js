import supabase from './db-client.js';
import { setCors, handleOptions } from './_cors.js';

export default async function handler(req, res) {
  setCors(res);
  if (handleOptions(req, res)) return;
  try {
    if (req.method === 'GET') {
      const { data, error } = await supabase.from('risk_rules').select('*').limit(1).single();
      if (error && error.code !== 'PGRST116') throw error;
      return res.status(200).json(data || null);
    }
    if (req.method === 'PUT') {
      const { id, max_capital_per_trade, max_daily_loss, max_open_positions, virtual_capital, allowed_segments, paper_mode } = req.body || {};
      const patch = { max_capital_per_trade, max_daily_loss, max_open_positions, virtual_capital, allowed_segments, paper_mode, updated_at: new Date().toISOString() };
      const { data, error } = await supabase.from('risk_rules').update(patch).eq('id', id || 1).select().single();
      if (error) throw error;
      return res.status(200).json(data);
    }
    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('risk api error:', err);
    res.status(500).json({ error: err.message });
  }
}

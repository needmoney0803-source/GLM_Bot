import supabase from './db-client.js';
import { setCors, handleOptions } from './_cors.js';
import { extractLessons } from './_engine.js';

export default async function handler(req, res) {
  setCors(res);
  if (handleOptions(req, res)) return;
  try {
    if (req.method === 'POST') {
      const { decision_id, exit_price, result, notes } = req.body || {};
      if (!decision_id || exit_price == null) {
        return res.status(400).json({ error: 'decision_id and exit_price are required' });
      }
      const { data: dec } = await supabase.from('decisions').select('*').eq('id', decision_id).single();
      if (!dec) return res.status(404).json({ error: 'decision not found' });
      const sign = dec.action === 'SELL' ? -1 : 1;
      const pnl = (Number(exit_price) - Number(dec.entry_price)) * Number(dec.qty || 1) * Number(dec.lot_size || 1) * sign;
      const cost = Number(dec.entry_price) * Number(dec.qty || 1) * Number(dec.lot_size || 1);
      const pnl_percent = cost ? (pnl / cost * 100) : 0;
      const { data: out, error } = await supabase.from('trade_outcomes').insert({
        decision_id, exit_price, pnl, pnl_percent, result: result || 'manual_close', notes: notes || '', closed_at: new Date().toISOString(),
      }).select().single();
      if (error) throw error;
      await supabase.from('decisions').update({ status: 'closed' }).eq('id', decision_id);
      try { await extractLessons(supabase); } catch (e) { console.error('lesson refresh failed:', e.message); }
      return res.status(201).json({ outcome: out, pnl, pnl_percent });
    }
    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('outcomes api error:', err);
    res.status(500).json({ error: err.message });
  }
}

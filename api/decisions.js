import supabase from './db-client.js';
import { setCors, handleOptions } from './_cors.js';

export default async function handler(req, res) {
  setCors(res);
  if (handleOptions(req, res)) return;
  try {
    if (req.method === 'GET') {
      const { id, status, limit } = req.query;
      if (id) {
        const { data, error } = await supabase.from('decisions').select('*, decision_agents(*), trade_outcomes(*)').eq('id', id).single();
        if (error) throw error;
        return res.status(200).json(data);
      }
      let q = supabase.from('decisions').select('*, decision_agents(*), trade_outcomes(*)').order('created_at', { ascending: false });
      if (status) q = q.eq('status', status);
      q = q.limit(Number(limit) || 100);
      const { data, error } = await q;
      if (error) throw error;
      return res.status(200).json(data || []);
    }
    if (req.method === 'POST') {
      const b = req.body || {};
      const { data, error } = await supabase.from('decisions').insert({
        instrument: b.instrument, segment: b.segment, exchange: b.exchange, option_type: b.option_type,
        strike: b.strike, expiry: b.expiry, action: b.action || 'HOLD', qty: b.qty || 1, lot_size: b.lot_size || 50,
        entry_price: b.entry_price || 0, stop_loss: b.stop_loss || null, target: b.target || null,
        setup_summary: b.setup_summary || '', setup_meta: b.setup_meta || {}, reasoning: b.reasoning || '',
        confidence: b.confidence || 0, lessons_applied: b.lessons_applied || [], status: b.status || 'pending',
        mode: b.mode || 'paper', provider_used: b.provider_used || 'manual',
      }).select().single();
      if (error) throw error;
      return res.status(201).json(data);
    }
    if (req.method === 'PUT') {
      const { id, status, action, qty, entry_price, stop_loss, target, confidence, reasoning } = req.body || {};
      const patch = {};
      if (status !== undefined) patch.status = status;
      if (action !== undefined) patch.action = action;
      if (qty !== undefined) patch.qty = qty;
      if (entry_price !== undefined) patch.entry_price = entry_price;
      if (stop_loss !== undefined) patch.stop_loss = stop_loss;
      if (target !== undefined) patch.target = target;
      if (confidence !== undefined) patch.confidence = confidence;
      if (reasoning !== undefined) patch.reasoning = reasoning;
      const { data, error } = await supabase.from('decisions').update(patch).eq('id', id).select().single();
      if (error) throw error;
      return res.status(200).json(data);
    }
    if (req.method === 'DELETE') {
      const { id } = req.body || {};
      await supabase.from('decision_agents').delete().eq('decision_id', id);
      await supabase.from('trade_outcomes').delete().eq('decision_id', id);
      const { error } = await supabase.from('decisions').delete().eq('id', id);
      if (error) throw error;
      return res.status(200).json({ ok: true });
    }
    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('decisions api error:', err);
    res.status(500).json({ error: err.message });
  }
}

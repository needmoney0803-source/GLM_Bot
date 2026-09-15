import supabase from './db-client.js';
import { setCors, handleOptions } from './_cors.js';

export default async function handler(req, res) {
  setCors(res);
  if (handleOptions(req, res)) return;
  try {
    if (req.method === 'GET') {
      const { data, error } = await supabase.from('watchlist').select('*').order('id', { ascending: true });
      if (error) throw error;
      return res.status(200).json(data || []);
    }
    if (req.method === 'POST') {
      const { symbol, name, segment, exchange, lot_size, enabled } = req.body || {};
      const { data, error } = await supabase.from('watchlist').insert({
        symbol, name, segment, exchange, lot_size: lot_size || 50, enabled: enabled ?? true,
      }).select().single();
      if (error) throw error;
      return res.status(201).json(data);
    }
    if (req.method === 'PUT') {
      const { id, symbol, name, segment, exchange, lot_size, enabled } = req.body || {};
      const { data, error } = await supabase.from('watchlist').update({
        symbol, name, segment, exchange, lot_size, enabled,
      }).eq('id', id).select().single();
      if (error) throw error;
      return res.status(200).json(data);
    }
    if (req.method === 'DELETE') {
      const { id } = req.body || {};
      const { error } = await supabase.from('watchlist').delete().eq('id', id);
      if (error) throw error;
      return res.status(200).json({ ok: true });
    }
    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('watchlist api error:', err);
    res.status(500).json({ error: err.message });
  }
}

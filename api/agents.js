import supabase from './db-client.js';
import { setCors, handleOptions } from './_cors.js';
import { computeAgentStats } from './_stats.js';

export default async function handler(req, res) {
  setCors(res);
  if (handleOptions(req, res)) return;
  try {
    if (req.method === 'GET') {
      const { data: agents, error } = await supabase.from('agents').select('*').order('id', { ascending: true });
      if (error) throw error;
      const stats = await computeAgentStats(supabase);
      const sm = {};
      for (const s of stats) sm[s.agent_id] = s;
      const out = (agents || []).map((a) => ({
        ...a,
        decisions_count: (sm[a.id] && sm[a.id].decisions_count) || 0,
        wins: (sm[a.id] && sm[a.id].wins) || 0,
        losses: (sm[a.id] && sm[a.id].losses) || 0,
        win_rate: (sm[a.id] && sm[a.id].win_rate) ?? null,
        agreement_rate: (sm[a.id] && sm[a.id].agreement_rate) ?? null,
      }));
      return res.status(200).json(out);
    }
    if (req.method === 'POST') {
      const { name, role, system_prompt, provider, model, weight, enabled } = req.body || {};
      const { data, error } = await supabase.from('agents').insert({
        name, role, system_prompt, provider, model, weight: weight ?? 1, enabled: enabled ?? true,
      }).select().single();
      if (error) throw error;
      return res.status(201).json(data);
    }
    if (req.method === 'PUT') {
      const { id, name, role, system_prompt, provider, model, weight, enabled } = req.body || {};
      const { data, error } = await supabase.from('agents').update({
        name, role, system_prompt, provider, model, weight, enabled,
      }).eq('id', id).select().single();
      if (error) throw error;
      return res.status(200).json(data);
    }
    if (req.method === 'DELETE') {
      const { id } = req.body || {};
      const { error } = await supabase.from('agents').delete().eq('id', id);
      if (error) throw error;
      return res.status(200).json({ ok: true });
    }
    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('agents api error:', err);
    res.status(500).json({ error: err.message });
  }
}

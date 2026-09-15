import supabase from './db-client.js';
import { setCors, handleOptions } from './_cors.js';
import { runDecision } from './_engine.js';

export default async function handler(req, res) {
  setCors(res);
  if (handleOptions(req, res)) return;
  try {
    if (req.method === 'POST') {
      const setup = req.body || {};
      if (!setup.instrument || !setup.spot) {
        return res.status(400).json({ error: 'instrument and spot are required' });
      }
      const result = await runDecision(setup, supabase);
      return res.status(201).json(result);
    }
    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('decide api error:', err);
    res.status(500).json({ error: err.message });
  }
}

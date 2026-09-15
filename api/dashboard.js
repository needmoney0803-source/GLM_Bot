import supabase from './db-client.js';
import { setCors, handleOptions } from './_cors.js';
import { getDashboardPayload } from './_stats.js';

export default async function handler(req, res) {
  setCors(res);
  if (handleOptions(req, res)) return;
  try {
    if (req.method === 'GET') {
      const payload = await getDashboardPayload(supabase);
      return res.status(200).json(payload);
    }
    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('dashboard api error:', err);
    res.status(500).json({ error: err.message });
  }
}

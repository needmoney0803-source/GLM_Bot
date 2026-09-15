import supabase from './db-client.js';
import { setCors, handleOptions } from './_cors.js';

export default async function handler(req, res) {
  setCors(res);
  if (handleOptions(req, res)) return;
  try {
    if (req.method === 'GET') {
      const { data: open } = await supabase.from('decisions').select('*, trade_outcomes(*)').eq('status', 'open').order('created_at', { ascending: false });
      const liveReady = !!(process.env.DHAN_CLIENT_ID || process.env.FYERS_CLIENT_ID);
      return res.status(200).json({
        liveReady,
        message: liveReady
          ? 'Broker credentials detected - live trading can be enabled in Risk Rules.'
          : 'No broker credentials. Running in paper mode. Add DHAN_CLIENT_ID/SECRET or FYERS keys in Secrets to go live.',
        openPositions: open || [],
      });
    }
    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('broker api error:', err);
    res.status(500).json({ error: err.message });
  }
}

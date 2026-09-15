import supabase from './db-client.js';
import { setCors, handleOptions } from './_cors.js';
import { availableProviders, hasAnyProvider } from './llm.js';

export default async function handler(req, res) {
  setCors(res);
  if (handleOptions(req, res)) return;
  try {
    if (req.method === 'GET') {
      const { data: risk } = await supabase.from('risk_rules').select('*').limit(1).single();
      return res.status(200).json({
        providers: availableProviders(),
        anyConfigured: hasAnyProvider(),
        brokerReady: !!(process.env.DHAN_CLIENT_ID || process.env.FYERS_CLIENT_ID),
        paperMode: (risk && risk.paper_mode) !== false,
      });
    }
    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('settings api error:', err);
    res.status(500).json({ error: err.message });
  }
}

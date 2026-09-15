import supabase from './db-client.js';
import { setCors, handleOptions } from './_cors.js';
import { extractLessons } from './_engine.js';

export default async function handler(req, res) {
  setCors(res);
  if (handleOptions(req, res)) return;
  try {
    if (req.method === 'GET') {
      const { data, error } = await supabase.from('lessons').select('*').order('updated_at', { ascending: false }).limit(50);
      if (error) throw error;
      return res.status(200).json(data || []);
    }
    if (req.method === 'POST') {
      const lessons = await extractLessons(supabase);
      return res.status(200).json(lessons);
    }
    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('lessons api error:', err);
    res.status(500).json({ error: err.message });
  }
}

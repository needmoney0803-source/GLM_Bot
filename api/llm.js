const PROVIDERS = {
  gemini: { name: 'Google Gemini', env: 'GEMINI_API_KEY' },
  groq: { name: 'Groq', env: 'GROQ_API_KEY' },
  openrouter: { name: 'OpenRouter', env: 'OPENROUTER_API_KEY' },
  mistral: { name: 'Mistral', env: 'MISTRAL_API_KEY' },
  cerebras: { name: 'Cerebras', env: 'CEREBRAS_API_KEY' },
};

const DEFAULT_MODELS = {
  gemini: 'gemini-2.0-flash',
  groq: 'llama-3.3-70b-versatile',
  openrouter: 'meta-llama/llama-3.3-70b-instruct:free',
  mistral: 'mistral-small-latest',
  cerebras: 'llama-3.3-70b',
};

const OPENAI_COMPATIBLE = {
  groq: 'https://api.groq.com/openai/v1',
  openrouter: 'https://openrouter.ai/api/v1',
  mistral: 'https://api.mistral.ai/v1',
  cerebras: 'https://api.cerebras.ai/v1',
};

export function defaultModel(provider) {
  return DEFAULT_MODELS[provider] || 'gpt-3.5-turbo';
}

export function availableProviders() {
  return Object.entries(PROVIDERS).map(([id, p]) => ({
    id,
    name: p.name,
    configured: !!process.env[p.env],
  }));
}

export function hasAnyProvider() {
  return Object.values(PROVIDERS).some((p) => !!process.env[p.env]);
}

async function callGemini(model, system, user) {
  const key = process.env.GEMINI_API_KEY;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
  const body = {
    contents: [{ role: 'user', parts: [{ text: user }] }],
    generationConfig: { temperature: 0.4, maxOutputTokens: 1024 },
  };
  if (system) body.systemInstruction = { parts: [{ text: system }] };
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Gemini ${res.status}: ${t.slice(0, 180)}`);
  }
  const data = await res.json();
  return (data.candidates?.[0]?.content?.parts || []).map((p) => p.text || '').join('').trim();
}

async function callOpenAICompatible(provider, model, system, user) {
  const key = process.env[PROVIDERS[provider].env];
  const base = OPENAI_COMPATIBLE[provider];
  const res = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model,
      messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
      temperature: 0.4,
      max_tokens: 1024,
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`${provider} ${res.status}: ${t.slice(0, 180)}`);
  }
  const data = await res.json();
  return (data.choices?.[0]?.message?.content || '').trim();
}

export async function callLLM({ provider, model, system, user }) {
  const order = [];
  if (provider) order.push(provider);
  for (const p of Object.keys(PROVIDERS)) if (p !== provider) order.push(p);
  let lastErr = null;
  for (const p of order) {
    const env = PROVIDERS[p]?.env;
    if (!env || !process.env[env]) continue;
    try {
      const m = model || defaultModel(p);
      const text =
        p === 'gemini'
          ? await callGemini(m, system, user)
          : await callOpenAICompatible(p, m, system, user);
      if (text) return { text, provider: p, model: m };
    } catch (e) {
      lastErr = e;
    }
  }
  return { text: null, provider: null, model: null, error: lastErr?.message || 'No LLM provider configured' };
}

import { setCors, handleOptions } from './_cors.js';

export default async function handler(req, res) {
  setCors(res);
  if (handleOptions(req, res)) return;
  try {
    if (req.method === 'GET') {
      return res.status(200).json({ providers: availableProviders(), anyConfigured: hasAnyProvider() });
    }
    if (req.method === 'POST') {
      const { provider, model, system, user } = req.body || {};
      const result = await callLLM({ provider, model, system, user });
      return res.status(200).json(result);
    }
    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('llm api error:', err);
    res.status(500).json({ error: err.message });
  }
}

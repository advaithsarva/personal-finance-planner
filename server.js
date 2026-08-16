const express = require('express');
const { plan } = require('./finance');

const app = express();
app.use(express.json());
app.use(express.static('public'));

const GROQ_KEY = process.env.GROQ_API_KEY;   // no fallback default, ever
const MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

// The model never sees a blank slate — it is handed the computed plan and asked
// to explain it. No key, no network, bad response: the numbers still ship.
async function explain(p) {
  if (!GROQ_KEY) return { advice: null, adviceStatus: 'off: GROQ_API_KEY not set' };

  const prompt = `You are a financial advisor in India. A calculator has already produced this plan for a user.
Do not recompute or contradict the numbers. Explain what they mean and name the two biggest risks.
Under 120 words, plain text, no markdown headings.

${JSON.stringify(p, null, 2)}`;

  const started = Date.now();
  try {
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${GROQ_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: MODEL, messages: [{ role: 'user', content: prompt }], max_tokens: 300 }),
      signal: AbortSignal.timeout(20000),
    });
    if (!r.ok) return { advice: null, adviceStatus: `off: Groq returned ${r.status}` };
    const j = await r.json();
    return {
      advice: j.choices?.[0]?.message?.content?.trim() || null,
      adviceStatus: 'ok',
      adviceMs: Date.now() - started,
      adviceTokens: j.usage?.total_tokens,
    };
  } catch (e) {
    return { advice: null, adviceStatus: `off: ${e.message}` };
  }
}

app.post('/api/finance', async (req, res) => {
  const { type, amount, ...opts } = req.body || {};
  let p;
  try {
    p = plan(type, Number(amount), opts);
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
  res.json({ ...p, ...(await explain(p)) });
});

if (require.main === module) {
  const port = Number(process.env.PORT) || 5000;
  app.listen(port, () => {
    console.log(`MoneyPort on http://localhost:${port}  (advice ${GROQ_KEY ? 'on' : 'off — set GROQ_API_KEY'})`);
  });
}

module.exports = app;
